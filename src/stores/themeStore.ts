import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";
export type AccentTheme = "blue" | "violet" | "rose" | "emerald" | "amber";

interface ThemeStore {
  mode: ThemeMode;
  accent: AccentTheme;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentTheme) => void;
}

const accentDefs: Record<AccentTheme, { light: Record<string, string>; dark: Record<string, string> }> = {
  blue: {
    light: {
      "--app-primary": "#2563eb",
      "--app-primary-hover": "#1d4ed8",
      "--app-primary-soft": "#eef4ff",
      "--app-primary-line": "#c7d9fd",
    },
    dark: {
      "--app-primary": "#3b82f6",
      "--app-primary-hover": "#60a5fa",
      "--app-primary-soft": "#15263d",
      "--app-primary-line": "#1e3a5f",
    },
  },
  violet: {
    light: {
      "--app-primary": "#7c3aed",
      "--app-primary-hover": "#6d28d9",
      "--app-primary-soft": "#f3f0ff",
      "--app-primary-line": "#ddd6fe",
    },
    dark: {
      "--app-primary": "#8b5cf6",
      "--app-primary-hover": "#a78bfa",
      "--app-primary-soft": "#1e1836",
      "--app-primary-line": "#2e1f5e",
    },
  },
  rose: {
    light: {
      "--app-primary": "#e11d48",
      "--app-primary-hover": "#be123c",
      "--app-primary-soft": "#fff1f2",
      "--app-primary-line": "#fecdd3",
    },
    dark: {
      "--app-primary": "#fb7185",
      "--app-primary-hover": "#fda4af",
      "--app-primary-soft": "#2c1320",
      "--app-primary-line": "#4c1d2e",
    },
  },
  emerald: {
    light: {
      "--app-primary": "#059669",
      "--app-primary-hover": "#047857",
      "--app-primary-soft": "#ecfdf5",
      "--app-primary-line": "#a7f3d0",
    },
    dark: {
      "--app-primary": "#34d399",
      "--app-primary-hover": "#6ee7b7",
      "--app-primary-soft": "#0d2818",
      "--app-primary-line": "#1a4d30",
    },
  },
  amber: {
    light: {
      "--app-primary": "#d97706",
      "--app-primary-hover": "#b45309",
      "--app-primary-soft": "#fffbeb",
      "--app-primary-line": "#fde68a",
    },
    dark: {
      "--app-primary": "#fbbf24",
      "--app-primary-hover": "#fcd34d",
      "--app-primary-soft": "#2c2310",
      "--app-primary-line": "#4a3a15",
    },
  },
};

function getIsDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyAccent(accent: AccentTheme, isDark: boolean) {
  const root = document.documentElement;
  const vars = isDark ? accentDefs[accent].dark : accentDefs[accent].light;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

function applyTheme(mode: ThemeMode, accent: AccentTheme) {
  const root = document.documentElement;
  const isDark = getIsDark(mode);
  root.classList.toggle("dark", isDark);
  applyAccent(accent, isDark);
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      mode: "system",
      accent: "blue",
      setMode: (mode) => {
        set({ mode });
        applyTheme(mode, get().accent);
      },
      setAccent: (accent) => {
        set({ accent });
        applyTheme(get().mode, accent);
      },
    }),
    {
      name: "omni-novel-theme",
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.mode, state.accent);
        }
      },
    },
  ),
);

// Initialize theme on load
applyTheme(
  useThemeStore.getState().mode,
  useThemeStore.getState().accent,
);

// Listen for system theme changes
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  const { mode, accent } = useThemeStore.getState();
  if (mode === "system") {
    applyTheme(mode, accent);
  }
});
