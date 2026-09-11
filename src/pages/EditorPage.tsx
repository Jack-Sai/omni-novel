import { useState, useCallback, useMemo } from "react";
import { Plus, BookOpen, Trash2, Download, PanelLeftOpen, PanelLeftClose, Check, BarChart3, Settings } from "lucide-react";
import { NewProjectDialog, NewProject, ProjectSettings } from "../components/dialog";
import { useProjectStore } from "../stores/projectStore";
import { useChapterStore, Chapter } from "../stores/chapterStore";
import { Editor } from "../components/editor";
import { ChapterList } from "../components/chapter";
import { ExportService } from "../services";
import { useAutoSave } from "../hooks";
import { WordStats } from "../components/ui";

export function EditorPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showStats, setShowStats] = useState(false);
  const { projects, currentProject, addProject, setCurrentProject, deleteProject } = useProjectStore();
  const { chapters, currentChapter, setCurrentChapter, updateContent: updateChapterContent } = useChapterStore();

  const handleSave = useCallback(() => {
    setLastSaved(new Date());
  }, []);

  const { saveNow: _saveNow } = useAutoSave({
    data: currentChapter,
    onSave: handleSave,
    interval: 30000,
    enabled: !!currentChapter,
  });

  const stats = useMemo(() => {
    if (!currentProject) {
      return { totalWords: 0, chapterWords: 0, averageWordsPerChapter: 0 };
    }

    const projectChapters = chapters.filter((c) => c.projectId === currentProject.id);
    const totalWords = projectChapters.reduce((sum, c) => {
      const text = c.content.replace(/<[^>]*>/g, "").replace(/\s/g, "");
      return sum + text.length;
    }, 0);

    const chapterWords = currentChapter
      ? currentChapter.content.replace(/<[^>]*>/g, "").replace(/\s/g, "").length
      : 0;

    const averageWordsPerChapter =
      projectChapters.length > 0 ? Math.round(totalWords / projectChapters.length) : 0;

    return { totalWords, chapterWords, averageWordsPerChapter };
  }, [currentProject, chapters, currentChapter]);

  const handleCreateProject = (project: NewProject) => {
    addProject(project);
  };

  const handleSelectChapter = (chapter: Chapter) => {
    setCurrentChapter(chapter);
  };

  const handleExport = async (format: "txt" | "markdown") => {
    const content = currentChapter?.content || currentProject?.content || "";
    if (!content) return;

    await ExportService.exportToFile({
      format,
      filename: currentChapter?.title || currentProject?.title || "未命名",
      content,
      title: currentChapter?.title || currentProject?.title,
      author: currentProject?.author,
    });
  };

  if (!currentProject) {
    return (
      <div className="flex h-full flex-col p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">我的项目</h1>
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white transition hover:bg-[var(--color-primary-hover)]"
          >
            <Plus size={18} />
            新建项目
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <BookOpen size={48} className="text-[var(--color-text-secondary)]" />
            <p className="text-[var(--color-text-secondary)]">还没有项目，开始创建吧</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group relative cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 transition hover:border-[var(--color-primary)]"
                onClick={() => setCurrentProject(project)}
              >
                <h3 className="mb-2 text-lg font-semibold">{project.title}</h3>
                {project.author && (
                  <p className="mb-1 text-sm text-[var(--color-text-secondary)]">作者：{project.author}</p>
                )}
                {project.genre && (
                  <span className="mb-2 inline-block rounded-full bg-[var(--color-primary-light)] px-2 py-0.5 text-xs text-[var(--color-primary)]">
                    {project.genre}
                  </span>
                )}
                {project.synopsis && (
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--color-text-secondary)]">
                    {project.synopsis}
                  </p>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteProject(project.id);
                  }}
                  className="absolute right-2 top-2 rounded p-1 text-[var(--color-text-secondary)] opacity-0 transition hover:bg-red-100 hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <NewProjectDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreateProject={handleCreateProject}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--color-border)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
            >
              {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
            <div>
              <h1 className="text-xl font-bold">{currentProject.title}</h1>
              {currentProject.author && (
                <p className="text-sm text-[var(--color-text-secondary)]">{currentProject.author}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStats(!showStats)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition ${
                showStats
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                  : "border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
              }`}
            >
              <BarChart3 size={16} />
              统计
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm transition hover:bg-[var(--color-bg-secondary)]"
            >
              <Settings size={16} />
              项目设置
            </button>
            <div className="relative group">
              <button className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm transition hover:bg-[var(--color-bg-secondary)]">
                <Download size={16} />
                导出
              </button>
              <div className="invisible group-hover:visible absolute right-0 top-full mt-1 w-36 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-1 shadow-lg z-10">
                <button
                  onClick={() => handleExport("markdown")}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-secondary)]"
                >
                  导出 Markdown
                </button>
                <button
                  onClick={() => handleExport("txt")}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-secondary)]"
                >
                  导出 TXT
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                setCurrentProject(null);
                setCurrentChapter(null);
              }}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm transition hover:bg-[var(--color-bg-secondary)]"
            >
              返回列表
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <div className="w-48 border-r border-[var(--color-border)]">
            <ChapterList
              projectId={currentProject.id}
              onSelectChapter={handleSelectChapter}
              currentChapterId={currentChapter?.id}
            />
          </div>
        )}

        {showStats && (
          <div className="w-64 border-r border-[var(--color-border)] p-4">
            <h3 className="mb-3 font-medium">字数统计</h3>
            <WordStats
              totalWords={stats.totalWords}
              chapterWords={stats.chapterWords}
              targetWords={100000}
              averageWordsPerChapter={stats.averageWordsPerChapter}
            />
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          {currentChapter ? (
            <div className="flex h-full flex-col">
              <Editor
                content={currentChapter.content}
                placeholder={`开始写作 ${currentChapter.title}...`}
                onUpdate={(content) => updateChapterContent(currentChapter.id, content)}
              />
              <div className="border-t border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-secondary)]">
                {lastSaved ? (
                  <span className="flex items-center gap-1">
                    <Check size={12} className="text-green-500" />
                    已保存 {lastSaved.toLocaleTimeString()}
                  </span>
                ) : (
                  <span>自动保存已开启</span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <BookOpen size={48} className="text-[var(--color-text-secondary)]" />
              <p className="text-[var(--color-text-secondary)]">选择一个章节开始写作</p>
            </div>
          )}
        </div>
      </div>

      <ProjectSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
