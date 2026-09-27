import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Badge, Button, Dialog } from "../ui";
import { useProjectStore } from "../../stores/projectStore";
import {
  annotationActionLabels,
  runAnnotationAI,
  addAnnotationsFromPreviews,
  type AnnotationAIAction,
  type AnnotationPreview,
} from "../../services/annotationAIService";

export interface AnnotationAIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: AnnotationAIAction;
  chapterId: string;
  onCreated?: (count: number) => void;
}

const actionHints: Record<AnnotationAIAction, string> = {
  review: "AI 以编辑视角逐段审校当前章，生成问题与修改建议批注。",
  aiContent: "AI 扫描当前章，标记疑似 AI 生成或 AI 味明显的段落。",
  reader: "AI 模拟真实读者边读边吐槽，给出疑问、情绪与期待批注。",
};

export function AnnotationAIDialog({
  open,
  onOpenChange,
  action,
  chapterId,
  onCreated,
}: AnnotationAIDialogProps) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<AnnotationPreview[] | null>(null);
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
      const res = await runAnnotationAI(action, chapterId);
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
    const kind = action === "reader" ? "reader" : "ai";
    const n = addAnnotationsFromPreviews(project.id, chapterId, chosen, kind);
    setApplied(`已插入 ${n} 条批注`);
    onCreated(n);
    setPreviews(null);
    setChecked([]);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title={annotationActionLabels[action]}
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
              {running ? "生成中…" : "生成批注"}
            </Button>
          </>
        )
      }
    >
      {!previews ? (
        <div className="space-y-3">
          <p className="text-[13px] leading-relaxed text-ink-2">{actionHints[action]}</p>
          <p className="text-[12px] text-ink-3">
            将读取当前章正文生成批注，插入前可预览勾选。
          </p>
          {applied && <p className="text-[13px] text-success">{applied}</p>}
          {error && <p className="text-[13px] text-danger">{error}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-line">
            {previews.length === 0 && (
              <p className="px-4 py-6 text-center text-[13px] text-ink-3">AI 未发现问题</p>
            )}
            <div className="divide-y divide-line">
              {previews.map((p, i) => (
                <label
                  key={`${p.title}-${i}`}
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
                      <Badge variant="outline" size="sm">
                        {action === "reader" ? "读者" : "AI"}
                      </Badge>
                      <span className="text-sm font-medium text-ink">{p.title}</span>
                    </div>
                    {p.quote && (
                      <blockquote className="mt-1 line-clamp-3 border-l-2 border-line pl-2 text-[12px] italic text-ink-3">
                        {p.quote}
                      </blockquote>
                    )}
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{p.content}</p>
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

