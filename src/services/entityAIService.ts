import type { ConsistencyIssue } from "./database";
import { worldviewAIPrompts } from "./prompts";
import { createChatService, parseJsonObject } from "./aiGenerate";
import { buildChapterExcerpt, parseIssues, saveOutlineReport } from "./outlineAIService";
import { useSettingsStore } from "../stores/settingsStore";
import { useProjectStore } from "../stores/projectStore";
import { useWorldviewStore, worldviewTypes, type WorldviewType } from "../stores/worldviewStore";
import { useCharacterStore } from "../stores/characterStore";

/**
 * 设定库 AI 辅助（PRD 4.2.13）：
 * - extractEntities：从正文提取设定实体 → worldview.json
 * - updateEntity：按正文补强已有条目 → worldview.json
 * - completeFields：补全条目缺失字段 → worldview.json
 * - generateBio：人物小传撰写/完善 → character.json
 * - checkConflicts：设定 vs 设定/正文 冲突检查 → consistency_reports（type=worldview）
 * - suggestRelations：梳理条目关联 → worldview.json（relationships）
 * 所有写入经 store（自动落盘）；报告经 saveOutlineReport（与一致性报告同构同库）。
 */

export type EntityAIAction =
  | "extractEntities"
  | "updateEntity"
  | "completeFields"
  | "generateBio"
  | "checkConflicts"
  | "suggestRelations";

export type EntityAIScope = "worldview" | "character";

export interface ExtractedEntity {
  name: string;
  type: WorldviewType;
  description: string;
  details: string;
  tags: string[];
}

export interface EntityUpdates {
  description?: string;
  details?: string;
  relationships?: string;
  tags?: string[];
}

export interface BioUpdates {
  background: string;
  personality?: string;
  goals?: string;
  conflicts?: string;
}

export type EntityAIResult =
  | { action: "extractEntities"; entities: ExtractedEntity[] }
  | { action: "updateEntity" | "completeFields"; updates: EntityUpdates }
  | { action: "generateBio"; bio: BioUpdates }
  | { action: "checkConflicts"; issues: ConsistencyIssue[] }
  | { action: "suggestRelations"; relationships: string; relatedTags: string[] };

export interface EntityAIInput {
  /** extractEntities / updateEntity / checkConflicts 的正文粘贴 */
  text?: string;
  /** updateEntity / completeFields / generateBio / suggestRelations 的目标条目 id */
  entityId?: string;
  /** 补充要求 */
  requirement?: string;
}

export const entityActionLabels: Record<EntityAIAction, string> = {
  extractEntities: "提取设定实体",
  updateEntity: "按正文更新",
  completeFields: "补全字段",
  generateBio: "撰写人物小传",
  checkConflicts: "冲突检查",
  suggestRelations: "关系梳理",
};

export const scopeActions: Record<EntityAIScope, EntityAIAction[]> = {
  worldview: ["extractEntities", "updateEntity", "completeFields", "checkConflicts", "suggestRelations"],
  character: ["generateBio"],
};

const worldviewTypeValues: WorldviewType[] = worldviewTypes.map((t) => t.value);

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function strList(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim());
  }
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

function enumValue<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  const s = str(v).toLowerCase();
  return (allowed as readonly string[]).includes(s) ? (s as T) : fallback;
}

/** 世界观设定清单摘要 */
function buildWorldviewDigest(projectId: string): string {
  const items = useWorldviewStore.getState().items.filter((i) => i.projectId === projectId);
  if (items.length === 0) return "（暂无设定）";
  return items
    .map((i) => {
      const label = worldviewTypes.find((t) => t.value === i.type)?.label ?? i.type;
      const parts = [`- ${i.name}（${label}）`];
      if (i.description) parts.push(`  概述：${i.description}`);
      if (i.details) parts.push(`  详情：${i.details}`);
      if (i.relationships) parts.push(`  关联：${i.relationships}`);
      return parts.join("\n");
    })
    .join("\n");
}

function parseEntities(raw: unknown): ExtractedEntity[] | null {
  if (!raw || typeof raw !== "object") return null;
  const arr = Array.isArray((raw as Record<string, unknown>).entities)
    ? ((raw as Record<string, unknown>).entities as unknown[])
    : null;
  if (!arr) return null;
  const out: ExtractedEntity[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (!str(o.name)) continue;
    out.push({
      name: str(o.name),
      type: enumValue(o.type, worldviewTypeValues, "other"),
      description: str(o.description),
      details: str(o.details),
      tags: strList(o.tags),
    });
  }
  return out;
}

function parseUpdates(raw: unknown): EntityUpdates | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const updates: EntityUpdates = {};
  if (str(o.description)) updates.description = str(o.description);
  if (str(o.details)) updates.details = str(o.details);
  if (str(o.relationships)) updates.relationships = str(o.relationships);
  const tags = strList(o.tags);
  if (tags.length > 0) updates.tags = tags;
  return updates;
}

function parseBio(raw: unknown): BioUpdates | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const background = str(o.background);
  if (!background) return null;
  const bio: BioUpdates = { background };
  if (str(o.personality)) bio.personality = str(o.personality);
  if (str(o.goals)) bio.goals = str(o.goals);
  if (str(o.conflicts)) bio.conflicts = str(o.conflicts);
  return bio;
}

function parseRelations(raw: unknown): { relationships: string; relatedTags: string[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return { relationships: str(o.relationships), relatedTags: strList(o.relatedTags) };
}

/** 运行设定库 AI 能力，返回结构化结果（不写库） */
export async function runEntityAI(
  action: EntityAIAction,
  input: EntityAIInput = {},
): Promise<EntityAIResult> {
  const project = useProjectStore.getState().currentProject;
  if (!project) throw new Error("未打开项目");
  const ai = useSettingsStore.getState().ai;

  const context: string[] = [`作品：《${project.title}》`];
  let system: string;
  let userContent: string;
  let temperature = 0.3;

  if (action === "extractEntities") {
    if (!input.text?.trim()) throw new Error("请粘贴要提取的正文");
    system = worldviewAIPrompts.extractEntities;
    context.push(`【已有设定清单（避免重复提取）】\n${buildWorldviewDigest(project.id)}`);
    context.push(`【正文】\n${input.text}`);
    userContent = context.join("\n\n");
  } else if (action === "updateEntity" || action === "completeFields") {
    if (!input.entityId) throw new Error("请先选择条目");
    const item = useWorldviewStore.getState().items.find((i) => i.id === input.entityId);
    if (!item) throw new Error("条目不存在");
    system =
      action === "updateEntity"
        ? worldviewAIPrompts.updateEntity
        : worldviewAIPrompts.completeFields;
    const label = worldviewTypes.find((t) => t.value === item.type)?.label ?? item.type;
    context.push(
      `【已有设定】\n- ${item.name}（${label}）\n概述：${item.description || "（空）"}\n详情：${item.details || "（空）"}\n关联：${item.relationships || "（空）"}\n标签：${item.tags.join("、") || "（空）"}`,
    );
    if (action === "updateEntity") {
      const text = input.text?.trim();
      if (!text) throw new Error("请粘贴参考正文");
      context.push(`【正文节选】\n${text}`);
    }
    const req = str(input.requirement);
    if (req) context.push(`【补充要求】\n${req}`);
    userContent = context.join("\n\n");
    if (action === "updateEntity") temperature = 0.2;
  } else if (action === "generateBio") {
    if (!input.entityId) throw new Error("请先选择人物");
    const c = useCharacterStore.getState().characters.find((x) => x.id === input.entityId);
    if (!c) throw new Error("人物不存在");
    system = worldviewAIPrompts.generateBio;
    context.push(
      `【人物资料】\n姓名：${c.name}${c.aliases.length ? `（${c.aliases.join("、")}）` : ""}\n性别：${c.gender || "未定"} 年龄：${c.age || "未定"}\n外貌：${c.appearance || "（空）"}\n性格：${c.personality || "（空）"}\n背景：${c.background || "（空）"}\n目标：${c.goals || "（空）"}\n冲突：${c.conflicts || "（空）"}\n能力：${c.abilities || "（空）"} 弱点：${c.weaknesses || "（空）"}`,
    );
    const text = input.text?.trim();
    if (text) context.push(`【正文节选】\n${text}`);
    const req = str(input.requirement);
    if (req) context.push(`【补充要求】\n${req}`);
    userContent = context.join("\n\n");
    temperature = 0.5;
  } else if (action === "checkConflicts") {
    system = worldviewAIPrompts.checkConflicts;
    context.push(`【设定库清单】\n${buildWorldviewDigest(project.id)}`);
    const text = input.text?.trim() || buildChapterExcerpt(project.id);
    if (text) context.push(`【正文节选】\n${text}`);
    const req = str(input.requirement);
    if (req) context.push(`【关注点】\n${req}`);
    userContent = context.join("\n\n");
  } else {
    if (!input.entityId) throw new Error("请先选择条目");
    const item = useWorldviewStore.getState().items.find((i) => i.id === input.entityId);
    if (!item) throw new Error("条目不存在");
    system = worldviewAIPrompts.suggestRelations;
    const others = buildWorldviewDigest(project.id);
    context.push(
      `【目标设定】\n- ${item.name}（${worldviewTypes.find((t) => t.value === item.type)?.label ?? item.type}）\n${item.description}\n${item.details}`,
    );
    context.push(`【设定库其他条目】\n${others}`);
    const req = str(input.requirement);
    if (req) context.push(`【补充要求】\n${req}`);
    userContent = context.join("\n\n");
    temperature = 0.4;
  }

  const service = createChatService();
  const raw = await service.chat(
    [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
    { temperature, numPredict: Math.max(ai.maxTokens, 4096), think: ai.think },
  );
  const parsed = parseJsonObject(raw);
  if (!parsed) throw new Error("AI 返回内容无法解析，请重试");

  if (action === "extractEntities") {
    const entities = parseEntities(parsed);
    if (entities === null) throw new Error("AI 返回的实体格式无法解析，请重试");
    return { action, entities };
  }
  if (action === "updateEntity" || action === "completeFields") {
    const updates = parseUpdates(parsed);
    if (updates === null || Object.keys(updates).length === 0) {
      throw new Error("AI 未返回可更新的字段，请重试");
    }
    return { action, updates };
  }
  if (action === "generateBio") {
    const bio = parseBio(parsed);
    if (!bio) throw new Error("AI 未返回小传内容，请重试");
    return { action, bio };
  }
  if (action === "checkConflicts") {
    const issues = parseIssues(parsed);
    if (issues === null) throw new Error("AI 返回的检查结果格式无法解析，请重试");
    return { action, issues };
  }
  const relations = parseRelations(parsed);
  if (!relations || !relations.relationships) {
    throw new Error("AI 未返回关系内容，请重试");
  }
  return { action, ...relations };
}

/** 提取的实体批量入库（worldview.json） */
export function addExtractedEntities(projectId: string, entities: ExtractedEntity[]): number {
  const store = useWorldviewStore.getState();
  for (const e of entities) {
    store.addItem({
      projectId,
      name: e.name,
      type: e.type,
      description: e.description,
      details: e.details,
      relationships: "",
      notes: "AI 提取",
      tags: e.tags,
    });
  }
  return entities.length;
}

/** 字段更新写回条目 */
export function applyEntityUpdates(entityId: string, updates: EntityUpdates): void {
  useWorldviewStore.getState().updateItem(entityId, updates);
}

/** 关系梳理写回条目（relationships 文本 + tags 追加关联名） */
export function applyRelations(
  entityId: string,
  relationships: string,
  relatedTags: string[],
): void {
  const store = useWorldviewStore.getState();
  const item = store.items.find((i) => i.id === entityId);
  if (!item) return;
  const tags = relatedTags.filter(
    (t) => !item.tags.includes(t) && t !== item.name,
  );
  store.updateItem(entityId, {
    relationships,
    ...(tags.length > 0 ? { tags: [...item.tags, ...tags] } : {}),
  });
}

/** 人物小传写回 */
export function applyBio(characterId: string, bio: BioUpdates): void {
  const updates: Record<string, string> = { background: bio.background };
  if (bio.personality) updates.personality = bio.personality;
  if (bio.goals) updates.goals = bio.goals;
  if (bio.conflicts) updates.conflicts = bio.conflicts;
  useCharacterStore.getState().updateCharacter(characterId, updates);
}

/** 冲突检查保存为一致性报告（type=worldview，与一致性检查同构同库） */
export const saveEntityReport = saveOutlineReport;
