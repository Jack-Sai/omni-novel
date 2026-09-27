import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCheck,
  GitCompare,
  PenLine,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import { Badge, Button, EmptyState, Menu, MenuContent, MenuItem, MenuTrigger } from "../ui";
import type { BadgeVariant } from "../ui/Badge";
import { cn } from "../../lib/cn";
import {
  useRevisionStore,
  type Revision,
} from "../../stores/revisionStore";
import { useChapterStore } from "../../stores/chapterStore";
import { computeRevisionStats } from "../../services/revisionService";
import type { RevisionAIAction } from "../../services/revisionAIService";
import { REVISION_CLICK_EVENT } from "../editor/revisionHighlight";

export interface RevisionPanelProps {
  projectId: string;
  currentChapterId: string | null;
  /** 修订模式开关态与切换 */
  trackMode: boolean;
  onToggleTrackMode: () => void;
  onRunAI: (action: RevisionAIAction) => void;
  onCompare: () => void;
  /** 点击卡片 → 正文定位（含切章） */
  onLocate: (rev: Revision) => void;
  onAccept: (rev: Revision) => void;
  onReject: (rev: Revision) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onClose: () => void;
}

type ListFilter = "pending" | "history" | "all";

const kindMeta: Record<Revision["kind"], { label: string; variant: BadgeVariant }> = {
  insert: { label: "新增", variant: "success" },
  delete: { label: "删除", variant: "danger" },
  replace: { label: "替换", variant: "warning" },
  suggest: { label: "建议", variant: "primary" },
};

const sourceMeta: Record<Revision["source"], string> = {
  manual: "手动",
  ai: "AI 建议",
  "ai-rewrite": "AI 改写",
};

const filterItems: { value: ListFilter; label: string }[] = [
  { value: "pending", label: "待处理" },
  { value: "history", label: "历史" },
  { value: "all", label: "全部" },
];

function fmtShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 变更片段展示：红色删除 + 绿色新增 */
function ChangeQuote({ rev }: { rev: Revision }) {
  if (rev.kind === "insert") {
    return (
      <p className="text-[12px] leading-relaxed text-success">
        + {rev.quoteAfter.length > 160 ? `${rev.quoteAfter.slice(0, 160)}…` : rev.quoteAfter}
      </p>
    );
  }
  if (rev.kind === "delete") {
    return (
      <p className="text-[12px] leading-relaxed text-danger line-through decoration-danger/60">
        - {rev.quoteBefore.length > 160 ? `${rev.quoteBefore.slice(0, 160)}…` : rev.quoteBefore}
      </p>
    );
  }
  return (
    <div className="space-y-1">
      <p className="text-[12px] leading-relaxed text-danger line-through decoration-danger/60">
        - {rev.quoteBefore.length > 120 ? `${rev.quoteBefore.slice(0, 120)}…` : rev.quoteBefore}
      </p>
      <p className="text-[12px] leading-relaxed text-success">
        + {rev.quoteAfter.length > 120 ? `${rev.quoteAfter.slice(0, 120)}…` : rev.quoteAfter}
      </p>
    </div>
  );
}

export function RevisionPanel({
  projectId,
  currentChapterId,
  trackMode,
  onToggleTrackMode,
  onRunAI,
  onCompare,
  onLocate,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll,
  onClose,
}: RevisionPanelProps) {
  const revisions = useRevisionStore((s) => s.revisions);
  const activeRevisionId = useRevisionStore((s) => s.activeRevisionId);
  const setActiveRevisionId = useRevisionStore((s) => s.setActiveRevisionId);
  const chapters = useChapterStore((s) => s.chapters);

  const [filter, setFilter] = useState<ListFilter>("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 正文点击 AI 建议高亮 → 展开对应卡片并滚动可见
  useEffect(() => {
    const handler = (e: Event) => {
      const { revisionId } = (e as CustomEvent).detail as { revisionId: string };
      setFilter("all");
      setExpandedId(revisionId);
      setActiveRevisionId(revisionId);
      requestAnimationFrame(() => {
        document
          .querySelector(`[data-revision-card="${revisionId}"]`)
          ?.scrollIntoView({ block: "nearest" });
      });
    };
    window.addEventListener(REVISION_CLICK_EVENT, handler);
    return () => window.removeEventListener(REVISION_CLICK_EVENT, handler);
  }, [setActiveRevisionId]);

  const chapterTitle = useMemo(() => {
    const map = new Map(chapters.map((c) => [c.id, c.title]));
    return (id: string) => map.get(id) ?? "已删除章节";
  }, [chapters]);

  const projectRevisions = useMemo(
    () => revisions.filter((r) => r.projectId === projectId),
    [revisions, projectId],
  );
  const stats = useMemo(() => computeRevisionStats(projectRevisions), [projectRevisions]);

  const list = useMemo(() => {
    let out = projectRevisions;
    if (currentChapterId) out = out.filter((r) => r.chapterId === currentChapterId);
    if (filter === "pending") out = out.filter((r) => r.status === "pending");
    else if (filter === "history")
      out = out.filter((r) => r.status !== "pending");
    return [...out].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [projectRevisions, currentChapterId, filter]);

  const pendingInChapter = currentChapterId
    ? projectRevisions.filter(
        (r) => r.chapterId === currentChapterId && r.status === "pending",
      )
    : [];

  const handleClickCard = (rev: Revision) => {
    setExpandedId((prev) => (prev === rev.id ? null : rev.id));
    setActiveRevisionId(rev.id);
    onLocate(rev);
  };

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-l border-line bg-canvas">
      {/* 头部 */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">修订</span>
          <Badge variant={stats.pending > 0 ? "warning" : "neutral"} size="sm">
            {stats.pending} 待处理
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            title="修订对比（同步点 vs 当前）"
            aria-label="修订对比"
            onClick={onCompare}
            disabled={!currentChapterId}
          >
            <GitCompare size={15} />
          </Button>
          <Menu>
            <MenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" title="AI 修订" aria-label="AI 修订">
                <Sparkles size={15} />
              </Button>
            </MenuTrigger>
            <MenuContent align="end">
              <MenuItem onSelect={() => onRunAI("suggest")} disabled={!currentChapterId}>
                AI 修订建议
              </MenuItem>
              <MenuItem onSelect={() => onRunAI("proofread")} disabled={!currentChapterId}>
                拼写与语法检查
              </MenuItem>
            </MenuContent>
          </Menu>
          <Button variant="ghost" size="icon-sm" title="收起" aria-label="收起修订面板" onClick={onClose}>
            <X size={15} />
          </Button>
        </div>
      </div>

      {/* 修订模式开关 */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-3 py-2">
        <button
          type="button"
          role="switch"
          aria-checked={trackMode}
          onClick={onToggleTrackMode}
          className="flex items-center gap-2 text-[12px] text-ink-2 hover:text-ink"
        >
          <span
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors",
              trackMode ? "bg-primary" : "bg-line-strong",
            )}
          >
            <span
              className={cn(
                "pointer-events-none mt-0.5 inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                trackMode ? "translate-x-4.5" : "translate-x-0.5",
              )}
            />
          </span>
          {trackMode ? "修订中（记录修改）" : "开启修订模式"}
        </button>
        <Button
          variant="primary"
          size="sm"
          className="h-6 px-2 text-[11px]"
          disabled={pendingInChapter.length === 0}
          onClick={onAcceptAll}
          title="接受本章全部待处理修订"
        >
          <CheckCheck size={12} />
          全部接受
        </Button>
      </div>

      {/* 统计 */}
      <div className="flex shrink-0 flex-wrap gap-1 border-b border-line px-3 py-2 text-[11px] text-ink-3">
        <span>+{stats.addedChars} 字</span>
        <span>−{stats.removedChars} 字</span>
        <span>· 已接受 {stats.accepted}</span>
        <span>· 已拒绝 {stats.rejected}</span>
        {stats.aiCount > 0 && <span>· AI {stats.aiCount}</span>}
        <button
          type="button"
          className="ml-auto text-danger hover:underline disabled:opacity-40"
          disabled={pendingInChapter.length === 0}
          onClick={onRejectAll}
          title="拒绝本章全部待处理修订"
        >
          全部拒绝
        </button>
      </div>

      {/* 过滤 chips */}
      <div className="flex shrink-0 gap-1 border-b border-line px-3 py-2">
        {filterItems.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[12px] transition-colors",
              filter === f.value
                ? "bg-primary-soft font-medium text-primary"
                : "text-ink-3 hover:bg-hover hover:text-ink-2",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 列表 */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {list.length === 0 ? (
          <EmptyState
            icon={PenLine}
            title={filter === "pending" ? "没有待处理修订" : "暂无修订记录"}
            description={
              currentChapterId
                ? "开启修订模式后的修改会记录为修订；也可用 AI 生成修订建议"
                : "先选择一个章节"
            }
          />
        ) : (
          <div className="space-y-2">
            {list.map((rev) => {
              const expanded = expandedId === rev.id;
              const kind = kindMeta[rev.kind];
              const isActive = activeRevisionId === rev.id;
              return (
                <div
                  key={rev.id}
                  data-revision-card={rev.id}
                  className={cn(
                    "cursor-pointer rounded-lg border bg-surface transition-colors",
                    isActive
                      ? "border-primary ring-1 ring-primary/30"
                      : "border-line hover:border-ink-3/40",
                  )}
                  onClick={() => handleClickCard(rev)}
                >
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={kind.variant} size="sm">
                        {kind.label}
                      </Badge>
                      <Badge variant="outline" size="sm">
                        {sourceMeta[rev.source]}
                      </Badge>
                      {rev.status === "accepted" && (
                        <Badge variant="success" size="sm">
                          已接受
                        </Badge>
                      )}
                      {rev.status === "rejected" && (
                        <Badge variant="danger" size="sm">
                          已拒绝
                        </Badge>
                      )}
                      <span className="ml-auto shrink-0 text-[11px] text-ink-3">
                        {fmtShort(rev.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-ink-3">
                      {chapterTitle(rev.chapterId)}
                    </p>

                    {expanded && (
                      <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                        <ChangeQuote rev={rev} />
                        {rev.reason && (
                          <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-ink-2">
                            {rev.reason}
                          </p>
                        )}
                        {rev.status === "pending" ? (
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="primary"
                              size="sm"
                              className="h-7 flex-1 text-xs"
                              onClick={() => onAccept(rev)}
                            >
                              <Check size={13} />
                              接受
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-7 flex-1 text-xs"
                              onClick={() => onReject(rev)}
                            >
                              <XCircle size={13} />
                              拒绝
                            </Button>
                          </div>
                        ) : (
                          <p className="text-[11px] text-ink-3">
                            {rev.resolvedAt ? fmtShort(rev.resolvedAt) : ""}{" "}
                            {rev.status === "accepted" ? "已接受" : "已拒绝"}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
