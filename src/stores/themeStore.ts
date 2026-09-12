import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";
export type AccentTheme = "blue" | "violet" | "rose" | "emerald" | "amber" | "cyan" | "slate";
export type SurfaceTone = "cool" | "warm" | "neutral";
export type BorderStyle = "default" | "softer" | "sharper";

interface ThemeStore {
  mode: ThemeMode;
  accent: AccentTheme;
  tone: SurfaceTone;
  border: BorderStyle;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentTheme) => void;
  setTone: (tone: SurfaceTone) => void;
  setBorder: (border: BorderStyle) => void;
}

/* ── 强调色 ── */
const accentDefs: Record<AccentTheme, { light: Record<string, string>; dark: Record<string, string> }> = {
  blue: {
    light: { "--app-primary": "#2563eb", "--app-primary-hover": "#1d4ed8", "--app-primary-soft": "#eef4ff", "--app-primary-line": "#c7d9fd" },
    dark:  { "--app-primary": "#3b82f6", "--app-primary-hover": "#60a5fa", "--app-primary-soft": "#15263d", "--app-primary-line": "#1e3a5f" },
  },
  violet: {
    light: { "--app-primary": "#7c3aed", "--app-primary-hover": "#6d28d9", "--app-primary-soft": "#f3f0ff", "--app-primary-line": "#ddd6fe" },
    dark:  { "--app-primary": "#8b5cf6", "--app-primary-hover": "#a78bfa", "--app-primary-soft": "#1e1836", "--app-primary-line": "#2e1f5e" },
  },
  rose: {
    light: { "--app-primary": "#e11d48", "--app-primary-hover": "#be123c", "--app-primary-soft": "#fff1f2", "--app-primary-line": "#fecdd3" },
    dark:  { "--app-primary": "#fb7185", "--app-primary-hover": "#fda4af", "--app-primary-soft": "#2c1320", "--app-primary-line": "#4c1d2e" },
  },
  emerald: {
    light: { "--app-primary": "#059669", "--app-primary-hover": "#047857", "--app-primary-soft": "#ecfdf5", "--app-primary-line": "#a7f3d0" },
    dark:  { "--app-primary": "#34d399", "--app-primary-hover": "#6ee7b7", "--app-primary-soft": "#0d2818", "--app-primary-line": "#1a4d30" },
  },
  amber: {
    light: { "--app-primary": "#d97706", "--app-primary-hover": "#b45309", "--app-primary-soft": "#fffbeb", "--app-primary-line": "#fde68a" },
    dark:  { "--app-primary": "#fbbf24", "--app-primary-hover": "#fcd34d", "--app-primary-soft": "#2c2310", "--app-primary-line": "#4a3a15" },
  },
  cyan: {
    light: { "--app-primary": "#0891b2", "--app-primary-hover": "#0e7490", "--app-primary-soft": "#ecfeff", "--app-primary-line": "#a5f3fc" },
    dark:  { "--app-primary": "#22d3ee", "--app-primary-hover": "#67e8f9", "--app-primary-soft": "#0c2d33", "--app-primary-line": "#155e6b" },
  },
  slate: {
    light: { "--app-primary": "#475569", "--app-primary-hover": "#334155", "--app-primary-soft": "#f8fafc", "--app-primary-line": "#cbd5e1" },
    dark:  { "--app-primary": "#94a3b8", "--app-primary-hover": "#cbd5e1", "--app-primary-soft": "#1a2030", "--app-primary-line": "#334155" },
  },
};

/* ── 表面底色 ── */
const toneDefs: Record<SurfaceTone, { light: Record<string, string>; dark: Record<string, string> }> = {
  cool: {
    light: { "--app-subtle": "#f1f5f9", "--app-canvas": "#f8fafc", "--app-surface": "#ffffff", "--app-elevated": "#ffffff", "--app-hover": "#e8eef6" },
    dark:  { "--app-subtle": "#0a0e15", "--app-canvas": "#0e131b", "--app-surface": "#161d28", "--app-elevated": "#1c2532", "--app-hover": "#202b3a" },
  },
  warm: {
    light: { "--app-subtle": "#faf8f5", "--app-canvas": "#fdfcfa", "--app-surface": "#ffffff", "--app-elevated": "#ffffff", "--app-hover": "#f0ebe3" },
    dark:  { "--app-subtle": "#12100d", "--app-canvas": "#181511", "--app-surface": "#1f1b16", "--app-elevated": "#262219", "--app-hover": "#2e2920" },
  },
  neutral: {
    light: { "--app-subtle": "#f3f3f3", "--app-canvas": "#fafafa", "--app-surface": "#ffffff", "--app-elevated": "#ffffff", "--app-hover": "#ebebeb" },
    dark:  { "--app-subtle": "#0d0d0d", "--app-canvas": "#141414", "--app-surface": "#1c1c1c", "--app-elevated": "#242424", "--app-hover": "#2a2a2a" },
  },
};

/* ── 边框风格 ── */
const borderDefs: Record<BorderStyle, { light: Record<string, string>; dark: Record<string, string> }> = {
  default: {
    light: { "--app-line": "#e6ebf2", "--app-line-strong": "#cbd5e1" },
    dark:  { "--app-line": "#242e3c", "--app-line-strong": "#46566e" },
  },
  softer: {
    light: { "--app-line": "#eef1f5", "--app-line-strong": "#dde3ea" },
    dark:  { "--app-line": "#1e2733", "--app-line-strong": "#384758" },
  },
  sharper: {
    light: { "--app-line": "#d5dbe3", "--app-line-strong": "#b0bcca" },
    dark:  { "--app-line": "#2c3a4a", "--app-line-strong": "#556878" },
  },
};

/* ── 圆角 ── */
const radiusDefs: Record<BorderStyle, Record<string, string>> = {
  default: {},
  softer:  { "--radius-xs": "8px", "--radius-sm": "10px", "--radius-md": "12px", "--radius-lg": "14px", "--radius-xl": "18px", "--radius-2xl": "22px" },
  sharper: { "--radius-xs": "4px", "--radius-sm": "5px", "--radius-md": "6px", "--radius-lg": "8px", "--radius-xl": "10px", "--radius-2xl": "12px" },
};

function getIsDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function setVars(record: Record<string, string>) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(record)) {
    root.style.setProperty(key, value);
  }
}

function applyTheme(mode: ThemeMode, accent: AccentTheme, tone: SurfaceTone, border: BorderStyle) {
  const root = document.documentElement;
  const isDark = getIsDark(mode);

  root.classList.toggle("dark", isDark);

  setVars(accentDefs[accent][isDark ? "dark" : "light"]);
  setVars(toneDefs[tone][isDark ? "dark" : "light"]);
  setVars(borderDefs[border][isDark ? "dark" : "light"]);
  setVars(radiusDefs[border]);
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      mode: "system",
      accent: "blue",
      tone: "cool",
      border: "default",
      setMode: (mode) => {
        set({ mode });
        const s = get();
        applyTheme(mode, s.accent, s.tone, s.border);
      },
      setAccent: (accent) => {
        set({ accent });
        const s = get();
        applyTheme(s.mode, accent, s.tone, s.border);
      },
      setTone: (tone) => {
        set({ tone });
        const s = get();
        applyTheme(s.mode, s.accent, tone, s.border);
      },
      setBorder: (border) => {
        set({ border });
        const s = get();
        applyTheme(s.mode, s.accent, s.tone, border);
      },
    }),
    {
      name: "omni-novel-theme",
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.mode, state.accent, state.tone, state.border);
        }
      },
    },
  ),
);

// Initialize theme on load
const init = useThemeStore.getState();
applyTheme(init.mode, init.accent, init.tone, init.border);

// Listen for system theme changes
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  const { mode, accent, tone, border } = useThemeStore.getState();
  if (mode === "system") {
    applyTheme(mode, accent, tone, border);
  }
});
