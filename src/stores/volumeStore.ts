import { create } from "zustand";
import { saveProjectJson, loadProjectJson } from "../services/storage";

export interface Volume {
  id: string;
  projectId: string;
  title: string;
  description: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type NewVolume = Omit<Volume, "id" | "createdAt" | "updatedAt">;

interface VolumeStore {
  volumes: Volume[];
  addVolume: (volume: NewVolume) => Volume;
  updateVolume: (id: string, updates: Partial<Volume>) => void;
  deleteVolume: (id: string) => void;
  /** 按 id 数组重排（仅更新 order，不动章节） */
  reorderVolumes: (projectId: string, volumeIds: string[]) => void;
  getVolumesByProject: (projectId: string) => Volume[];
  loadFromDisk: (projectDir: string) => Promise<void>;
  saveToDisk: (projectDir: string) => void;
}

let saveTimers: Record<string, ReturnType<typeof setTimeout> | null> = {};

export const useVolumeStore = create<VolumeStore>()((set, get) => ({
  volumes: [],

  addVolume: (volume) => {
    const now = new Date().toISOString();
    const newVolume: Volume = {
      id: crypto.randomUUID(),
      ...volume,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ volumes: [...state.volumes, newVolume] }));
    return newVolume;
  },

  updateVolume: (id, updates) =>
    set((state) => ({
      volumes: state.volumes.map((v) =>
        v.id === id ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v,
      ),
    })),

  deleteVolume: (id) =>
    set((state) => ({ volumes: state.volumes.filter((v) => v.id !== id) })),

  reorderVolumes: (projectId, volumeIds) =>
    set((state) => ({
      volumes: state.volumes.map((v) => {
        if (v.projectId !== projectId) return v;
        const newOrder = volumeIds.indexOf(v.id);
        return newOrder >= 0 ? { ...v, order: newOrder, updatedAt: new Date().toISOString() } : v;
      }),
    })),

  getVolumesByProject: (projectId) =>
    get()
      .volumes.filter((v) => v.projectId === projectId)
      .sort((a, b) => a.order - b.order),

  loadFromDisk: async (projectDir: string) => {
    const data = await loadProjectJson<{ volumes: Volume[] }>(projectDir, "data", "volumes.json");
    // 无数据时清空，避免切换项目后残留上一项目内容
    set({ volumes: data?.volumes ?? [] });
  },

  saveToDisk: (projectDir: string) => {
    const key = projectDir;
    if (saveTimers[key]) clearTimeout(saveTimers[key]!);
    saveTimers[key] = setTimeout(() => {
      const { volumes } = get();
      saveProjectJson(projectDir, "data", "volumes.json", { volumes }).catch((e) =>
        console.error("保存卷数据失败:", e),
      );
      saveTimers[key] = null;
    }, 500);
  },
}));
