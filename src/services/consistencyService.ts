import {
  consistencyReportDb,
  parseReportRow,
  type ConsistencyIssue,
  type ConsistencyReportRow,
} from "./database";
import { systemPrompts } from "./prompts";
import { createAIService, toLlamaConfig } from "./aiService";
import { useChapterStore } from "../stores/chapterStore";
import { useCharacterStore } from "../stores/characterStore";
import { useWorldviewStore } from "../stores/worldviewStore";
import { useForeshadowingStore } from "../stores/foreshadowingStore";
import { useSettingsStore } from "../stores/settingsStore";

/** 单章送检截断字数（防单章超长挤爆上下文） */
const CHAPTER_CHAR_LIMIT = 6000;
/** 送检正文总字数上限 */
const TOTAL_CHAR_LIMIT = 40000;
/** 权威设定摘要单字段截断 */
const FIELD_CHAR_LIMIT = 300;

export interface ParsedReport {
  chapterIds: string[];
  chapterTitles: string[];
  issues: ConsistencyIssue[];
}

/** 权威设定摘要（实体卡）：人物 + 世界观 + 伏笔 → 文本基准 */
export function buildEntityDigest(projectId: string): string {
  const parts: string[] = [];

  const chars = useCharacterStore
    .getState()
    .characters.filter((c) => c.projectId === projectId);
  if (chars.length > 0) {
    parts.push("【人物设定卡】");
    for (const c of chars) {
      const lines = [
        `- ${c.name}${c.aliases.length ? `（别名：${c.aliases.join("、")}）` : ""}`,
        c.appearance && `  外貌：${c.appearance.slice(0, FIELD_CHAR_LIMIT)}`,
        c.personality && `  性格：${c.personality.slice(0, FIELD_CHAR_LIMIT)}`,
        c.background && `  背景：${c.background.slice(0, FIELD_CHAR_LIMIT)}`,
        c.goals && `  目标：${c.goals.slice(0, FIELD_CHAR_LIMIT)}`,
        c.relationships && `  关系：${c.relationships.slice(0, FIELD_CHAR_LIMIT)}`,
      ].filter(Boolean);
      parts.push(lines.join("\n"));
    }
  }

  const worldview = useWorldviewStore
    .getState()
    .items.filter((w) => w.projectId === projectId);
  if (worldview.length > 0) {
    parts.push("【世界观设定卡】");
    for (const w of worldview) {
      parts.push(
        `- ${w.name}（${w.type}）：${[w.description, w.details]
          .filter(Boolean)
          .join("；")
          .slice(0, FIELD_CHAR_LIMIT * 2)}`
      );
    }
  }

  const foreshadowing = useForeshadowingStore
    .getState()
    .items.filter((f) => f.projectId === projectId);
  if (foreshadowing.length > 0) {
    parts.push("【伏笔清单】");
    for (const f of foreshadowing) {
      const statusLabel =
        f.status === "planted" ? "已埋设" : f.status === "revealed" ? "已回收" : f.status;
      parts.push(
        `- ${f.name}（${statusLabel}）：${(f.description || f.plantedContent || "").slice(0, 200)}`
      );
    }
  }

  return parts.join("\n");
}

/** 从 AI 回复解析 issues（容忍围栏/前后缀，坏字段容错） */
function parseIssues(raw: string): ConsistencyIssue[] | null {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) text = text.slice(start, end + 1);

  for (const candidate of [text, text.replace(/,\s*([}\]])/g, "$1")]) {
    try {
      const parsed = JSON.parse(candidate);
      const arr = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.issues)
          ? parsed.issues
          : null;
      if (!arr) continue;
      const issues: ConsistencyIssue[] = [];
      for (const item of arr) {
        if (!item || typeof item !== "object" || !item.title) continue;
        const sev = ["high", "medium", "low"].includes(item.severity)
          ? item.severity
          : "medium";
        const type = [
          "character",
          "timeline",
          "worldview",
          "plot",
          "foreshadow",
          "other",
        ].includes(item.type)
          ? item.type
          : "other";
        issues.push({
          severity: sev,
          type,
          title: String(item.title),
          description: String(item.description || ""),
          chapters: Array.isArray(item.chapters)
            ? item.chapters.map((c: unknown) => String(c))
            : [],
          evidence: String(item.evidence || ""),
          suggestion: String(item.suggestion || ""),
        });
      }
      return issues;
    } catch {
      // 尝试下一个候选
    }
  }
  return null;
}

/**
 * 运行一致性检查：权威设定 + 选定章节 → 结构化矛盾报告（落库）。
 * 有 outputIssues 时跳过 AI 直接入库（测试/回放用）。
 */
export async function checkConsistency(
  projectId: string,
  chapterIds: string[],
  opts?: { outputIssues?: ConsistencyIssue[] }
): Promise<ParsedReport> {
  const chapters = useChapterStore.getState().chapters;
  const picked = chapterIds
    .map((id) => chapters.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .sort((a, b) => a.order - b.order);
  if (picked.length === 0) throw new Error("未选择章节");

  let issues: ConsistencyIssue[];
  if (opts?.outputIssues) {
    issues = opts.outputIssues;
  } else {
    const digest = buildEntityDigest(projectId);
    const sections: string[] = [];
    let total = 0;
    for (const c of picked) {
      const body = (c.content || "").slice(0, CHAPTER_CHAR_LIMIT);
      const section = `第${c.order}章 ${c.title}\n${body}`;
      if (total + section.length > TOTAL_CHAR_LIMIT) {
        sections.push(`（后续章节超出长度上限，已省略）`);
        break;
      }
      sections.push(section);
      total += section.length;
    }

    const system = [
      systemPrompts.consistencyCheck,
      digest || "【权威设定卡】（本书暂无人物/世界观/伏笔卡片，仅做章节间互检）",
    ].join("\n\n");

    const ai = useSettingsStore.getState().ai;
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
        { role: "system", content: system },
        { role: "user", content: `【待检章节】\n${sections.join("\n\n")}` },
      ],
      { temperature: 0.2, numPredict: Math.max(ai.maxTokens, 4096), think: ai.think },
    );

    const parsed = parseIssues(raw);
    if (parsed === null) throw new Error("AI 返回的报告格式无法解析，请重试");
    issues = parsed;
  }

  await consistencyReportDb.create(projectId, {
    chapterIds: picked.map((c) => c.id),
    chapterTitles: picked.map((c) => c.title),
    issues,
    model: opts?.outputIssues ? "manual" : useSettingsStore.getState().ai.model,
  });

  return {
    chapterIds: picked.map((c) => c.id),
    chapterTitles: picked.map((c) => c.title),
    issues,
  };
}

export async function listReports(projectId: string): Promise<ConsistencyReportRow[]> {
  return consistencyReportDb.list(projectId);
}

export function reportDetail(row: ConsistencyReportRow): ParsedReport {
  return parseReportRow(row);
}

export async function deleteReport(id: string): Promise<void> {
  await consistencyReportDb.delete(id);
}
