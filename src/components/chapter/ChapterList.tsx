import { useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileText, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useChapterStore, Chapter } from "../../stores/chapterStore";
import { useVolumeStore } from "../../stores/volumeStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useProjectStore } from "../../stores/projectStore";
import { deleteChapterCascade } from "../../lib/chapterActions";
import {
  createAIService,
  getSystemPrompt,
  memoryDb,
  toLlamaConfig,
} from "../../services";
import { Button, EmptyState, Input } from "../ui";
import { cn } from "../../lib/cn";

interface ChapterListProps {
  projectId: string;
  onSelectChapter: (chapter: Chapter) => void;
  currentChapterId?: string | null;
}

type AddTarget = { volumeId: string | null } | null;

export function ChapterList({ projectId, onSelectChapter, currentChapterId }: ChapterListProps) {
  const [addTarget, setAddTarget] = useState<AddTarget>(null);
  const [newTitle, setNewTitle] = useState("");
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const { chapters, addChapter, updateChapter } = useChapterStore();
  const { volumes } = useVolumeStore();
  const { ai } = useSettingsStore();

  const projectVolumes = useMemo(
    () =>
      volumes.filter((v) => v.projectId === projectId).sort((a, b) => a.order - b.order),
    [volumes, projectId],
  );

  const projectChapters = useMemo(
    () =>
      chapters
        .filter((c) => c.projectId === projectId)
        .sort((a, b) => a.order - b.order),
    [chapters, projectId],
  );

  /** 卷 + 未分卷的分组列表（保持卷顺序，未分卷在最后） */
  const groups = useMemo(() => {
    const list: { key: string; title: string | null; chapters: Chapter[] }[] =
      projectVolumes.map((v) => ({
        key: v.id,
        title: v.title,
        chapters: projectChapters.filter((c) => c.volumeId === v.id),
      }));
    const unassigned = projectChapters.filter((c) => c.volumeId === null);
    if (unassigned.length > 0 || list.length === 0) {
      list.push({ key: "__unassigned", title: null, chapters: unassigned });
    }
    return list;
  }, [projectVolumes, projectChapters]);

  const handleAdd = () => {
    const title = newTitle.trim();
    if (!title || !addTarget) return;
    addChapter({
      projectId,
      volumeId: addTarget.volumeId,
      title,
      content: "",
      summary: "",
      status: "draft",
      order: projectChapters.reduce((max, c) => Math.max(max, c.order), -1) + 1,
    });
    setNewTitle("");
    setAddTarget(null);
  };

  const toggleGroup = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

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

  const renderAddInput = () =>
    addTarget && (
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
              setAddTarget(null);
            }
          }}
          onBlur={() => {
            if (newTitle.trim()) handleAdd();
            else setAddTarget(null);
          }}
          placeholder="输入章节标题…"
        />
      </div>
    );

  const renderChapterRow = (chapter: Chapter, index: number) => {
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
            void deleteChapterCascade(projectId, chapter.id);
          }}
        >
          <Trash2 size={12} />
        </Button>
      </div>
    );
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
          onClick={() => {
            setNewTitle("");
            setAddTarget({ volumeId: null });
          }}
        >
          <Plus size={14} />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-1.5">
        {projectChapters.length === 0 && !addTarget ? (
          <EmptyState
            size="sm"
            icon={FileText}
            title="暂无章节"
            description="新建章节后即可开始写作"
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setNewTitle("");
                  setAddTarget({ volumeId: null });
                }}
              >
                <Plus size={13} />
                新建章节
              </Button>
            }
            className="py-10"
          />
        ) : (
          <div className="space-y-1.5">
            {groups.map((group) => {
              const isOpen = !collapsed.has(group.key);
              const isUnassigned = group.title === null;
              return (
                <div key={group.key}>
                  <div className="flex items-center gap-1 px-1.5 py-1">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-label={isOpen ? "折叠分组" : "展开分组"}
                      onClick={() => toggleGroup(group.key)}
                      className="flex min-w-0 flex-1 items-center gap-1 rounded text-left text-[11px] font-medium text-ink-3 hover:text-ink-2"
                    >
                      {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      <span className="truncate">{isUnassigned ? "未分卷" : group.title}</span>
                      <span className="tabular-nums">{group.chapters.length}</span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="向此分组添加章节"
                      className="h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={() => {
                        setNewTitle("");
                        setAddTarget({ volumeId: isUnassigned ? null : group.key });
                      }}
                    >
                      <Plus size={12} />
                    </Button>
                  </div>

                  {isOpen && (
                    <div className="space-y-0.5">
                      {group.chapters.length > 0 ? (
                        group.chapters.map((c, i) => renderChapterRow(c, i))
                      ) : (
                        <p className="px-3 py-1.5 text-[11px] text-ink-3">
                          {isUnassigned ? "暂无未分卷章节" : "空卷"}
                        </p>
                      )}
                    </div>
                  )}
                  {addTarget?.volumeId === (isUnassigned ? null : group.key) &&
                    renderAddInput()}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
