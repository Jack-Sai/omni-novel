import { create } from "zustand";
import { saveProjectJson, loadProjectJson } from "../services/storage";

export interface Scene {
  id: string;
  title: string;
  summary: string;
  location: string;
  characters: string[];
  order: number;
}

export interface OutlineChapter {
  id: string;
  title: string;
  summary: string;
  scenes: Scene[];
  status: "draft" | "writing" | "completed";
}

export interface Volume {
  id: string;
  projectId: string;
  title: string;
  description: string;
  chapters: OutlineChapter[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface OutlineStore {
  volumes: Volume[];
  currentVolume: Volume | null;
  currentChapter: OutlineChapter | null;
  addVolume: (volume: Omit<Volume, "id" | "createdAt" | "updatedAt" | "chapters">) => void;
  setCurrentVolume: (volume: Volume | null) => void;
  setCurrentChapter: (chapter: OutlineChapter | null) => void;
  updateVolume: (id: string, updates: Partial<Volume>) => void;
  deleteVolume: (id: string) => void;
  addChapter: (volumeId: string, chapter: Omit<OutlineChapter, "id" | "scenes">) => void;
  updateChapter: (volumeId: string, chapterId: string, updates: Partial<OutlineChapter>) => void;
  deleteChapter: (volumeId: string, chapterId: string) => void;
  addScene: (volumeId: string, chapterId: string, scene: Omit<Scene, "id">) => void;
  updateScene: (volumeId: string, chapterId: string, sceneId: string, updates: Partial<Scene>) => void;
  deleteScene: (volumeId: string, chapterId: string, sceneId: string) => void;
  getVolumesByProject: (projectId: string) => Volume[];
  loadFromDisk: (projectDir: string) => Promise<void>;
  saveToDisk: (projectDir: string) => void;
}

let saveTimers: Record<string, ReturnType<typeof setTimeout> | null> = {};

export const useOutlineStore = create<OutlineStore>()((set, get) => ({
  volumes: [],
  currentVolume: null,
  currentChapter: null,

  addVolume: (volume) => {
    const newVolume: Volume = {
      id: crypto.randomUUID(),
      ...volume,
      chapters: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      volumes: [...state.volumes, newVolume],
      currentVolume: newVolume,
    }));
  },

  setCurrentVolume: (volume) => set({ currentVolume: volume }),

  setCurrentChapter: (chapter) => set({ currentChapter: chapter }),

  updateVolume: (id, updates) =>
    set((state) => {
      const updatedAt = new Date().toISOString();
      const volumes = state.volumes.map((v) =>
        v.id === id ? { ...v, ...updates, updatedAt } : v
      );
      const currentVolume =
        state.currentVolume?.id === id
          ? { ...state.currentVolume, ...updates, updatedAt }
          : state.currentVolume;
      return { volumes, currentVolume };
    }),

  deleteVolume: (id) =>
    set((state) => ({
      volumes: state.volumes.filter((v) => v.id !== id),
      currentVolume: state.currentVolume?.id === id ? null : state.currentVolume,
    })),

  addChapter: (volumeId, chapter) =>
    set((state) => {
      const newChapter: OutlineChapter = { id: crypto.randomUUID(), ...chapter, scenes: [] };
      const volumes = state.volumes.map((v) =>
        v.id === volumeId
          ? { ...v, chapters: [...v.chapters, newChapter], updatedAt: new Date().toISOString() }
          : v
      );
      return { volumes };
    }),

  updateChapter: (volumeId, chapterId, updates) =>
    set((state) => {
      const volumes = state.volumes.map((v) =>
        v.id === volumeId
          ? {
              ...v,
              chapters: v.chapters.map((c) => (c.id === chapterId ? { ...c, ...updates } : c)),
              updatedAt: new Date().toISOString(),
            }
          : v
      );
      return { volumes };
    }),

  deleteChapter: (volumeId, chapterId) =>
    set((state) => {
      const volumes = state.volumes.map((v) =>
        v.id === volumeId
          ? { ...v, chapters: v.chapters.filter((c) => c.id !== chapterId), updatedAt: new Date().toISOString() }
          : v
      );
      return { volumes };
    }),

  addScene: (volumeId, chapterId, scene) =>
    set((state) => {
      const newScene: Scene = { id: crypto.randomUUID(), ...scene };
      const volumes = state.volumes.map((v) =>
        v.id === volumeId
          ? {
              ...v,
              chapters: v.chapters.map((c) =>
                c.id === chapterId ? { ...c, scenes: [...c.scenes, newScene] } : c
              ),
              updatedAt: new Date().toISOString(),
            }
          : v
      );
      return { volumes };
    }),

  updateScene: (volumeId, chapterId, sceneId, updates) =>
    set((state) => {
      const volumes = state.volumes.map((v) =>
        v.id === volumeId
          ? {
              ...v,
              chapters: v.chapters.map((c) =>
                c.id === chapterId
                  ? { ...c, scenes: c.scenes.map((s) => (s.id === sceneId ? { ...s, ...updates } : s)) }
                  : c
              ),
              updatedAt: new Date().toISOString(),
            }
          : v
      );
      return { volumes };
    }),

  deleteScene: (volumeId, chapterId, sceneId) =>
    set((state) => {
      const volumes = state.volumes.map((v) =>
        v.id === volumeId
          ? {
              ...v,
              chapters: v.chapters.map((c) =>
                c.id === chapterId
                  ? { ...c, scenes: c.scenes.filter((s) => s.id !== sceneId) }
                  : c
              ),
              updatedAt: new Date().toISOString(),
            }
          : v
      );
      return { volumes };
    }),

  getVolumesByProject: (projectId) => {
    return get().volumes.filter((v) => v.projectId === projectId).sort((a, b) => a.order - b.order);
  },

  loadFromDisk: async (projectDir: string) => {
    const data = await loadProjectJson<{ volumes: Volume[] }>(projectDir, "data", "outline.json");
    // 无数据时清空，避免切换项目后残留上一项目内容
    set({ volumes: data?.volumes ?? [] });
  },

  saveToDisk: (projectDir: string) => {
    const key = projectDir;
    if (saveTimers[key]) clearTimeout(saveTimers[key]!);
    saveTimers[key] = setTimeout(() => {
      const { volumes } = get();
      saveProjectJson(projectDir, "data", "outline.json", { volumes }).catch((e) =>
        console.error("保存大纲数据失败:", e)
      );
      saveTimers[key] = null;
    }, 500);
  },
}));
