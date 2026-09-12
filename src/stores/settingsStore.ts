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

export interface EditorSettings {
  /** 是否开启自动保存 */
  autoSaveEnabled: boolean;
  /** 自动保存间隔（毫秒） */
  autoSaveInterval: number;
  /** 字体大小（rem） */
  fontSize: number;
  /** 行高 */
  lineHeight: number;
  /** 编辑器宽度（字符数） */
  editorWidth: number;
}

interface SettingsStore {
  ai: AISettings;
  editor: EditorSettings;
  updateAISettings: (settings: Partial<AISettings>) => void;
  updateEditorSettings: (settings: Partial<EditorSettings>) => void;
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

const defaultEditorSettings: EditorSettings = {
  autoSaveEnabled: true,
  autoSaveInterval: 30000,
  fontSize: 1.0625,
  lineHeight: 1.95,
  editorWidth: 42,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ai: defaultAISettings,
      editor: defaultEditorSettings,
      updateAISettings: (settings) =>
        set((state) => ({
          ai: { ...state.ai, ...settings },
        })),
      updateEditorSettings: (settings) =>
        set((state) => ({
          editor: { ...state.editor, ...settings },
        })),
    }),
    {
      name: "omni-novel-settings",
    }
  )
);
