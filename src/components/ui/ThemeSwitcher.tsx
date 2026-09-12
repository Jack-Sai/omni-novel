import { Sun, Moon } from "lucide-react";
import { useThemeStore, type AccentTheme } from "../../stores/themeStore";
import { cn } from "../../lib/cn";

const accents: { value: AccentTheme; color: string }[] = [
  { value: "blue", color: "#3b82f6" },
  { value: "violet", color: "#8b5cf6" },
  { value: "rose", color: "#fb7185" },
  { value: "emerald", color: "#34d399" },
  { value: "amber", color: "#fbbf24" },
  { value: "cyan", color: "#22d3ee" },
  { value: "slate", color: "#94a3b8" },
];

export function ThemeSwitcher({ className }: { className?: string }) {
  const { mode, accent, setMode, setAccent } = useThemeStore();
  const isDark =
    mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* 亮/暗切换 */}
      <button
        type="button"
        onClick={() => setMode(isDark ? "light" : "dark")}
        title={isDark ? "切换亮色" : "切换暗色"}
        aria-label={isDark ? "切换亮色" : "切换暗色"}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-150",
          "text-ink-3 hover:bg-hover hover:text-ink",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-ring)]",
        )}
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* 强调色切换 */}
      <div className="relative group">
        <button
          type="button"
          title="强调色"
          aria-label="强调色"
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-150",
            "text-ink-3 hover:bg-hover hover:text-ink",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-ring)]",
          )}
        >
          <div
            className="h-4 w-4 rounded-full border-2 border-current"
            style={{ backgroundColor: accents.find((a) => a.value === accent)?.color }}
          />
        </button>

        {/* 悬浮展开色板 */}
        <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
          <div className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-2 py-1.5 shadow-lg">
            {accents.map(({ value, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => setAccent(value)}
                title={value}
                aria-label={value}
                className={cn(
                  "h-5 w-5 rounded-full border-2 transition-all duration-150",
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
    </div>
  );
}
