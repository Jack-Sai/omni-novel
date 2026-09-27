import { useState } from "react";
import { Loader2, Save, Sparkles } from "lucide-react";
import { Badge, Button, Dialog, Field, Select, Textarea } from "../ui";
import type { BadgeVariant } from "../ui/Badge";
import { useProjectStore } from "../../stores/projectStore";
import { useChapterStore } from "../../stores/chapterStore";
import { useForeshadowingStore } from "../../stores/foreshadowingStore";
import type { ConsistencyIssue } from "../../services/database";
import {
  outlineActionLabels,
  runOutlineAI,
  applyOutlinePlan,
  saveOutlineReport,
  type OutlineAIAction,
  type OutlineAIResult,
  type OutlinePlan,
} from "../../services/outlineAIService";

export interface OutlineAIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 写入完成后通知（用于刷新页面提示） */
  onApplied?: (summary: string) => void;
}

const actions: OutlineAIAction[] = [
  "generate",
  "checkLogic",
  "checkPacing",
  "suggestConflict",
  "suggestHooks",
  "expand",
  "condense",
];

const actionHints: Record<OutlineAIAction, { label: string; reqHint: string; reqPlaceholder: string; reqRequired: boolean }> = {
  generate: {
    label: "灵感 / 梗概",
    reqHint: "可写明期望的卷数、每卷章数，例：3 卷，每卷 10 章",
    reqPlaceholder: "例：一句话灵感「废柴少年捡到能看穿万物价格的天眼」，或完整故事梗概……",
    reqRequired: true,
  },
  checkLogic: {
    label: "重点关注（可选）",
    reqHint: "留空则全面检查因果、矛盾与伏笔",
    reqPlaceholder: "例：重点检查第 1 卷的主角动机是否充分……",
    reqRequired: false,
  },
  checkPacing: {
    label: "重点关注（可选）",
    reqHint: "留空则整体评估张弛与爽点分布",
    reqPlaceholder: "例：开篇 10 章是否进入核心冲突……",
    reqRequired: false,
  },
  suggestConflict: {
    label: "补充需求（可选）",
    reqHint: "想加什么方向的冲突",
    reqPlaceholder: "例：希望第一卷末尾增加一场阵营对立……",
    reqRequired: false,
  },
  suggestHooks: {
    label: "补充需求（可选）",
    reqHint: "想在哪些位置埋伏笔、加爽点",
    reqPlaceholder: "例：希望前 10 章多埋两条长线伏笔……",
    reqRequired: false,
  },
  expand: {
    label: "条目文本",
    reqHint: "可先从下方章节载入梗概，扩写后可写回",
    reqPlaceholder: "粘贴要扩写的章/场景梗概……",
    reqRequired: true,
  },
  condense: {
    label: "条目文本",
    reqHint: "可先从下方章节载入梗概，压缩后可写回",
    reqPlaceholder: "粘贴要压缩的章/场景梗概……",
    reqRequired: true,
  },
};

const severityMeta: Record<ConsistencyIssue["severity"], BadgeVariant> = {
  high: "danger",
  medium: "warning",
  low: "outline",
};

const severityLabels: Record<ConsistencyIssue["severity"], string> = {
  high: "高",
  medium: "中",
  low: "低",
};

function planStats(plan: OutlinePlan): { volumes: number; chapters: number; scenes: number } {
  let chapters = 0;
  let scenes = 0;
  for (const v of plan.volumes) {
    chapters += v.chapters.length;
    for (const c of v.chapters) scenes += c.scenes.length;
  }
  return { volumes: plan.volumes.length, chapters, scenes };
}

export function OutlineAIDialog({ open, onOpenChange, onApplied }: OutlineAIDialogProps) {
  const [action, setAction] = useState<OutlineAIAction>("generate");
  const [requirement, setRequirement] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OutlineAIResult | null>(null);
  const [applied, setApplied] = useState<string | null>(null);

  const project = useProjectStore((s) => s.currentProject);
  const chapters = useChapterStore((s) => s.chapters).filter(
    (c) => c.projectId === project?.id,
  );

  const hint = actionHints[action];
  const isExpandCondense = action === "expand" || action === "condense";

  const reset = () => {
    setResult(null);
    setError(null);
    setApplied(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setRunning(false);
      reset();
      setRequirement("");
      setChapterId("");
    }
    onOpenChange(next);
  };

  const handleActionChange = (next: OutlineAIAction) => {
    setAction(next);
    reset();
  };

  const handleRun = async () => {
    if (running) return;
    if (hint.reqRequired && !requirement.trim()) return;
    setRunning(true);
    setError(null);
    setApplied(null);
    setResult(null);
    try {
      const res = await runOutlineAI(action, { requirement });
      setResult(res);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setRunning(false);
    }
  };

  const handleApplyPlan = () => {
    if (!result || result.action !== "generate" || !project) return;
    const stats = applyOutlinePlan(project.id, result.plan);
    const summary = `已写入 ${stats.volumes} 卷、${stats.chapters} 章、${stats.scenes} 个场景`;
    setApplied(summary);
    onApplied?.(summary);
    setResult(null);
    setRequirement("");
  };

  const handleSaveReport = async () => {
    if (!result || !project) return;
    if (result.action !== "checkLogic" && result.action !== "checkPacing") return;
    if (result.issues.length === 0) {
      setApplied("无问题，无需保存报告");
      return;
    }
    setRunning(true);
    try {
      await saveOutlineReport(project.id, result.issues);
      setApplied(`已保存 ${result.issues.length} 条问题到一致性报告`);
      setResult(null);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setRunning(false);
    }
  };

  const handleSaveSuggestionAsForeshadowing = (index: number) => {
    if (!result || result.action !== "suggestHooks" || !project) return;
    const s = result.suggestions[index];
    if (!s) return;
    useForeshadowingStore.getState().addItem({
      projectId: project.id,
      name: s.title,
      description: s.description,
      importance: "medium",
      status: "planted",
      plantedChapter: s.targetChapter,
      plantedContent: "",
      revealChapter: "",
      revealContent: "",
      relatedCharacters: [],
      notes: `AI 建议（${s.kind}）`,
    });
    setApplied(`已存为伏笔：${s.title}`);
  };

  const handleWriteBackChapter = () => {
    if (!result || !chapterId) return;
    const text = result.action === "expand" || result.action === "condense" ? result.text : "";
    if (!text) return;
    useChapterStore.getState().updateChapter(chapterId, { summary: text });
    const ch = useChapterStore.getState().chapters.find((c) => c.id === chapterId);
    setApplied(`已写回「${ch?.title ?? ""}」的梗概`);
    setResult(null);
  };

  const handleLoadChapter = (id: string) => {
    setChapterId(id);
    const ch = chapters.find((c) => c.id === id);
    if (ch) setRequirement(ch.summary || "");
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title="大纲 AI 辅助"
      description="生成三级大纲、检查逻辑节奏、建议冲突爽点、扩缩写条目"
      icon={Sparkles}
      size="lg"
      footer={
        result ? (
          <>
            <Button variant="ghost" onClick={() => reset()} disabled={running}>
              返回修改
            </Button>
            {result.action === "generate" && (
              <Button variant="primary" onClick={handleApplyPlan}>
                <Save size={14} />
                写入大纲
              </Button>
            )}
            {(result.action === "checkLogic" || result.action === "checkPacing") && (
              <Button variant="primary" onClick={() => void handleSaveReport()} disabled={running}>
                <Save size={14} />
                保存为一致性报告
              </Button>
            )}
            {(result.action === "suggestConflict" || result.action === "suggestHooks") && (
              <Button variant="ghost" onClick={() => reset()}>
                完成
              </Button>
            )}
            {(result.action === "expand" || result.action === "condense") && (
              <Button variant="primary" onClick={handleWriteBackChapter} disabled={!chapterId}>
                <Save size={14} />
                写回章节梗概
              </Button>
            )}
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => handleOpenChange(false)}>
              关闭
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleRun()}
              disabled={running || (hint.reqRequired && !requirement.trim())}
            >
              {running ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {running ? "运行中…" : outlineActionLabels[action]}
            </Button>
          </>
        )
      }
    >
      {!project ? (
        <p className="text-[13px] text-ink-3">请先打开一个项目。</p>
      ) : result ? (
        <div className="space-y-3">
          <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-line">
            {result.action === "generate" && (
              <div className="divide-y divide-line">
                <p className="bg-subtle px-4 py-2 text-[12px] text-ink-3">
                  共 {planStats(result.plan).volumes} 卷 · {planStats(result.plan).chapters} 章 ·{" "}
                  {planStats(result.plan).scenes} 个场景
                </p>
                {result.plan.volumes.map((v, vi) => (
                  <div key={`${v.title}-${vi}`} className="px-4 py-3">
                    <p className="text-sm font-semibold text-ink">
                      <Badge variant="primary" size="sm" className="mr-2">
                        卷
                      </Badge>
                      {v.title}
                    </p>
                    {v.description && (
                      <p className="mt-1 text-[13px] text-ink-2">{v.description}</p>
                    )}
                    <div className="mt-2 space-y-2">
                      {v.chapters.map((c, ci) => (
                        <div key={`${c.title}-${ci}`} className="rounded-lg bg-subtle px-3 py-2">
                          <p className="text-[13px] font-medium text-ink">{c.title}</p>
                          {c.summary && (
                            <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">
                              {c.summary}
                            </p>
                          )}
                          {c.scenes.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {c.scenes.map((s, si) => (
                                <li key={`${s.title}-${si}`} className="text-[12px] text-ink-3">
                                  · {s.title}
                                  {s.summary ? `：${s.summary}` : ""}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(result.action === "checkLogic" || result.action === "checkPacing") && (
              <div className="divide-y divide-line">
                {result.issues.length === 0 ? (
                  <p className="px-4 py-6 text-center text-[13px] text-ink-3">
                    未发现明显问题
                  </p>
                ) : (
                  result.issues.map((issue, i) => (
                    <div key={`${issue.title}-${i}`} className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={severityMeta[issue.severity]} size="sm">
                          {severityLabels[issue.severity]}
                        </Badge>
                        <span className="text-sm font-medium text-ink">{issue.title}</span>
                      </div>
                      <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                        {issue.description}
                      </p>
                      {issue.chapters.length > 0 && (
                        <p className="mt-1 text-[12px] text-ink-3">
                          涉及：{issue.chapters.join("、")}
                        </p>
                      )}
                      {issue.evidence && (
                        <blockquote className="mt-1.5 border-l-2 border-line pl-2 text-[12px] italic text-ink-3">
                          {issue.evidence}
                        </blockquote>
                      )}
                      {issue.suggestion && (
                        <p className="mt-1.5 text-[13px] text-primary">建议：{issue.suggestion}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {(result.action === "suggestConflict" || result.action === "suggestHooks") && (
              <div className="divide-y divide-line">
                {result.suggestions.map((s, i) => (
                  <div key={`${s.title}-${i}`} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="neutral" size="sm">
                          {s.kind}
                        </Badge>
                        <span className="text-sm font-medium text-ink">{s.title}</span>
                      </div>
                      {result.action === "suggestHooks" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSaveSuggestionAsForeshadowing(i)}
                        >
                          存为伏笔
                        </Button>
                      )}
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{s.description}</p>
                    {s.targetChapter && (
                      <p className="mt-1 text-[12px] text-ink-3">建议位置：{s.targetChapter}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {(result.action === "expand" || result.action === "condense") && (
              <p className="whitespace-pre-wrap px-4 py-3 text-[13px] leading-relaxed text-ink-2">
                {result.text}
              </p>
            )}
          </div>
          {applied && <p className="text-[13px] text-success">{applied}</p>}
          {error && <p className="text-[13px] text-danger">{error}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="能力">
            <Select
              value={action}
              onChange={(e) => handleActionChange(e.target.value as OutlineAIAction)}
            >
              {actions.map((a) => (
                <option key={a} value={a}>
                  {outlineActionLabels[a]}
                </option>
              ))}
            </Select>
          </Field>

          {isExpandCondense && (
            <Field label="载入章节梗概（可选）" hint="选择章后自动载入其梗概，改完可写回">
              <Select value={chapterId} onChange={(e) => handleLoadChapter(e.target.value)}>
                <option value="">不选择</option>
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    第{c.order + 1}章 {c.title}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label={hint.label} hint={hint.reqHint}>
            <Textarea
              autoFocus
              rows={6}
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder={hint.reqPlaceholder}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleRun();
              }}
            />
          </Field>

          {applied && <p className="text-[13px] text-success">{applied}</p>}
          {error && <p className="text-[13px] text-danger">{error}</p>}
          <p className="text-[12px] text-ink-3">
            生成与建议结果需确认后写入；检查结果可保存为一致性报告。
          </p>
        </div>
      )}
    </Dialog>
  );
}
