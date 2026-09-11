import { useState } from "react";
import { Plus, FileText, Trash2, GripVertical } from "lucide-react";
import { useChapterStore, Chapter } from "../../stores/chapterStore";

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
    addChapter(projectId, newTitle.trim());
    setNewTitle("");
    setIsAdding(false);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <span className="font-medium">章节</span>
        <button
          onClick={() => setIsAdding(true)}
          className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)]"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {projectChapters.length === 0 && !isAdding ? (
          <div className="flex h-full flex-col items-center justify-center p-4">
            <FileText size={32} className="mb-2 text-[var(--color-text-secondary)]" />
            <p className="text-sm text-[var(--color-text-secondary)]">暂无章节</p>
          </div>
        ) : (
          <div className="p-2">
            {projectChapters.map((chapter) => (
              <div
                key={chapter.id}
                onClick={() => onSelectChapter(chapter)}
                className={`group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition
                  ${
                    currentChapterId === chapter.id
                      ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                      : "hover:bg-[var(--color-bg-secondary)]"
                  }`}
              >
                <GripVertical size={14} className="text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100" />
                <span className="flex-1 truncate text-sm">{chapter.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChapter(chapter.id);
                  }}
                  className="rounded p-1 text-[var(--color-text-secondary)] opacity-0 transition hover:bg-red-100 hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {isAdding && (
          <div className="p-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") setIsAdding(false);
              }}
              onBlur={() => {
                if (newTitle.trim()) handleAdd();
                else setIsAdding(false);
              }}
              autoFocus
              placeholder="输入章节标题..."
              className="w-full rounded-lg border border-[var(--color-primary)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
