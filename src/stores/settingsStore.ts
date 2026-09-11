import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AISettings {
  baseUrl: string;
  model: string;
  temperature: number;
  topP: number;
  topK: number;
  repeatPenalty: number;
  maxTokens: number;
}

interface SettingsStore {
  ai: AISettings;
  updateAISettings: (settings: Partial<AISettings>) => void;
}

const defaultAISettings: AISettings = {
  baseUrl: "http://localhost:11434",
  model: "qwen2.5:7b",
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  repeatPenalty: 1.1,
  maxTokens: 2048,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ai: defaultAISettings,
      updateAISettings: (settings) =>
        set((state) => ({
          ai: { ...state.ai, ...settings },
        })),
    }),
    {
      name: "omni-novel-settings",
    }
  )
);
