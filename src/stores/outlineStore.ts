import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  addVolume: (projectId: string, title: string) => void;
  setCurrentVolume: (volume: Volume | null) => void;
  setCurrentChapter: (chapter: OutlineChapter | null) => void;
  updateVolume: (id: string, updates: Partial<Volume>) => void;
  deleteVolume: (id: string) => void;
  addChapter: (volumeId: string, title: string) => void;
  updateChapter: (volumeId: string, chapterId: string, updates: Partial<OutlineChapter>) => void;
  deleteChapter: (volumeId: string, chapterId: string) => void;
  addScene: (volumeId: string, chapterId: string, title: string) => void;
  updateScene: (volumeId: string, chapterId: string, sceneId: string, updates: Partial<Scene>) => void;
  deleteScene: (volumeId: string, chapterId: string, sceneId: string) => void;
  getVolumesByProject: (projectId: string) => Volume[];
}

export const useOutlineStore = create<OutlineStore>()(
  persist(
    (set, get) => ({
      volumes: [],
      currentVolume: null,
      currentChapter: null,
      addVolume: (projectId, title) => {
        const existingVolumes = get().volumes.filter((v) => v.projectId === projectId);
        const order = existingVolumes.length;
        const newVolume: Volume = {
          id: crypto.randomUUID(),
          projectId,
          title,
          description: "",
          chapters: [],
          order,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          volumes: [...state.volumes, newVolume],
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
      addChapter: (volumeId, title) => {
        set((state) => {
          const volumes = state.volumes.map((v) => {
            if (v.id === volumeId) {
              const newChapter: OutlineChapter = {
                id: crypto.randomUUID(),
                title,
                summary: "",
                scenes: [],
                status: "draft",
              };
              return { ...v, chapters: [...v.chapters, newChapter], updatedAt: new Date().toISOString() };
            }
            return v;
          });
          return { volumes };
        });
      },
      updateChapter: (volumeId, chapterId, updates) =>
        set((state) => {
          const volumes = state.volumes.map((v) => {
            if (v.id === volumeId) {
              const chapters = v.chapters.map((c) =>
                c.id === chapterId ? { ...c, ...updates } : c
              );
              return { ...v, chapters, updatedAt: new Date().toISOString() };
            }
            return v;
          });
          return { volumes };
        }),
      deleteChapter: (volumeId, chapterId) =>
        set((state) => {
          const volumes = state.volumes.map((v) => {
            if (v.id === volumeId) {
              return { ...v, chapters: v.chapters.filter((c) => c.id !== chapterId), updatedAt: new Date().toISOString() };
            }
            return v;
          });
          return { volumes };
        }),
      addScene: (volumeId, chapterId, title) =>
        set((state) => {
          const volumes = state.volumes.map((v) => {
            if (v.id === volumeId) {
              const chapters = v.chapters.map((c) => {
                if (c.id === chapterId) {
                  const newScene: Scene = {
                    id: crypto.randomUUID(),
                    title,
                    summary: "",
                    location: "",
                    characters: [],
                    order: c.scenes.length,
                  };
                  return { ...c, scenes: [...c.scenes, newScene] };
                }
                return c;
              });
              return { ...v, chapters, updatedAt: new Date().toISOString() };
            }
            return v;
          });
          return { volumes };
        }),
      updateScene: (volumeId, chapterId, sceneId, updates) =>
        set((state) => {
          const volumes = state.volumes.map((v) => {
            if (v.id === volumeId) {
              const chapters = v.chapters.map((c) => {
                if (c.id === chapterId) {
                  const scenes = c.scenes.map((s) =>
                    s.id === sceneId ? { ...s, ...updates } : s
                  );
                  return { ...c, scenes };
                }
                return c;
              });
              return { ...v, chapters, updatedAt: new Date().toISOString() };
            }
            return v;
          });
          return { volumes };
        }),
      deleteScene: (volumeId, chapterId, sceneId) =>
        set((state) => {
          const volumes = state.volumes.map((v) => {
            if (v.id === volumeId) {
              const chapters = v.chapters.map((c) => {
                if (c.id === chapterId) {
                  return { ...c, scenes: c.scenes.filter((s) => s.id !== sceneId) };
                }
                return c;
              });
              return { ...v, chapters, updatedAt: new Date().toISOString() };
            }
            return v;
          });
          return { volumes };
        }),
      getVolumesByProject: (projectId) => {
        return get().volumes.filter((v) => v.projectId === projectId).sort((a, b) => a.order - b.order);
      },
    }),
    {
      name: "omni-novel-outline",
    }
  )
);
