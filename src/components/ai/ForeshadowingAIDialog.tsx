import { useState } from "react";
import { Loader2, Save, Sparkles } from "lucide-react";
import { Badge, Button, Dialog, Field, Select, Textarea } from "../ui";
import type { BadgeVariant } from "../ui/Badge";
import { useProjectStore } from "../../stores/projectStore";
import { useForeshadowingStore } from "../../stores/foreshadowingStore";
import type { ConsistencyIssue } from "../../services/database";
import {
  foreshadowingActionLabels,
  runForeshadowingAI,
  addUnresolvedCandidates,
  applyRevealOption,
  addPlantOptions,
  saveForeshadowingReport,
  type ForeshadowingAIAction,
  type ForeshadowingAIResult,
} from "../../services/foreshadowingAIService";

export interface ForeshadowingAIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied?: (summary: string) => void;
}

const actions: ForeshadowingAIAction[] = ["detectUnresolved", "suggestReveal", "suggestPlant"];

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

export function ForeshadowingAIDialog({ open, onOpenChange, onApplied }: ForeshadowingAIDialogProps) {
  const [action, setAction] = useState<ForeshadowingAIAction>("detectUnresolved");
  const [requirement, setRequirement] = useState("");
  const [foreshadowId, setForeshadowId] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ForeshadowingAIResult | null>(null);
  const [applied, setApplied] = useState<string | null>(null);

  const project = useProjectStore((s) => s.currentProject);
  const items = useForeshadowingStore((s) => s.items).filter(
    (f) => f.projectId === project?.id,
  );
  const plantedItems = items.filter((f) => f.status === "planted");

  const hints: Record<ForeshadowingAIAction, { label: string; hint: string; placeholder: string; required: boolean }> = {
    detectUnresolved: {
      label: "重点关注（可选）",
      hint: "对照全书正文扫描；留空则全面检测",
      placeholder: "例：重点看前 10 章埋的长线伏笔……",
      required: false,
    },
    suggestReveal: {
      label: "补充需求（可选）",
      hint: "对回收方式的偏好",
      placeholder: "例：希望放在大战高潮时揭晓……",
      required: false,
    },
    suggestPlant: {
      label: "伏笔想法 / 主题",
      hint: "想埋什么线索，AI 给出埋设位置与方式",
      placeholder: "例：主角佩戴的旧怀表、亦敌亦友的神秘商人……",
      required: true,
    },
  };
  const hint = hints[action];

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
      setForeshadowId("");
    }
    onOpenChange(next);
  };

  const handleRun = async () => {
    if (running) return;
    if (hint.required && !requirement.trim()) return;
    setRunning(true);
    setError(null);
    setApplied(null);
    setResult(null);
    try {
      const res = await runForeshadowingAI(action, {
        requirement,
        foreshadowId: action === "suggestReveal" ? foreshadowId : undefined,
      });
      setResult(res);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setRunning(false);
    }
  };

  const handleSaveReport = async () => {
    if (!result || result.action !== "detectUnresolved" || !project) return;
    if (result.issues.length === 0) {
      setApplied("无问题，无需保存报告");
      return;
    }
    setRunning(true);
    try {
      await saveForeshadowingReport(project.id, result.issues);
      setApplied(`已保存 ${result.issues.length} 条问题到一致性报告`);
      setResult((r) => (r && r.action === "detectUnresolved" ? { ...r, issues: [] } : r));
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setRunning(false);
    }
  };

  const handleAddCandidate = (index: number) => {
    if (!result || result.action !== "detectUnresolved" || !project) return;
    const c = result.candidates[index];
    if (!c) return;
    addUnresolvedCandidates(project.id, [c]);
    setApplied(`已添加伏笔：${c.name}`);
    setResult((r) =>
      r && r.action === "detectUnresolved"
        ? { ...r, candidates: r.candidates.filter((_, i) => i !== index) }
        : r,
    );
  };

  const handleAddAllCandidates = () => {
    if (!result || result.action !== "detectUnresolved" || !project) return;
    if (result.candidates.length === 0) return;
    const n = addUnresolvedCandidates(project.id, result.candidates);
    setApplied(`已添加 ${n} 条伏笔`);
    setResult((r) => (r && r.action === "detectUnresolved" ? { ...r, candidates: [] } : r));
  };

  const handleApplyReveal = (index: number) => {
    if (!result || result.action !== "suggestReveal" || !foreshadowId) return;
    const opt = result.options[index];
    if (!opt) return;
    applyRevealOption(foreshadowId, opt);
    const item = items.find((f) => f.id === foreshadowId);
    setApplied(`已写回「${item?.name ?? ""}」的回收方案`);
    onApplied?.(`已更新伏笔回收方案`);
    setResult(null);
  };

  const handleAddPlantOption = (index: number) => {
    if (!result || result.action !== "suggestPlant" || !project) return;
    const opt = result.options[index];
    if (!opt) return;
    addPlantOptions(project.id, [opt]);
    setApplied(`已添加伏笔：${opt.name}`);
    onApplied?.(`已添加伏笔 ${opt.name}`);
    setResult((r) =>
      r && r.action === "suggestPlant"
        ? { ...r, options: r.options.filter((_, i) => i !== index) }
        : r,
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title="伏笔 AI 辅助"
      description="检测未回收伏笔、建议回收方式、建议埋设方式"
      icon={Sparkles}
      size="lg"
      footer={
        result ? (
          <>
            <Button variant="ghost" onClick={() => reset()} disabled={running}>
              返回修改
            </Button>
            {result.action === "detectUnresolved" && (
              <Button
                variant="primary"
                onClick={() => void handleSaveReport()}
                disabled={running || result.issues.length === 0}
              >
                <Save size={14} />
                保存为一致性报告
              </Button>
            )}
            {result.action === "detectUnresolved" && result.candidates.length > 0 && (
              <Button variant="primary" onClick={handleAddAllCandidates}>
                <Save size={14} />
                全部添加为伏笔（{result.candidates.length}）
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
              disabled={running || (hint.required && !requirement.trim()) || (action === "suggestReveal" && !foreshadowId)}
            >
              {running ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {running ? "运行中…" : foreshadowingActionLabels[action]}
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
            {result.action === "detectUnresolved" && (
              <div className="divide-y divide-line">
                {result.issues.length > 0 && (
                  <div className="px-4 py-2 text-[12px] font-medium text-ink-3">
                    未回收 / 失效问题（{result.issues.length}）
                  </div>
                )}
                {result.issues.map((issue, i) => (
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
                    {issue.evidence && (
                      <blockquote className="mt-1.5 border-l-2 border-line pl-2 text-[12px] italic text-ink-3">
                        {issue.evidence}
                      </blockquote>
                    )}
                    {issue.suggestion && (
                      <p className="mt-1.5 text-[13px] text-primary">建议：{issue.suggestion}</p>
                    )}
                  </div>
                ))}
                {result.issues.length === 0 && result.candidates.length === 0 && (
                  <p className="px-4 py-6 text-center text-[13px] text-ink-3">
                    未发现问题与疑似伏笔
                  </p>
                )}
                {result.candidates.length > 0 && (
                  <div className="border-t border-line px-4 py-2 text-[12px] font-medium text-ink-3">
                    疑似未标记伏笔（{result.candidates.length}）
                  </div>
                )}
                {result.candidates.map((c, i) => (
                  <div key={`${c.name}-${i}`} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="primary" size="sm">
                          {{ low: "低", medium: "中", high: "高" }[c.importance]}
                        </Badge>
                        <span className="text-sm font-medium text-ink">{c.name}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleAddCandidate(i)}>
                        添加
                      </Button>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{c.description}</p>
                    <p className="mt-1 text-[12px] text-ink-3">
                      {c.plantedChapter ? `出现于：${c.plantedChapter} · ` : ""}
                      {c.reason}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {(result.action === "suggestReveal" || result.action === "suggestPlant") && (
              <div className="divide-y divide-line">
                {result.action === "suggestReveal" &&
                  result.options.map((opt, i) => (
                    <div key={`${i}`} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] leading-relaxed text-ink-2">
                            {opt.revealContent}
                          </p>
                          {opt.revealChapter && (
                            <p className="mt-1 text-[12px] text-ink-3">
                              回收位置：{opt.revealChapter}
                            </p>
                          )}
                          {opt.note && <p className="mt-1 text-[12px] text-ink-3">{opt.note}</p>}
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="shrink-0"
                          onClick={() => handleApplyReveal(i)}
                        >
                          应用此方案
                        </Button>
                      </div>
                    </div>
                  ))}
                {result.action === "suggestPlant" &&
                  result.options.map((opt, i) => (
                    <div key={`${i}`} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-ink">
                            <Badge variant="neutral" size="sm" className="mr-2">
                              {{ low: "低", medium: "中", high: "高" }[opt.importance]}
                            </Badge>
                            {opt.name}
                          </p>
                          <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                            {opt.description}
                          </p>
                          {opt.plantedChapter && (
                            <p className="mt-1 text-[12px] text-ink-3">
                              埋设位置：{opt.plantedChapter}
                            </p>
                          )}
                          {opt.plantedContent && (
                            <p className="mt-1 text-[12px] text-ink-3">
                              埋设方式：{opt.plantedContent}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="shrink-0"
                          onClick={() => handleAddPlantOption(i)}
                        >
                          存为伏笔
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
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
              onChange={(e) => {
                setAction(e.target.value as ForeshadowingAIAction);
                reset();
              }}
            >
              {actions.map((a) => (
                <option key={a} value={a}>
                  {foreshadowingActionLabels[a]}
                </option>
              ))}
            </Select>
          </Field>

          {action === "suggestReveal" && (
            <Field label="选择伏笔" hint="针对已埋设的伏笔建议回收方案">
              <Select value={foreshadowId} onChange={(e) => setForeshadowId(e.target.value)}>
                <option value="">请选择</option>
                {plantedItems.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
              {plantedItems.length === 0 && (
                <p className="text-[12px] text-ink-3">当前没有待回收的伏笔。</p>
              )}
            </Field>
          )}

          <Field label={hint.label} hint={hint.hint}>
            <Textarea
              autoFocus={hint.required}
              rows={5}
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder={hint.placeholder}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleRun();
              }}
            />
          </Field>

          {applied && <p className="text-[13px] text-success">{applied}</p>}
          {error && <p className="text-[13px] text-danger">{error}</p>}
          <p className="text-[12px] text-ink-3">
            检测结果的问题可保存为一致性报告；疑似伏笔与埋设方案确认后写入伏笔库。
          </p>
        </div>
      )}
    </Dialog>
  );
}
