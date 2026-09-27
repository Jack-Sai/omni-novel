import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Download,
  MessageCircle,
  MessageSquarePlus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Badge, Button, EmptyState, Input, Menu, MenuContent, MenuItem, MenuTrigger } from "../ui";
import type { BadgeVariant } from "../ui/Badge";
import { cn } from "../../lib/cn";
import {
  useAnnotationStore,
  type Annotation,
  type AnnotationScope,
} from "../../stores/annotationStore";
import { useChapterStore } from "../../stores/chapterStore";
import type { AnnotationAIAction } from "../../services/annotationAIService";
import { ANNOTATION_CLICK_EVENT } from "../editor/annotationHighlight";

export interface AnnotationPanelProps {
  projectId: string;
  /** 当前章（章节级批注的默认挂载） */
  currentChapterId: string | null;
  onLocate: (annotation: Annotation) => void;
  onAdd: (scope: AnnotationScope) => void;
  onRunAI: (action: AnnotationAIAction) => void;
  onExport: () => void;
  onClose: () => void;
}

type StatusFilter = "all" | "open" | "resolved";

const kindMeta: Record<Annotation["kind"], { label: string; variant: BadgeVariant }> = {
  manual: { label: "批注", variant: "neutral" },
  ai: { label: "AI", variant: "primary" },
  reader: { label: "读者", variant: "warning" },
};

const filterItems: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "open", label: "待解决" },
  { value: "resolved", label: "已解决" },
];

function fmtShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function AnnotationPanel({
  projectId,
  currentChapterId,
  onLocate,
  onAdd,
  onRunAI,
  onExport,
  onClose,
}: AnnotationPanelProps) {
  const annotations = useAnnotationStore((s) => s.annotations);
  const activeId = useAnnotationStore((s) => s.activeId);
  const setActiveId = useAnnotationStore((s) => s.setActiveId);
  const chapters = useChapterStore((s) => s.chapters);

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // 正文点击批注高亮 → 展开对应卡片并滚动可见
  useEffect(() => {
    const handler = (e: Event) => {
      const { annotationId } = (e as CustomEvent).detail as { annotationId: string };
      setFilter("all");
      setExpandedId(annotationId);
      setActiveId(annotationId);
      requestAnimationFrame(() => {
        document
          .querySelector(`[data-annotation-card="${annotationId}"]`)
          ?.scrollIntoView({ block: "nearest" });
      });
    };
    window.addEventListener(ANNOTATION_CLICK_EVENT, handler);
    return () => window.removeEventListener(ANNOTATION_CLICK_EVENT, handler);
  }, [setActiveId]);

  const chapterTitle = useMemo(() => {
    const map = new Map(chapters.map((c) => [c.id, c.title]));
    return (id: string | null) => (id ? (map.get(id) ?? "已删除章节") : "全局");
  }, [chapters]);

  const list = useMemo(() => {
    return annotations
      .filter((a) => a.projectId === projectId)
      .filter((a) => (filter === "all" ? true : a.status === filter))
      .sort((a, b) => {
        // 待解决优先（filter=all 时），再按更新时间倒序
        if (filter === "all" && a.status !== b.status) return a.status === "open" ? -1 : 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [annotations, projectId, filter]);

  const openCount = annotations.filter(
    (a) => a.projectId === projectId && a.status === "open",
  ).length;

  const handleClickCard = (a: Annotation) => {
    setExpandedId((prev) => (prev === a.id ? null : a.id));
    setReplyText("");
    setActiveId(a.id);
    onLocate(a);
  };

  const handleReply = (a: Annotation) => {
    const text = replyText.trim();
    if (!text) return;
    useAnnotationStore.getState().addReply(a.id, { author: "author", content: text });
    setReplyText("");
  };

  const handleToggleStatus = (a: Annotation) => {
    useAnnotationStore.getState().toggleStatus(a.id);
  };

  const handleDelete = (a: Annotation) => {
    if (!window.confirm(`删除批注「${a.title}」？`)) return;
    useAnnotationStore.getState().deleteAnnotation(a.id);
    if (expandedId === a.id) setExpandedId(null);
  };

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-l border-line bg-canvas">
      {/* 头部 */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">批注</span>
          <Badge variant={openCount > 0 ? "warning" : "neutral"} size="sm">
            {openCount} 待解决
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Menu>
            <MenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" title="添加批注" aria-label="添加批注">
                <MessageSquarePlus size={15} />
              </Button>
            </MenuTrigger>
            <MenuContent align="end">
              <MenuItem onSelect={() => onAdd("chapter")} disabled={!currentChapterId}>
                章节批注
              </MenuItem>
              <MenuItem onSelect={() => onAdd("global")}>全局批注</MenuItem>
            </MenuContent>
          </Menu>
          <Menu>
            <MenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" title="AI 批注" aria-label="AI 批注">
                <Sparkles size={15} />
              </Button>
            </MenuTrigger>
            <MenuContent align="end">
              <MenuItem onSelect={() => onRunAI("review")} disabled={!currentChapterId}>
                AI 审校批注
              </MenuItem>
              <MenuItem onSelect={() => onRunAI("aiContent")} disabled={!currentChapterId}>
                标记 AI 生成内容
              </MenuItem>
              <MenuItem onSelect={() => onRunAI("reader")} disabled={!currentChapterId}>
                读者模拟批注
              </MenuItem>
            </MenuContent>
          </Menu>
          <Button
            variant="ghost"
            size="icon-sm"
            title="导出批注（Markdown）"
            aria-label="导出批注"
            onClick={onExport}
          >
            <Download size={15} />
          </Button>
          <Button variant="ghost" size="icon-sm" title="收起" aria-label="收起批注面板" onClick={onClose}>
            <X size={15} />
          </Button>
        </div>
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
            icon={MessageCircle}
            title={filter === "all" ? "暂无批注" : "没有符合的批注"}
            description={
              filter === "all"
                ? "选中正文可添加文本批注，或用 AI 生成审校批注"
                : "切换过滤条件查看其他批注"
            }
          />
        ) : (
          <div className="space-y-2">
            {list.map((a) => {
              const expanded = expandedId === a.id;
              const kind = kindMeta[a.kind];
              const isActive = activeId === a.id;
              return (
                <div
                  key={a.id}
                  data-annotation-card={a.id}
                  className={cn(
                    "cursor-pointer rounded-lg border bg-surface transition-colors",
                    isActive ? "border-primary ring-1 ring-primary/30" : "border-line hover:border-ink-3/40",
                  )}
                  onClick={() => handleClickCard(a)}
                >
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={kind.variant} size="sm">
                        {kind.label}
                      </Badge>
                      <Badge variant="outline" size="sm">
                        {{ text: "文本", chapter: "章节", global: "全局" }[a.scope]}
                      </Badge>
                      {a.status === "resolved" && (
                        <Badge variant="success" size="sm">
                          已解决
                        </Badge>
                      )}
                      <span className="ml-auto shrink-0 text-[11px] text-ink-3">
                        {fmtShort(a.updatedAt)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "mt-1.5 text-[13px] font-medium",
                        a.status === "resolved" ? "text-ink-3 line-through" : "text-ink",
                      )}
                    >
                      {a.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-3">
                      {chapterTitle(a.chapterId)}
                      {a.replies.length > 0 && ` · ${a.replies.length} 回复`}
                    </p>

                    {expanded && (
                      <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                        {a.quote && (
                          <blockquote className="max-h-24 overflow-y-auto border-l-2 border-warning-line bg-warning-soft px-2 py-1.5 text-[12px] italic text-ink-2">
                            {a.quote}
                          </blockquote>
                        )}
                        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-2">
                          {a.content}
                        </p>

                        {a.replies.length > 0 && (
                          <div className="space-y-1.5 border-t border-line pt-2">
                            {a.replies.map((r) => (
                              <div key={r.id} className="rounded-md bg-subtle px-2 py-1.5">
                                <p className="text-[11px] text-ink-3">{fmtShort(r.createdAt)}</p>
                                <p className="mt-0.5 whitespace-pre-wrap text-[12px] text-ink-2">
                                  {r.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          <Input
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="回复…"
                            className="h-7 flex-1 text-[12px]"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleReply(a);
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="发送回复"
                            aria-label="发送回复"
                            disabled={!replyText.trim()}
                            onClick={() => handleReply(a)}
                          >
                            <Send size={13} />
                          </Button>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(a)}
                          >
                            {a.status === "open" ? (
                              <>
                                <CheckCircle2 size={13} />
                                标记解决
                              </>
                            ) : (
                              <>
                                <Circle size={13} />
                                重新打开
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-auto text-danger hover:bg-danger-soft hover:text-danger"
                            onClick={() => handleDelete(a)}
                          >
                            <Trash2 size={13} />
                            删除
                          </Button>
                        </div>
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
