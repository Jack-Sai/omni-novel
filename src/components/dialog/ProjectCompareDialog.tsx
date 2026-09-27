import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  GitCompare,
  Minus,
  Plus,
} from "lucide-react";
import { versionDb, type ChapterVersionRow } from "../../services";
import { useChapterStore } from "../../stores/chapterStore";
import { computeDiffParts, formatVersionTime, textWordCount } from "../../lib/textDiff";
import { Badge, Button, Dialog, EmptyState, Select, Skeleton } from "../ui";
import { cn } from "../../lib/cn";

interface ProjectCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

/** 时间点选项：去重 created_at（最近优先）+ 当前 */
interface TimePoint {
  value: string;
  label: string;
}

const CURRENT = "__current__";
/** 最多列出的时间点（避免下拉爆炸） */
const MAX_TIME_POINTS = 80;
const MAX_DIFF_LINES = 400;

type ChangeKind = "modified" | "added" | "removed";

interface ChapterDiff {
  chapterId: string;
  title: string;
  kind: ChangeKind;
  wordsA: number;
  wordsB: number;
  contentA: string | null;
  contentB: string | null;
}

const kindMeta: Record<ChangeKind, { label: string; variant: "warning" | "success" | "danger" }> = {
  modified: { label: "修改", variant: "warning" },
  added: { label: "新增", variant: "success" },
  removed: { label: "删除", variant: "danger" },
};

export function ProjectCompareDialog({
  open,
  onOpenChange,
  projectId,
}: ProjectCompareDialogProps) {
  const chapters = useChapterStore((s) => s.chapters);
  const projectChapters = useMemo(
    () => chapters.filter((c) => c.projectId === projectId),
    [chapters, projectId]
  );

  const [meta, setMeta] = useState<ChapterVersionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeA, setTimeA] = useState<string>("");
  const [timeB, setTimeB] = useState<string>(CURRENT);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [computing, setComputing] = useState(false);

  /** 时间点列表（去重，新→旧） */
  const timePoints = useMemo<TimePoint[]>(() => {
    const seen = new Set<string>();
    const points: TimePoint[] = [{ value: CURRENT, label: "当前（工作区）" }];
    for (let i = meta.length - 1; i >= 0 && points.length <= MAX_TIME_POINTS; i--) {
      const t = meta[i].created_at;
      if (seen.has(t)) continue;
      seen.add(t);
      points.push({ value: t, label: formatVersionTime(t) });
    }
    return points;
  }, [meta]);

  // 打开时加载元数据并给默认时间点（A=最早可见时间点，B=当前）
  useEffect(() => {
    if (!open) {
      setMeta([]);
      setExpandedId(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void versionDb
      .listMetaByProject(projectId)
      .then((rows) => {
        if (cancelled) return;
        setMeta(rows);
        const points = new Set(rows.map((r) => r.created_at));
        const oldest = rows.length > 0 ? rows[0].created_at : "";
        // 默认：A = 尽量早的时间点，B = 当前
        setTimeA(points.size > 1 && oldest ? oldest : "");
        setTimeB(CURRENT);
      })
      .catch((e) => console.warn("加载版本元数据失败:", e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  /** 取某章在时间点的 HTML（CURRENT → 工作区内容） */
  const contentAt = useCallback(
    async (chapterId: string, time: string): Promise<string | null> => {
      if (time === CURRENT) {
        const ch = projectChapters.find((c) => c.id === chapterId);
        return ch ? ch.content : null;
      }
      if (!time) return null;
      const row = await versionDb.getLatestAt(projectId, chapterId, time);
      return row ? row.content : null;
    },
    [projectChapters, projectId]
  );

  /** 计算项目级差异（章级状态 + 字数增减） */
  const [diffs, setDiffs] = useState<ChapterDiff[]>([]);

  const compute = useCallback(async () => {
    if (!timeA || !timeB || timeA === timeB) {
      setDiffs([]);
      return;
    }
    setComputing(true);
    try {
      // 章全集：两时间点出现过的章 ∪ 当前章
      const chapterIds = new Set<string>(projectChapters.map((c) => c.id));
      for (const m of meta) {
        if (timeA !== CURRENT && m.created_at <= timeA) chapterIds.add(m.chapter_id);
        if (timeB !== CURRENT && m.created_at <= timeB) chapterIds.add(m.chapter_id);
      }

      const results: ChapterDiff[] = [];
      for (const id of chapterIds) {
        const [contentA, contentB] = await Promise.all([
          contentAt(id, timeA),
          contentAt(id, timeB),
        ]);
        if (contentA === null && contentB === null) continue;
        const title =
          projectChapters.find((c) => c.id === id)?.title ??
          meta.find((m) => m.chapter_id === id)?.title ??
          "（已删除的章节）";
        const wordsA = contentA === null ? 0 : textWordCount(contentA);
        const wordsB = contentB === null ? 0 : textWordCount(contentB);
        if (contentA === null) {
          results.push({
            chapterId: id,
            title,
            kind: "added",
            wordsA,
            wordsB,
            contentA,
            contentB,
          });
        } else if (contentB === null) {
          results.push({
            chapterId: id,
            title,
            kind: "removed",
            wordsA,
            wordsB,
            contentA,
            contentB,
          });
        } else if (contentA !== contentB) {
          results.push({
            chapterId: id,
            title,
            kind: "modified",
            wordsA,
            wordsB,
            contentA,
            contentB,
          });
        }
      }
      setDiffs(results);
    } catch (e) {
      console.warn("计算项目差异失败:", e);
      setDiffs([]);
    } finally {
      setComputing(false);
    }
  }, [timeA, timeB, meta, projectChapters, contentAt]);

  // 时间点变化自动重算
  useEffect(() => {
    if (!open) return;
    if (!timeA || !timeB || timeA === timeB) return;
    void compute();
  }, [open, compute, timeA, timeB]);

  const summary = useMemo(() => {
    let modified = 0;
    let added = 0;
    let removed = 0;
    let wordsDelta = 0;
    for (const d of diffs) {
      if (d.kind === "modified") modified++;
      else if (d.kind === "added") added++;
      else removed++;
      wordsDelta += d.wordsB - d.wordsA;
    }
    return { modified, added, removed, wordsDelta, unchanged: 0 };
  }, [diffs]);

  const swap = () => {
    setTimeA(timeB);
    setTimeB(timeA);
  };

  const sameTime = !timeA || !timeB || timeA === timeB;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="项目版本对比"
      description="跨时间点比较全书章节的增删改与字数变化"
      icon={GitCompare}
      size="xl"
      footer={
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          关闭
        </Button>
      }
    >
      <div className="flex max-h-[70vh] min-h-0 flex-col gap-3">
        {/* 时间点选择 */}
        <div className="flex shrink-0 flex-wrap items-end gap-3 rounded-lg border border-line bg-subtle p-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-2">
            对比起点
            <Select
              selectSize="sm"
              className="w-56"
              value={timeA}
              onChange={(e) => setTimeA(e.target.value)}
            >
              <option value="">（选择时间点）</option>
              {timePoints.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </label>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="交换两个时间点"
            title="交换"
            disabled={sameTime}
            onClick={swap}
          >
            <ArrowLeftRight size={15} />
          </Button>
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-2">
            对比终点
            <Select
              selectSize="sm"
              className="w-56"
              value={timeB}
              onChange={(e) => setTimeB(e.target.value)}
            >
              <option value="">（选择时间点）</option>
              {timePoints.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </label>

          {!sameTime && (
            <div className="ml-auto flex items-center gap-2">
              <Badge variant={summary.modified > 0 ? "warning" : "outline"} size="sm">
                修改 {summary.modified}
              </Badge>
              <Badge variant={summary.added > 0 ? "success" : "outline"} size="sm">
                新增 {summary.added}
              </Badge>
              <Badge variant={summary.removed > 0 ? "danger" : "outline"} size="sm">
                删除 {summary.removed}
              </Badge>
              <Badge variant="outline" size="sm">
                {summary.wordsDelta >= 0 ? (
                  <span className="flex items-center gap-0.5 text-success">
                    <Plus size={11} />
                    {summary.wordsDelta.toLocaleString()} 字
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-danger">
                    <Minus size={11} />
                    {Math.abs(summary.wordsDelta).toLocaleString()} 字
                  </span>
                )}
              </Badge>
            </div>
          )}
        </div>

        {/* 结果列表 */}
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-line">
          {loading || computing ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : meta.length === 0 ? (
            <EmptyState
              icon={GitCompare}
              title="暂无版本快照"
              description="章节保存产生自动快照后，即可进行跨时间点对比。"
              className="py-10"
            />
          ) : sameTime ? (
            <EmptyState
              icon={GitCompare}
              title="请选择两个不同时间点"
              description="左侧选一个历史时间点，右侧保留「当前」即可对比最近变化。"
              className="py-10"
            />
          ) : diffs.length === 0 ? (
            <EmptyState
              icon={GitCompare}
              title="两个时间点之间没有变化"
              description="所选范围内章节内容与增删均一致。"
              className="py-10"
            />
          ) : (
            <ul className="divide-y divide-line">
              {diffs.map((d) => {
                const expanded = expandedId === d.chapterId;
                const delta = d.wordsB - d.wordsA;
                const parts =
                  expanded && d.contentA !== null && d.contentB !== null
                    ? computeDiffParts(d.contentA, d.contentB, MAX_DIFF_LINES)
                    : null;
                return (
                  <li key={d.chapterId}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-hover"
                      onClick={() => setExpandedId(expanded ? null : d.chapterId)}
                    >
                      {expanded ? (
                        <ChevronDown size={14} className="shrink-0 text-ink-3" />
                      ) : (
                        <ChevronRight size={14} className="shrink-0 text-ink-3" />
                      )}
                      <Badge variant={kindMeta[d.kind].variant} size="sm">
                        {kindMeta[d.kind].label}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                        {d.title}
                      </span>
                      <span className="shrink-0 text-[12px] tabular-nums text-ink-3">
                        {d.wordsA.toLocaleString()} → {d.wordsB.toLocaleString()} 字
                      </span>
                      <span
                        className={cn(
                          "shrink-0 text-[12px] font-medium tabular-nums",
                          delta > 0 ? "text-success" : delta < 0 ? "text-danger" : "text-ink-3",
                        )}
                      >
                        {delta > 0 ? `+${delta}` : delta < 0 ? delta : "±0"}
                      </span>
                    </button>
                    {parts && (
                      <div className="border-t border-line bg-subtle">
                        <div className="flex items-center gap-3 px-3 py-1 text-[11px] text-ink-3">
                          <span className="flex items-center gap-1">
                            <span className="inline-block h-2 w-2 rounded-sm bg-danger/60" />{" "}
                            起点（−）
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="inline-block h-2 w-2 rounded-sm bg-success/60" />{" "}
                            终点（+）
                          </span>
                        </div>
                        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words px-3 pb-2 font-mono text-xs leading-relaxed">
                          {parts.map((p, i) => (
                            <span
                              key={i}
                              className={cn(
                                "block",
                                p.added && "bg-success/15 text-success",
                                p.removed && "bg-danger/15 text-danger",
                              )}
                            >
                              {(p.added ? "+ " : p.removed ? "- " : "  ") + p.value}
                            </span>
                          ))}
                        </pre>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Dialog>
  );
}
