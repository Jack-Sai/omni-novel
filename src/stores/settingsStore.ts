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
  /** 发送给模型的最近消息条数（上下文窗口） */
  contextMessageCount: number;
  /** 发送前检索相关记忆注入上下文（记忆系统） */
  memoryInject: boolean;
  /** llama-server.exe 路径（仅 llamacpp 后端） */
  llamaServerPath: string;
  /** GGUF 模型文件路径（仅 llamacpp 后端） */
  llamaModelPath: string;
  /** llama-server 额外启动参数（不含 -m / --host / --port） */
  llamaExtraArgs: string;
  /** 空闲多少分钟后自动卸载，0 = 不卸载 */
  idleUnloadMinutes: number;
  /** 续写字数（0 = 不指定，仅写入提示词约定篇幅，不强制截断） */
  continuationLength: number;
}

export interface EditorSettings {
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
  /** 正文字号（rem，1 = 16px） */
  fontSize: number;
  /** 正文行高（倍数） */
  lineHeight: number;
  /** 正文字体（CSS font stack，"" = 默认衬线） */
  fontFamily: string;
  editorWidth: number;
  /** 打字机滚动：输入时保持光标在视口中部 */
  typewriterScroll: boolean;
  /** 章节目标字数（0 = 不显示进度） */
  chapterWordTarget: number;
}

/** llama.cpp 模型档案：记录模型位置与启动参数，切换模型时一键套用 */
export interface ModelPreset {
  id: string;
  name: string;
  /** GGUF 模型文件路径 */
  llamaModelPath: string;
  /** llama-server 启动参数 */
  llamaExtraArgs: string;
  /** OpenAI 兼容接口的 model 字段 */
  model: string;
  /** 服务端点 */
  baseUrl: string;
  /** 空闲自动卸载分钟数 */
  idleUnloadMinutes: number;
}

interface SettingsStore {
  ai: AISettings;
  editor: EditorSettings;
  /** AI 面板宽度（px），可拖拽调整 */
  aiPanelWidth: number;
  modelPresets: ModelPreset[];
  updateAISettings: (settings: Partial<AISettings>) => void;
  updateEditorSettings: (settings: Partial<EditorSettings>) => void;
  updateAiPanelWidth: (width: number) => void;
  /** 保存模型档案；同名档案覆盖更新 */
  saveModelPreset: (preset: Omit<ModelPreset, "id">) => void;
  removeModelPreset: (id: string) => void;
  /** 将档案字段应用到当前 AI 设置 */
  applyModelPreset: (id: string) => void;
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
  maxTokens: 4096,
  think: true,
  contextMessageCount: 20,
  memoryInject: true,
  llamaServerPath: "D:\\llama.cpp\\llama-server.exe",
  llamaModelPath: "E:\\Models\\Qwen3.8-9B-Q8_0.gguf",
  llamaExtraArgs: "-ngl 99 -c 16384 -fa on --jinja -t 8",
  idleUnloadMinutes: 10,
  continuationLength: 0,
};

const defaultEditorSettings: EditorSettings = {
  autoSaveEnabled: true,
  autoSaveInterval: 30000,
  fontSize: 1.0625,
  lineHeight: 1.95,
  fontFamily: "",
  editorWidth: 42,
  typewriterScroll: false,
  chapterWordTarget: 3000,
};

const AI_PANEL_MIN_WIDTH = 240;
const AI_PANEL_MAX_WIDTH = 720;
const defaultAiPanelWidth = 320;

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useSettingsStore = create<SettingsStore>()((set, get) => ({
  ai: defaultAISettings,
  editor: defaultEditorSettings,
  aiPanelWidth: defaultAiPanelWidth,
  modelPresets: [],

  updateAISettings: (settings) => {
    set((state) => ({ ai: { ...state.ai, ...settings } }));
    get().saveToDisk();
  },

  updateEditorSettings: (settings) => {
    set((state) => ({ editor: { ...state.editor, ...settings } }));
    get().saveToDisk();
  },

  updateAiPanelWidth: (width) => {
    const clamped = Math.min(AI_PANEL_MAX_WIDTH, Math.max(AI_PANEL_MIN_WIDTH, Math.round(width)));
    if (clamped === get().aiPanelWidth) return;
    set({ aiPanelWidth: clamped });
    get().saveToDisk();
  },

  saveModelPreset: (preset) => {
    const { modelPresets } = get();
    const existing = modelPresets.find((p) => p.name === preset.name);
    if (existing) {
      set({
        modelPresets: modelPresets.map((p) =>
          p.id === existing.id ? { ...preset, id: existing.id } : p,
        ),
      });
    } else {
      set({ modelPresets: [...modelPresets, { ...preset, id: crypto.randomUUID() }] });
    }
    get().saveToDisk();
  },

  removeModelPreset: (id) => {
    set((state) => ({ modelPresets: state.modelPresets.filter((p) => p.id !== id) }));
    get().saveToDisk();
  },

  applyModelPreset: (id) => {
    const preset = get().modelPresets.find((p) => p.id === id);
    if (!preset) return;
    get().updateAISettings({
      llamaModelPath: preset.llamaModelPath,
      llamaExtraArgs: preset.llamaExtraArgs,
      model: preset.model,
      baseUrl: preset.baseUrl,
      idleUnloadMinutes: preset.idleUnloadMinutes,
    });
  },

  loadFromDisk: async () => {
    const data = await loadGlobalConfig<{
      ai: AISettings;
      editor: EditorSettings;
      aiPanelWidth?: number;
      modelPresets?: ModelPreset[];
    }>("data", "settings.json");
    if (data) {
      set({
        ai: { ...defaultAISettings, ...data.ai },
        editor: { ...defaultEditorSettings, ...data.editor },
        aiPanelWidth: data.aiPanelWidth ?? defaultAiPanelWidth,
        modelPresets: data.modelPresets ?? [],
      });
    }
  },

  saveToDisk: () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const { ai, editor, aiPanelWidth, modelPresets } = get();
      saveGlobalConfig("data", "settings.json", { ai, editor, aiPanelWidth, modelPresets }).catch((e) =>
        console.error("保存设置失败:", e)
      );
    }, 500);
  },
}));
