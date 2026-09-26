import type { ElementType, ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface EmptyStateProps {
  icon?: ElementType;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  size?: "sm" | "md";
  className?: string;
}

/** 统一空态：所有页面的「还没有内容」都走这里，保证图标尺寸与间距一致 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "md",
  className,
}: EmptyStateProps) {
  const isSmall = size === "sm";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        isSmall ? "gap-2.5 p-6" : "gap-4 p-10",
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "omni-pop flex items-center justify-center rounded-full bg-subtle text-ink-3 ring-4 ring-primary-soft/50",
            isSmall ? "h-12 w-12" : "h-16 w-16",
          )}
        >
          <Icon size={isSmall ? 20 : 28} aria-hidden />
        </div>
      )}
      <p className={cn("font-medium text-ink", isSmall ? "text-sm" : "text-base")}>{title}</p>
      {description && (
        <p className={cn("max-w-sm leading-relaxed text-ink-3", isSmall ? "text-[13px]" : "text-sm")}>
          {description}
        </p>
      )}
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}
