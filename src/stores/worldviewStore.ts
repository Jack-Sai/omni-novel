import { create } from "zustand";
import { saveProjectJson, loadProjectJson } from "../services/storage";

export type WorldviewType =
  | "location"
  | "organization"
  | "item"
  | "event"
  | "rule"
  | "race"
  | "magic"
  | "technology"
  | "history"
  | "other";

export const worldviewTypes: { value: WorldviewType; label: string }[] = [
  { value: "location", label: "地点" },
  { value: "organization", label: "组织" },
  { value: "item", label: "物品" },
  { value: "event", label: "事件" },
  { value: "rule", label: "规则" },
  { value: "race", label: "种族" },
  { value: "magic", label: "魔法/能力" },
  { value: "technology", label: "科技" },
  { value: "history", label: "历史" },
  { value: "other", label: "其他" },
];

export interface WorldviewItem {
  id: string;
  projectId: string;
  name: string;
  type: WorldviewType;
  description: string;
  details: string;
  relationships: string;
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface WorldviewStore {
  items: WorldviewItem[];
  currentItem: WorldviewItem | null;
  addItem: (item: Omit<WorldviewItem, "id" | "createdAt" | "updatedAt">) => void;
  setCurrentItem: (item: WorldviewItem | null) => void;
  updateItem: (id: string, updates: Partial<WorldviewItem>) => void;
  deleteItem: (id: string) => void;
  getItemsByProject: (projectId: string) => WorldviewItem[];
  getItemsByType: (projectId: string, type: WorldviewType) => WorldviewItem[];
  loadFromDisk: (projectDir: string) => Promise<void>;
  saveToDisk: (projectDir: string) => void;
}

let saveTimers: Record<string, ReturnType<typeof setTimeout> | null> = {};

export const useWorldviewStore = create<WorldviewStore>()((set, get) => ({
  items: [],
  currentItem: null,

  addItem: (item) => {
    const newItem: WorldviewItem = {
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

  getItemsByType: (projectId, type) => {
    return get().items.filter((i) => i.projectId === projectId && i.type === type);
  },

  loadFromDisk: async (projectDir: string) => {
    const data = await loadProjectJson<{ items: WorldviewItem[] }>(projectDir, "data", "worldview.json");
    if (data?.items) {
      set({ items: data.items });
    }
  },

  saveToDisk: (projectDir: string) => {
    const key = projectDir;
    if (saveTimers[key]) clearTimeout(saveTimers[key]!);
    saveTimers[key] = setTimeout(() => {
      const { items } = get();
      saveProjectJson(projectDir, "data", "worldview.json", { items }).catch((e) =>
        console.error("保存世界观数据失败:", e)
      );
      saveTimers[key] = null;
    }, 500);
  },
}));
