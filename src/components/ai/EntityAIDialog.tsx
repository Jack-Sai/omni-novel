import { useState } from "react";
import { Loader2, Save, Sparkles } from "lucide-react";
import { Badge, Button, Dialog, Field, Select, Textarea } from "../ui";
import type { BadgeVariant } from "../ui/Badge";
import { useProjectStore } from "../../stores/projectStore";
import { useWorldviewStore, worldviewTypes } from "../../stores/worldviewStore";
import { useCharacterStore } from "../../stores/characterStore";
import type { ConsistencyIssue } from "../../services/database";
import {
  entityActionLabels,
  scopeActions,
  runEntityAI,
  addExtractedEntities,
  applyEntityUpdates,
  applyRelations,
  applyBio,
  saveEntityReport,
  type EntityAIAction,
  type EntityAIResult,
  type EntityAIScope,
} from "../../services/entityAIService";

export interface EntityAIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: EntityAIScope;
  /** 预选的目标条目/人物 id */
  initialEntityId?: string;
  onApplied?: (summary: string) => void;
}

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

interface ActionHint {
  label: string;
  hint: string;
  placeholder: string;
  /** 需要目标条目选择器 */
  needEntity: boolean;
  /** 需要正文粘贴 */
  needText: boolean;
  /** 正文是否必填 */
  textRequired: boolean;
}

const hints: Record<EntityAIAction, ActionHint> = {
  extractEntities: {
    label: "正文",
    hint: "粘贴要提取设定的正文段落",
    placeholder: "粘贴正文……",
    needEntity: false,
    needText: true,
    textRequired: true,
  },
  updateEntity: {
    label: "参考正文",
    hint: "正文中的新信息将合并进该设定",
    placeholder: "粘贴包含该设定描写的正文……",
    needEntity: true,
    needText: true,
    textRequired: true,
  },
  completeFields: {
    label: "补充要求（可选）",
    hint: "对补全方向的偏好",
    placeholder: "例：着重补全组织的权力结构……",
    needEntity: true,
    needText: false,
    textRequired: false,
  },
  generateBio: {
    label: "正文节选 / 补充要求（可选）",
    hint: "有正文参考时小传更贴合剧情",
    placeholder: "粘贴该人物出场的正文，或写补充要求……",
    needEntity: true,
    needText: false,
    textRequired: false,
  },
  checkConflicts: {
    label: "正文节选 / 关注点（可选）",
    hint: "留空则仅比对设定之间是否矛盾",
    placeholder: "粘贴正文以比对设定与正文的冲突……",
    needEntity: false,
    needText: false,
    textRequired: false,
  },
  suggestRelations: {
    label: "补充要求（可选）",
    hint: "梳理该设定与其他条目的关联",
    placeholder: "例：重点看与主要组织的关系……",
    needEntity: true,
    needText: false,
    textRequired: false,
  },
};

const updateFieldLabels: Record<string, string> = {
  description: "概述",
  details: "详情",
  relationships: "关联",
  tags: "标签",
};

export function EntityAIDialog({
  open,
  onOpenChange,
  scope,
  initialEntityId,
  onApplied,
}: EntityAIDialogProps) {
  const actions = scopeActions[scope];
  const [action, setAction] = useState<EntityAIAction>(actions[0]);
  const [entityId, setEntityId] = useState(initialEntityId ?? "");
  const [text, setText] = useState("");
  const [requirement, setRequirement] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EntityAIResult | null>(null);
  const [applied, setApplied] = useState<string | null>(null);

  const project = useProjectStore((s) => s.currentProject);
  const worldviewItems = useWorldviewStore((s) => s.items).filter(
    (i) => i.projectId === project?.id,
  );
  const characters = useCharacterStore((s) => s.characters).filter(
    (c) => c.projectId === project?.id,
  );

  const hint = hints[action];
  const entityOptions =
    scope === "character"
      ? characters.map((c) => ({ id: c.id, label: c.name }))
      : worldviewItems.map((i) => ({
          id: i.id,
          label: `${i.name}（${worldviewTypes.find((t) => t.value === i.type)?.label ?? i.type}）`,
        }));
  const entity = scope === "character"
    ? characters.find((c) => c.id === entityId)
    : worldviewItems.find((i) => i.id === entityId);

  const reset = () => {
    setResult(null);
    setError(null);
    setApplied(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setRunning(false);
      reset();
      setText("");
      setRequirement("");
      setEntityId(initialEntityId ?? "");
    }
    onOpenChange(next);
  };

  const canRun =
    !running &&
    (!hint.needEntity || !!entityId) &&
    (!hint.textRequired || !!text.trim());

  const handleRun = async () => {
    if (!canRun) return;
    setRunning(true);
    setError(null);
    setApplied(null);
    setResult(null);
    try {
      const res = await runEntityAI(action, {
        text: text.trim() || undefined,
        entityId: hint.needEntity ? entityId : undefined,
        requirement: requirement.trim() || undefined,
      });
      setResult(res);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setRunning(false);
    }
  };

  const handleAddEntities = (index?: number) => {
    if (!result || result.action !== "extractEntities" || !project) return;
    const list =
      index === undefined
        ? result.entities
        : result.entities.filter((_, i) => i === index);
    if (list.length === 0) return;
    const n = addExtractedEntities(project.id, list);
    setApplied(`已添加 ${n} 条设定`);
    onApplied?.(`已添加 ${n} 条设定`);
    setResult((r) =>
      r && r.action === "extractEntities"
        ? {
            ...r,
            entities:
              index === undefined
                ? []
                : r.entities.filter((_, i) => i !== index),
          }
        : r,
    );
  };

  const handleApplyUpdates = () => {
    if (!result || (result.action !== "updateEntity" && result.action !== "completeFields")) {
      return;
    }
    if (!entityId) return;
    applyEntityUpdates(entityId, result.updates);
    setApplied(`已更新「${entity?.name ?? ""}」`);
    onApplied?.(`已更新设定 ${entity?.name ?? ""}`);
    setResult(null);
  };

  const handleApplyBio = () => {
    if (!result || result.action !== "generateBio" || !entityId) return;
    applyBio(entityId, result.bio);
    setApplied(`已写回「${entity?.name ?? ""}」的人物小传`);
    onApplied?.(`已更新人物小传 ${entity?.name ?? ""}`);
    setResult(null);
  };

  const handleApplyRelations = () => {
    if (!result || result.action !== "suggestRelations" || !entityId) return;
    applyRelations(entityId, result.relationships, result.relatedTags);
    setApplied(`已写回「${entity?.name ?? ""}」的关联`);
    onApplied?.(`已更新设定关联 ${entity?.name ?? ""}`);
    setResult(null);
  };

  const handleSaveReport = async () => {
    if (!result || result.action !== "checkConflicts" || !project) return;
    if (result.issues.length === 0) {
      setApplied("无冲突，无需保存报告");
      return;
    }
    setRunning(true);
    try {
      await saveEntityReport(project.id, result.issues);
      setApplied(`已保存 ${result.issues.length} 条冲突到一致性报告`);
      setResult((r) => (r && r.action === "checkConflicts" ? { ...r, issues: [] } : r));
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setRunning(false);
    }
  };

  const hasApplyAction =
    result &&
    (result.action === "updateEntity" ||
      result.action === "completeFields" ||
      result.action === "generateBio" ||
      result.action === "suggestRelations");

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title="设定库 AI 辅助"
      description="从正文提取设定、更新补全字段、撰写人物小传、冲突检查与关系梳理"
      icon={Sparkles}
      size="lg"
      footer={
        result ? (
          <>
            <Button variant="ghost" onClick={() => reset()} disabled={running}>
              返回修改
            </Button>
            {result.action === "extractEntities" && result.entities.length > 0 && (
              <Button variant="primary" onClick={() => handleAddEntities()}>
                <Save size={14} />
                全部添加（{result.entities.length}）
              </Button>
            )}
            {result.action === "checkConflicts" && (
              <Button
                variant="primary"
                onClick={() => void handleSaveReport()}
                disabled={running || result.issues.length === 0}
              >
                <Save size={14} />
                保存为一致性报告
              </Button>
            )}
            {hasApplyAction && (
              <Button
                variant="primary"
                onClick={
                  result.action === "generateBio"
                    ? handleApplyBio
                    : result.action === "suggestRelations"
                      ? handleApplyRelations
                      : handleApplyUpdates
                }
              >
                <Save size={14} />
                {result.action === "generateBio"
                  ? "写回人物"
                  : result.action === "suggestRelations"
                    ? "写回关联"
                    : "应用更新"}
              </Button>
            )}
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => handleOpenChange(false)}>
              关闭
            </Button>
            <Button variant="primary" onClick={() => void handleRun()} disabled={!canRun}>
              {running ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {running ? "运行中…" : entityActionLabels[action]}
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
            {result.action === "extractEntities" && (
              <div className="divide-y divide-line">
                {result.entities.length === 0 && (
                  <p className="px-4 py-6 text-center text-[13px] text-ink-3">
                    未提取到设定实体
                  </p>
                )}
                {result.entities.map((e, i) => (
                  <div key={`${e.name}-${i}`} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="primary" size="sm">
                          {worldviewTypes.find((t) => t.value === e.type)?.label ?? e.type}
                        </Badge>
                        <span className="text-sm font-medium text-ink">{e.name}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleAddEntities(i)}>
                        添加
                      </Button>
                    </div>
                    {e.description && (
                      <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                        {e.description}
                      </p>
                    )}
                    {e.details && (
                      <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{e.details}</p>
                    )}
                    {e.tags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {e.tags.map((t) => (
                          <Badge key={t} variant="neutral" size="sm">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {(result.action === "updateEntity" || result.action === "completeFields") && (
              <div className="divide-y divide-line">
                {Object.entries(result.updates).map(([key, value]) => (
                  <div key={key} className="px-4 py-3">
                    <p className="text-[12px] font-medium text-ink-3">
                      {updateFieldLabels[key] ?? key}
                    </p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">
                      {Array.isArray(value) ? value.join("、") : value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {result.action === "generateBio" && (
              <div className="divide-y divide-line">
                <div className="px-4 py-3">
                  <p className="text-[12px] font-medium text-ink-3">背景小传</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">
                    {result.bio.background}
                  </p>
                </div>
                {result.bio.personality && (
                  <div className="px-4 py-3">
                    <p className="text-[12px] font-medium text-ink-3">性格</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">
                      {result.bio.personality}
                    </p>
                  </div>
                )}
                {result.bio.goals && (
                  <div className="px-4 py-3">
                    <p className="text-[12px] font-medium text-ink-3">目标</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">
                      {result.bio.goals}
                    </p>
                  </div>
                )}
                {result.bio.conflicts && (
                  <div className="px-4 py-3">
                    <p className="text-[12px] font-medium text-ink-3">冲突</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">
                      {result.bio.conflicts}
                    </p>
                  </div>
                )}
              </div>
            )}

            {result.action === "checkConflicts" && (
              <div className="divide-y divide-line">
                {result.issues.length === 0 && (
                  <p className="px-4 py-6 text-center text-[13px] text-ink-3">
                    未发现设定冲突
                  </p>
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
              </div>
            )}

            {result.action === "suggestRelations" && (
              <div className="px-4 py-3">
                <p className="text-[13px] leading-relaxed text-ink-2">
                  {result.relationships}
                </p>
                {result.relatedTags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {result.relatedTags.map((t) => (
                      <Badge key={t} variant="neutral" size="sm">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
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
                setAction(e.target.value as EntityAIAction);
                reset();
              }}
            >
              {actions.map((a) => (
                <option key={a} value={a}>
                  {entityActionLabels[a]}
                </option>
              ))}
            </Select>
          </Field>

          {hint.needEntity && (
            <Field label={scope === "character" ? "选择人物" : "选择条目"}>
              <Select value={entityId} onChange={(e) => setEntityId(e.target.value)}>
                <option value="">请选择</option>
                {entityOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </Select>
              {entityOptions.length === 0 && (
                <p className="text-[12px] text-ink-3">
                  {scope === "character" ? "暂无人物，请先创建。" : "暂无设定条目。"}
                </p>
              )}
            </Field>
          )}

          <Field label={hint.label} hint={hint.hint}>
            <Textarea
              autoFocus={hint.textRequired}
              rows={6}
              value={action === "completeFields" || action === "suggestRelations" || action === "generateBio" ? requirement : text}
              onChange={(e) =>
                action === "completeFields" ||
                action === "suggestRelations" ||
                action === "generateBio"
                  ? setRequirement(e.target.value)
                  : setText(e.target.value)
              }
              placeholder={hint.placeholder}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleRun();
              }}
            />
          </Field>

          {applied && <p className="text-[13px] text-success">{applied}</p>}
          {error && <p className="text-[13px] text-danger">{error}</p>}
          <p className="text-[12px] text-ink-3">
            写入均经预览确认；冲突检查可保存为一致性报告。
          </p>
        </div>
      )}
    </Dialog>
  );
}
