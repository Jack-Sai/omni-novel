import type { ElementType, ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface PageProps {
  children: ReactNode;
  className?: string;
}

/** 页面外壳：纵向撑满、内容区独立滚动 */
export function Page({ children, className }: PageProps) {
  return <div className={cn("flex h-full flex-col bg-canvas", className)}>{children}</div>;
}

export interface PageHeaderProps {
  /** 标题左侧的返回按钮等 */
  leading?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** 右侧操作区 */
  actions?: ReactNode;
  className?: string;
}

/** 页面标题栏：所有页面统一高度、内边距与分隔线 */
export function PageHeader({
  leading,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex shrink-0 items-center gap-4 border-b border-line bg-surface px-10 py-6",
        className,
      )}
    >
      {leading}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 truncate text-sm text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2.5">{actions}</div>}
    </header>
  );
}

export interface PageBodyProps {
  children: ReactNode;
  /** reading 会把内容收进窄栏并居中，适合表单/长文 */
  width?: "full" | "reading";
  /** 关闭内边距，供编辑器类全出血布局使用 */
  padded?: boolean;
  /** 内容在剩余高度内垂直居中，适合空态 */
  center?: boolean;
  className?: string;
}

export function PageBody({
  children,
  width = "full",
  padded = true,
  center = false,
  className,
}: PageBodyProps) {
  const padding = padded ? "px-10 py-8" : undefined;
  const centering = center && "flex min-h-full items-center justify-center";

  return (
    <div className={cn("flex-1 overflow-auto", className)}>
      {width === "reading" ? (
        /* 用 flex 居中而非 mx-auto：不易被其它样式意外覆盖 */
        <div className="flex w-full justify-center">
          <div className={cn("w-full max-w-3xl", centering, padding)}>{children}</div>
        </div>
      ) : (
        <div className={cn("w-full", centering, padding)}>{children}</div>
      )}
    </div>
  );
}

/** 页面内的分组区块标题 */
export function SectionTitle({
  icon: Icon,
  children,
  actions,
  className,
}: {
  icon?: ElementType;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        {Icon && <Icon size={15} className="text-ink-3" aria-hidden />}
        {children}
      </h2>
      {actions}
    </div>
  );
}
