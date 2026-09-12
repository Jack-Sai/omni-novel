import type { ElementType, KeyboardEvent, ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ElementType;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger";
  hint?: ReactNode;
  align?: "center" | "left";
  className?: string;
}

const toneStyles = {
  neutral: "border-line bg-surface text-ink",
  primary: "border-primary-line bg-primary-soft text-primary",
  success: "border-success-line bg-success-soft text-success",
  warning: "border-warning-line bg-warning-soft text-warning",
  danger: "border-danger-line bg-danger-soft text-danger",
} as const;

/** 统计卡片：伏笔状态、字数概览等指标统一用这个 */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  hint,
  align = "center",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        toneStyles[tone],
        align === "center" && "text-center",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5",
          align === "center" && "justify-center",
        )}
      >
        {Icon && <Icon size={14} aria-hidden className="opacity-70" />}
        <span
          className={cn(
            "text-[13px] font-medium",
            tone === "neutral" ? "text-ink-2" : "opacity-80",
          )}
        >
          {label}
        </span>
      </div>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {hint && (
        <p className={cn("mt-1 text-[12px]", tone === "neutral" ? "text-ink-3" : "opacity-70")}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function Kbd({
  children,
  className,
  onKeyDown,
}: {
  children: ReactNode;
  className?: string;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
}) {
  return (
    <kbd
      onKeyDown={onKeyDown}
      className={cn(
        "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-line",
        "bg-subtle px-1.5 font-mono text-[11px] font-medium text-ink-2",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
