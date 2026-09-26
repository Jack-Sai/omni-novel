import { create } from "zustand";
import { saveGlobalConfig, loadGlobalConfig } from "../services/storage";

export interface Project {
  id: string;
  title: string;
  author: string;
  genre: string;
  synopsis: string;
  content: string;
  storagePath?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectStore {
  projects: Project[];
  currentProject: Project | null;
  addProject: (project: Omit<Project, "id" | "createdAt" | "updatedAt" | "content">) => void;
  /** 接收 SQLite projects 表行（snake_case），映射为 Project 并写入 store（保留原 id）。setCurrent=false 仅合并不选中 */
  addProjectFromRecord: (
    record: {
      id: string;
      title: string;
      author?: string | null;
      genre?: string | null;
      synopsis?: string | null;
      storage_path?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
    },
    options?: { setCurrent?: boolean },
  ) => void;
  setCurrentProject: (project: Project | null) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  updateContent: (id: string, content: string) => void;
  loadFromDisk: () => Promise<void>;
  saveToDisk: () => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useProjectStore = create<ProjectStore>()((set, get) => ({
  projects: [],
  currentProject: null,

  addProject: (project) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      ...project,
      content: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      projects: [...state.projects, newProject],
      currentProject: newProject,
    }));
    get().saveToDisk();
  },

  setCurrentProject: (project) => set({ currentProject: project }),

  addProjectFromRecord: (record, options) => {
    const project: Project = {
      id: record.id,
      title: record.title,
      author: record.author ?? "",
      genre: record.genre ?? "",
      synopsis: record.synopsis ?? "",
      content: "",
      storagePath: record.storage_path || undefined,
      createdAt: record.created_at ?? new Date().toISOString(),
      updatedAt: record.updated_at ?? new Date().toISOString(),
    };
    const shouldSetCurrent = options?.setCurrent ?? true;
    set((state) => ({
      projects: [...state.projects.filter((p) => p.id !== project.id), project],
      currentProject: shouldSetCurrent ? project : state.currentProject,
    }));
    get().saveToDisk();
  },

  updateProject: (id, updates) => {
    set((state) => {
      const updatedAt = new Date().toISOString();
      const projects = state.projects.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt } : p
      );
      const currentProject =
        state.currentProject?.id === id
          ? { ...state.currentProject, ...updates, updatedAt }
          : state.currentProject;
      return { projects, currentProject };
    });
    get().saveToDisk();
  },

  deleteProject: (id) => {
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
    }));
    get().saveToDisk();
  },

  updateContent: (id, content) => {
    set((state) => {
      const updatedAt = new Date().toISOString();
      const projects = state.projects.map((p) =>
        p.id === id ? { ...p, content, updatedAt } : p
      );
      const currentProject =
        state.currentProject?.id === id
          ? { ...state.currentProject, content, updatedAt }
          : state.currentProject;
      return { projects, currentProject };
    });
    get().saveToDisk();
  },

  loadFromDisk: async () => {
    const data = await loadGlobalConfig<{ projects: Project[] }>("data", "projects.json");
    if (data?.projects) {
      set({ projects: data.projects });
    }
  },

  saveToDisk: () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const { projects } = get();
      saveGlobalConfig("data", "projects.json", { projects }).catch((e) =>
        console.error("保存项目数据失败:", e)
      );
    }, 500);
  },
}));
