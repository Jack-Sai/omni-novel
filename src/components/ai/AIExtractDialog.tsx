import { useState } from "react";
import { Loader2, RefreshCw, ScanText, Sparkles } from "lucide-react";
import { Button, Dialog, Field, Textarea } from "../ui";
import type { Project } from "../../stores/projectStore";
import { useCharacterStore, type Character } from "../../stores/characterStore";
import { useRelationStore } from "../../stores/relationStore";
import {
  extractCharacters,
  type NewCharacter,
  type SuggestedRelation,
} from "../../services/aiGenerate";

export interface AIExtractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  characters: Character[];
  onApplied?: () => void;
}

type CharRow = NewCharacter & { checked: boolean; dup: boolean };
type RelRow = SuggestedRelation & { checked: boolean; matched: boolean };

export function AIExtractDialog({
  open,
  onOpenChange,
  project,
  characters,
  onApplied,
}: AIExtractDialogProps) {
  const { addCharacter, setCurrentCharacter } = useCharacterStore();
  const { addRelation } = useRelationStore();
  const [text, setText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [charRows, setCharRows] = useState<CharRow[] | null>(null);
  const [relRows, setRelRows] = useState<RelRow[] | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setCharRows(null);
      setRelRows(null);
      setError(null);
      setGenerating(false);
    }
    onOpenChange(next);
  };

  const handleGenerate = async () => {
    if (!text.trim() || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await extractCharacters(text, {
        projectTitle: project.title,
        projectGenre: project.genre,
        existingNames: characters.map((c) => c.name),
      });
      if (!res) {
        setError("模型返回内容无法解析，请重试。");
        return;
      }
      if (res.characters.length === 0) {
        setError("未从文本中提取到人物，换一段内容试试。");
        return;
      }
      const existingNames = new Set(characters.map((c) => c.name));
      const batchNames = new Set(res.characters.map((c) => c.name));
      setCharRows(
        res.characters.map((c) => ({
          ...c,
          dup: existingNames.has(c.name),
          checked: !existingNames.has(c.name),
        })),
      );
      setRelRows(
        res.relations.map((r) => {
          const inExisting = (n: string) =>
            characters.some((c) => c.name === n || c.aliases.includes(n));
          const inBatch = (n: string) => batchNames.has(n);
          return {
            ...r,
            matched: (inExisting(r.sourceName) || inBatch(r.sourceName)) &&
              (inExisting(r.targetName) || inBatch(r.targetName)),
            checked: false,
          };
        }),
      );
      // 关系默认勾选：仅当两端都存在（已有或本批勾选）时——保守起见由用户自己勾
      setRelRows((prev) =>
        prev ? prev.map((r) => ({ ...r, checked: r.matched })) : prev,
      );
    } catch (e) {
      setError(`提取失败：${String(e)}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = () => {
    if (!charRows || !relRows) return;
    const idByName = new Map<string, string>();
    for (const c of characters) idByName.set(c.name, c.id);

    let created = 0;
    for (const row of charRows) {
      if (!row.checked || row.dup) continue;
      const createdChar = addCharacter({ projectId: project.id, ...row });
      idByName.set(row.name, createdChar.id);
      created += 1;
    }

    let relCreated = 0;
    for (const r of relRows) {
      if (!r.checked) continue;
      const sourceId = idByName.get(r.sourceName);
      const targetId = idByName.get(r.targetName);
      if (!sourceId || !targetId || sourceId === targetId) continue;
      const ok = addRelation({
        projectId: project.id,
        sourceId,
        targetId,
        type: r.type,
        label: r.label,
        description: r.description,
        directed: r.directed,
      });
      if (ok) relCreated += 1;
    }

    setCurrentCharacter(null);
    onApplied?.();
    handleOpenChange(false);
    console.info(`AI 提取：新建人物 ${created}，新增关系 ${relCreated}`);
  };

  const charChecked = charRows?.filter((r) => r.checked && !r.dup).length ?? 0;
  const relChecked = relRows?.filter((r) => r.checked).length ?? 0;

  const hasResult = charRows !== null;

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title="从文本提取人物"
      description="粘贴章节或大纲，AI 提取人物档案与相互关系"
      icon={ScanText}
      size="lg"
      footer={
        hasResult ? (
          <>
            <Button variant="ghost" onClick={handleGenerate} disabled={generating || !text.trim()}>
              <RefreshCw size={14} />
              重新提取
            </Button>
            <Button
              variant="primary"
              onClick={handleApply}
              disabled={charChecked + relChecked === 0}
            >
              导入所选（{charChecked} 人 / {relChecked} 条关系）
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => handleOpenChange(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={!text.trim() || generating}
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {generating ? "提取中…" : "提取"}
            </Button>
          </>
        )
      }
    >
      {hasResult ? (
        <div className="space-y-3">
          <div className="max-h-[52vh] space-y-4 overflow-y-auto pr-1">
            <div>
              <p className="mb-2 text-[13px] font-medium text-ink">
                人物（{charRows!.length}）
              </p>
              <div className="space-y-2">
                {charRows!.map((r, i) => (
                  <label
                    key={`${r.name}-${i}`}
                    className={
                      r.dup
                        ? "flex items-start gap-3 rounded-lg border border-dashed border-line px-3 py-2.5 opacity-60"
                        : "flex cursor-pointer items-start gap-3 rounded-lg border border-line px-3 py-2.5 transition-colors hover:bg-hover"
                    }
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 accent-[var(--app-primary,#4f6ef7)]"
                      checked={r.checked}
                      disabled={r.dup}
                      onChange={(e) =>
                        setCharRows((prev) =>
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
                        <span className="font-medium text-ink">{r.name}</span>
                        {r.gender && (
                          <span className="text-ink-3">
                            {{ male: "男", female: "女", other: "其他" }[r.gender] ?? ""}
                          </span>
                        )}
                        {r.dup && (
                          <span className="rounded-md bg-warning-soft px-1.5 py-0.5 text-[11px] text-warning">
                            已存在同名人物
                          </span>
                        )}
                      </span>
                      {r.personality && (
                        <span className="mt-1 block truncate text-[12px] text-ink-3">
                          {r.personality}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {relRows && relRows.length > 0 && (
              <div>
                <p className="mb-2 text-[13px] font-medium text-ink">
                  关系（{relRows.length}）
                </p>
                <div className="space-y-2">
                  {relRows.map((r, i) => (
                    <label
                      key={`${r.sourceName}-${r.targetName}-${i}`}
                      className={
                        r.matched
                          ? "flex cursor-pointer items-start gap-3 rounded-lg border border-line px-3 py-2.5 transition-colors hover:bg-hover"
                          : "flex items-start gap-3 rounded-lg border border-dashed border-line px-3 py-2.5 opacity-60"
                      }
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 shrink-0 accent-[var(--app-primary,#4f6ef7)]"
                        checked={r.checked}
                        disabled={!r.matched}
                        onChange={(e) =>
                          setRelRows((prev) =>
                            prev
                              ? prev.map((row, j) =>
                                  j === i ? { ...row, checked: e.target.checked } : row,
                                )
                              : prev,
                          )
                        }
                      />
                      <span className="min-w-0 flex-1 text-[13px]">
                        <span className="font-medium text-ink">{r.sourceName}</span>
                        <span className="mx-1.5 text-ink-3">{r.directed ? "→" : "—"}</span>
                        <span className="font-medium text-ink">{r.targetName}</span>
                        {r.label && <span className="ml-2 text-ink-2">（{r.label}）</span>}
                        {!r.matched && (
                          <span className="ml-2 rounded-md bg-danger-soft px-1.5 py-0.5 text-[11px] text-danger">
                            两端未全部匹配
                          </span>
                        )}
                        {r.description && (
                          <span className="mt-1 block text-[12px] text-ink-3">
                            {r.description}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          {error && <p className="text-[13px] text-danger">{error}</p>}
          <p className="text-[12px] text-ink-3">
            导入时先创建勾选的人物，再按姓名建立关系；同名已有条目不会重复创建。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="文本内容" hint="粘贴章节正文、人物小传或大纲片段（最多约 6000 字）">
            <Textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleGenerate();
              }}
              rows={10}
              placeholder="在此粘贴要分析的文本……"
            />
          </Field>
          {error && <p className="text-[13px] text-danger">{error}</p>}
          {generating && (
            <p className="text-[13px] text-ink-3">正在提取，依模型不同可能需要 10~60 秒…</p>
          )}
        </div>
      )}
    </Dialog>
  );
}
