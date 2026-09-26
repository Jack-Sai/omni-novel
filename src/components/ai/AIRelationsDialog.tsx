import { useState } from "react";
import { Loader2, RefreshCw, Sparkles, Users } from "lucide-react";
import { Button, Dialog, Field, Textarea } from "../ui";
import type { Project } from "../../stores/projectStore";
import type { Character } from "../../stores/characterStore";
import {
  relationTypeColors,
  relationTypes,
  useRelationStore,
} from "../../stores/relationStore";
import { suggestRelations, type SuggestedRelation } from "../../services/aiGenerate";

export interface AIRelationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  characters: Character[];
  existing: string[];
  onApplied?: () => void;
}

type SuggestRow = SuggestedRelation & {
  checked: boolean;
  sourceId?: string;
  targetId?: string;
};

export function AIRelationsDialog({
  open,
  onOpenChange,
  project,
  characters,
  existing,
  onApplied,
}: AIRelationsDialogProps) {
  const { addRelation } = useRelationStore();
  const [hint, setHint] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SuggestRow[] | null>(null);

  const resolveId = (name: string): string | undefined =>
    characters.find((c) => c.name === name || c.aliases.includes(name))?.id;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setRows(null);
      setError(null);
      setGenerating(false);
    }
    onOpenChange(next);
  };

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await suggestRelations(characters, {
        projectTitle: project.title,
        projectGenre: project.genre,
        projectSummary: project.synopsis,
        existing,
        hint,
      });
      if (res === null) {
        setError("模型返回内容无法解析，请重试。");
        return;
      }
      if (res.length === 0) {
        setError("AI 未找到新的关系建议，可调整人物或补充要求后重试。");
        return;
      }
      setRows(
        res.map((r) => {
          const sourceId = resolveId(r.sourceName);
          const targetId = resolveId(r.targetName);
          return { ...r, sourceId, targetId, checked: !!sourceId && !!targetId };
        }),
      );
    } catch (e) {
      setError(`生成失败：${String(e)}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = () => {
    if (!rows) return;
    let applied = 0;
    for (const r of rows) {
      if (!r.checked || !r.sourceId || !r.targetId) continue;
      const ok = addRelation({
        projectId: project.id,
        sourceId: r.sourceId,
        targetId: r.targetId,
        type: r.type,
        label: r.label,
        description: r.description,
        directed: r.directed,
      });
      if (ok) applied += 1;
    }
    onApplied?.();
    handleOpenChange(false);
    if (applied === 0) {
      // 全部重复时给个提示（关闭后无法展示，留给 console）
      console.warn("AI 关系建议全部与已有关系重复，未新增");
    }
  };

  const matchedCount = rows?.filter((r) => r.checked && r.sourceId && r.targetId).length ?? 0;

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title="AI 建议关系"
      description="基于人物名册生成关系提案，勾选后批量写入图谱"
      icon={Users}
      size="lg"
      footer={
        rows ? (
          <>
            <Button variant="ghost" onClick={handleGenerate} disabled={generating}>
              <RefreshCw size={14} />
              重新生成
            </Button>
            <Button variant="primary" onClick={handleApply} disabled={matchedCount === 0}>
              应用所选（{matchedCount}）
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => handleOpenChange(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {generating ? "生成中…" : "生成"}
            </Button>
          </>
        )
      }
    >
      {rows ? (
        <div className="space-y-3">
          <div className="max-h-[50vh] space-y-2 overflow-y-auto rounded-xl border border-line p-3">
            {rows.map((r, i) => {
              const matched = !!r.sourceId && !!r.targetId;
              const typeMeta = relationTypes.find((t) => t.value === r.type);
              const color = relationTypeColors[r.type] ?? "#94a3b8";
              return (
                <label
                  key={`${r.sourceName}-${r.targetName}-${i}`}
                  className={
                    matched
                      ? "flex cursor-pointer items-start gap-3 rounded-lg border border-line px-3 py-2.5 transition-colors hover:bg-hover"
                      : "flex items-start gap-3 rounded-lg border border-dashed border-line px-3 py-2.5 opacity-60"
                  }
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--app-primary,#4f6ef7)]"
                    checked={r.checked}
                    disabled={!matched}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev
                          ? prev.map((row, j) =>
                              j === i ? { ...row, checked: e.target.checked } : row,
                            )
                          : prev,
                      )
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-[13px]">
                      <span className="font-medium text-ink">{r.sourceName}</span>
                      <span className="text-ink-3">{r.directed ? "→" : "—"}</span>
                      <span className="font-medium text-ink">{r.targetName}</span>
                      <span
                        className="rounded-md px-1.5 py-0.5 text-[11px] font-medium"
                        style={{ background: `${color}1f`, color }}
                      >
                        {r.label || typeMeta?.label}
                      </span>
                      {!matched && (
                        <span className="rounded-md bg-danger-soft px-1.5 py-0.5 text-[11px] text-danger">
                          未匹配到人物
                        </span>
                      )}
                    </span>
                    {r.description && (
                      <span className="mt-1 block text-[12px] leading-5 text-ink-3">
                        {r.description}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
          {error && <p className="text-[13px] text-danger">{error}</p>}
          <p className="text-[12px] text-ink-3">
            与已有关系重复的提案会在写入时自动忽略；两端姓名无法匹配的条目不可勾选。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="补充要求（可选）" hint="留空 = AI 自动设计；也可指定方向，如：侧重师徒与宿敌">
            <Textarea
              autoFocus
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleGenerate();
              }}
              rows={4}
              placeholder="例：围绕主角设计，突出阵营对立……"
            />
          </Field>
          {error && <p className="text-[13px] text-danger">{error}</p>}
          {generating && (
            <p className="text-[13px] text-ink-3">正在生成，依模型不同可能需要 10~60 秒…</p>
          )}
        </div>
      )}
    </Dialog>
  );
}
