import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface CharacterStore {
  characters: Character[];
  currentCharacter: Character | null;
  addCharacter: (projectId: string, name: string) => void;
  setCurrentCharacter: (character: Character | null) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  getCharactersByProject: (projectId: string) => Character[];
}

export const useCharacterStore = create<CharacterStore>()(
  persist(
    (set, get) => ({
      characters: [],
      currentCharacter: null,
      addCharacter: (projectId, name) => {
        const newCharacter: Character = {
          id: crypto.randomUUID(),
          projectId,
          name,
          aliases: [],
          gender: "",
          age: "",
          appearance: "",
          personality: "",
          background: "",
          goals: "",
          conflicts: "",
          relationships: "",
          notes: "",
          tags: [],
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
    }),
    {
      name: "omni-novel-characters",
    }
  )
);
