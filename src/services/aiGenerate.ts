import { createAIService, toLlamaConfig } from "./aiService";
import { structuredPrompts, characterAIPrompts } from "./prompts";
import { useSettingsStore } from "../stores/settingsStore";
import type { Character } from "../stores/characterStore";
import type { WorldviewItem, WorldviewType } from "../stores/worldviewStore";
import { worldviewTypes } from "../stores/worldviewStore";
import type { Foreshadowing } from "../stores/foreshadowingStore";
import { relationTypes, type RelationType } from "../stores/relationStore";

export type GenerateKind = "character" | "worldview" | "foreshadowing";

export type NewCharacter = Omit<Character, "id" | "projectId" | "createdAt" | "updatedAt">;
export type NewWorldviewItem = Omit<
  WorldviewItem,
  "id" | "projectId" | "createdAt" | "updatedAt"
>;
export type NewForeshadowing = Omit<
  Foreshadowing,
  "id" | "projectId" | "createdAt" | "updatedAt"
>;

export interface GenerateStructuredInput {
  kind: GenerateKind;
  requirement: string;
  projectTitle?: string;
  projectGenre?: string;
  projectSummary?: string;
  existingNames?: string[];
  /** 仅世界观：限定类型，空串 = 让 AI 自动判断 */
  worldviewType?: WorldviewType | "";
  /** 仅伏笔：限定重要度，空串 = 让 AI 自动判断 */
  importance?: "low" | "medium" | "high" | "";
}

const genderValues = ["male", "female", "other"] as const;
const worldviewTypeValues = [
  "location",
  "organization",
  "item",
  "event",
  "rule",
  "race",
  "magic",
  "technology",
  "history",
  "other",
] as const;
const importanceValues = ["low", "medium", "high"] as const;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function strList(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim());
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

function enumValue<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  const s = str(v).toLowerCase();
  return (allowed as readonly string[]).includes(s) ? (s as T) : fallback;
}

/** 从模型输出中提取 JSON 对象（剥代码围栏/截取花括号/去尾逗号，均失败返回 null） */
function parseJsonObject(raw: string): Record<string, unknown> | null {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) text = fence[1].trim();
  const start = text.search(/[{[]/);
  if (start >= 0) {
    const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
    if (end > start) text = text.slice(start, end + 1);
  }
  for (const candidate of [text, text.replace(/,\s*([}\]])/g, "$1")]) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      if (parsed && Array.isArray(parsed) && parsed[0] && typeof parsed[0] === "object") {
        return parsed[0] as Record<string, unknown>;
      }
    } catch {
      // 继续尝试下一种形态
    }
  }
  return null;
}

function buildUserMessage(input: GenerateStructuredInput): string {
  const context: string[] = [];
  if (input.projectTitle) context.push(`作品：《${input.projectTitle}》`);
  if (input.projectGenre) context.push(`题材类型：${input.projectGenre}`);
  if (input.projectSummary) context.push(`简介：${input.projectSummary.slice(0, 500)}`);
  if (input.existingNames?.length) {
    context.push(`已有条目（避免雷同或重复）：${input.existingNames.slice(0, 30).join("、")}`);
  }
  if (input.kind === "worldview" && input.worldviewType) {
    const label = worldviewTypes.find((t) => t.value === input.worldviewType)?.label;
    context.push(`限定类型：${label ?? input.worldviewType}`);
  }
  if (input.kind === "foreshadowing" && input.importance) {
    const label = { low: "低", medium: "中", high: "高" }[input.importance];
    context.push(`限定重要度：${label}`);
  }
  context.push(`需求：${input.requirement.trim()}`);
  return context.join("\n");
}

function createChatService() {
  const { ai } = useSettingsStore.getState();
  return createAIService({
    backend: ai.backend,
    baseUrl: ai.baseUrl,
    model: ai.model,
    apiKey: ai.apiKey,
    llama:
      ai.backend === "llamacpp"
        ? toLlamaConfig({
            baseUrl: ai.baseUrl,
            llamaServerPath: ai.llamaServerPath,
            llamaModelPath: ai.llamaModelPath,
            llamaExtraArgs: ai.llamaExtraArgs,
            idleUnloadMinutes: ai.idleUnloadMinutes,
          })
        : undefined,
  });
}

/** 发起一次 system+user 的非流式调用并解析 JSON（失败返回 null） */
async function chatWithPrompt(
  system: string,
  user: string,
  numPredict = 1600,
): Promise<Record<string, unknown> | null> {
  const service = createChatService();
  const raw = await service.chat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.5, numPredict, think: false },
  );
  if (!raw.trim()) return null;
  return parseJsonObject(raw);
}

async function chatJson(input: GenerateStructuredInput): Promise<Record<string, unknown> | null> {
  return chatWithPrompt(structuredPrompts[input.kind], buildUserMessage(input));
}

/** 生成人物，解析失败返回 null（保留用户输入，不静默创建） */
export async function generateCharacter(
  input: Omit<GenerateStructuredInput, "kind">,
): Promise<NewCharacter | null> {
  const data = await chatJson({ ...input, kind: "character" });
  return data ? toNewCharacter(data) : null;
}

/** 从 JSON 对象解析人物（name 必填），失败返回 null */
function toNewCharacter(data: Record<string, unknown>): NewCharacter | null {
  const name = str(data.name);
  if (!name) return null;
  return {
    name,
    aliases: strList(data.aliases),
    gender: enumValue(data.gender, genderValues, "other"),
    age: str(data.age),
    appearance: str(data.appearance),
    personality: str(data.personality),
    background: str(data.background),
    goals: str(data.goals),
    conflicts: str(data.conflicts),
    relationships: str(data.relationships),
    abilities: str(data.abilities),
    weaknesses: str(data.weaknesses),
    notes: str(data.notes),
    tags: strList(data.tags),
  };
}

/** 生成世界观条目，解析失败返回 null */
export async function generateWorldviewItem(
  input: Omit<GenerateStructuredInput, "kind">,
): Promise<NewWorldviewItem | null> {
  const data = await chatJson({ ...input, kind: "worldview" });
  if (!data) return null;
  const name = str(data.name);
  if (!name) return null;
  return {
    name,
    type: enumValue(data.type, worldviewTypeValues, "other"),
    description: str(data.description),
    details: str(data.details),
    relationships: str(data.relationships),
    notes: str(data.notes),
    tags: strList(data.tags),
  };
}

/** 生成伏笔，解析失败返回 null */
export async function generateForeshadowing(
  input: Omit<GenerateStructuredInput, "kind">,
): Promise<NewForeshadowing | null> {
  const data = await chatJson({ ...input, kind: "foreshadowing" });
  if (!data) return null;
  const name = str(data.name);
  if (!name) return null;
  return {
    name,
    description: str(data.description),
    plantedChapter: str(data.plantedChapter),
    plantedContent: str(data.plantedContent),
    revealChapter: str(data.revealChapter),
    revealContent: str(data.revealContent),
    status: "planted",
    importance: enumValue(data.importance, importanceValues, "medium"),
    relatedCharacters: strList(data.relatedCharacters),
    notes: str(data.notes),
  };
}

// ── 人物管理 AI 能力：完善 / 建议关系 / 从文本提取 ──────────────────────────────

export interface ProjectAIContext {
  projectTitle?: string;
  projectGenre?: string;
  projectSummary?: string;
}

/** AI 返回的关系条目（sourceName/targetName 尚未映射到 id） */
export interface SuggestedRelation {
  sourceName: string;
  targetName: string;
  type: RelationType;
  label: string;
  description: string;
  directed: boolean;
}

const relationTypeValues = relationTypes.map((t) => t.value) as readonly RelationType[];

function toRelationItem(v: unknown): SuggestedRelation | null {
  if (!v || typeof v !== "object") return null;
  const d = v as Record<string, unknown>;
  const sourceName = str(d.sourceName);
  const targetName = str(d.targetName);
  if (!sourceName || !targetName || sourceName === targetName) return null;
  return {
    sourceName,
    targetName,
    type: enumValue(d.type, relationTypeValues, "other"),
    label: str(d.label),
    description: str(d.description),
    directed: typeof d.directed === "boolean" ? d.directed : true,
  };
}

/** 完善现有人物：返回改进后的完整档案（name 必填），失败返回 null */
export async function refineCharacter(
  current: Character,
  opts: ProjectAIContext & { requirement?: string; siblingNames?: string[] },
): Promise<NewCharacter | null> {
  const lines: string[] = [];
  if (opts.projectTitle) lines.push(`作品：《${opts.projectTitle}》`);
  if (opts.projectGenre) lines.push(`题材类型：${opts.projectGenre}`);
  if (opts.projectSummary) lines.push(`简介：${opts.projectSummary.slice(0, 500)}`);
  if (opts.siblingNames?.length) {
    lines.push(`同项目已有（保持兼容、避免撞名）：${opts.siblingNames.slice(0, 40).join("、")}`);
  }
  lines.push(
    `【当前人物】\n${JSON.stringify(
      {
        name: current.name,
        aliases: current.aliases,
        gender: current.gender,
        age: current.age,
        appearance: current.appearance,
        personality: current.personality,
        background: current.background,
        goals: current.goals,
        conflicts: current.conflicts,
        relationships: current.relationships,
        abilities: current.abilities,
        weaknesses: current.weaknesses,
        notes: current.notes,
        tags: current.tags,
      },
      null,
      2,
    )}`,
  );
  if (opts.requirement?.trim()) lines.push(`【补充需求】${opts.requirement.trim()}`);
  const data = await chatWithPrompt(characterAIPrompts.refine, lines.join("\n\n"));
  return data ? toNewCharacter(data) : null;
}

/** 基于人物名册建议关系；解析失败返回 null，无建议返回 [] */
export async function suggestRelations(
  characters: Character[],
  opts: ProjectAIContext & { existing?: string[]; hint?: string },
): Promise<SuggestedRelation[] | null> {
  const roster = characters.map((c) => {
    const alias = c.aliases.length ? `（别名：${c.aliases.join("、")}）` : "";
    const brief = c.personality ? `：${c.personality.slice(0, 40)}` : "";
    return `${c.name}${alias}${brief}`;
  });
  const lines: string[] = [];
  if (opts.projectTitle) lines.push(`作品：《${opts.projectTitle}》`);
  if (opts.projectGenre) lines.push(`题材类型：${opts.projectGenre}`);
  if (opts.projectSummary) lines.push(`简介：${opts.projectSummary.slice(0, 500)}`);
  lines.push(`【人物名单】\n${roster.join("\n")}`);
  if (opts.existing?.length) {
    lines.push(`【已有关系（禁止重复或变体重复）】\n${opts.existing.join("\n")}`);
  }
  if (opts.hint?.trim()) lines.push(`【补充要求】${opts.hint.trim()}`);
  const data = await chatWithPrompt(characterAIPrompts.suggestRelations, lines.join("\n\n"));
  if (!data || !Array.isArray(data.relations)) return null;
  return data.relations
    .map(toRelationItem)
    .filter((x): x is SuggestedRelation => x !== null);
}

/** 从文本提取人物与关系；解析失败返回 null */
export async function extractCharacters(
  text: string,
  opts: ProjectAIContext & { existingNames?: string[] },
): Promise<{ characters: NewCharacter[]; relations: SuggestedRelation[] } | null> {
  const lines: string[] = [];
  if (opts.projectTitle) lines.push(`作品：《${opts.projectTitle}》`);
  if (opts.projectGenre) lines.push(`题材类型：${opts.projectGenre}`);
  if (opts.existingNames?.length) {
    lines.push(`【已有（避免重复创建，仍可补充信息）】${opts.existingNames.slice(0, 40).join("、")}`);
  }
  lines.push(`【待分析文本】\n${text.trim().slice(0, 6000)}`);
  const data = await chatWithPrompt(characterAIPrompts.extractCharacters, lines.join("\n\n"), 3000);
  if (!data || !Array.isArray(data.characters)) return null;
  const chars = data.characters
    .map((c) => (c && typeof c === "object" ? toNewCharacter(c as Record<string, unknown>) : null))
    .filter((c): c is NewCharacter => c !== null);
  const rels = Array.isArray(data.relations)
    ? data.relations.map(toRelationItem).filter((x): x is SuggestedRelation => x !== null)
    : [];
  return { characters: chars, relations: rels };
}
