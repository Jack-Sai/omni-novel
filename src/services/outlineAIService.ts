import { consistencyReportDb, type ConsistencyIssue } from "./database";
import { outlineAIPrompts } from "./prompts";
import { createChatService, parseJsonObject } from "./aiGenerate";
import { useSettingsStore } from "../stores/settingsStore";
import { useProjectStore } from "../stores/projectStore";
import { useVolumeStore, type Volume } from "../stores/volumeStore";
import { useChapterStore, type Chapter } from "../stores/chapterStore";
import { useSceneStore, type Scene } from "../stores/sceneStore";

/**
 * 大纲 AI 辅助（PRD 4.3.6）：
 * 生成三级大纲 / 检查逻辑与节奏 / 建议冲突与爽点伏笔 / 扩写缩写大纲条目。
 * 生成与建议类只产出预览，确认后经 applyOutlinePlan 写入 volumes/chapters/scenes（store 自动落盘）。
 * 检查类输出与一致性报告同构的 issues，可经 saveOutlineReport 落 consistency_reports。
 */

export type OutlineAIAction =
  | "generate"
  | "checkLogic"
  | "checkPacing"
  | "suggestConflict"
  | "suggestHooks"
  | "expand"
  | "condense";

export interface PlanScene {
  title: string;
  summary: string;
}

export interface PlanChapter {
  title: string;
  summary: string;
  scenes: PlanScene[];
}

export interface PlanVolume {
  title: string;
  description: string;
  chapters: PlanChapter[];
}

export interface OutlinePlan {
  volumes: PlanVolume[];
}

export interface OutlineSuggestion {
  title: string;
  description: string;
  targetChapter: string;
  kind: string;
}

export type OutlineAIResult =
  | { action: "generate"; plan: OutlinePlan }
  | { action: "checkLogic" | "checkPacing"; issues: ConsistencyIssue[] }
  | { action: "suggestConflict" | "suggestHooks"; suggestions: OutlineSuggestion[] }
  | { action: "expand" | "condense"; text: string };

export interface OutlineAIInput {
  /** 用户补充（灵感/关注点/条目文本） */
  requirement?: string;
  /** expand/condense：目标章 id（用于展示与写入） */
  chapterId?: string;
}

export const outlineActionLabels: Record<OutlineAIAction, string> = {
  generate: "生成大纲",
  checkLogic: "检查逻辑",
  checkPacing: "检查节奏",
  suggestConflict: "建议冲突",
  suggestHooks: "建议爽点/伏笔",
  expand: "扩写条目",
  condense: "缩写条目",
};

const CHAPTER_CHAR_LIMIT = 4000;
const TOTAL_CHAR_LIMIT = 30000;

/** 大纲摘要（卷→章→场景）：送给 AI 的结构化文本 */
export function buildOutlineDigest(projectId: string): string {
  const { chapters } = useChapterStore.getState();
  const { scenes } = useSceneStore.getState();
  const volumes = useVolumeStore
    .getState()
    .volumes.filter((v) => v.projectId === projectId)
    .sort((a, b) => a.order - b.order);
  const byVolume = chapters
    .filter((c) => c.projectId === projectId)
    .sort((a, b) => a.order - b.order);
  const parts: string[] = [];

  const renderChapter = (c: Chapter): string => {
    const lines = [`【第${c.order + 1}章】${c.title}`];
    if (c.summary) lines.push(`梗概：${c.summary}`);
    const chScenes = scenes
      .filter((s) => s.chapterId === c.id)
      .sort((a, b) => a.order - b.order);
    if (chScenes.length > 0) {
      lines.push(
        `场景：${chScenes.map((s, i) => `${i + 1}.${s.title}${s.summary ? `（${s.summary}）` : ""}`).join(" ")}`,
      );
    }
    return lines.join("\n");
  };

  if (volumes.length > 0) {
    for (const v of volumes) {
      parts.push(`◆ 卷《${v.title}》${v.description ? `：${v.description}` : ""}`);
      const vChapters = byVolume.filter((c) => c.volumeId === v.id);
      for (const c of vChapters) parts.push(renderChapter(c));
    }
    const ungrouped = byVolume.filter((c) => c.volumeId === null);
    if (ungrouped.length > 0) {
      parts.push("◆ 未分卷");
      for (const c of ungrouped) parts.push(renderChapter(c));
    }
  } else {
    for (const c of byVolume) parts.push(renderChapter(c));
  }

  return parts.length > 0 ? parts.join("\n") : "（当前暂无大纲）";
}

/** 章节正文组包（截断到上限，供检查类参考已有内容） */
function buildChapterExcerpt(projectId: string): string {
  const picked = useChapterStore
    .getState()
    .chapters.filter((c) => c.projectId === projectId)
    .sort((a, b) => a.order - b.order);
  const sections: string[] = [];
  let total = 0;
  for (const c of picked) {
    const body = (c.content || "").slice(0, CHAPTER_CHAR_LIMIT);
    if (!body) continue;
    const section = `第${c.order + 1}章 ${c.title}\n${body}`;
    if (total + section.length > TOTAL_CHAR_LIMIT) {
      sections.push("（后续章节超出长度上限，已省略）");
      break;
    }
    sections.push(section);
    total += section.length;
  }
  return sections.join("\n\n");
}

function strList(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim());
  }
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** 解析 issues（与一致性报告同构，容错同 consistencyService） */
function parseIssues(raw: unknown): ConsistencyIssue[] | null {
  if (!raw || typeof raw !== "object") return null;
  const arr = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as Record<string, unknown>).issues)
      ? ((raw as Record<string, unknown>).issues as unknown[])
      : null;
  if (!arr) return null;
  const issues: ConsistencyIssue[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object" || !(item as Record<string, unknown>).title) continue;
    const o = item as Record<string, unknown>;
    const sev = ["high", "medium", "low"].includes(str(o.severity))
      ? (str(o.severity) as ConsistencyIssue["severity"])
      : "medium";
    const type = [
      "character",
      "timeline",
      "worldview",
      "plot",
      "foreshadow",
      "other",
    ].includes(str(o.type))
      ? (str(o.type) as ConsistencyIssue["type"])
      : "other";
    issues.push({
      severity: sev,
      type,
      title: str(o.title),
      description: str(o.description),
      chapters: strList(o.chapters),
      evidence: str(o.evidence),
      suggestion: str(o.suggestion),
    });
  }
  return issues;
}

function parseSuggestions(raw: unknown): OutlineSuggestion[] | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const arr = Array.isArray(obj.suggestions) ? obj.suggestions : null;
  if (!arr) return null;
  const out: OutlineSuggestion[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (!str(o.title)) continue;
    out.push({
      title: str(o.title),
      description: str(o.description),
      targetChapter: str(o.targetChapter),
      kind: str(o.kind) || "建议",
    });
  }
  return out;
}

function parsePlan(raw: unknown): OutlinePlan | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const vols = Array.isArray(obj.volumes) ? obj.volumes : null;
  if (!vols) return null;
  const volumes: PlanVolume[] = [];
  for (const v of vols) {
    if (!v || typeof v !== "object") continue;
    const vo = v as Record<string, unknown>;
    if (!str(vo.title)) continue;
    const chs = Array.isArray(vo.chapters) ? vo.chapters : [];
    const chapters: PlanChapter[] = [];
    for (const c of chs) {
      if (!c || typeof c !== "object") continue;
      const co = c as Record<string, unknown>;
      if (!str(co.title)) continue;
      const scs = Array.isArray(co.scenes) ? co.scenes : [];
      const scenes: PlanScene[] = [];
      for (const s of scs) {
        if (!s || typeof s !== "object") continue;
        const so = s as Record<string, unknown>;
        if (!str(so.title)) continue;
        scenes.push({ title: str(so.title), summary: str(so.summary) });
      }
      chapters.push({ title: str(co.title), summary: str(co.summary), scenes });
    }
    volumes.push({ title: str(vo.title), description: str(vo.description), chapters });
  }
  if (volumes.length === 0) return null;
  return { volumes };
}

/** 运行大纲 AI 能力，返回结构化结果（不写库） */
export async function runOutlineAI(
  action: OutlineAIAction,
  input: OutlineAIInput = {},
): Promise<OutlineAIResult> {
  const project = useProjectStore.getState().currentProject;
  if (!project) throw new Error("未打开项目");
  const ai = useSettingsStore.getState().ai;

  const context: string[] = [];
  context.push(`作品：《${project.title}》`);
  if (project.genre) context.push(`题材：${project.genre}`);
  if (project.synopsis) context.push(`简介：${project.synopsis.slice(0, 400)}`);

  const isExpandCondense = action === "expand" || action === "condense";
  const isCheck = action === "checkLogic" || action === "checkPacing";
  const isGenerate = action === "generate";

  if (!isExpandCondense) {
    const digest = buildOutlineDigest(project.id);
    context.push(`【当前大纲】\n${digest}`);
  }
  if (isCheck || action === "suggestConflict" || action === "suggestHooks") {
    const excerpt = buildChapterExcerpt(project.id);
    if (excerpt) context.push(`【已有正文节选】\n${excerpt}`);
  }

  let userContent: string;
  if (isGenerate) {
    const req = (input.requirement || "").trim();
    if (!req) throw new Error("请先输入灵感或梗概");
    context.push(`【灵感/需求】\n${req}`);
    userContent = context.join("\n\n");
  } else if (isExpandCondense) {
    const req = (input.requirement || "").trim();
    if (!req) throw new Error("请先输入要处理的大纲条目");
    context.push(`【待处理条目】\n${req.slice(0, 4000)}`);
    userContent = context.join("\n\n");
  } else {
    const req = (input.requirement || "").trim();
    if (req) context.push(`【重点关注】\n${req}`);
    userContent = context.join("\n\n");
  }

  const promptKey = (
    {
      generate: "generateOutline",
      checkLogic: "checkLogic",
      checkPacing: "checkPacing",
      suggestConflict: "suggestConflict",
      suggestHooks: "suggestHooks",
      expand: "expand",
      condense: "condense",
    } as const
  )[action] satisfies keyof typeof outlineAIPrompts;

  const service = createChatService();
  const raw = await service.chat(
    [
      { role: "system", content: outlineAIPrompts[promptKey] },
      { role: "user", content: userContent },
    ],
    { temperature: isGenerate || isExpandCondense ? 0.6 : 0.2, numPredict: Math.max(ai.maxTokens, 4096), think: ai.think },
  );

  const parsed = parseJsonObject(raw);
  if (!parsed) throw new Error("AI 返回内容无法解析，请重试");

  if (isGenerate) {
    const plan = parsePlan(parsed);
    if (!plan) throw new Error("生成的大纲格式无法解析，请重试");
    return { action: "generate", plan };
  }
  if (isCheck) {
    const issues = parseIssues(parsed);
    if (issues === null) throw new Error("AI 返回的报告格式无法解析，请重试");
    return { action, issues };
  }
  if (action === "suggestConflict" || action === "suggestHooks") {
    const suggestions = parseSuggestions(parsed);
    if (suggestions === null || suggestions.length === 0) {
      throw new Error("AI 未返回有效建议，请重试");
    }
    return { action, suggestions };
  }
  const text = str((parsed as Record<string, unknown>).text);
  if (!text) throw new Error("AI 返回内容无法解析，请重试");
  return { action, text };
}

/** 把生成的三级大纲写入 volumes/chapters/scenes（追加，不覆盖已有；store 自动落盘） */
export function applyOutlinePlan(
  projectId: string,
  plan: OutlinePlan,
): { volumes: number; chapters: number; scenes: number } {
  const now = new Date().toISOString();
  const vState = useVolumeStore.getState();
  const cState = useChapterStore.getState();
  const sState = useSceneStore.getState();

  let vOrder = vState.volumes
    .filter((v) => v.projectId === projectId)
    .reduce((max, v) => Math.max(max, v.order), -1) + 1;
  let chOrder = cState.chapters
    .filter((c) => c.projectId === projectId)
    .reduce((max, c) => Math.max(max, c.order), -1) + 1;

  const newVolumes: Volume[] = [];
  const newChapters: Chapter[] = [];
  const newScenes: Scene[] = [];

  for (const pv of plan.volumes) {
    const volume: Volume = {
      id: crypto.randomUUID(),
      projectId,
      title: pv.title,
      description: pv.description,
      order: vOrder++,
      createdAt: now,
      updatedAt: now,
    };
    newVolumes.push(volume);

    for (const pc of pv.chapters) {
      const chapter: Chapter = {
        id: crypto.randomUUID(),
        projectId,
        volumeId: volume.id,
        title: pc.title,
        content: "",
        summary: pc.summary,
        status: "draft",
        order: chOrder++,
        createdAt: now,
        updatedAt: now,
      };
      newChapters.push(chapter);

      pc.scenes.forEach((ps, i) => {
        newScenes.push({
          id: crypto.randomUUID(),
          projectId,
          chapterId: chapter.id,
          title: ps.title,
          summary: ps.summary,
          status: "draft",
          order: i,
          createdAt: now,
          updatedAt: now,
        });
      });
    }
  }

  useVolumeStore.setState({ volumes: [...vState.volumes, ...newVolumes] });
  useChapterStore.setState({ chapters: [...cState.chapters, ...newChapters] });
  useSceneStore.setState({ scenes: [...sState.scenes, ...newScenes] });

  return {
    volumes: newVolumes.length,
    chapters: newChapters.length,
    scenes: newScenes.length,
  };
}

/** 检查类结果保存为一致性报告（type 含 foreshadow/plot，与一致性检查同构同库） */
export async function saveOutlineReport(
  projectId: string,
  issues: ConsistencyIssue[],
): Promise<void> {
  const chapters = useChapterStore
    .getState()
    .chapters.filter((c) => c.projectId === projectId)
    .sort((a, b) => a.order - b.order);
  await consistencyReportDb.create(projectId, {
    chapterIds: chapters.map((c) => c.id),
    chapterTitles: chapters.map((c) => c.title),
    issues,
    model: useSettingsStore.getState().ai.model,
  });
}
