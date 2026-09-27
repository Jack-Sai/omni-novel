import { create } from "zustand";
import { saveProjectJson, loadProjectJson } from "../services/storage";
import type { ChapterStatus } from "./chapterStore";

/**
 * 场景（Scene）：章内规划单元，卷 → 章 → 场景 三级大纲的最底层。
 * 场景只承载规划信息（标题/梗概/状态），正文仍归属章节。
 */
export interface Scene {
  id: string;
  projectId: string;
  chapterId: string;
  title: string;
  summary: string;
  status: ChapterStatus;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface SceneStore {
  scenes: Scene[];
  addScene: (scene: Omit<Scene, "id" | "createdAt" | "updatedAt">) => Scene;
  updateScene: (id: string, updates: Partial<Scene>) => void;
  deleteScene: (id: string) => void;
  /** 章删除级联清理 */
  deleteByChapter: (chapterId: string) => void;
  getScenesByChapter: (chapterId: string) => Scene[];
  /** 在同章兄弟内交换两个场景的顺序（dir = -1 上移 / 1 下移） */
  moveScene: (id: string, dir: -1 | 1) => void;
  loadFromDisk: (projectDir: string) => Promise<void>;
  saveToDisk: (projectDir: string) => void;
}

let saveTimers: Record<string, ReturnType<typeof setTimeout> | null> = {};

export const useSceneStore = create<SceneStore>()((set, get) => ({
  scenes: [],

  addScene: (scene) => {
    const now = new Date().toISOString();
    const newScene: Scene = {
      id: crypto.randomUUID(),
      ...scene,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ scenes: [...state.scenes, newScene] }));
    return newScene;
  },

  updateScene: (id, updates) =>
    set((state) => ({
      scenes: state.scenes.map((s) =>
        s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
      ),
    })),

  deleteScene: (id) =>
    set((state) => ({ scenes: state.scenes.filter((s) => s.id !== id) })),

  deleteByChapter: (chapterId) =>
    set((state) => ({ scenes: state.scenes.filter((s) => s.chapterId !== chapterId) })),

  getScenesByChapter: (chapterId) =>
    get()
      .scenes.filter((s) => s.chapterId === chapterId)
      .sort((a, b) => a.order - b.order),

  moveScene: (id, dir) =>
    set((state) => {
      const target = state.scenes.find((s) => s.id === id);
      if (!target) return state;
      const siblings = state.scenes
        .filter((s) => s.chapterId === target.chapterId)
        .sort((a, b) => a.order - b.order);
      const idx = siblings.findIndex((s) => s.id === id);
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= siblings.length) return state;
      const other = siblings[swapIdx];
      const now = new Date().toISOString();
      return {
        scenes: state.scenes.map((s) => {
          if (s.id === target.id) return { ...s, order: other.order, updatedAt: now };
          if (s.id === other.id) return { ...s, order: target.order, updatedAt: now };
          return s;
        }),
      };
    }),

  loadFromDisk: async (projectDir: string) => {
    const data = await loadProjectJson<{ scenes: Scene[] }>(projectDir, "data", "scenes.json");
    // 无数据时清空，避免切换项目后残留上一项目内容
    set({ scenes: data?.scenes ?? [] });
  },

  saveToDisk: (projectDir: string) => {
    const key = projectDir;
    if (saveTimers[key]) clearTimeout(saveTimers[key]!);
    saveTimers[key] = setTimeout(() => {
      const { scenes } = get();
      saveProjectJson(projectDir, "data", "scenes.json", { scenes }).catch((e) =>
        console.error("保存场景数据失败:", e)
      );
      saveTimers[key] = null;
    }, 500);
  },
}));
