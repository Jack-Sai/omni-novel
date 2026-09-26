import { cn } from "../../lib/cn";

export interface SkeletonProps {
  className?: string;
}

/** 骨架屏占位块：加载态统一使用（animate-pulse） */
export function Skeleton({ className }: SkeletonProps) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-line", className)} />;
}

export interface SkeletonCardProps {
  className?: string;
}

/** 骨架卡片：多行文本占位，用于列表加载 */
export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div
      aria-hidden
      className={cn("space-y-3 rounded-xl border border-line bg-surface p-4", className)}
    >
      <div className="flex gap-2">
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-4 w-14" />
      </div>
      <Skeleton className="h-4 w-2/3" />
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </div>
      <Skeleton className="h-3 w-24" />
    </div>
  );
}
