import { create } from "zustand";
import zh from "./locales/zh";
import en from "./locales/en";

/**
 * 轻量 i18n（v1.3.3 国际化）：
 * - 语言包为 TS 对象（zh / en），t(key) 按 overrides → 目标语言 → 中文 → key 兜底
 * - 翻译管理：overrides 存 localStorage，可逐条覆盖语言包并重置
 * - useT() 订阅 lang/overrides，切换语言时订阅组件重渲染；App 根按 lang remount 保证全量刷新
 */
export type Lang = "zh" | "en";

export const LANG_OPTIONS: { value: Lang; label: string; nativeLabel: string }[] = [
  { value: "zh", label: "中文", nativeLabel: "中文" },
  { value: "en", label: "英文", nativeLabel: "English" },
];

/** Intl locale 映射 */
export const LANG_LOCALE: Record<Lang, string> = { zh: "zh-CN", en: "en-US" };

const packs: Record<Lang, Record<string, string>> = { zh, en };

const STORAGE_KEY = "omni-i18n";

interface Persisted {
  lang?: Lang;
  overrides?: Partial<Record<Lang, Record<string, string>>>;
}

function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : {};
  } catch {
    return {};
  }
}

function persist(state: { lang: Lang; overrides: Partial<Record<Lang, Record<string, string>>> }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储不可用时静默（语言选择仅本次会话生效）
  }
}

interface I18nState {
  lang: Lang;
  overrides: Partial<Record<Lang, Record<string, string>>>;
  setLang: (lang: Lang) => void;
  /** 编辑翻译覆盖；value 为空串表示恢复语言包默认值 */
  updateOverride: (lang: Lang, key: string, value: string) => void;
  resetOverrides: () => void;
}

const initial = loadPersisted();

export const useI18nStore = create<I18nState>()((set, get) => ({
  lang: initial.lang ?? "zh",
  overrides: initial.overrides ?? {},

  setLang: (lang) => {
    set({ lang });
    persist({ lang, overrides: get().overrides });
  },

  updateOverride: (lang, key, value) => {
    const overrides = { ...get().overrides };
    const pack = { ...(overrides[lang] ?? {}) };
    if (value === "") delete pack[key];
    else pack[key] = value;
    overrides[lang] = pack;
    set({ overrides });
    persist({ lang: get().lang, overrides });
  },

  resetOverrides: () => {
    set({ overrides: {} });
    persist({ lang: get().lang, overrides: {} });
  },
}));

function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  let out = text;
  for (const [k, v] of Object.entries(params)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

/** 翻译（非 hook 场景；组件内请用 useT 触发订阅） */
export function t(key: string, params?: Record<string, string | number>): string {
  const { lang, overrides } = useI18nStore.getState();
  const text =
    overrides[lang]?.[key] ?? packs[lang][key] ?? packs.zh[key] ?? key;
  return interpolate(text, params);
}

/** 组件内翻译：订阅语言与覆盖变化，切换后自动重渲染 */
export function useT(): typeof t {
  useI18nStore((s) => s.lang);
  useI18nStore((s) => s.overrides);
  return t;
}

/** 语言包全部 key（翻译管理列表） */
export function allKeys(): string[] {
  const keys = new Set<string>(Object.keys(packs.zh));
  for (const k of Object.keys(packs.en)) keys.add(k);
  return [...keys].sort();
}

/** 读取某 key 在指定语言的打包值（不含 overrides） */
export function packValue(lang: Lang, key: string): string {
  return packs[lang][key] ?? "";
}

/** 当前生效值（含 overrides），供翻译管理展示 */
export function effectiveValue(lang: Lang, key: string): string {
  const { overrides } = useI18nStore.getState();
  return overrides[lang]?.[key] ?? packs[lang][key] ?? packs.zh[key] ?? key;
}
