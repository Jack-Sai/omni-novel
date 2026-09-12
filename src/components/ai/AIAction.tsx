import { useState } from "react";
import {
  BookOpen,
  Loader2,
  Maximize2,
  Minimize2,
  PenTool,
  Sparkles,
  X,
} from "lucide-react";
import { ollama, getSystemPrompt, PromptKey } from "../../services";
import { Button } from "../ui";
import { cn } from "../../lib/cn";

interface AIActionProps {
  selectedText: string;
  onApply: (result: string) => void;
  onClose: () => void;
}

const actions = [
  { key: "continuation" as PromptKey, label: "续写", icon: PenTool, needsSelection: false },
  { key: "polish" as PromptKey, label: "润色", icon: BookOpen, needsSelection: true },
  { key: "expand" as PromptKey, label: "扩写", icon: Maximize2, needsSelection: true },
  { key: "compress" as PromptKey, label: "缩写", icon: Minimize2, needsSelection: true },
];

export function AIAction({ selectedText, onApply, onClose }: AIActionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<PromptKey | null>(null);

  const handleAction = async (actionKey: PromptKey) => {
    if (isLoading) return;

    setIsLoading(true);
    setCurrentAction(actionKey);

    try {
      const systemPrompt = getSystemPrompt(actionKey);
      const label = actions.find((a) => a.key === actionKey)?.label;
      const userContent =
        actionKey === "continuation"
          ? "请续写下面的内容，保持风格一致：\n\n" + (selectedText || "（从这里开始续写）")
          : `请对以下内容进行${label}：\n\n${selectedText}`;

      const response = await ollama.chat([
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ]);

      setResult(response);
    } catch {
      setResult("抱歉，AI 处理失败，请重试。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    onApply(result);
    onClose();
  };

  return (
    <div className="omni-pop absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-line bg-elevated p-3 shadow-lg">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
          <Sparkles size={14} className="text-primary" aria-hidden />
          AI 助手
        </span>
        <Button variant="ghost" size="icon-sm" aria-label="关闭" onClick={onClose}>
          <X size={14} />
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {actions.map((action) => {
          const disabled = isLoading || (action.needsSelection && !selectedText);
          const active = currentAction === action.key;

          return (
            <button
              key={action.key}
              type="button"
              disabled={disabled}
              onClick={() => handleAction(action.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-ring)]",
                "disabled:cursor-not-allowed disabled:opacity-45",
                active
                  ? "border-primary-line bg-primary-soft text-primary"
                  : "border-line text-ink-2 hover:border-line-strong hover:bg-hover hover:text-ink",
              )}
            >
              {isLoading && active ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <action.icon size={12} aria-hidden />
              )}
              {action.label}
            </button>
          );
        })}
      </div>

      {actions.some((a) => a.needsSelection) && !selectedText && (
        <p className="mt-2 text-[11px] leading-relaxed text-ink-3">
          润色 / 扩写 / 缩写需要先在正文中选中文字。
        </p>
      )}

      {result && (
        <>
          <div className="mt-2.5 max-h-48 overflow-auto rounded-md border border-line bg-subtle p-2.5">
            <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink">
              {result}
            </div>
          </div>

          <div className="mt-2.5 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setResult(null)}>
              重新生成
            </Button>
            <Button variant="primary" size="sm" onClick={handleApply}>
              应用到正文
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
