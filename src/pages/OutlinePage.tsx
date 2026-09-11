import { useState } from "react";
import { Plus, BookOpen, Trash2, ChevronDown, ChevronRight, FileText, MapPin } from "lucide-react";
import { useOutlineStore } from "../stores/outlineStore";
import { useProjectStore } from "../stores/projectStore";

export function OutlinePage() {
  const { currentProject } = useProjectStore();
  const {
    volumes,
    addVolume,
    deleteVolume,
    addChapter,
    deleteChapter,
    addScene,
    deleteScene,
  } = useOutlineStore();
  const [expandedVolumes, setExpandedVolumes] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [showAddVolume, setShowAddVolume] = useState(false);
  const [showAddChapter, setShowAddChapter] = useState<string | null>(null);
  const [showAddScene, setShowAddScene] = useState<{ volumeId: string; chapterId: string } | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const projectVolumes = currentProject
    ? volumes.filter((v) => v.projectId === currentProject.id).sort((a, b) => a.order - b.order)
    : [];

  const toggleVolume = (id: string) => {
    const newExpanded = new Set(expandedVolumes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedVolumes(newExpanded);
  };

  const toggleChapter = (id: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedChapters(newExpanded);
  };

  const handleAddVolume = () => {
    if (!newTitle.trim() || !currentProject) return;
    addVolume(currentProject.id, newTitle.trim());
    setNewTitle("");
    setShowAddVolume(false);
  };

  const handleAddChapter = (volumeId: string) => {
    if (!newTitle.trim()) return;
    addChapter(volumeId, newTitle.trim());
    setNewTitle("");
    setShowAddChapter(null);
  };

  const handleAddScene = (volumeId: string, chapterId: string) => {
    if (!newTitle.trim()) return;
    addScene(volumeId, chapterId, newTitle.trim());
    setNewTitle("");
    setShowAddScene(null);
  };

  if (!currentProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <BookOpen size={48} className="text-[var(--color-text-secondary)]" />
        <p className="text-[var(--color-text-secondary)]">请先选择一个项目</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">大纲管理</h1>
        <button
          onClick={() => setShowAddVolume(true)}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white transition hover:bg-[var(--color-primary-hover)]"
        >
          <Plus size={18} />
          添加卷
        </button>
      </div>

      {showAddVolume && (
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddVolume()}
            autoFocus
            placeholder="输入卷名..."
            className="flex-1 rounded-lg border border-[var(--color-primary)] bg-[var(--color-bg)] px-3 py-2 outline-none"
          />
          <button
            onClick={handleAddVolume}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white transition hover:bg-[var(--color-primary-hover)]"
          >
            添加
          </button>
          <button
            onClick={() => setShowAddVolume(false)}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 transition hover:bg-[var(--color-bg-secondary)]"
          >
            取消
          </button>
        </div>
      )}

      {projectVolumes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <BookOpen size={48} className="text-[var(--color-text-secondary)]" />
          <p className="text-[var(--color-text-secondary)]">还没有大纲，开始规划吧</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projectVolumes.map((volume) => (
            <div
              key={volume.id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
            >
              <div className="group flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleVolume(volume.id)} className="text-[var(--color-text-secondary)]">
                    {expandedVolumes.has(volume.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                  <span className="font-medium">{volume.title}</span>
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    ({volume.chapters.length} 章)
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowAddChapter(volume.id)}
                    className="rounded p-1 text-[var(--color-text-secondary)] opacity-0 transition hover:bg-[var(--color-border)] group-hover:opacity-100"
                    title="添加章节"
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    onClick={() => deleteVolume(volume.id)}
                    className="rounded p-1 text-[var(--color-text-secondary)] opacity-0 transition hover:bg-red-100 hover:text-red-500 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {showAddChapter === volume.id && (
                <div className="border-t border-[var(--color-border)] px-4 py-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddChapter(volume.id)}
                      autoFocus
                      placeholder="输入章节标题..."
                      className="flex-1 rounded-lg border border-[var(--color-primary)] bg-[var(--color-bg)] px-3 py-1.5 text-sm outline-none"
                    />
                    <button
                      onClick={() => handleAddChapter(volume.id)}
                      className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm text-white transition hover:bg-[var(--color-primary-hover)]"
                    >
                      添加
                    </button>
                    <button
                      onClick={() => setShowAddChapter(null)}
                      className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm transition hover:bg-[var(--color-bg-secondary)]"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              {expandedVolumes.has(volume.id) && volume.chapters.length > 0 && (
                <div className="border-t border-[var(--color-border)] px-4 py-2">
                  {volume.chapters.map((chapter, index) => (
                    <div key={chapter.id} className="mb-2">
                      <div className="group flex items-center justify-between rounded px-3 py-2 transition hover:bg-[var(--color-bg)]">
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleChapter(chapter.id)} className="text-[var(--color-text-secondary)]">
                            {expandedChapters.has(chapter.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                          <FileText size={14} className="text-[var(--color-text-secondary)]" />
                          <span>第{index + 1}章 {chapter.title}</span>
                          <span className={`rounded px-1.5 py-0.5 text-xs ${
                            chapter.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : chapter.status === "writing"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {chapter.status === "completed" ? "已完成" : chapter.status === "writing" ? "写作中" : "草稿"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setShowAddScene({ volumeId: volume.id, chapterId: chapter.id })}
                            className="rounded p-1 text-[var(--color-text-secondary)] opacity-0 transition hover:bg-[var(--color-border)] group-hover:opacity-100"
                          >
                            <Plus size={12} />
                          </button>
                          <button
                            onClick={() => deleteChapter(volume.id, chapter.id)}
                            className="rounded p-1 text-[var(--color-text-secondary)] opacity-0 transition hover:bg-red-100 hover:text-red-500 group-hover:opacity-100"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {showAddScene?.volumeId === volume.id && showAddScene.chapterId === chapter.id && (
                        <div className="ml-8 py-1">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newTitle}
                              onChange={(e) => setNewTitle(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleAddScene(volume.id, chapter.id)}
                              autoFocus
                              placeholder="输入场景标题..."
                              className="flex-1 rounded-lg border border-[var(--color-primary)] bg-[var(--color-bg)] px-3 py-1 text-xs outline-none"
                            />
                            <button
                              onClick={() => handleAddScene(volume.id, chapter.id)}
                              className="rounded bg-[var(--color-primary)] px-2 py-1 text-xs text-white"
                            >
                              添加
                            </button>
                            <button
                              onClick={() => setShowAddScene(null)}
                              className="rounded border border-[var(--color-border)] px-2 py-1 text-xs"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      )}

                      {expandedChapters.has(chapter.id) && chapter.scenes.length > 0 && (
                        <div className="ml-8 space-y-1 py-1">
                          {chapter.scenes.map((scene, sceneIndex) => (
                            <div
                              key={scene.id}
                              className="group flex items-center justify-between rounded px-2 py-1 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
                            >
                              <div className="flex items-center gap-2">
                                <MapPin size={12} />
                                <span>场景{sceneIndex + 1}: {scene.title}</span>
                              </div>
                              <button
                                onClick={() => deleteScene(volume.id, chapter.id, scene.id)}
                                className="rounded p-0.5 opacity-0 transition hover:bg-red-100 hover:text-red-500 group-hover:opacity-100"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
