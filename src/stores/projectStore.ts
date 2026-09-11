import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Project {
  id: string;
  title: string;
  author: string;
  genre: string;
  synopsis: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectStore {
  projects: Project[];
  currentProject: Project | null;
  addProject: (project: Omit<Project, "id" | "createdAt" | "updatedAt" | "content">) => void;
  setCurrentProject: (project: Project | null) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  updateContent: (id: string, content: string) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      projects: [],
      currentProject: null,
      addProject: (project) => {
        const newProject: Project = {
          ...project,
          content: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          projects: [...state.projects, newProject],
          currentProject: newProject,
        }));
      },
      setCurrentProject: (project) => set({ currentProject: project }),
      updateProject: (id, updates) =>
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
        }),
      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProject: state.currentProject?.id === id ? null : state.currentProject,
        })),
      updateContent: (id, content) =>
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
        }),
    }),
    {
      name: "omni-novel-projects",
    }
  )
);
