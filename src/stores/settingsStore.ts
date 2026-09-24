import { create } from "zustand";
import { saveGlobalConfig, loadGlobalConfig } from "../services/storage";
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
  think: boolean;
  /** llama-server.exe 路径（仅 llamacpp 后端） */
  llamaServerPath: string;
  /** GGUF 模型文件路径（仅 llamacpp 后端） */
  llamaModelPath: string;
  /** llama-server 额外启动参数（不含 -m / --host / --port） */
  llamaExtraArgs: string;
  /** 空闲多少分钟后自动卸载，0 = 不卸载 */
  idleUnloadMinutes: number;
}

export interface EditorSettings {
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
  fontSize: number;
  lineHeight: number;
  editorWidth: number;
}

interface SettingsStore {
  ai: AISettings;
  editor: EditorSettings;
  updateAISettings: (settings: Partial<AISettings>) => void;
  updateEditorSettings: (settings: Partial<EditorSettings>) => void;
  loadFromDisk: () => Promise<void>;
  saveToDisk: () => void;
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
  llamaServerPath: "D:\\llama.cpp\\llama-server.exe",
  llamaModelPath: "E:\\Models\\Qwen3.8-9B-Q8_0.gguf",
  llamaExtraArgs: "-ngl 99 -c 16384 -fa on --jinja -t 8",
  idleUnloadMinutes: 10,
};

const defaultEditorSettings: EditorSettings = {
  autoSaveEnabled: true,
  autoSaveInterval: 30000,
  fontSize: 1.0625,
  lineHeight: 1.95,
  editorWidth: 42,
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useSettingsStore = create<SettingsStore>()((set, get) => ({
  ai: defaultAISettings,
  editor: defaultEditorSettings,

  updateAISettings: (settings) => {
    set((state) => ({ ai: { ...state.ai, ...settings } }));
    get().saveToDisk();
  },

  updateEditorSettings: (settings) => {
    set((state) => ({ editor: { ...state.editor, ...settings } }));
    get().saveToDisk();
  },

  loadFromDisk: async () => {
    const data = await loadGlobalConfig<{ ai: AISettings; editor: EditorSettings }>("data", "settings.json");
    if (data) {
      set({
        ai: { ...defaultAISettings, ...data.ai },
        editor: { ...defaultEditorSettings, ...data.editor },
      });
    }
  },

  saveToDisk: () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const { ai, editor } = get();
      saveGlobalConfig("data", "settings.json", { ai, editor }).catch((e) =>
        console.error("保存设置失败:", e)
      );
    }, 500);
  },
}));
