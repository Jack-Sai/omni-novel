import { annotationAIPrompts } from "./prompts";
import { createChatService, parseJsonObject } from "./aiGenerate";
import { useSettingsStore } from "../stores/settingsStore";
import { useProjectStore } from "../stores/projectStore";
import { useChapterStore } from "../stores/chapterStore";
import { useAnnotationStore, type AnnotationKind } from "../stores/annotationStore";
import { htmlToText } from "../lib/textDiff";

/**
 * 批注 AI（PRD 批注系统）：
 * - review：资深编辑逐段审校 → 审校批注（kind=ai）
 * - aiContent：标记疑似 AI 生成段落（kind=ai）
 * - reader：读者模拟即时反应（kind=reader）
 * quote 为正文原样摘录；入库时按 htmlToText 判定能否挂到文本级，
 * 定位偏移交给高亮插件按 quote 搜索（textFrom 置 null）。
 */
export type AnnotationAIAction = "review" | "aiContent" | "reader";

export const annotationActionLabels: Record<AnnotationAIAction, string> = {
  review: "AI 审校批注",
  aiContent: "标记 AI 生成内容",
  reader: "读者模拟批注",
};

export interface AnnotationPreview {
  quote: string;
  title: string;
  content: string;
}

const CHAPTER_TEXT_LIMIT = 14000;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function parsePreviews(raw: unknown): AnnotationPreview[] | null {
  if (!raw || typeof raw !== "object") return null;
  const arr = Array.isArray((raw as Record<string, unknown>).annotations)
    ? ((raw as Record<string, unknown>).annotations as unknown[])
    : null;
  if (!arr) return null;
  const out: AnnotationPreview[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const title = str(o.title);
    const content = str(o.content);
    if (!title || !content) continue;
    out.push({ quote: str(o.quote), title, content });
  }
  return out;
}

/** 跑批注 AI，返回预览（不写库） */
export async function runAnnotationAI(
  action: AnnotationAIAction,
  chapterId: string,
): Promise<AnnotationPreview[]> {
  const project = useProjectStore.getState().currentProject;
  if (!project) throw new Error("未打开项目");
  const chapter = useChapterStore.getState().chapters.find((c) => c.id === chapterId);
  if (!chapter) throw new Error("章不存在");
  const text = htmlToText(chapter.content);
  if (!text) throw new Error("本章暂无正文，请先写作");
  const ai = useSettingsStore.getState().ai;

  const system = annotationAIPrompts[action];
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
    { temperature: 0.4, numPredict: Math.max(ai.maxTokens, 4096), think: ai.think },
  );
  const parsed = parseJsonObject(raw);
  if (!parsed) throw new Error("AI 返回内容无法解析，请重试");
  const previews = parsePreviews(parsed);
  if (previews === null) throw new Error("AI 返回的批注格式无法解析，请重试");
  return previews;
}

/** 预览批量入库：quote 在正文纯文本中可找到 → text 级，否则降级 chapter 级 */
export function addAnnotationsFromPreviews(
  projectId: string,
  chapterId: string,
  previews: AnnotationPreview[],
  kind: AnnotationKind,
): number {
  const chapter = useChapterStore.getState().chapters.find((c) => c.id === chapterId);
  const plain = chapter ? htmlToText(chapter.content) : "";
  const store = useAnnotationStore.getState();
  for (const p of previews) {
    const inText = p.quote && plain.includes(p.quote);
    store.addAnnotation({
      projectId,
      scope: inText ? "text" : "chapter",
      kind,
      status: "open",
      chapterId,
      title: p.title,
      content: p.content,
      quote: p.quote,
      textFrom: null,
      textTo: null,
      replies: [],
    });
  }
  return previews.length;
}
