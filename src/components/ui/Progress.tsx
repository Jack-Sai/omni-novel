import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface ProgressProps {
  value: number;
  max?: number;
  tone?: "primary" | "success" | "warning" | "danger";
  className?: string;
}

const toneStyles = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
} as const;

export function Progress({ value, max = 100, tone = "primary", className }: ProgressProps) {
  const percent = max > 0 ? Math.min(Math.max((value / max) * 100, 0), 100) : 0;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-subtle", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", toneStyles[tone])}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export interface MetricRowProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}

/** 编辑器侧栏里的指标行：左标签右数值 */
export function MetricRow({ label, value, hint }: MetricRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-2.5 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[13px] text-ink-2">{label}</p>
        {hint && <p className="text-[11px] text-ink-3">{hint}</p>}
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">{value}</span>
    </div>
  );
}
