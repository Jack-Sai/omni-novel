import { create } from "zustand";
import { persist } from "zustand/middleware";

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

export const worldviewTypes: { value: WorldviewType; label: string }[] = [
  { value: "location", label: "地点" },
  { value: "organization", label: "组织" },
  { value: "item", label: "物品" },
  { value: "event", label: "事件" },
  { value: "rule", label: "规则" },
  { value: "race", label: "种族" },
  { value: "magic", label: "魔法体系" },
  { value: "technology", label: "科技体系" },
  { value: "history", label: "历史事件" },
  { value: "other", label: "其他" },
];

interface WorldviewStore {
  items: WorldviewItem[];
  currentItem: WorldviewItem | null;
  addItem: (projectId: string, name: string, type: WorldviewType) => void;
  setCurrentItem: (item: WorldviewItem | null) => void;
  updateItem: (id: string, updates: Partial<WorldviewItem>) => void;
  deleteItem: (id: string) => void;
  getItemsByProject: (projectId: string) => WorldviewItem[];
  getItemsByType: (projectId: string, type: WorldviewType) => WorldviewItem[];
}

export const useWorldviewStore = create<WorldviewStore>()(
  persist(
    (set, get) => ({
      items: [],
      currentItem: null,
      addItem: (projectId, name, type) => {
        const newItem: WorldviewItem = {
          id: crypto.randomUUID(),
          projectId,
          name,
          type,
          description: "",
          details: "",
          relationships: "",
          notes: "",
          tags: [],
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
          const items = state.items.map((item) =>
            item.id === id ? { ...item, ...updates, updatedAt } : item
          );
          const currentItem =
            state.currentItem?.id === id
              ? { ...state.currentItem, ...updates, updatedAt }
              : state.currentItem;
          return { items, currentItem };
        }),
      deleteItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          currentItem: state.currentItem?.id === id ? null : state.currentItem,
        })),
      getItemsByProject: (projectId) => {
        return get().items.filter((item) => item.projectId === projectId);
      },
      getItemsByType: (projectId, type) => {
        return get().items.filter(
          (item) => item.projectId === projectId && item.type === type
        );
      },
    }),
    {
      name: "omni-novel-worldview",
    }
  )
);
