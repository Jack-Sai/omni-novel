import { loadGlobalConfig, saveGlobalConfig } from "../services/storage";

/**
 * 模型管理（#9）：模型注册、收藏与切换历史。
 * 存全局配置 ~/.omni-novel/data/model_library.json，SettingsPage AI tab 使用。
 */

export interface LibraryModel {
  id: string;
  /** 模型标识（ai.model 的值，如 qwen2.5:7b） */
  model: string;
  /** 显示名/备注 */
  label: string;
  favorite: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

export interface SwitchRecord {
  model: string;
  at: string;
}

export interface ModelLibraryState {
  models: LibraryModel[];
  /** 切换历史（新→旧，最多 50 条） */
  history: SwitchRecord[];
}

const FILE = "model_library.json";
const MAX_HISTORY = 50;

const EMPTY: ModelLibraryState = { models: [], history: [] };

let cache: ModelLibraryState | null = null;

export async function loadModelLibrary(): Promise<ModelLibraryState> {
  if (cache) return cache;
  try {
    const data = await loadGlobalConfig<ModelLibraryState>("data", FILE);
    if (data && Array.isArray(data.models) && Array.isArray(data.history)) {
      cache = data;
      return cache;
    }
  } catch (e) {
    console.warn("加载模型库失败:", e);
  }
  cache = { ...EMPTY, models: [], history: [] };
  return cache;
}

export async function saveModelLibrary(state: ModelLibraryState): Promise<void> {
  cache = state;
  await saveGlobalConfig("data", FILE, state);
}

/** 记录一次模型切换：历史头部插入（去重）+ 刷新 lastUsedAt */
export function recordModelSwitch(
  state: ModelLibraryState,
  model: string
): ModelLibraryState {
  if (!model.trim()) return state;
  const now = new Date().toISOString();
  const history: SwitchRecord[] = [
    { model, at: now },
    ...state.history.filter((h) => h.model !== model),
  ].slice(0, MAX_HISTORY);

  const models = state.models.map((m) =>
    m.model === model ? { ...m, lastUsedAt: now } : m
  );
  return { models, history };
}

/** 注册模型到模型库（已存在则更新 label/收藏状态） */
export function registerModel(
  state: ModelLibraryState,
  model: string,
  label: string,
  favorite: boolean
): ModelLibraryState {
  if (!model.trim()) return state;
  const now = new Date().toISOString();
  const existing = state.models.find((m) => m.model === model);
  if (existing) {
    return {
      ...state,
      models: state.models.map((m) =>
        m.id === existing.id
          ? {
              ...m,
              label: label.trim() || m.label,
              favorite: favorite || m.favorite,
              lastUsedAt: now,
            }
          : m
      ),
    };
  }
  const entry: LibraryModel = {
    id: crypto.randomUUID(),
    model: model.trim(),
    label: label.trim() || model.trim(),
    favorite,
    createdAt: now,
    lastUsedAt: now,
  };
  return { ...state, models: [entry, ...state.models] };
}

/** 切换收藏 */
export function toggleFavorite(state: ModelLibraryState, id: string): ModelLibraryState {
  return {
    ...state,
    models: state.models.map((m) =>
      m.id === id ? { ...m, favorite: !m.favorite } : m
    ),
  };
}

export function removeLibraryModel(
  state: ModelLibraryState,
  id: string
): ModelLibraryState {
  return { ...state, models: state.models.filter((m) => m.id !== id) };
}
