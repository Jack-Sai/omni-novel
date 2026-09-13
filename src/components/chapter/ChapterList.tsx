import { useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { useChapterStore, Chapter } from "../../stores/chapterStore";
import { Button, EmptyState, Input } from "../ui";
import { cn } from "../../lib/cn";

interface ChapterListProps {
  projectId: string;
  onSelectChapter: (chapter: Chapter) => void;
  currentChapterId?: string | null;
}

export function ChapterList({ projectId, onSelectChapter, currentChapterId }: ChapterListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const { chapters, addChapter, deleteChapter } = useChapterStore();

  const projectChapters = chapters
    .filter((c) => c.projectId === projectId)
    .sort((a, b) => a.order - b.order);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addChapter({
      projectId,
      volumeId: null,
      title: newTitle.trim(),
      content: "",
      summary: "",
      order: projectChapters.length,
    });
    setNewTitle("");
    setIsAdding(false);
  };

  return (
    <div className="flex h-full flex-col bg-canvas">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-3.5 py-2">
        <span className="text-[13px] font-medium text-ink-2">
          章节
          <span className="ml-1.5 tabular-nums text-ink-3">{projectChapters.length}</span>
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="新建章节"
          onClick={() => setIsAdding(true)}
        >
          <Plus size={14} />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-1.5">
        {projectChapters.length === 0 && !isAdding ? (
          <EmptyState
            size="sm"
            icon={FileText}
            title="暂无章节"
            description="新建章节后即可开始写作"
            action={
              <Button variant="secondary" size="sm" onClick={() => setIsAdding(true)}>
                <Plus size={13} />
                新建章节
              </Button>
            }
            className="py-10"
          />
        ) : (
          <div className="space-y-0.5">
            {projectChapters.map((chapter, index) => {
              const active = currentChapterId === chapter.id;

              return (
                <div
                  key={chapter.id}
                  className={cn(
                    "group flex items-center rounded-lg transition-colors duration-150",
                    active ? "bg-surface shadow-xs" : "hover:bg-hover",
                  )}
                >
                  <button
                    type="button"
                    aria-current={active ? "true" : undefined}
                    onClick={() => onSelectChapter(chapter)}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-ring)]",
                      active ? "font-medium text-primary" : "text-ink-2",
                    )}
                  >
                    <span
                      className={cn(
                        "w-4 shrink-0 text-right text-[12px] tabular-nums",
                        active ? "text-primary" : "text-ink-3",
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{chapter.title}</span>
                  </button>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`删除 ${chapter.title}`}
                    className="mr-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-danger-soft hover:text-danger focus-visible:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChapter(chapter.id);
                    }}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {isAdding && (
          <div className="p-1.5">
            <Input
              autoFocus
              inputSize="sm"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") {
                  setNewTitle("");
                  setIsAdding(false);
                }
              }}
              onBlur={() => {
                if (newTitle.trim()) handleAdd();
                else setIsAdding(false);
              }}
              placeholder="输入章节标题…"
            />
          </div>
        )}
      </div>
    </div>
  );
}
