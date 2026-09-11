import { create } from "zustand";

type Theme = "light" | "dark" | "system";

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: "system",
  setTheme: (theme) => {
    set({ theme });
    applyTheme(theme);
  },
}));

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  } else {
    root.classList.toggle("dark", theme === "dark");
  }
}

// Initialize theme on load
applyTheme("system");

// Listen for system theme changes
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  const currentTheme = useThemeStore.getState().theme;
  if (currentTheme === "system") {
    document.documentElement.classList.toggle("dark", e.matches);
  }
});
