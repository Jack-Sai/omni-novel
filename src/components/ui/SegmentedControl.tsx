import type { ElementType } from "react";
import { cn } from "../../lib/cn";

export interface SegmentedItem<T extends string = string> {
  value: T;
  label: string;
  icon?: ElementType;
  count?: number;
}

export interface SegmentedControlProps<T extends string = string> {
  items: SegmentedItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /**
   * segment —— 内嵌式分段控件，适合切换「模式」
   * chip    —— 独立胶囊按钮，适合「筛选」
   */
  variant?: "segment" | "chip";
  size?: "sm" | "md";
  /** 让每个选项均分容器宽度 */
  fill?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  items,
  value,
  onChange,
  variant = "chip",
  size = "md",
  fill = false,
  className,
}: SegmentedControlProps<T>) {
  const isSegment = variant === "segment";

  return (
    <div
      role="group"
      className={cn(
        "flex items-center",
        isSegment
          ? "inline-flex gap-1 rounded-xl border border-line bg-subtle p-1"
          : "gap-2",
        fill && "w-full",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        const Icon = item.icon;

        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-ring)]",
              size === "sm" ? "h-8 px-3 text-[13px]" : "h-9 px-3.5 text-sm",
              isSegment ? "rounded-lg" : "rounded-full border",
              fill && "flex-1",
              isSegment
                ? active
                  ? "bg-surface text-ink shadow-xs"
                  : "text-ink-2 hover:text-ink"
                : active
                  ? "border-primary-line bg-primary-soft text-primary"
                  : "border-line text-ink-2 hover:border-line-strong hover:bg-hover hover:text-ink",
            )}
          >
            {Icon && <Icon size={size === "sm" ? 14 : 15} aria-hidden />}
            {item.label}
            {item.count !== undefined && (
              <span className={cn("tabular-nums", active ? "opacity-70" : "text-ink-3")}>
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
