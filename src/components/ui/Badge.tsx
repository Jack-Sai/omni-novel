import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export type BadgeVariant =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "outline";

export type BadgeSize = "sm" | "md";

const variantStyles: Record<BadgeVariant, string> = {
  neutral: "border-line bg-subtle text-ink-2",
  primary: "border-primary-line bg-primary-soft text-primary",
  success: "border-success-line bg-success-soft text-success",
  warning: "border-warning-line bg-warning-soft text-warning",
  danger: "border-danger-line bg-danger-soft text-danger",
  outline: "border-line text-ink-2",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-1.5 py-px text-[11px]",
  md: "px-2 py-0.5 text-xs",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** 圆形胶囊；默认为 true */
  pill?: boolean;
}

export function Badge({
  variant = "neutral",
  size = "md",
  pill = true,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 border font-medium leading-normal",
        pill ? "rounded-full" : "rounded",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
