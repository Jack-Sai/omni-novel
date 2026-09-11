import { useState } from "react";
import { Sparkles, PenTool, BookOpen, Minimize2, Maximize2, Loader2 } from "lucide-react";
import { ollama, getSystemPrompt, PromptKey } from "../../services";

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
      let userContent = "";

      if (actionKey === "continuation") {
        userContent = "请续写下面的内容，保持风格一致：\n\n" + (selectedText || "（从这里开始续写）");
      } else {
        userContent = `请对以下内容进行${actions.find((a) => a.key === actionKey)?.label}：\n\n${selectedText}`;
      }

      const response = await ollama.chat([
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ]);

      setResult(response);
    } catch (error) {
      setResult("抱歉，AI 处理失败，请重试。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (result) {
      onApply(result);
      onClose();
    }
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4 shadow-lg z-50">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--color-primary)]" />
          <span className="font-medium">AI 助手</span>
        </div>
        <button
          onClick={onClose}
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
        >
          ×
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.key}
            onClick={() => handleAction(action.key)}
            disabled={isLoading || (action.needsSelection && !selectedText)}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition
              ${
                currentAction === action.key
                  ? "bg-[var(--color-primary)] text-white"
                  : "border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
              }
              ${(action.needsSelection && !selectedText) || isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isLoading && currentAction === action.key ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <action.icon size={12} />
            )}
            {action.label}
          </button>
        ))}
      </div>

      {result && (
        <div className="max-h-48 overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
          <div className="whitespace-pre-wrap text-sm">{result}</div>
        </div>
      )}

      {result && (
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={() => setResult(null)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm transition hover:bg-[var(--color-bg-secondary)]"
          >
            重新生成
          </button>
          <button
            onClick={handleApply}
            className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm text-white transition hover:bg-[var(--color-primary-hover)]"
          >
            应用
          </button>
        </div>
      )}
    </div>
  );
}
