import { useState, useEffect, useCallback, useMemo } from "react";
import { diffLines } from "diff";
import { History, Plus, RotateCcw, Trash2 } from "lucide-react";
import { versionDb, type ChapterVersionRow } from "../../services";
import { Badge, Button, Dialog, EmptyState } from "../ui";
import { cn } from "../../lib/cn";

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  chapterId: string;
  chapterTitle: string;
  currentContent: string;
  /** 恢复选中版本：由父级先快照当前内容再写回编辑器 */
  onRestore: (content: string) => void;
}

const sourceLabels: Record<string, string> = {
  auto: "自动",
  manual: "手动",
  restore: "恢复前",
};

/** HTML → 纯文本（按块换行），仅用于对比展示 */
function htmlToText(html: string): string {
  return html
    .replace(/<\/(p|div|h[1-6]|li|blockquote|pre)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatTime(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const MAX_DIFF_LINES = 600;

export function VersionHistoryDialog({
  open,
  onOpenChange,
  projectId,
  chapterId,
  chapterTitle,
  currentContent,
  onRestore,
}: VersionHistoryDialogProps) {
  const [versions, setVersions] = useState<ChapterVersionRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await versionDb.list(projectId, chapterId);
      setVersions(rows);
      setSelectedId((prev) => (prev && rows.some((r) => r.id === prev) ? prev : null));
    } catch (e) {
      console.warn("加载版本历史失败:", e);
    } finally {
      setLoading(false);
    }
  }, [projectId, chapterId]);

  useEffect(() => {
    if (open) {
      setSelectedId(null);
      void load();
    } else {
      setVersions([]);
      setSelectedId(null);
    }
  }, [open, load]);

  const handleSnapshot = useCallback(async () => {
    try {
      await versionDb.create(projectId, chapterId, {
        title: "手动快照",
        content: currentContent,
        source: "manual",
      });
      await load();
    } catch (e) {
      console.warn("保存快照失败:", e);
    }
  }, [projectId, chapterId, currentContent, load]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await versionDb.delete(id);
        setVersions((prev) => prev.filter((v) => v.id !== id));
        setSelectedId((prev) => (prev === id ? null : prev));
      } catch (e) {
        console.warn("删除版本失败:", e);
      }
    },
    [],
  );

  const selected = useMemo(
    () => versions.find((v) => v.id === selectedId) || null,
    [versions, selectedId],
  );

  const diffParts = useMemo(() => {
    if (!selected) return [];
    const parts = diffLines(htmlToText(currentContent), htmlToText(selected.content));
    let total = 0;
    const out: { value: string; added?: boolean; removed?: boolean }[] = [];
    for (const p of parts) {
      const lines = p.value.split("\n");
      if (total + lines.length > MAX_DIFF_LINES) {
        out.push({ value: "…（差异过长，已截断）" });
        break;
      }
      out.push(p);
      total += lines.length;
    }
    return out;
  }, [selected, currentContent]);

  const currentWords = htmlToText(currentContent).replace(/\s/g, "").length;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="版本历史"
      description={`${chapterTitle} · 当前 ${currentWords} 字 · 每章保留最近 20 个版本`}
      icon={History}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          <Button variant="secondary" onClick={() => void handleSnapshot()}>
            <Plus size={15} />
            保存当前为快照
          </Button>
          <Button
            variant="primary"
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              onRestore(selected.content);
            }}
          >
            <RotateCcw size={15} />
            恢复此版本
          </Button>
        </>
      }
    >
      <div className="flex max-h-[65vh] min-h-0 flex-col gap-4">
        {/* 版本列表 */}
        <div className="shrink-0 overflow-auto rounded-lg border border-line">
          {loading ? (
            <p className="px-3 py-4 text-center text-[13px] text-ink-3">加载中…</p>
          ) : versions.length === 0 ? (
            <EmptyState
              icon={History}
              title="暂无版本"
              description="每次保存章节时会自动创建快照（内容有变化才会记录）。"
              className="py-8"
            />
          ) : (
            <ul className="divide-y divide-line">
              {versions.map((v) => {
                const active = v.id === selectedId;
                return (
                  <li key={v.id}>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5",
                        active ? "bg-primary-soft" : "hover:bg-hover",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(active ? null : v.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none"
                      >
                        <Badge variant={active ? "primary" : "outline"} size="sm">
                          {sourceLabels[v.source] ?? v.source}
                        </Badge>
                        <span className="shrink-0 text-[13px] text-ink-2">
                          {formatTime(v.created_at)}
                        </span>
                        <span className="truncate text-[12px] text-ink-3">
                          {v.title} · {v.word_count} 字
                        </span>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="删除此版本"
                        className="opacity-0 transition-opacity hover:bg-danger-soft hover:text-danger focus-visible:opacity-100"
                        onClick={() => void handleDelete(v.id)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 差异对比：当前 vs 选中版本 */}
        {selected && (
          <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-line bg-surface">
            <div className="sticky top-0 flex items-center gap-3 border-b border-line bg-subtle px-3 py-1.5 text-[11px] text-ink-3">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-danger/60" /> 当前内容（−）
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-success/60" /> 此版本（+）
              </span>
            </div>
            <pre className="whitespace-pre-wrap break-words px-3 py-2 font-mono text-xs leading-relaxed">
              {diffParts.map((p, i) => (
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
      </div>
    </Dialog>
  );
}
