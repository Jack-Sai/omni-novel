import type { HTMLAttributes, KeyboardEvent } from "react";
import { cn } from "../../lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** 可点击卡片：补齐键盘可达性与 hover 反馈 */
  interactive?: boolean;
  padded?: boolean;
}

export function Card({
  interactive = false,
  padded = true,
  className,
  children,
  onClick,
  onKeyDown,
  ...props
}: CardProps) {
  const clickable = interactive || !!onClick;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (!clickable || !onClick || event.defaultPrevented) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.currentTarget.click();
    }
  };

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "rounded-xl border border-line bg-surface shadow-xs",
        padded && "p-5",
        clickable &&
          "cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-ring)]",
        clickable && "hover:border-primary-line hover:bg-hover",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
