import { create } from "zustand";
import { saveProjectJson, loadProjectJson } from "../services/storage";

export type ChapterStatus = "draft" | "writing" | "completed";

export interface Chapter {
  id: string;
  projectId: string;
  /** 所属卷 id；null = 未分卷 */
  volumeId: string | null;
  title: string;
  content: string;
  summary: string;
  status: ChapterStatus;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export const chapterStatusLabels: Record<ChapterStatus, string> = {
  draft: "草稿",
  writing: "写作中",
  completed: "已完成",
};

interface ChapterStore {
  chapters: Chapter[];
  currentChapter: Chapter | null;
  addChapter: (chapter: Omit<Chapter, "id" | "createdAt" | "updatedAt">) => void;
  setCurrentChapter: (chapter: Chapter | null) => void;
  updateChapter: (id: string, updates: Partial<Chapter>) => void;
  deleteChapter: (id: string) => void;
  updateContent: (id: string, content: string) => void;
  getChaptersByProject: (projectId: string) => Chapter[];
  reorderChapters: (projectId: string, chapterIds: string[]) => void;
  loadFromDisk: (projectDir: string) => Promise<void>;
  saveToDisk: (projectDir: string) => void;
}

let saveTimers: Record<string, ReturnType<typeof setTimeout> | null> = {};

export const useChapterStore = create<ChapterStore>()((set, get) => ({
  chapters: [],
  currentChapter: null,

  addChapter: (chapter) => {
    const newChapter: Chapter = {
      id: crypto.randomUUID(),
      ...chapter,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      chapters: [...state.chapters, newChapter],
      currentChapter: newChapter,
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
    return get().chapters
      .filter((c) => c.projectId === projectId)
      .sort((a, b) => a.order - b.order);
  },

  reorderChapters: (projectId, chapterIds) =>
    set((state) => {
      const chapters = state.chapters.map((c) => {
        if (c.projectId !== projectId) return c;
        const newOrder = chapterIds.indexOf(c.id);
        return newOrder >= 0 ? { ...c, order: newOrder, updatedAt: new Date().toISOString() } : c;
      });
      return { chapters };
    }),

  loadFromDisk: async (projectDir: string) => {
    const data = await loadProjectJson<{ chapters: Chapter[] }>(projectDir, "data", "chapters.json");
    // 无数据时清空，避免切换项目后残留上一项目内容；旧数据缺 status 时补默认值
    set({
      chapters: (data?.chapters ?? []).map((c) => ({ ...c, status: c.status ?? "draft" })),
    });
  },

  saveToDisk: (projectDir: string) => {
    const key = projectDir;
    if (saveTimers[key]) clearTimeout(saveTimers[key]!);
    saveTimers[key] = setTimeout(() => {
      const { chapters } = get();
      saveProjectJson(projectDir, "data", "chapters.json", { chapters }).catch((e) =>
        console.error("保存章节数据失败:", e)
      );
      saveTimers[key] = null;
    }, 500);
  },
}));
