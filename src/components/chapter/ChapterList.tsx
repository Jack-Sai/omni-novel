import { useState } from "react";
import { FileText, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useChapterStore, Chapter } from "../../stores/chapterStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useProjectStore } from "../../stores/projectStore";
import {
  createAIService,
  getSystemPrompt,
  memoryDb,
  toLlamaConfig,
  versionDb,
} from "../../services";
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
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const { chapters, addChapter, deleteChapter, updateChapter } = useChapterStore();
  const { ai } = useSettingsStore();

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

  /** AI 生成章节摘要：写回 chapter.summary 并同步为记忆条目（替换旧摘要记忆） */
  const handleGenerateSummary = async (chapter: Chapter) => {
    if (summarizingId) return;
    const text = chapter.content
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) return;

    setSummarizingId(chapter.id);
    try {
      const service = createAIService({
        backend: ai.backend,
        baseUrl: ai.baseUrl,
        model: ai.model,
        apiKey: ai.apiKey,
        llama:
          ai.backend === "llamacpp"
            ? toLlamaConfig({
                baseUrl: ai.baseUrl,
                llamaServerPath: ai.llamaServerPath,
                llamaModelPath: ai.llamaModelPath,
                llamaExtraArgs: ai.llamaExtraArgs,
                idleUnloadMinutes: ai.idleUnloadMinutes,
              })
            : undefined,
      });
      const summary = await service.chat(
        [
          { role: "system", content: getSystemPrompt("chapterSummary") },
          { role: "user", content: `《${chapter.title}》正文：\n\n${text.slice(0, 4000)}` },
        ],
        { temperature: 0.3, numPredict: 300, think: false },
      );
      const clean = summary.trim();
      if (!clean) return;

      updateChapter(chapter.id, { summary: clean });

      const project = useProjectStore.getState().currentProject;
      if (project) {
        const old = await memoryDb.list(project.id, {
          type: "summary",
          scope: "chapter",
          refId: chapter.id,
        });
        for (const item of old) {
          await memoryDb.delete(item.id);
        }
        await memoryDb.create(project.id, {
          type: "summary",
          scope: "chapter",
          refId: chapter.id,
          title: chapter.title,
          content: clean,
          source: "ai",
          importance: 7,
        });
      }
    } catch (e) {
      console.warn("生成章节摘要失败:", e);
    } finally {
      setSummarizingId(null);
    }
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
                    title={chapter.summary || undefined}
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
                    aria-label={
                      summarizingId === chapter.id
                        ? "正在生成摘要"
                        : `生成 ${chapter.title} 的摘要`
                    }
                    title="AI 生成摘要"
                    disabled={summarizingId !== null && summarizingId !== chapter.id}
                    className="mr-0.5 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleGenerateSummary(chapter);
                    }}
                  >
                    {summarizingId === chapter.id ? (
                      <Loader2 size={12} className="animate-spin text-primary" />
                    ) : (
                      <Sparkles size={12} />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`删除 ${chapter.title}`}
                    className="mr-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-danger-soft hover:text-danger focus-visible:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChapter(chapter.id);
                      // 顺带清理该章的版本快照与摘要记忆
                      versionDb.deleteByChapter(projectId, chapter.id).catch(() => {});
                      memoryDb
                        .list(projectId, { type: "summary", scope: "chapter", refId: chapter.id })
                        .then((rows) =>
                          Promise.all(rows.map((r) => memoryDb.delete(r.id))),
                        )
                        .catch(() => {});
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
