import { revisionAIPrompts } from "./prompts";
import { createChatService, parseJsonObject } from "./aiGenerate";
import { useSettingsStore } from "../stores/settingsStore";
import { useProjectStore } from "../stores/projectStore";
import { useChapterStore } from "../stores/chapterStore";
import { useRevisionStore, type RevisionSource } from "../stores/revisionStore";
import { htmlToText } from "../lib/textDiff";

/**
 * 修订 AI：
 * - suggest：AI 修订建议（给修改稿，不动正文）
 * - proofread：拼写 / 语法 / 标点校对（同样以建议形式入库）
 * 结果均为 suggest 修订，正文 quote 高亮，接受时才替换文本。
 */
export type RevisionAIAction = "suggest" | "proofread";

export const revisionActionLabels: Record<RevisionAIAction, string> = {
  suggest: "AI 修订建议",
  proofread: "拼写与语法检查",
};

export interface RevisionPreview {
  quote: string;
  replacement: string;
  reason: string;
}

const CHAPTER_TEXT_LIMIT = 14000;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function parseRevisions(raw: unknown): RevisionPreview[] | null {
  if (!raw || typeof raw !== "object") return null;
  const arr = Array.isArray((raw as Record<string, unknown>).revisions)
    ? ((raw as Record<string, unknown>).revisions as unknown[])
    : null;
  if (!arr) return null;
  const out: RevisionPreview[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const quote = str(o.quote).trim();
    const replacement = str(o.replacement);
    if (!quote) continue;
    out.push({ quote, replacement: replacement.trim(), reason: str(o.reason).trim() });
  }
  return out;
}

/** 跑修订 AI，返回建议预览（不写库、不改正文） */
export async function runRevisionAI(
  action: RevisionAIAction,
  chapterId: string,
): Promise<RevisionPreview[]> {
  const project = useProjectStore.getState().currentProject;
  if (!project) throw new Error("未打开项目");
  const chapter = useChapterStore.getState().chapters.find((c) => c.id === chapterId);
  if (!chapter) throw new Error("章不存在");
  const text = htmlToText(chapter.content);
  if (!text) throw new Error("本章暂无正文，请先写作");
  const ai = useSettingsStore.getState().ai;

  const system = revisionAIPrompts[action];
  const userContent = [
    `作品：《${project.title}》`,
    `章节：${chapter.title}`,
    `【正文】\n${text.slice(0, CHAPTER_TEXT_LIMIT)}`,
  ].join("\n\n");

  const service = createChatService();
  const raw = await service.chat(
    [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
    { temperature: 0.3, numPredict: Math.max(ai.maxTokens, 4096), think: ai.think },
  );
  const parsed = parseJsonObject(raw);
  if (!parsed) throw new Error("AI 返回内容无法解析，请重试");
  const revisions = parseRevisions(parsed);
  if (revisions === null) throw new Error("AI 返回的修订格式无法解析，请重试");
  return revisions;
}

/**
 * 预览批量入库为 suggest 修订（正文不动）。
 * quote 在正文中可找到才入库；textFrom 置 null，高亮靠 quote 搜索。
 */
export function addSuggestionsFromPreviews(
  projectId: string,
  chapterId: string,
  previews: RevisionPreview[],
  source: RevisionSource = "ai",
): number {
  const chapter = useChapterStore.getState().chapters.find((c) => c.id === chapterId);
  const plain = chapter ? htmlToText(chapter.content).replace(/[\r\n]/g, "") : "";
  const store = useRevisionStore.getState();
  let n = 0;
  for (const p of previews) {
    const compactQuote = p.quote.replace(/[\r\n]/g, "");
    if (!compactQuote || !plain.includes(compactQuote)) continue;
    store.addRevision({
      projectId,
      chapterId,
      kind: "suggest",
      source,
      quoteBefore: compactQuote,
      quoteAfter: p.replacement,
      textFrom: null,
      reason: p.reason,
    });
    n++;
  }
  return n;
}
