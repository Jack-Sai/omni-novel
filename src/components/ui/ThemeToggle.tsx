import { Sun, Moon, Monitor } from "lucide-react";
import { useThemeStore } from "../../stores/themeStore";
import { cn } from "../../lib/cn";

const themes = [
  { value: "light", icon: Sun, label: "亮色" },
  { value: "dark", icon: Moon, label: "暗色" },
  { value: "system", icon: Monitor, label: "跟随系统" },
] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useThemeStore();

  return (
    <div
      role="group"
      aria-label="主题"
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-line bg-surface p-1",
        className,
      )}
    >
      {themes.map(({ value, icon: Icon, label }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            title={label}
            aria-label={label}
            aria-pressed={active}
            className={cn(
              "flex h-8 flex-1 items-center justify-center rounded-lg transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-ring)]",
              active
                ? "bg-primary-soft text-primary"
                : "text-ink-3 hover:bg-hover hover:text-ink",
            )}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}
