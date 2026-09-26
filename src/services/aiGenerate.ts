import { createAIService, toLlamaConfig } from "./aiService";
import { structuredPrompts } from "./prompts";
import { useSettingsStore } from "../stores/settingsStore";
import type { Character } from "../stores/characterStore";
import type { WorldviewItem, WorldviewType } from "../stores/worldviewStore";
import { worldviewTypes } from "../stores/worldviewStore";
import type { Foreshadowing } from "../stores/foreshadowingStore";

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

async function chatJson(input: GenerateStructuredInput): Promise<Record<string, unknown> | null> {
  const { ai } = useSettingsStore.getState();
  const service = createAIService({
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
  const raw = await service.chat(
    [
      { role: "system", content: structuredPrompts[input.kind] },
      { role: "user", content: buildUserMessage(input) },
    ],
    { temperature: 0.5, numPredict: 1600, think: false },
  );
  if (!raw.trim()) return null;
  return parseJsonObject(raw);
}

/** 生成人物，解析失败返回 null（保留用户输入，不静默创建） */
export async function generateCharacter(
  input: Omit<GenerateStructuredInput, "kind">,
): Promise<NewCharacter | null> {
  const data = await chatJson({ ...input, kind: "character" });
  if (!data) return null;
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
