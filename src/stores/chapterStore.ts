import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Chapter {
  id: string;
  projectId: string;
  volumeId: string | null;
  title: string;
  content: string;
  summary: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface ChapterStore {
  chapters: Chapter[];
  currentChapter: Chapter | null;
  addChapter: (projectId: string, title: string, volumeId?: string | null) => void;
  setCurrentChapter: (chapter: Chapter | null) => void;
  updateChapter: (id: string, updates: Partial<Chapter>) => void;
  deleteChapter: (id: string) => void;
  updateContent: (id: string, content: string) => void;
  getChaptersByProject: (projectId: string) => Chapter[];
  reorderChapters: (projectId: string, chapterIds: string[]) => void;
}

export const useChapterStore = create<ChapterStore>()(
  persist(
    (set, get) => ({
      chapters: [],
      currentChapter: null,
      addChapter: (projectId, title, volumeId = null) => {
        const existingChapters = get().chapters.filter(
          (c) => c.projectId === projectId && c.volumeId === volumeId
        );
        const order = existingChapters.length;

        const newChapter: Chapter = {
          id: crypto.randomUUID(),
          projectId,
          volumeId,
          title,
          content: "",
          summary: "",
          order,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          chapters: [...state.chapters, newChapter],
        }));
      },
      setCurrentChapter: (chapter) => set({ currentChapter: chapter }),
      updateChapter: (id, updates) =>
        set((state) => {
          const updatedAt = new Date().toISOString();
          const chapters = state.chapters.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt } : c
          );
          const currentChapter =
            state.currentChapter?.id === id
              ? { ...state.currentChapter, ...updates, updatedAt }
              : state.currentChapter;
          return { chapters, currentChapter };
        }),
      deleteChapter: (id) =>
        set((state) => ({
          chapters: state.chapters.filter((c) => c.id !== id),
          currentChapter: state.currentChapter?.id === id ? null : state.currentChapter,
        })),
      updateContent: (id, content) =>
        set((state) => {
          const updatedAt = new Date().toISOString();
          const chapters = state.chapters.map((c) =>
            c.id === id ? { ...c, content, updatedAt } : c
          );
          const currentChapter =
            state.currentChapter?.id === id
              ? { ...state.currentChapter, content, updatedAt }
              : state.currentChapter;
          return { chapters, currentChapter };
        }),
      getChaptersByProject: (projectId) => {
        return get()
          .chapters.filter((c) => c.projectId === projectId)
          .sort((a, b) => a.order - b.order);
      },
      reorderChapters: (projectId, chapterIds) => {
        set((state) => {
          const chapters = state.chapters.map((c) => {
            if (c.projectId === projectId) {
              const newOrder = chapterIds.indexOf(c.id);
              if (newOrder !== -1) {
                return { ...c, order: newOrder };
              }
            }
            return c;
          });
          return { chapters };
        });
      },
    }),
    {
      name: "omni-novel-chapters",
    }
  )
);
