import { useMemo } from "react";
import { GitCompare } from "lucide-react";
import { Dialog } from "../ui";
import { cn } from "../../lib/cn";
import { computeDiffParts, type DiffPart } from "../../lib/textDiff";

export interface RevisionCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterTitle: string;
  /** 同步点（上次接受/拒绝后）的纯文本 */
  baselineText: string;
  /** 当前纯文本 */
  currentText: string;
}

/** 行级对比视图：基线 vs 当前（行内变化以整行着色展示） */
export function RevisionCompareDialog({
  open,
  onOpenChange,
  chapterTitle,
  baselineText,
  currentText,
}: RevisionCompareDialogProps) {
  const parts = useMemo<DiffPart[]>(
    () => (open ? computeDiffParts(baselineText, currentText) : []),
    [open, baselineText, currentText],
  );

  const hasDiff = parts.some((p) => p.added || p.removed);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="修订对比"
      description={`${chapterTitle}：同步点（上次接受/拒绝后） vs 当前正文`}
      icon={GitCompare}
      size="xl"
      footer={
        <button
          type="button"
          className="rounded-lg border border-line px-4 py-2 text-sm text-ink-2 hover:bg-hover"
          onClick={() => onOpenChange(false)}
        >
          关闭
        </button>
      }
    >
      <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-line bg-surface font-mono text-[12.5px] leading-relaxed">
        {parts.length === 0 ? (
          <p className="px-4 py-6 text-center font-sans text-[13px] text-ink-3">
            两侧内容一致，暂无差异
          </p>
        ) : (
          parts.map((p, i) => {
            const lines = p.value.split("\n");
            return lines.map((line, j) => {
              // diff 片段尾部常带换行，渲染为独立行；末行无内容时跳过
              const isLast = j === lines.length - 1;
              if (isLast && line === "") return null;
              return (
                <div
                  key={`${i}-${j}`}
                  className={cn(
                    "whitespace-pre-wrap px-3",
                    p.added && "bg-success-soft text-success",
                    p.removed && "bg-danger-soft text-danger line-through decoration-danger/40",
                    !p.added && !p.removed && "text-ink-2",
                  )}
                >
                  <span className="select-none text-ink-3">
                    {p.added ? "+" : p.removed ? "-" : " "}
                    {" "}
                  </span>
                  {line || " "}
                </div>
              );
            });
          })
        )}
      </div>
      {!hasDiff && parts.length > 0 && (
        <p className="mt-2 text-[12px] text-ink-3">两侧文本无实质差异。</p>
      )}
    </Dialog>
  );
}
