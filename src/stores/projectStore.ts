import { create } from "zustand";
import { saveGlobalConfig, loadGlobalConfig } from "../services/storage";
import { projectDb } from "../services/database";

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
  /** 接收 SQLite projects 表行（snake_case），映射为 Project。数据一致性规则：projects.json 为权威，
   * SQLite 仅兜底补入 JSON 中不存在的旧项目，绝不覆盖 JSON 已有行（防旧 DB 数据回滚新改名）。setCurrent=false 仅合并不选中 */
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
    set((state) => {
      // JSON 权威：已存在于 projects.json 的项目忽略 DB 行（仅补入旧版只存于 DB 的项目）
      if (state.projects.some((p) => p.id === project.id)) {
        return shouldSetCurrent
          ? {
              currentProject:
                state.projects.find((p) => p.id === project.id) ??
                state.currentProject,
            }
          : {};
      }
      return {
        projects: [...state.projects, project],
        currentProject: shouldSetCurrent ? project : state.currentProject,
      };
    });
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
    // 镜像同步：SQLite projects 行跟随 JSON（仅支持的列），失败仅告警不阻塞
    const dbUpdates: Partial<{
      title: string;
      author: string;
      genre: string;
      synopsis: string;
      content: string;
      storage_path: string;
    }> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.author !== undefined) dbUpdates.author = updates.author;
    if (updates.genre !== undefined) dbUpdates.genre = updates.genre;
    if (updates.synopsis !== undefined) dbUpdates.synopsis = updates.synopsis;
    if (updates.storagePath !== undefined) dbUpdates.storage_path = updates.storagePath;
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (Object.keys(dbUpdates).length > 0) {
      void projectDb.update(id, dbUpdates).catch((e) =>
        console.warn("同步项目数据库记录失败:", e)
      );
    }
  },

  deleteProject: (id) => {
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
    }));
    get().saveToDisk();
    // 镜像同步：删除 SQLite 行（FK ON DELETE CASCADE 级联清理 ai_sessions/memory_items 等）
    void projectDb.delete(id).catch((e) =>
      console.warn("删除项目数据库记录失败:", e)
    );
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
