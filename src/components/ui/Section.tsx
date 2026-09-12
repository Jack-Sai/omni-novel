import type { ElementType, ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface SectionProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ElementType;
  actions?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
  className?: string;
}

/** 带标题栏的内容区块：设置页等信息密集页面统一用它分节 */
export function Section({
  title,
  description,
  icon: Icon,
  actions,
  children,
  contentClassName,
  className,
}: SectionProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-line bg-surface shadow-xs",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
        {Icon && <Icon size={16} className="shrink-0 text-ink-3" aria-hidden />}
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-ink-3">{description}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      <div className={cn("p-5", contentClassName)}>{children}</div>
    </section>
  );
}

export interface SettingRowProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** 左说明右控件的设置行 */
export function SettingRow({ title, description, children, className }: SettingRowProps) {
  return (
    <div
      className={cn("flex flex-wrap items-center justify-between gap-4", className)}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        {description && <p className="mt-0.5 text-[13px] text-ink-3">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
