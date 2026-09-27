import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileText,
  History,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  MessageSquarePlus,
  MessageSquareText,
  PanelLeftOpen,
  Save,
  Sparkles,
} from "lucide-react";
import { VersionHistoryDialog } from "../components/dialog";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "../stores/projectStore";
import { useChapterStore, Chapter } from "../stores/chapterStore";
import { useCharacterStore, type Character } from "../stores/characterStore";
import { Editor, type EditorRef } from "../components/editor";
import {
  CHAR_HIGHLIGHT_CLICK_EVENT,
} from "../components/editor/characterHighlight";
import { CharacterPopover } from "../components/editor/CharacterPopover";
import { AIPanel, type AiQuickActionRequest } from "../components/ai";
import { AnnotationPanel } from "../components/annotations/AnnotationPanel";
import { AddAnnotationDialog } from "../components/annotations/AddAnnotationDialog";
import { AnnotationAIDialog } from "../components/annotations/AnnotationAIDialog";
import type { AnnotationAIAction } from "../services/annotationAIService";
import { ChapterList } from "../components/chapter";
import {
  ExportService,
  versionDb,
  loadProjectStores,
  builtinPromptList,
  getSystemPrompt,
} from "../services";
import { cn } from "../lib/cn";
import { buildAnnotationMarkdown, downloadAnnotationMarkdown } from "../lib/annotationExport";
import { buildIndex, flatToPm, type TextSeg } from "../components/editor/search";
import { useAnnotationStore, type Annotation, type AnnotationScope } from "../stores/annotationStore";
import { useAutoSave } from "../hooks";
import {
  noteActivity,
  startWritingTracker,
  stopWritingTracker,
} from "../services/writingTracker";
import { useSettingsStore } from "../stores/settingsStore";
import { useUIStore } from "../stores/uiStore";
import {
  Button,
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
  WritingInsights,
} from "../components/ui";

/** PM doc 位置 → 纯文本 flat 偏移（批注选区落库用） */
function pmToFlat(segs: TextSeg[], pos: number): number {
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i];
    if (pos >= s.docStart && pos <= s.docStart + s.length) {
      return s.textStart + (pos - s.docStart);
    }
  }
  return 0;
}

export function EditorPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [annotationPanelOpen, setAnnotationPanelOpen] = useState(false);
  const [addDlg, setAddDlg] = useState<{ scope: AnnotationScope; prefill?: { quote: string; textFrom: number | null; textTo: number | null } } | null>(null);
  const [aiDlg, setAiDlg] = useState<AnnotationAIAction | null>(null);
  const [locateReq, setLocateReq] = useState<{ id: string; chapterId: string | null; quote: string; textFrom: number | null } | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  /** 选区浮层位置（视口坐标） */
  const [selectionPos, setSelectionPos] = useState<{ x: number; y: number } | null>(null);
  /** 「问 AI」预填输入 */
  const [askAiPrefill, setAskAiPrefill] = useState("");
  /** 选区浮层触发的 AI 快捷操作请求（AIPanel 消费后清空） */
  const [aiQuickAction, setAiQuickAction] = useState<{
    id: number;
    request: AiQuickActionRequest;
  } | null>(null);
  /** 专注模式：隐藏顶栏、侧栏与 AI 面板 */
  const [focusMode, setFocusMode] = useState(false);
  const editorRef = useRef<EditorRef>(null);
  const navigate = useNavigate();
  const { projects, currentProject, setCurrentProject } = useProjectStore();
  const {
    chapters,
    currentChapter,
    setCurrentChapter,
    updateContent: updateChapterContent,
  } = useChapterStore();

  const { editor } = useSettingsStore();

  /** 人名高亮点击弹出的人物速览 */
  const [charPopover, setCharPopover] = useState<{
    character: Character;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const { characterId, clientX, clientY } = (e as CustomEvent).detail as {
        characterId: string;
        clientX: number;
        clientY: number;
      };
      const c = useCharacterStore.getState().characters.find((x) => x.id === characterId);
      if (c) setCharPopover({ character: c, x: clientX, y: clientY });
    };
    window.addEventListener(CHAR_HIGHLIGHT_CLICK_EVENT, handler);
    return () => window.removeEventListener(CHAR_HIGHLIGHT_CLICK_EVENT, handler);
  }, []);

  // 切换/新建章节时清理选区浮层，避免残留浮层拦截编辑器点击
  useEffect(() => {
    setSelectedText("");
    setSelectionPos(null);
  }, [currentChapter?.id]);

  // 写作时长/热力图追踪：编辑器页挂载期间按项目启停（writingTracker 30s 心跳）
  const trackerProjectId = currentProject?.id;
  useEffect(() => {
    if (!trackerProjectId) return;
    startWritingTracker(trackerProjectId);
    return () => stopWritingTracker();
  }, [trackerProjectId]);

  // 跨页定位章节（一致性报告「定位章节」等）：检测到 pending id 时打开对应章节并清空
  useEffect(() => {
    const pending = useUIStore.getState().pendingOpenChapterId;
    if (!pending) return;
    const target = chapters.find((c) => c.id === pending);
    if (target) {
      setCurrentChapter(target);
      useUIStore.getState().setPendingOpenChapterId(null);
    }
  }, [chapters, setCurrentChapter]);
  // 批注跳转定位：切章 → 编辑器重建后选中 quote 并滚动
  useEffect(() => {
    if (!locateReq) return;
    if (locateReq.chapterId !== currentChapter?.id) {
      // 目标章不存在则放弃（已删除）
      if (locateReq.chapterId && !chapters.some((c) => c.id === locateReq.chapterId)) {
        setLocateReq(null);
      }
      return;
    }
    const ed = editorRef.current?.getEditor();
    if (!ed) return;
    const timer = requestAnimationFrame(() => {
      try {
        if (locateReq.quote) {
          const index = buildIndex(ed.state.doc);
          let pos = -1;
          if (
            locateReq.textFrom != null &&
            index.full.slice(locateReq.textFrom, locateReq.textFrom + locateReq.quote.length) ===
              locateReq.quote
          ) {
            pos = locateReq.textFrom;
          }
          if (pos < 0) pos = index.full.indexOf(locateReq.quote);
          if (pos >= 0) {
            const from = flatToPm(index.segs, pos);
            const to = flatToPm(index.segs, pos + locateReq.quote.length);
            ed.chain().setTextSelection({ from, to }).scrollIntoView().run();
          }
        }
      } catch (e) {
        console.warn("批注定位失败:", e);
      }
      setLocateReq(null);
    });
    return () => cancelAnimationFrame(timer);
  }, [locateReq, currentChapter?.id, chapters]);

  const handleSave = useCallback(async () => {
    if (!currentChapter || !currentProject) return;

    setLastSaved(new Date());

    // 自动版本快照（内容无变化时 versionDb 内部跳过）
    try {
      await versionDb.create(currentProject.id, currentChapter.id, {
        content: currentChapter.content,
        source: "auto",
      });
    } catch (err) {
      console.warn("创建版本快照失败:", err);
    }
  }, [currentChapter, currentProject]);

  /** 恢复历史版本：先把当前内容快照（source=restore），再写回编辑器 */
  const handleRestoreVersion = useCallback(
    async (content: string) => {
      if (!currentChapter || !currentProject) return;
      try {
        await versionDb.create(currentProject.id, currentChapter.id, {
          title: "恢复前备份",
          content: currentChapter.content,
          source: "restore",
        });
      } catch (err) {
        console.warn("恢复前快照失败:", err);
      }
      updateChapterContent(currentChapter.id, content);
      editorRef.current?.getEditor()?.commands.setContent(content);
      setVersionDialogOpen(false);
    },
    [currentChapter, currentProject, updateChapterContent],
  );

  const { saveNow } = useAutoSave({
    data: currentChapter,
    onSave: handleSave,
    interval: editor.autoSaveInterval,
    enabled: !!currentChapter && editor.autoSaveEnabled,
    key: currentChapter?.id ?? null,
  });

  // 打字机滚动：输入后把光标行滚到编辑器视口中部（rAF 节流）
  const typewriterRafRef = useRef<number | null>(null);
  const handleEditorUpdate = useCallback(
    (content: string) => {
      noteActivity();
      if (!currentChapter) return;
      updateChapterContent(currentChapter.id, content);
      if (!editor.typewriterScroll) return;
      if (typewriterRafRef.current !== null) return;
      typewriterRafRef.current = requestAnimationFrame(() => {
        typewriterRafRef.current = null;
        const ed = editorRef.current?.getEditor();
        if (!ed) return;
        try {
          const node = ed.view.domAtPos(ed.state.selection.head).node;
          const el = node instanceof Element ? node : node.parentElement;
          el?.scrollIntoView({ block: "center" });
        } catch {
          // 光标节点不可用时忽略
        }
      });
    },
    [currentChapter, editor.typewriterScroll, updateChapterContent],
  );

  // 快捷键：Ctrl+S 保存、专注模式下 Esc 退出
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveNow();
      }
      if (e.key === "Escape" && focusMode) {
        setFocusMode(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (typewriterRafRef.current !== null) {
        cancelAnimationFrame(typewriterRafRef.current);
        typewriterRafRef.current = null;
      }
    };
  }, [saveNow, focusMode]);

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

  const targetProgress = useMemo(() => {
    if (!editor.chapterWordTarget) return null;
    const pct = Math.min(100, Math.round((stats.chapterWords / editor.chapterWordTarget) * 100));
    return { pct, over: stats.chapterWords > editor.chapterWordTarget };
  }, [stats.chapterWords, editor.chapterWordTarget]);

  const handleSelectChapter = (chapter: Chapter) => {
    setCurrentChapter(chapter);
  };

  /** 选区变化：记录文字并把浮层锚到选区末尾（视口坐标） */
  const handleSelectionUpdate = useCallback((text: string) => {
    setSelectedText(text);
    const ed = editorRef.current?.getEditor();
    if (!text || !ed) {
      setSelectionPos(null);
      return;
    }
    try {
      const { to } = ed.state.selection;
      const coords = ed.view.coordsAtPos(to);
      setSelectionPos({ x: coords.left, y: coords.top });
    } catch {
      setSelectionPos(null);
    }
  }, []);

  const handleCopySelection = async () => {
    try {
      await navigator.clipboard.writeText(selectedText);
    } catch (e) {
      console.warn("复制选区失败:", e);
    }
  };

  const handleAskAi = () => {
    setFocusMode(false); // 专注模式下面板被隐藏，先退出以确保请求被消费
    setAiPanelOpen(true);
    setAskAiPrefill(
      `请分析这段文字并给出改进建议（结构、节奏、画面感）：\n\n${selectedText.slice(0, 800)}`,
    );
    setSelectionPos(null);
  };

  /** 选区浮层点 AI 按钮：打开面板并触发对应快捷操作 */
  const handleFloatAiAction = (request: AiQuickActionRequest) => {
    setFocusMode(false); // 专注模式下面板被隐藏，先退出以确保请求被消费
    setAiPanelOpen(true);
    setAiQuickAction({ id: Date.now(), request });
    setSelectionPos(null);
  };

  /** 选区浮层「批注」：按当前选区创建文本批注 */
  const handleAnnotateSelection = () => {
    const ed = editorRef.current?.getEditor();
    if (!ed || !currentChapter || !currentProject) return;
    const { from, to } = ed.state.selection;
    const index = buildIndex(ed.state.doc);
    setAddDlg({
      scope: "text",
      prefill: {
        quote: selectedText,
        textFrom: pmToFlat(index.segs, from),
        textTo: pmToFlat(index.segs, to),
      },
    });
    setSelectionPos(null);
  };

  /** 批注卡片点击：激活高亮 + 必要时切章 + 文本级选中定位 */
  const handleLocateAnnotation = (a: Annotation) => {
    useAnnotationStore.getState().setActiveId(a.id);
    if (a.chapterId && a.chapterId !== currentChapter?.id) {
      const target = chapters.find((c) => c.id === a.chapterId);
      if (target) setCurrentChapter(target);
    }
    if (a.scope !== "text") return;
    setLocateReq({
      id: a.id,
      chapterId: a.chapterId,
      quote: a.quote,
      textFrom: a.textFrom,
    });
  };

  /** 导出全部批注为 Markdown */
  const handleExportAnnotations = () => {
    if (!currentProject) return;
    const anns = useAnnotationStore.getState().getByProject(currentProject.id);
    if (anns.length === 0) {
      window.alert("暂无批注可导出");
      return;
    }
    const md = buildAnnotationMarkdown(currentProject.title, anns, chapters);
    downloadAnnotationMarkdown(`${currentProject.title}-批注`, md);
  };

  const handleExport = async (format: "txt" | "markdown" | "html" | "docx" | "epub") => {
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

  const handleExportAll = async (format: "txt" | "markdown" | "html" | "docx" | "epub") => {
    if (!currentProject) return;
    await ExportService.exportProject(currentProject.id, format);
  };

  /* ================= 未打开项目 ================= */
  if (!currentProject) {
    return (
      <Page>
        <PageHeader title="编辑器" description="未打开任何项目" />

        <PageBody center>
          <EmptyState
            icon={BookOpen}
            title="尚未打开项目"
            description={
              projects.length > 0
                ? "请先在书架打开一个项目，再进入编辑器写作。"
                : "还没有任何项目，先去书架创建一部作品吧。"
            }
            action={
              <Button
                variant="primary"
                size="lg"
                onClick={() => void navigate("/bookshelf")}
              >
                <BookOpen size={16} />
                前往书架
              </Button>
            }
          />
        </PageBody>
      </Page>
    );
  }

  /* ================= 写作界面 ================= */
  return (
    <Page>
      {!focusMode && (
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
              variant="secondary"
              disabled={!currentChapter}
              onClick={() => setFocusMode(true)}
              title="专注模式（Esc 退出）"
            >
              <Minimize2 size={15} />
              专注
            </Button>
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
            <Button
              variant={annotationPanelOpen ? "primary" : "secondary"}
              onClick={() => setAnnotationPanelOpen(!annotationPanelOpen)}
              aria-pressed={annotationPanelOpen}
            >
              <MessageSquareText size={15} />
              批注
            </Button>

            <Button
              variant="secondary"
              disabled={!currentChapter}
              onClick={() => setVersionDialogOpen(true)}
              title="版本历史与对比"
            >
              <History size={15} />
              历史
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
                <MenuItem onSelect={() => handleExport("epub")}>导出 EPUB</MenuItem>
                <MenuSeparator />
                <MenuLabel>整个项目</MenuLabel>
                <MenuItem onSelect={() => handleExportAll("epub")}>导出整本 EPUB</MenuItem>
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
                // 清空项目级 store 并解除落盘目标
                void loadProjectStores("");
              }}
            >
              返回列表
            </Button>
          </>
        }
        >
      </PageHeader>
      )}

      {/* 专注模式浮动退出按钮 */}
      {focusMode && (
        <button
          type="button"
          onClick={() => setFocusMode(false)}
          title="退出专注（Esc）"
          className="fixed right-4 top-4 z-40 flex items-center gap-1.5 rounded-full border border-line bg-elevated/90 px-3 py-1.5 text-xs text-ink-2 shadow-md backdrop-blur transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-ring)]"
        >
          <Maximize2 size={13} />
          退出专注
        </button>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {sidebarOpen && !focusMode && (
          <div className="w-56 shrink-0 border-r border-line">
            <ChapterList
              projectId={currentProject.id}
              onSelectChapter={handleSelectChapter}
              currentChapterId={currentChapter?.id}
            />
          </div>
        )}

        {showStats && !focusMode && (
          <div className="w-64 shrink-0 overflow-auto border-r border-line bg-canvas p-4">
            <WordStats
              totalWords={stats.totalWords}
              chapterWords={stats.chapterWords}
              targetWords={100000}
              averageWordsPerChapter={stats.averageWordsPerChapter}
            />
            <WritingInsights projectId={currentProject.id} />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {currentChapter ? (
            <>
              <Editor
                key={currentChapter.id}
                chapterId={currentChapter.id}
                ref={editorRef}
                content={currentChapter.content}
                placeholder={`开始写作 ${currentChapter.title}…`}
                onUpdate={handleEditorUpdate}
                onSelectionUpdate={handleSelectionUpdate}
              />

              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas px-5 py-2 text-[12px] text-ink-3">
                <div className="flex items-center gap-5">
                  <span>
                    本章 <span className="tabular-nums text-ink-2">{stats.chapterWords}</span> 字
                  </span>
                  {targetProgress && (
                    <span className="flex items-center gap-2">
                      <span>
                        目标{" "}
                        <span className="tabular-nums text-ink-2">
                          {editor.chapterWordTarget}
                        </span>
                      </span>
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
                        <span
                          className={cn(
                            "block h-full rounded-full transition-all",
                            targetProgress.over ? "bg-success" : "bg-primary",
                          )}
                          style={{ width: `${targetProgress.pct}%` }}
                        />
                      </span>
                      <span className="tabular-nums text-ink-2">{targetProgress.pct}%</span>
                    </span>
                  )}
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

        {aiPanelOpen && !focusMode && currentChapter && (
          <AIPanel
            getEditor={() => editorRef.current?.getEditor() ?? null}
            selectedText={selectedText}
            chapterContent={currentChapter.content}
            onContentApplied={(html) => updateChapterContent(currentChapter.id, html)}
            prefill={askAiPrefill}
            onPrefillConsumed={() => setAskAiPrefill("")}
            quickActionRequest={aiQuickAction}
            onQuickActionConsumed={() => setAiQuickAction(null)}
          />
        )}

        {annotationPanelOpen && !focusMode && currentProject && (
          <AnnotationPanel
            projectId={currentProject.id}
            currentChapterId={currentChapter?.id ?? null}
            onLocate={handleLocateAnnotation}
            onAdd={(scope) => setAddDlg({ scope })}
            onRunAI={(action) => setAiDlg(action)}
            onExport={handleExportAnnotations}
            onClose={() => setAnnotationPanelOpen(false)}
          />
        )}
      </div>

      {/* 选区快捷浮层：复制 / 润色 扩写 缩写 / AI 菜单 / 问 AI */}
      {selectionPos && selectedText && !versionDialogOpen && (
        <div
          style={{ left: selectionPos.x, top: selectionPos.y }}
          className="fixed z-40 -translate-x-1/3 -translate-y-[calc(100%+8px)]"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-0.5 rounded-lg border border-line bg-elevated p-1 shadow-lg">
            <Button
              variant="ghost"
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleAnnotateSelection}
              className="h-7 gap-1 px-2 text-xs"
            >
              <MessageSquarePlus size={12} />
              批注
            </Button>            <Button
              variant="ghost"
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void handleCopySelection()}
              className="h-7 gap-1 px-2 text-xs"
            >
              <Copy size={12} />
              复制
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleFloatAiAction({ type: "quick", key: "polish" })}
              className="h-7 px-2 text-xs"
            >
              润色
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleFloatAiAction({ type: "quick", key: "expand" })}
              className="h-7 px-2 text-xs"
            >
              扩写
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleFloatAiAction({ type: "quick", key: "compress" })}
              className="h-7 px-2 text-xs"
            >
              缩写
            </Button>
            <Menu>
              <MenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onMouseDown={(e) => e.preventDefault()}
                  className="h-7 gap-0.5 px-2 text-xs"
                >
                  AI
                  <ChevronDown size={11} />
                </Button>
              </MenuTrigger>
              <MenuContent align="start" className="max-h-72 overflow-y-auto">
                <MenuItem
                  onSelect={() => handleFloatAiAction({ type: "quick", key: "continuation" })}
                >
                  续写
                </MenuItem>
                <MenuSeparator />
                {builtinPromptList
                  .filter(
                    (p) =>
                      !["continuation", "polish", "expand", "compress"].includes(p.key),
                  )
                  .map((p) => (
                    <MenuItem
                      key={p.key}
                      onSelect={() =>
                        handleFloatAiAction({
                          type: "prompt",
                          label: p.label,
                          systemPrompt: getSystemPrompt(p.key),
                        })
                      }
                    >
                      {p.label}
                    </MenuItem>
                  ))}
              </MenuContent>
            </Menu>
            <Button
              variant="primary"
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleAskAi}
              className="h-7 gap-1 px-2 text-xs"
            >
              <Sparkles size={12} />
              问 AI
            </Button>
          </div>
        </div>
      )}

      {currentProject && currentChapter && (
        <VersionHistoryDialog
          open={versionDialogOpen}
          onOpenChange={setVersionDialogOpen}
          projectId={currentProject.id}
          chapterId={currentChapter.id}
          chapterTitle={currentChapter.title}
          currentContent={currentChapter.content}
          onRestore={(content) => void handleRestoreVersion(content)}
        />
      )}

      {charPopover && (
        <CharacterPopover
          character={charPopover.character}
          x={charPopover.x}
          y={charPopover.y}
          onClose={() => setCharPopover(null)}
          onView={(c) => {
            setCharPopover(null);
            useCharacterStore.getState().setCurrentCharacter(c);
            void navigate("/characters");
          }}
        />
      )}
      {currentProject && addDlg && (
        <AddAnnotationDialog
          open
          onOpenChange={(o) => {
            if (!o) setAddDlg(null);
          }}
          projectId={currentProject.id}
          chapterId={addDlg.scope === "global" ? null : (currentChapter?.id ?? null)}
          scope={addDlg.scope}
          prefill={addDlg.prefill}
          onCreated={(id) => {
            useAnnotationStore.getState().setActiveId(id);
            setAnnotationPanelOpen(true);
          }}
        />
      )}

      {currentProject && aiDlg && currentChapter && (
        <AnnotationAIDialog
          open
          onOpenChange={(o) => {
            if (!o) setAiDlg(null);
          }}
          action={aiDlg}
          chapterId={currentChapter.id}
          onCreated={() => setAnnotationPanelOpen(true)}
        />
      )}
    </Page>
  );
}
