import { Sun, Moon, Monitor } from "lucide-react";
import {
  useThemeStore,
  type ThemeMode,
  type AccentTheme,
  type SurfaceTone,
  type BorderStyle,
} from "../../stores/themeStore";
import { cn } from "../../lib/cn";

const modes: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "亮色" },
  { value: "dark", icon: Moon, label: "暗色" },
  { value: "system", icon: Monitor, label: "跟随系统" },
];

const accents: { value: AccentTheme; label: string; color: string }[] = [
  { value: "blue", label: "蓝", color: "#3b82f6" },
  { value: "violet", label: "紫", color: "#8b5cf6" },
  { value: "rose", label: "玫", color: "#fb7185" },
  { value: "emerald", label: "绿", color: "#34d399" },
  { value: "amber", label: "琥珀", color: "#fbbf24" },
  { value: "cyan", label: "青", color: "#22d3ee" },
  { value: "slate", label: "岩", color: "#94a3b8" },
];

const tones: { value: SurfaceTone; label: string }[] = [
  { value: "cool", label: "冷调" },
  { value: "warm", label: "暖调" },
  { value: "neutral", label: "中性" },
];

const borders: { value: BorderStyle; label: string }[] = [
  { value: "default", label: "默认" },
  { value: "softer", label: "柔和" },
  { value: "sharper", label: "锐利" },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { mode, accent, tone, border, setMode, setAccent, setTone, setBorder } = useThemeStore();

  return (
    <div className={cn("space-y-5", className)}>
      {/* 亮/暗/跟随系统 */}
      <div>
        <label className="mb-2 block text-[13px] font-medium text-ink-3">模式</label>
        <div
          role="group"
          aria-label="主题模式"
          className="inline-flex items-center gap-1 rounded-xl border border-line bg-subtle p-1"
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
                  "flex h-9 min-w-[3.5rem] items-center justify-center gap-1.5 rounded-lg px-3 text-sm transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-ring)]",
                  active
                    ? "bg-surface text-ink shadow-xs"
                    : "text-ink-2 hover:text-ink",
                )}
              >
                <Icon size={15} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 强调色 */}
      <div>
        <label className="mb-2 block text-[13px] font-medium text-ink-3">强调色</label>
        <div className="flex items-center gap-2">
          {accents.map(({ value, label, color }) => (
            <button
              key={value}
              type="button"
              onClick={() => setAccent(value)}
              title={label}
              aria-label={label}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-ring)]",
                accent === value
                  ? "scale-110 border-ink ring-2 ring-ink/20"
                  : "border-transparent hover:scale-110",
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* 表面底色 */}
      <div>
        <label className="mb-2 block text-[13px] font-medium text-ink-3">色调</label>
        <div className="inline-flex items-center gap-1 rounded-xl border border-line bg-subtle p-1">
          {tones.map(({ value, label }) => {
            const active = tone === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTone(value)}
                className={cn(
                  "h-8 min-w-[3.5rem] rounded-lg px-3 text-[13px] font-medium transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-ring)]",
                  active
                    ? "bg-surface text-ink shadow-xs"
                    : "text-ink-2 hover:text-ink",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 边框风格 */}
      <div>
        <label className="mb-2 block text-[13px] font-medium text-ink-3">边框圆角</label>
        <div className="inline-flex items-center gap-1 rounded-xl border border-line bg-subtle p-1">
          {borders.map(({ value, label }) => {
            const active = border === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setBorder(value)}
                className={cn(
                  "h-8 min-w-[3.5rem] rounded-lg px-3 text-[13px] font-medium transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-ring)]",
                  active
                    ? "bg-surface text-ink shadow-xs"
                    : "text-ink-2 hover:text-ink",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
