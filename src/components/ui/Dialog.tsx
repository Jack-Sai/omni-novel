import type { ElementType, ReactNode } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";

const sizeStyles = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
} as const;

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: ElementType;
  children?: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof sizeStyles;
  /** 隐藏标题栏，用于命令面板一类的自定义头部 */
  hideHeader?: boolean;
  /** 去掉内容区默认内边距 */
  flush?: boolean;
  /** center 居中对话框；top 贴近顶部，适合命令面板 */
  position?: "center" | "top";
  className?: string;
}

/**
 * 统一的对话框：Radix 提供焦点管理与无障碍，这里只负责视觉。
 * 遮罩与面板动画定义在 index.css 的 .omni-overlay / .omni-panel(-top)。
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  children,
  footer,
  size = "md",
  hideHeader = false,
  flush = false,
  position = "center",
  className,
}: DialogProps) {
  const isTop = position === "top";

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className={cn(
            "omni-overlay fixed inset-0 z-50 flex bg-[var(--app-scrim)]",
            isTop
              ? "items-start justify-center p-4 pt-[12vh]"
              : "items-center justify-center p-4",
          )}
        >
          <RadixDialog.Content
            className={cn(
              "max-h-[85dvh] w-full overflow-y-auto rounded-2xl border border-line bg-elevated shadow-xl",
              "focus:outline-none",
              isTop ? "omni-panel omni-panel-top" : "omni-panel",
              sizeStyles[size],
              className,
            )}
          >
          {hideHeader ? (
            <RadixDialog.Title className="sr-only">{title}</RadixDialog.Title>
          ) : (
            <div className="flex items-start gap-3 border-b border-line px-6 py-5">
              {Icon && (
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Icon size={18} aria-hidden />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <RadixDialog.Title className="text-base font-semibold tracking-tight text-ink">
                  {title}
                </RadixDialog.Title>
                {description ? (
                  <RadixDialog.Description className="mt-0.5 text-[13px] text-ink-2">
                    {description}
                  </RadixDialog.Description>
                ) : (
                  <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
                )}
              </div>
              <RadixDialog.Close asChild>
                <button
                  type="button"
                  aria-label="关闭"
                  className="rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-ring)]"
                >
                  <X size={18} />
                </button>
              </RadixDialog.Close>
            </div>
          )}

          {children && <div className={cn(!flush && "px-6 py-5")}>{children}</div>}

          {footer && (
            <div className="flex items-center justify-end gap-2.5 border-t border-line bg-subtle px-6 py-4">
              {footer}
            </div>
          )}
        </RadixDialog.Content>
        </RadixDialog.Overlay>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export const DialogClose = RadixDialog.Close;
export const DialogTitle = RadixDialog.Title;
