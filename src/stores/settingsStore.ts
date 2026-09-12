import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BackendType } from "../services/aiService";

export interface AISettings {
  backend: BackendType;
  baseUrl: string;
  model: string;
  apiKey: string;
  temperature: number;
  topP: number;
  topK: number;
  repeatPenalty: number;
  maxTokens: number;
  /** 关闭模型内部思考/推理，节省上下文并加快响应速度 */
  think: boolean;
}

interface SettingsStore {
  ai: AISettings;
  updateAISettings: (settings: Partial<AISettings>) => void;
}

const defaultAISettings: AISettings = {
  backend: "ollama",
  baseUrl: "http://localhost:11434",
  model: "qwen2.5:7b",
  apiKey: "",
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  repeatPenalty: 1.1,
  maxTokens: 2048,
  think: true,
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
