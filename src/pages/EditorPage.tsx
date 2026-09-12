import { useState, useCallback, useMemo, useRef } from "react";
import {
  BarChart3,
  BookOpen,
  Check,
  Download,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { NewProjectDialog, NewProject } from "../components/dialog";
import { useProjectStore } from "../stores/projectStore";
import { useChapterStore, Chapter } from "../stores/chapterStore";
import { Editor, type EditorRef } from "../components/editor";
import { AIPanel } from "../components/ai";
import { ChapterList } from "../components/chapter";
import { ExportService, saveChapter, titleToFilename } from "../services";
import { useAutoSave } from "../hooks";
import { useSettingsStore } from "../stores/settingsStore";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
  Page,
  PageBody,
  PageHeader,
  WordStats,
} from "../components/ui";

const genreLabels: Record<string, string> = {
  fantasy: "玄幻",
  urban: "都市",
  suspense: "悬疑",
  scifi: "科幻",
  romance: "言情",
  historical: "历史",
  other: "其他",
};

export function EditorPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const editorRef = useRef<EditorRef>(null);
  const { projects, currentProject, addProject, setCurrentProject, deleteProject } =
    useProjectStore();
  const {
    chapters,
    currentChapter,
    setCurrentChapter,
    updateContent: updateChapterContent,
  } = useChapterStore();

  const { editor } = useSettingsStore();

  const handleSave = useCallback(async () => {
    if (!currentChapter || !currentProject) return;

    setLastSaved(new Date());

    // 保存到磁盘
    if (currentProject.storagePath) {
      try {
        const filename = titleToFilename(currentChapter.title, currentChapter.order);
        await saveChapter(currentProject.storagePath, filename, currentChapter.content);
      } catch (err) {
        console.error("Failed to save chapter to disk:", err);
      }
    }
  }, [currentChapter, currentProject]);

  const { saveNow } = useAutoSave({
    data: currentChapter,
    onSave: handleSave,
    interval: editor.autoSaveInterval,
    enabled: !!currentChapter && editor.autoSaveEnabled,
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

  const handleExport = async (format: "txt" | "markdown" | "html" | "docx") => {
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

  const handleExportAll = async (format: "txt" | "markdown" | "html" | "docx") => {
    if (!currentProject) return;
    await ExportService.exportProject(currentProject.id, format);
  };

  /* ================= 项目列表 ================= */
  if (!currentProject) {
    return (
      <Page>
        <PageHeader
          title="我的项目"
          description={projects.length > 0 ? `共 ${projects.length} 个项目` : "开始你的第一部作品"}
          actions={
            <Button variant="primary" onClick={() => setDialogOpen(true)}>
              <Plus size={15} />
              新建项目
            </Button>
          }
        />

        <PageBody center>
          {projects.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="还没有项目"
              description="创建第一个项目，开始你的故事。"
              action={
                <Button variant="primary" size="lg" onClick={() => setDialogOpen(true)}>
                  <Plus size={16} />
                  创建第一个项目
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  interactive
                  className="group relative flex flex-col"
                  onClick={() => setCurrentProject(project)}
                >
                  <div className="flex items-start justify-between gap-2 pr-6">
                    <h3 className="truncate text-sm font-medium text-ink">{project.title}</h3>
                  </div>

                  <p className="mt-0.5 text-[12px] text-ink-3">
                    {project.author ? `作者：${project.author}` : "未署名"}
                  </p>

                  {project.genre && (
                    <Badge variant="primary" size="sm" className="mt-2 w-fit">
                      {genreLabels[project.genre] ?? project.genre}
                    </Badge>
                  )}

                  {project.synopsis && (
                    <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-ink-2">
                      {project.synopsis}
                    </p>
                  )}

                  <div className="mt-auto pt-3 text-[11px] text-ink-3">
                    创建于 {new Date(project.createdAt).toLocaleDateString()}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`删除 ${project.title}`}
                    className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-danger-soft hover:text-danger focus-visible:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProject(project.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </PageBody>

        <NewProjectDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreateProject={handleCreateProject}
        />
      </Page>
    );
  }

  /* ================= 写作界面 ================= */
  return (
    <Page>
      <PageHeader
        leading={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={sidebarOpen ? "收起章节栏" : "展开章节栏"}
            aria-pressed={sidebarOpen}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </Button>
        }
        title={currentProject.title}
        description={currentProject.author ? `作者：${currentProject.author}` : undefined}
        actions={
          <>
            {lastSaved && (
              <span className="hidden items-center gap-1 text-[12px] text-ink-3 xl:flex">
                <Check size={12} className="text-success" aria-hidden />
                已保存 {lastSaved.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant={showStats ? "primary" : "secondary"}
              onClick={() => setShowStats(!showStats)}
              aria-pressed={showStats}
            >
              <BarChart3 size={15} />
              统计
            </Button>
            <Button
              variant={aiPanelOpen ? "primary" : "secondary"}
              onClick={() => setAiPanelOpen(!aiPanelOpen)}
              aria-pressed={aiPanelOpen}
            >
              <Sparkles size={15} />
              AI
            </Button>

            <Menu>
              <MenuTrigger asChild>
                <Button variant="primary">
                  <Download size={15} />
                  导出
                </Button>
              </MenuTrigger>
              <MenuContent>
                <MenuLabel>当前章节</MenuLabel>
                <MenuItem onSelect={() => handleExport("markdown")}>导出 Markdown</MenuItem>
                <MenuItem onSelect={() => handleExport("txt")}>导出 TXT</MenuItem>
                <MenuItem onSelect={() => handleExport("html")}>导出 HTML</MenuItem>
                <MenuItem onSelect={() => handleExport("docx")}>导出 DOCX</MenuItem>
                <MenuSeparator />
                <MenuLabel>整个项目</MenuLabel>
                <MenuItem onSelect={() => handleExportAll("markdown")}>批量导出 Markdown</MenuItem>
                <MenuItem onSelect={() => handleExportAll("txt")}>批量导出 TXT</MenuItem>
                <MenuItem onSelect={() => handleExportAll("html")}>批量导出 HTML</MenuItem>
                <MenuItem onSelect={() => handleExportAll("docx")}>批量导出 DOCX</MenuItem>
              </MenuContent>
            </Menu>

            <Button
              variant="ghost"
              onClick={() => {
                setCurrentProject(null);
                setCurrentChapter(null);
              }}
            >
              返回列表
            </Button>
          </>
        }
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {sidebarOpen && (
          <div className="w-56 shrink-0 border-r border-line">
            <ChapterList
              projectId={currentProject.id}
              onSelectChapter={handleSelectChapter}
              currentChapterId={currentChapter?.id}
            />
          </div>
        )}

        {showStats && (
          <div className="w-64 shrink-0 overflow-auto border-r border-line bg-canvas p-4">
            <WordStats
              totalWords={stats.totalWords}
              chapterWords={stats.chapterWords}
              targetWords={100000}
              averageWordsPerChapter={stats.averageWordsPerChapter}
            />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {currentChapter ? (
            <>
              <Editor
                ref={editorRef}
                content={currentChapter.content}
                placeholder={`开始写作 ${currentChapter.title}…`}
                onUpdate={(content) => updateChapterContent(currentChapter.id, content)}
                onSelectionUpdate={setSelectedText}
              />

              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas px-5 py-2 text-[12px] text-ink-3">
                <div className="flex items-center gap-5">
                  <span>
                    本章 <span className="tabular-nums text-ink-2">{stats.chapterWords}</span> 字
                  </span>
                  <span>
                    全书 <span className="tabular-nums text-ink-2">{stats.totalWords}</span> 字
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => saveNow()}
                    className="h-6 gap-1 text-xs"
                  >
                    <Save size={12} />
                    保存
                  </Button>
                  <div className="h-3 w-px bg-line" />
                  {lastSaved ? (
                    <>
                      <Check size={12} className="text-success" aria-hidden />
                      <span>已保存 {lastSaved.toLocaleTimeString()}</span>
                    </>
                  ) : (
                    <span>自动保存已开启</span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              icon={FileText}
              title="选择一个章节开始写作"
              description="在左侧章节栏中选择，或新建一个章节。"
            />
          )}
        </div>

        {aiPanelOpen && currentChapter && (
          <AIPanel
            editor={editorRef.current?.getEditor() ?? null}
            selectedText={selectedText}
            chapterContent={currentChapter.content}
          />
        )}
      </div>
    </Page>
  );
}
