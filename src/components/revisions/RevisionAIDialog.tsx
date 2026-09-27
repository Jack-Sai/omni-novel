import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Badge, Button, Dialog } from "../ui";
import { useProjectStore } from "../../stores/projectStore";
import {
  revisionActionLabels,
  runRevisionAI,
  addSuggestionsFromPreviews,
  type RevisionAIAction,
  type RevisionPreview,
} from "../../services/revisionAIService";

export interface RevisionAIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: RevisionAIAction;
  chapterId: string;
  onCreated?: (count: number) => void;
}

const actionHints: Record<RevisionAIAction, string> = {
  suggest: "AI 以编辑视角通读当前章，给出可直接执行的修改建议（不动正文，接受后才应用）。",
  proofread: "AI 检查当前章的错别字、语法与标点问题，给出修正建议（接受后才应用）。",
};

export function RevisionAIDialog({
  open,
  onOpenChange,
  action,
  chapterId,
  onCreated,
}: RevisionAIDialogProps) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<RevisionPreview[] | null>(null);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [applied, setApplied] = useState<string | null>(null);
  const project = useProjectStore((s) => s.currentProject);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setRunning(false);
      setPreviews(null);
      setChecked([]);
      setError(null);
      setApplied(null);
    }
    onOpenChange(next);
  };

  const handleRun = async () => {
    if (running) return;
    setRunning(true);
    setError(null);
    setApplied(null);
    try {
      const res = await runRevisionAI(action, chapterId);
      setPreviews(res);
      setChecked(res.map(() => true));
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setRunning(false);
    }
  };

  const selectedCount = checked.filter(Boolean).length;

  const handleInsert = () => {
    if (!previews || !onCreated || !project) return;
    const chosen = previews.filter((_, i) => checked[i]);
    if (chosen.length === 0) return;
    const n = addSuggestionsFromPreviews(project.id, chapterId, chosen, "ai");
    setApplied(`已插入 ${n} 条修订建议${n < chosen.length ? `（${chosen.length - n} 条未定位到原文，已跳过）` : ""}`);
    onCreated(n);
    setPreviews(null);
    setChecked([]);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title={revisionActionLabels[action]}
      description={actionHints[action]}
      icon={Sparkles}
      size="lg"
      footer={
        previews ? (
          <>
            <Button variant="ghost" onClick={() => setPreviews(null)} disabled={running}>
              重新生成
            </Button>
            <Button
              variant="primary"
              onClick={handleInsert}
              disabled={running || selectedCount === 0}
            >
              插入所选（{selectedCount}）
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => handleOpenChange(false)}>
              关闭
            </Button>
            <Button variant="primary" onClick={() => void handleRun()} disabled={running}>
              {running ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {running ? "生成中…" : "生成建议"}
            </Button>
          </>
        )
      }
    >
      {!previews ? (
        <div className="space-y-3">
          <p className="text-[13px] leading-relaxed text-ink-2">{actionHints[action]}</p>
          <p className="text-[12px] text-ink-3">
            将读取当前章正文生成建议，插入前可预览勾选；建议以修订形式出现在面板中。
          </p>
          {applied && <p className="text-[13px] text-success">{applied}</p>}
          {error && <p className="text-[13px] text-danger">{error}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-line">
            {previews.length === 0 && (
              <p className="px-4 py-6 text-center text-[13px] text-ink-3">
                AI 未发现需要修改的内容
              </p>
            )}
            <div className="divide-y divide-line">
              {previews.map((p, i) => (
                <label
                  key={`${p.quote.slice(0, 20)}-${i}`}
                  className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-hover"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={checked[i] ?? false}
                    onChange={(e) =>
                      setChecked((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="primary" size="sm">
                        AI 建议
                      </Badge>
                      <span className="text-[12px] text-ink-3">{p.reason || "修改建议"}</span>
                    </div>
                    <blockquote className="mt-1 line-clamp-3 border-l-2 border-danger-line bg-danger-soft px-2 py-1 text-[12px] italic text-ink-2">
                      {p.quote}
                    </blockquote>
                    {p.replacement ? (
                      <p className="mt-1 border-l-2 border-success-line bg-success-soft px-2 py-1 text-[12px] text-ink-2">
                        {p.replacement}
                      </p>
                    ) : (
                      <p className="mt-1 text-[12px] text-ink-3">（建议删除此段文字）</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
          {applied && <p className="text-[13px] text-success">{applied}</p>}
          {error && <p className="text-[13px] text-danger">{error}</p>}
        </div>
      )}
    </Dialog>
  );
}
