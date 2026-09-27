import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Button, Dialog, Field, Input, Textarea } from "../ui";
import { useAnnotationStore, type AnnotationScope } from "../../stores/annotationStore";

export interface AddAnnotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** text / chapter 级必传；global 不传 */
  chapterId?: string | null;
  scope: AnnotationScope;
  /** text 级：选区预填（原文 + 纯文本偏移） */
  prefill?: { quote: string; textFrom: number | null; textTo: number | null };
  onCreated?: (annotationId: string) => void;
}

const scopeLabels: Record<AnnotationScope, string> = {
  text: "文本批注",
  chapter: "章节批注",
  global: "全局批注",
};

export function AddAnnotationDialog({
  open,
  onOpenChange,
  projectId,
  chapterId,
  scope,
  prefill,
  onCreated,
}: AddAnnotationDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setContent("");
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const canSave = !!title.trim() && !!content.trim();

  const handleSave = () => {
    if (!canSave) return;
    if (scope !== "global" && !chapterId) {
      setError("请先打开章节");
      return;
    }
    try {
      const item = useAnnotationStore.getState().addAnnotation({
        projectId,
        scope,
        kind: "manual",
        status: "open",
        chapterId: scope === "global" ? null : (chapterId ?? null),
        title: title.trim(),
        content: content.trim(),
        quote: scope === "text" ? (prefill?.quote ?? "") : "",
        textFrom: scope === "text" ? (prefill?.textFrom ?? null) : null,
        textTo: scope === "text" ? (prefill?.textTo ?? null) : null,
        replies: [],
      });
      onCreated?.(item.id);
      handleOpenChange(false);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title={`添加${scopeLabels[scope]}`}
      description="记录问题、想法或待修改事项"
      icon={MessageSquarePlus}
      footer={
        <>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!canSave}>
            保存批注
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {scope === "text" && prefill?.quote && (
          <blockquote className="max-h-24 overflow-y-auto rounded-lg border-l-2 border-warning-line bg-warning-soft px-3 py-2 text-[13px] italic text-ink-2">
            {prefill.quote}
          </blockquote>
        )}

        <Field label="标题">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="一句话概括这条批注"
            maxLength={40}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
          />
        </Field>

        <Field label="内容">
          <Textarea
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="具体问题、修改建议或想法……"
          />
        </Field>

        {error && <p className="text-[13px] text-danger">{error}</p>}
      </div>
    </Dialog>
  );
}
