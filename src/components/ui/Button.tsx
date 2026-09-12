import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "subtle"
  | "danger";

export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary shadow-xs hover:bg-primary-hover",
  secondary:
    "border border-line bg-surface text-ink shadow-xs hover:border-line-strong hover:bg-hover",
  outline: "border border-line text-ink hover:bg-hover",
  ghost: "text-ink-2 hover:bg-hover hover:text-ink",
  subtle: "bg-subtle text-ink-2 hover:bg-hover hover:text-ink",
  danger: "bg-danger text-on-danger shadow-xs hover:brightness-110",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 rounded-lg px-3 text-[13px]",
  md: "h-10 gap-2 rounded-lg px-4 text-sm",
  lg: "h-12 gap-2 rounded-xl px-6 text-[15px]",
  icon: "h-10 w-10 rounded-lg",
  "icon-sm": "h-9 w-9 rounded-lg",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** 显示加载指示器并自动禁用 */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading = false, disabled, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium",
        "transition-[background-color,border-color,color,box-shadow] duration-150 ease-[var(--ease-smooth)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-ring)]",
        "focus-visible:ring-offset-1 focus-visible:ring-offset-canvas",
        "disabled:pointer-events-none disabled:opacity-45",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
});
