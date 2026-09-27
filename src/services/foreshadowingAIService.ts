import type { ConsistencyIssue } from "./database";
import { foreshadowingAIPrompts } from "./prompts";
import { createChatService, parseJsonObject } from "./aiGenerate";
import { buildChapterExcerpt, buildOutlineDigest, parseIssues, saveOutlineReport } from "./outlineAIService";
import { useSettingsStore } from "../stores/settingsStore";
import { useProjectStore } from "../stores/projectStore";
import { useForeshadowingStore } from "../stores/foreshadowingStore";

/**
 * 伏笔 AI 辅助（PRD 4.2.9）：
 * - detectUnresolved：扫描正文找出「像伏笔但未标记」的线索 +「已标记但长期未回收」的条目
 * - suggestReveal：给定伏笔，建议回收章节位置与方式（多方案）
 * - suggestPlant：给定想法，建议埋设位置与方式（多方案）
 * 检测类 issues 与一致性报告同构，可经 saveOutlineReport 落 consistency_reports（type=foreshadow）；
 * 候选与埋设方案确认后写入 foreshadowing.json（store 自动落盘）。
 */

export type ForeshadowingAIAction = "detectUnresolved" | "suggestReveal" | "suggestPlant";

export interface UnresolvedCandidate {
  name: string;
  description: string;
  importance: "low" | "medium" | "high";
  plantedChapter: string;
  reason: string;
}

export interface RevealOption {
  revealChapter: string;
  revealContent: string;
  note: string;
}

export interface PlantOption {
  name: string;
  description: string;
  plantedChapter: string;
  plantedContent: string;
  importance: "low" | "medium" | "high";
}

export type ForeshadowingAIResult =
  | { action: "detectUnresolved"; issues: ConsistencyIssue[]; candidates: UnresolvedCandidate[] }
  | { action: "suggestReveal"; options: RevealOption[] }
  | { action: "suggestPlant"; options: PlantOption[] };

export interface ForeshadowingAIInput {
  /** suggestPlant 必填；其余可选补充说明 */
  requirement?: string;
  /** suggestReveal 必填：伏笔 id */
  foreshadowId?: string;
}

export const foreshadowingActionLabels: Record<ForeshadowingAIAction, string> = {
  detectUnresolved: "检测未回收伏笔",
  suggestReveal: "建议回收方式",
  suggestPlant: "建议埋设方式",
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function enumValue<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  const s = str(v).toLowerCase();
  return (allowed as readonly string[]).includes(s) ? (s as T) : fallback;
}

function parseCandidates(raw: unknown): UnresolvedCandidate[] | null {
  if (!raw || typeof raw !== "object") return null;
  const arr = Array.isArray((raw as Record<string, unknown>).candidates)
    ? ((raw as Record<string, unknown>).candidates as unknown[])
    : null;
  if (!arr) return null;
  const out: UnresolvedCandidate[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (!str(o.name)) continue;
    out.push({
      name: str(o.name),
      description: str(o.description),
      importance: enumValue(o.importance, ["low", "medium", "high"] as const, "medium"),
      plantedChapter: str(o.plantedChapter),
      reason: str(o.reason),
    });
  }
  return out;
}

function parseOptions<T>(
  raw: unknown,
  parseOne: (o: Record<string, unknown>) => T | null,
): T[] | null {
  if (!raw || typeof raw !== "object") return null;
  const arr = Array.isArray((raw as Record<string, unknown>).options)
    ? ((raw as Record<string, unknown>).options as unknown[])
    : null;
  if (!arr) return null;
  const out: T[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const parsed = parseOne(item as Record<string, unknown>);
    if (parsed) out.push(parsed);
  }
  return out;
}

/** 伏笔清单摘要（与一致性检查 digest 的伏笔段同源思路） */
function buildForeshadowingDigest(projectId: string): string {
  const items = useForeshadowingStore
    .getState()
    .items.filter((f) => f.projectId === projectId);
  if (items.length === 0) return "（暂无已标记伏笔）";
  return items
    .map((f) => {
      const status =
        f.status === "planted" ? "已埋设" : f.status === "revealed" ? "已回收" : "已废弃";
      const parts = [`- ${f.name}（${status}，重要度 ${f.importance}）`];
      if (f.description) parts.push(`  内容：${f.description}`);
      if (f.plantedChapter) parts.push(`  埋设：${f.plantedChapter}${f.plantedContent ? `（${f.plantedContent}）` : ""}`);
      if (f.revealChapter || f.revealContent) {
        parts.push(`  回收：${f.revealChapter || "未定"}${f.revealContent ? `（${f.revealContent}）` : ""}`);
      }
      return parts.join("\n");
    })
    .join("\n");
}

/** 运行伏笔 AI 能力，返回结构化结果（不写库） */
export async function runForeshadowingAI(
  action: ForeshadowingAIAction,
  input: ForeshadowingAIInput = {},
): Promise<ForeshadowingAIResult> {
  const project = useProjectStore.getState().currentProject;
  if (!project) throw new Error("未打开项目");
  const ai = useSettingsStore.getState().ai;

  const context: string[] = [`作品：《${project.title}》`];
  let system: string;
  let userContent: string;
  let temperature = 0.3;

  if (action === "detectUnresolved") {
    system = foreshadowingAIPrompts.detectUnresolved;
    context.push(`【已标记伏笔清单】\n${buildForeshadowingDigest(project.id)}`);
    const excerpt = buildChapterExcerpt(project.id);
    if (excerpt) context.push(`【正文节选】\n${excerpt}`);
    else throw new Error("本书暂无正文，请先写作后再检测");
    const req = str(input.requirement);
    if (req) context.push(`【重点关注】\n${req}`);
    userContent = context.join("\n\n");
  } else if (action === "suggestReveal") {
    if (!input.foreshadowId) throw new Error("请先选择伏笔");
    const item = useForeshadowingStore
      .getState()
      .items.find((f) => f.id === input.foreshadowId);
    if (!item) throw new Error("伏笔不存在");
    system = foreshadowingAIPrompts.suggestReveal;
    context.push(
      `【目标伏笔】\n- ${item.name}\n内容：${item.description}\n埋设：${item.plantedChapter || "未定"}${item.plantedContent ? `（${item.plantedContent}）` : ""}\n当前状态：${item.status}`,
    );
    const outline = buildOutlineDigest(project.id);
    if (outline) context.push(`【当前大纲】\n${outline}`);
    const req = str(input.requirement);
    if (req) context.push(`【补充需求】\n${req}`);
    userContent = context.join("\n\n");
    temperature = 0.5;
  } else {
    const req = str(input.requirement);
    if (!req) throw new Error("请先输入伏笔想法或主题");
    system = foreshadowingAIPrompts.suggestPlant;
    context.push(`【当前大纲】\n${buildOutlineDigest(project.id)}`);
    context.push(`【伏笔想法】\n${req}`);
    userContent = context.join("\n\n");
    temperature = 0.5;
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

  if (action === "detectUnresolved") {
    const issues = parseIssues(parsed);
    const candidates = parseCandidates(parsed);
    if (issues === null || candidates === null) {
      throw new Error("AI 返回的检测结果格式无法解析，请重试");
    }
    return { action, issues, candidates };
  }
  if (action === "suggestReveal") {
    const options = parseOptions<RevealOption>(parsed, (o) => {
      const content = str(o.revealContent);
      if (!content) return null;
      return { revealChapter: str(o.revealChapter), revealContent: content, note: str(o.note) };
    });
    if (!options || options.length === 0) throw new Error("AI 未返回有效回收方案，请重试");
    return { action, options };
  }
  const options = parseOptions<PlantOption>(parsed, (o) => {
    const name = str(o.name);
    if (!name) return null;
    return {
      name,
      description: str(o.description),
      plantedChapter: str(o.plantedChapter),
      plantedContent: str(o.plantedContent),
      importance: enumValue(o.importance, ["low", "medium", "high"] as const, "medium"),
    };
  });
  if (!options || options.length === 0) throw new Error("AI 未返回有效埋设方案，请重试");
  return { action, options };
}

/** 候选疑似伏笔批量入库（写 foreshadowing.json） */
export function addUnresolvedCandidates(
  projectId: string,
  candidates: UnresolvedCandidate[],
): number {
  const store = useForeshadowingStore.getState();
  for (const c of candidates) {
    store.addItem({
      projectId,
      name: c.name,
      description: c.description,
      importance: c.importance,
      status: "planted",
      plantedChapter: c.plantedChapter,
      plantedContent: c.reason,
      revealChapter: "",
      revealContent: "",
      relatedCharacters: [],
      notes: "AI 检测疑似伏笔",
    });
  }
  return candidates.length;
}

/** 应用回收方案：写回伏笔的回收章节与方式（status 由用户在页面标记） */
export function applyRevealOption(foreshadowId: string, option: RevealOption): void {
  useForeshadowingStore.getState().updateItem(foreshadowId, {
    revealChapter: option.revealChapter,
    revealContent: option.revealContent,
  });
}

/** 埋设方案入库 */
export function addPlantOptions(projectId: string, options: PlantOption[]): number {
  const store = useForeshadowingStore.getState();
  for (const o of options) {
    store.addItem({
      projectId,
      name: o.name,
      description: o.description,
      importance: o.importance,
      status: "planted",
      plantedChapter: o.plantedChapter,
      plantedContent: o.plantedContent,
      revealChapter: "",
      revealContent: "",
      relatedCharacters: [],
      notes: "AI 建议埋设",
    });
  }
  return options.length;
}

/** 检测结果保存为一致性报告（type=foreshadow，与一致性检查同构同库） */
export const saveForeshadowingReport = saveOutlineReport;
