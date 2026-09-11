import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  addItem: (projectId: string, name: string) => void;
  setCurrentItem: (item: Foreshadowing | null) => void;
  updateItem: (id: string, updates: Partial<Foreshadowing>) => void;
  deleteItem: (id: string) => void;
  getItemsByProject: (projectId: string) => Foreshadowing[];
  getItemsByStatus: (projectId: string, status: ForeshadowingStatus) => Foreshadowing[];
}

export const useForeshadowingStore = create<ForeshadowingStore>()(
  persist(
    (set, get) => ({
      items: [],
      currentItem: null,
      addItem: (projectId, name) => {
        const newItem: Foreshadowing = {
          id: crypto.randomUUID(),
          projectId,
          name,
          description: "",
          plantedChapter: "",
          plantedContent: "",
          revealChapter: "",
          revealContent: "",
          status: "planted",
          importance: "medium",
          relatedCharacters: [],
          notes: "",
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
      getItemsByStatus: (projectId, status) => {
        return get().items.filter(
          (item) => item.projectId === projectId && item.status === status
        );
      },
    }),
    {
      name: "omni-novel-foreshadowing",
    }
  )
);
