import { Sun, Moon, Monitor } from "lucide-react";
import { useThemeStore } from "../../stores/themeStore";

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  const themes = [
    { value: "light" as const, icon: Sun, label: "亮色" },
    { value: "dark" as const, icon: Moon, label: "暗色" },
    { value: "system" as const, icon: Monitor, label: "跟随系统" },
  ];

  return (
    <div className="flex gap-1 rounded-lg border border-[var(--color-border)] p-1">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition
            ${
              theme === value
                ? "bg-[var(--color-primary)] text-white"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
            }`}
          title={label}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
