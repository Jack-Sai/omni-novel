import { useState, useMemo, useCallback } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react";
import { useOutlineStore } from "../stores/outlineStore";
import { useProjectStore } from "../stores/projectStore";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Page,
  PageBody,
  PageHeader,
  type BadgeVariant,
} from "../components/ui";

const statusMap: Record<string, { label: string; tone: BadgeVariant }> = {
  completed: { label: "已完成", tone: "success" },
  writing: { label: "写作中", tone: "warning" },
  draft: { label: "草稿", tone: "neutral" },
};

export function OutlinePage() {
  const { currentProject } = useProjectStore();
  const { volumes, addVolume, deleteVolume, addChapter, deleteChapter, addScene, deleteScene } =
    useOutlineStore();
  const [expandedVolumes, setExpandedVolumes] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [showAddVolume, setShowAddVolume] = useState(false);
  const [showAddChapter, setShowAddChapter] = useState<string | null>(null);
  const [showAddScene, setShowAddScene] = useState<{
    volumeId: string;
    chapterId: string;
  } | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const projectVolumes = useMemo(
    () =>
      currentProject
        ? volumes.filter((v) => v.projectId === currentProject.id).sort((a, b) => a.order - b.order)
        : [],
    [volumes, currentProject],
  );

  const toggleVolume = useCallback((id: string) => {
    setExpandedVolumes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleChapter = useCallback((id: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleAddVolume = useCallback(() => {
    if (!newTitle.trim() || !currentProject) return;
    addVolume(currentProject.id, newTitle.trim());
    setNewTitle("");
    setShowAddVolume(false);
  }, [newTitle, currentProject, addVolume]);

  const handleAddChapter = useCallback(
    (volumeId: string) => {
      if (!newTitle.trim()) return;
      addChapter(volumeId, newTitle.trim());
      setNewTitle("");
      setShowAddChapter(null);
    },
    [newTitle, addChapter],
  );

  const handleAddScene = useCallback(
    (volumeId: string, chapterId: string) => {
      if (!newTitle.trim()) return;
      addScene(volumeId, chapterId, newTitle.trim());
      setNewTitle("");
      setShowAddScene(null);
    },
    [newTitle, addScene],
  );

  /* ---------------- 未选择项目 ---------------- */
  if (!currentProject) {
    return (
      <Page>
        <PageHeader title="大纲管理" />
        <PageBody>
          <EmptyState
            icon={BookOpen}
            title="请先选择一个项目"
            description="在编辑器中打开或创建一个项目后，即可梳理卷、章、场景结构。"
          />
        </PageBody>
      </Page>
    );
  }

  const chapterCount = projectVolumes.reduce((sum, v) => sum + v.chapters.length, 0);

  return (
    <Page>
      <PageHeader
        title="大纲管理"
        description={`${projectVolumes.length} 卷 · ${chapterCount} 章`}
        actions={
          <Button variant="primary" onClick={() => setShowAddVolume(true)}>
            <Plus size={15} />
            添加卷
          </Button>
        }
      />

      <PageBody>
        <div className="space-y-3">
          {showAddVolume && (
            <Card className="omni-pop flex flex-wrap items-center gap-2">
              <Input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddVolume();
                  if (e.key === "Escape") setShowAddVolume(false);
                }}
                placeholder="输入卷名，回车创建"
                className="min-w-40 flex-1"
              />
              <Button variant="primary" onClick={handleAddVolume} disabled={!newTitle.trim()}>
                添加
              </Button>
              <Button variant="ghost" onClick={() => setShowAddVolume(false)}>
                取消
              </Button>
            </Card>
          )}

          {projectVolumes.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="还没有大纲"
              description="先立卷，再拆章，最后落到场景 —— 长篇小说不容易跑偏。"
              action={
                <Button variant="primary" onClick={() => setShowAddVolume(true)}>
                  <Plus size={15} />
                  添加第一卷
                </Button>
              }
              className="py-16"
            />
          ) : (
            projectVolumes.map((volume) => {
              const volumeOpen = expandedVolumes.has(volume.id);

              return (
                <Card key={volume.id} padded={false} className="overflow-hidden">
                  {/* 卷头 */}
                  <div className="group flex items-center gap-2 px-3 py-2.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={volumeOpen ? "折叠" : "展开"}
                      aria-expanded={volumeOpen}
                      onClick={() => toggleVolume(volume.id)}
                    >
                      {volumeOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </Button>
                    <BookOpen size={15} className="shrink-0 text-ink-3" aria-hidden />
                    <span className="truncate text-sm font-medium text-ink">{volume.title}</span>
                    <span className="shrink-0 text-[12px] tabular-nums text-ink-3">
                      {volume.chapters.length} 章
                    </span>

                    <div className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="添加章节"
                        onClick={() => setShowAddChapter(volume.id)}
                      >
                        <Plus size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="删除卷"
                        className="hover:bg-danger-soft hover:text-danger"
                        onClick={() => deleteVolume(volume.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  {/* 新增章节 */}
                  {showAddChapter === volume.id && (
                    <div className="omni-pop border-t border-line bg-subtle px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          autoFocus
                          inputSize="sm"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddChapter(volume.id);
                            if (e.key === "Escape") setShowAddChapter(null);
                          }}
                          placeholder="输入章节标题，回车创建"
                          className="min-w-40 flex-1"
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAddChapter(volume.id)}
                          disabled={!newTitle.trim()}
                        >
                          添加
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setShowAddChapter(null)}>
                          取消
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* 章节列表 */}
                  {volumeOpen && volume.chapters.length > 0 && (
                    <div className="border-t border-line px-3 py-2.5">
                      <div className="space-y-0.5">
                        {volume.chapters.map((chapter, index) => {
                          const chapterOpen = expandedChapters.has(chapter.id);
                          const status = statusMap[chapter.status] ?? statusMap.draft;

                          return (
                            <div key={chapter.id}>
                              <div className="group/ch flex items-center gap-2.5 rounded-lg py-2 pl-7 pr-2 transition-colors hover:bg-hover">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={chapterOpen ? "折叠" : "展开"}
                                  aria-expanded={chapterOpen}
                                  onClick={() => toggleChapter(chapter.id)}
                                  className="h-6 w-6"
                                >
                                  {chapterOpen ? (
                                    <ChevronDown size={13} />
                                  ) : (
                                    <ChevronRight size={13} />
                                  )}
                                </Button>
                                <span className="w-10 shrink-0 text-[12px] tabular-nums text-ink-3">
                                  第 {index + 1} 章
                                </span>
                                <FileText size={14} className="shrink-0 text-ink-3" aria-hidden />
                                <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                                  {chapter.title}
                                </span>
                                <Badge variant={status.tone} size="sm">
                                  {status.label}
                                </Badge>

                                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/ch:opacity-100 focus-within:opacity-100">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="添加场景"
                                    className="h-6 w-6"
                                    onClick={() =>
                                      setShowAddScene({
                                        volumeId: volume.id,
                                        chapterId: chapter.id,
                                      })
                                    }
                                  >
                                    <Plus size={12} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="删除章节"
                                    className="h-6 w-6 hover:bg-danger-soft hover:text-danger"
                                    onClick={() => deleteChapter(volume.id, chapter.id)}
                                  >
                                    <Trash2 size={12} />
                                  </Button>
                                </div>
                              </div>

                              {/* 新增场景 */}
                              {showAddScene?.volumeId === volume.id &&
                                showAddScene.chapterId === chapter.id && (
                                  <div className="omni-pop ml-14 mt-1.5 flex flex-wrap items-center gap-2 pb-1.5">
                                    <Input
                                      autoFocus
                                      inputSize="sm"
                                      value={newTitle}
                                      onChange={(e) => setNewTitle(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter")
                                          handleAddScene(volume.id, chapter.id);
                                        if (e.key === "Escape") setShowAddScene(null);
                                      }}
                                      placeholder="输入场景标题，回车创建"
                                      className="min-w-36 flex-1"
                                    />
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => handleAddScene(volume.id, chapter.id)}
                                      disabled={!newTitle.trim()}
                                    >
                                      添加
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setShowAddScene(null)}
                                    >
                                      取消
                                    </Button>
                                  </div>
                                )}

                              {/* 场景列表 */}
                              {chapterOpen && chapter.scenes.length > 0 && (
                                <div className="ml-14 space-y-0.5 border-l border-line py-1.5 pl-4">
                                  {chapter.scenes.map((scene, sceneIndex) => (
                                    <div
                                      key={scene.id}
                                      className="group/sc flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-hover"
                                    >
                                      <MapPin
                                        size={12}
                                        className="shrink-0 text-ink-3"
                                        aria-hidden
                                      />
                                      <span className="min-w-0 flex-1 truncate text-[12px] text-ink-2">
                                        场景 {sceneIndex + 1}：{scene.title}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label="删除场景"
                                        className="h-5 w-5 opacity-0 transition-opacity group-hover/sc:opacity-100 hover:bg-danger-soft hover:text-danger focus-visible:opacity-100"
                                        onClick={() =>
                                          deleteScene(volume.id, chapter.id, scene.id)
                                        }
                                      >
                                        <Trash2 size={11} />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </PageBody>
    </Page>
  );
}
