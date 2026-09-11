import { useState } from "react";
import { Plus, BookOpen, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

interface Chapter {
  id: string;
  title: string;
  summary: string;
}

interface Volume {
  id: string;
  title: string;
  chapters: Chapter[];
}

export function OutlinePage() {
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [volumeDialogOpen, setVolumeDialogOpen] = useState(false);
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
  const [selectedVolumeId, setSelectedVolumeId] = useState<string | null>(null);
  const [volumeTitle, setVolumeTitle] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterSummary, setChapterSummary] = useState("");
  const [expandedVolumes, setExpandedVolumes] = useState<Set<string>>(new Set());

  const handleAddVolume = (e: React.FormEvent) => {
    e.preventDefault();
    if (!volumeTitle.trim()) return;
    setVolumes([
      ...volumes,
      { id: crypto.randomUUID(), title: volumeTitle.trim(), chapters: [] },
    ]);
    setVolumeTitle("");
    setVolumeDialogOpen(false);
  };

  const handleAddChapter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterTitle.trim() || !selectedVolumeId) return;
    setVolumes(
      volumes.map((v) =>
        v.id === selectedVolumeId
          ? {
              ...v,
              chapters: [
                ...v.chapters,
                { id: crypto.randomUUID(), title: chapterTitle.trim(), summary: chapterSummary.trim() },
              ],
            }
          : v
      )
    );
    setChapterTitle("");
    setChapterSummary("");
    setChapterDialogOpen(false);
  };

  const handleDeleteVolume = (id: string) => {
    setVolumes(volumes.filter((v) => v.id !== id));
  };

  const handleDeleteChapter = (volumeId: string, chapterId: string) => {
    setVolumes(
      volumes.map((v) =>
        v.id === volumeId
          ? { ...v, chapters: v.chapters.filter((c) => c.id !== chapterId) }
          : v
      )
    );
  };

  const toggleVolume = (id: string) => {
    const newExpanded = new Set(expandedVolumes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedVolumes(newExpanded);
  };

  const openChapterDialog = (volumeId: string) => {
    setSelectedVolumeId(volumeId);
    setChapterDialogOpen(true);
  };

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">大纲管理</h1>
        <button
          onClick={() => setVolumeDialogOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white transition hover:bg-[var(--color-primary-hover)]"
        >
          <Plus size={18} />
          添加卷
        </button>
      </div>

      {volumes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <BookOpen size={48} className="text-[var(--color-text-secondary)]" />
          <p className="text-[var(--color-text-secondary)]">还没有大纲，开始规划吧</p>
        </div>
      ) : (
        <div className="space-y-2">
          {volumes.map((volume) => (
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
                    onClick={() => openChapterDialog(volume.id)}
                    className="rounded p-1 text-[var(--color-text-secondary)] opacity-0 transition hover:bg-[var(--color-border)] group-hover:opacity-100"
                    title="添加章节"
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteVolume(volume.id)}
                    className="rounded p-1 text-[var(--color-text-secondary)] opacity-0 transition hover:bg-red-100 hover:text-red-500 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {expandedVolumes.has(volume.id) && volume.chapters.length > 0 && (
                <div className="border-t border-[var(--color-border)] px-4 py-2">
                  {volume.chapters.map((chapter, index) => (
                    <div
                      key={chapter.id}
                      className="group flex items-center justify-between rounded px-3 py-2 transition hover:bg-[var(--color-bg)]"
                    >
                      <div>
                        <span className="text-[var(--color-text-secondary)]">第{index + 1}章 </span>
                        <span>{chapter.title}</span>
                        {chapter.summary && (
                          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                            {chapter.summary}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteChapter(volume.id, chapter.id)}
                        className="rounded p-1 text-[var(--color-text-secondary)] opacity-0 transition hover:bg-red-100 hover:text-red-500 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog.Root open={volumeDialogOpen} onOpenChange={setVolumeDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[var(--color-bg)] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="text-xl font-bold">添加卷</Dialog.Title>
              <Dialog.Close className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
                <X size={20} />
              </Dialog.Close>
            </div>
            <form onSubmit={handleAddVolume} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">卷名 *</label>
                <input
                  type="text"
                  value={volumeTitle}
                  onChange={(e) => setVolumeTitle(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
                  placeholder="输入卷名"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Dialog.Close
                  type="button"
                  className="rounded-lg border border-[var(--color-border)] px-4 py-2 transition hover:bg-[var(--color-bg-secondary)]"
                >
                  取消
                </Dialog.Close>
                <button
                  type="submit"
                  className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white transition hover:bg-[var(--color-primary-hover)]"
                >
                  添加
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={chapterDialogOpen} onOpenChange={setChapterDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[var(--color-bg)] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="text-xl font-bold">添加章节</Dialog.Title>
              <Dialog.Close className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
                <X size={20} />
              </Dialog.Close>
            </div>
            <form onSubmit={handleAddChapter} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">章节标题 *</label>
                <input
                  type="text"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
                  placeholder="输入章节标题"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">章节摘要</label>
                <textarea
                  value={chapterSummary}
                  onChange={(e) => setChapterSummary(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
                  placeholder="简要描述章节内容"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Dialog.Close
                  type="button"
                  className="rounded-lg border border-[var(--color-border)] px-4 py-2 transition hover:bg-[var(--color-bg-secondary)]"
                >
                  取消
                </Dialog.Close>
                <button
                  type="submit"
                  className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white transition hover:bg-[var(--color-primary-hover)]"
                >
                  添加
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
