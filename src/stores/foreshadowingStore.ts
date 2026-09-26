import { create } from "zustand";
import { saveProjectJson, loadProjectJson } from "../services/storage";

export type ForeshadowingStatus = "planted" | "revealed" | "abandoned";

export interface Foreshadowing {
  id: string;
  projectId: string;
  name: string;
  description: string;
  plantedChapter: string;
  plantedContent: string;
  revealChapter: string;
  revealContent: string;
  status: ForeshadowingStatus;
  importance: "low" | "medium" | "high";
  relatedCharacters: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface ForeshadowingStore {
  items: Foreshadowing[];
  currentItem: Foreshadowing | null;
  addItem: (item: Omit<Foreshadowing, "id" | "createdAt" | "updatedAt">) => void;
  setCurrentItem: (item: Foreshadowing | null) => void;
  updateItem: (id: string, updates: Partial<Foreshadowing>) => void;
  deleteItem: (id: string) => void;
  getItemsByProject: (projectId: string) => Foreshadowing[];
  getItemsByStatus: (projectId: string, status: ForeshadowingStatus) => Foreshadowing[];
  loadFromDisk: (projectDir: string) => Promise<void>;
  saveToDisk: (projectDir: string) => void;
}

let saveTimers: Record<string, ReturnType<typeof setTimeout> | null> = {};

export const useForeshadowingStore = create<ForeshadowingStore>()((set, get) => ({
  items: [],
  currentItem: null,

  addItem: (item) => {
    const newItem: Foreshadowing = {
      id: crypto.randomUUID(),
      ...item,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      items: [...state.items, newItem],
      currentItem: newItem,
    }));
  },

  setCurrentItem: (item) => set({ currentItem: item }),

  updateItem: (id, updates) =>
    set((state) => {
      const updatedAt = new Date().toISOString();
      const items = state.items.map((i) =>
        i.id === id ? { ...i, ...updates, updatedAt } : i
      );
      const currentItem =
        state.currentItem?.id === id
          ? { ...state.currentItem, ...updates, updatedAt }
          : state.currentItem;
      return { items, currentItem };
    }),

  deleteItem: (id) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
      currentItem: state.currentItem?.id === id ? null : state.currentItem,
    })),

  getItemsByProject: (projectId) => {
    return get().items.filter((i) => i.projectId === projectId);
  },

  getItemsByStatus: (projectId, status) => {
    return get().items.filter((i) => i.projectId === projectId && i.status === status);
  },

  loadFromDisk: async (projectDir: string) => {
    const data = await loadProjectJson<{ items: Foreshadowing[] }>(projectDir, "data", "foreshadowing.json");
    // 无数据时清空，避免切换项目后残留上一项目内容
    set({ items: data?.items ?? [] });
  },

  saveToDisk: (projectDir: string) => {
    const key = projectDir;
    if (saveTimers[key]) clearTimeout(saveTimers[key]!);
    saveTimers[key] = setTimeout(() => {
      const { items } = get();
      saveProjectJson(projectDir, "data", "foreshadowing.json", { items }).catch((e) =>
        console.error("保存伏笔数据失败:", e)
      );
      saveTimers[key] = null;
    }, 500);
  },
}));
