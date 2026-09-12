import { Sun, Moon, Monitor } from "lucide-react";
import { useThemeStore, type ThemeMode, type AccentTheme } from "../../stores/themeStore";
import { cn } from "../../lib/cn";

const modes: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "亮色" },
  { value: "dark", icon: Moon, label: "暗色" },
  { value: "system", icon: Monitor, label: "跟随系统" },
];

const accents: { value: AccentTheme; label: string; color: string }[] = [
  { value: "blue", label: "蓝色", color: "#3b82f6" },
  { value: "violet", label: "紫色", color: "#8b5cf6" },
  { value: "rose", label: "玫红", color: "#fb7185" },
  { value: "emerald", label: "翠绿", color: "#34d399" },
  { value: "amber", label: "琥珀", color: "#fbbf24" },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { mode, accent, setMode, setAccent } = useThemeStore();

  return (
    <div className={cn("space-y-3", className)}>
      {/* 亮/暗/跟随系统 */}
      <div
        role="group"
        aria-label="主题模式"
        className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface p-1"
      >
        {modes.map(({ value, icon: Icon, label }) => {
          const active = mode === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              title={label}
              aria-label={label}
              aria-pressed={active}
              className={cn(
                "flex h-9 min-w-[3rem] items-center justify-center gap-1.5 rounded-lg px-3 text-sm transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-ring)]",
                active
                  ? "bg-primary-soft text-primary"
                  : "text-ink-3 hover:bg-hover hover:text-ink",
              )}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>

      {/* 强调色 */}
      <div className="flex items-center gap-2">
        <span className="text-[13px] text-ink-3">强调色</span>
        <div className="flex items-center gap-1.5">
          {accents.map(({ value, label, color }) => (
            <button
              key={value}
              type="button"
              onClick={() => setAccent(value)}
              title={label}
              aria-label={label}
              className={cn(
                "h-6 w-6 rounded-full border-2 transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-ring)]",
                accent === value
                  ? "scale-110 border-ink"
                  : "border-transparent hover:scale-110",
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
