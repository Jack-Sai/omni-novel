import { create } from "zustand";
import { saveProjectJson, loadProjectJson } from "../services/storage";

export interface Character {
  id: string;
  projectId: string;
  name: string;
  aliases: string[];
  gender: string;
  age: string;
  appearance: string;
  personality: string;
  background: string;
  goals: string;
  conflicts: string;
  relationships: string;
  abilities: string;
  weaknesses: string;
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface CharacterStore {
  characters: Character[];
  currentCharacter: Character | null;
  addCharacter: (character: Omit<Character, "id" | "createdAt" | "updatedAt">) => void;
  setCurrentCharacter: (character: Character | null) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  getCharactersByProject: (projectId: string) => Character[];
  loadFromDisk: (projectDir: string) => Promise<void>;
  saveToDisk: (projectDir: string) => void;
}

let saveTimers: Record<string, ReturnType<typeof setTimeout> | null> = {};

export const useCharacterStore = create<CharacterStore>()((set, get) => ({
  characters: [],
  currentCharacter: null,

  addCharacter: (character) => {
    const newCharacter: Character = {
      id: crypto.randomUUID(),
      ...character,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      characters: [...state.characters, newCharacter],
      currentCharacter: newCharacter,
    }));
  },

  setCurrentCharacter: (character) => set({ currentCharacter: character }),

  updateCharacter: (id, updates) =>
    set((state) => {
      const updatedAt = new Date().toISOString();
      const characters = state.characters.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt } : c
      );
      const currentCharacter =
        state.currentCharacter?.id === id
          ? { ...state.currentCharacter, ...updates, updatedAt }
          : state.currentCharacter;
      return { characters, currentCharacter };
    }),

  deleteCharacter: (id) =>
    set((state) => ({
      characters: state.characters.filter((c) => c.id !== id),
      currentCharacter: state.currentCharacter?.id === id ? null : state.currentCharacter,
    })),

  getCharactersByProject: (projectId) => {
    return get().characters.filter((c) => c.projectId === projectId);
  },

  loadFromDisk: async (projectDir: string) => {
    const data = await loadProjectJson<{ characters: Character[] }>(projectDir, "data", "characters.json");
    // 无数据时清空，避免切换项目后残留上一项目内容
    set({ characters: data?.characters ?? [] });
  },

  saveToDisk: (projectDir: string) => {
    const key = projectDir;
    if (saveTimers[key]) clearTimeout(saveTimers[key]!);
    saveTimers[key] = setTimeout(() => {
      const { characters } = get();
      saveProjectJson(projectDir, "data", "characters.json", { characters }).catch((e) =>
        console.error("保存角色数据失败:", e)
      );
      saveTimers[key] = null;
    }, 500);
  },
}));
