import { memoryDb } from "./database";
import { useChapterStore } from "../stores/chapterStore";
import { useCharacterStore } from "../stores/characterStore";
import { useWorldviewStore } from "../stores/worldviewStore";
import { useForeshadowingStore } from "../stores/foreshadowingStore";

export type RetrievedKind =
  | "summary"
  | "event"
  | "entity"
  | "note"
  | "preference"
  | "character"
  | "worldview"
  | "foreshadowing";

export interface RetrievedMemory {
  kind: RetrievedKind;
  id: string;
  title: string;
  content: string;
  /** 排序分：命中词数 × 10 + 基础重要度 */
  score: number;
}

/** 计算查询在文本中的命中度：命中词数（整句子串命中记 0.5） */
function countHits(hay: string, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const h = hay.toLowerCase();
  const terms = q.split(/[\s,，、;；:：]+/).filter((t) => t.length > 0);
  let hits = 0;
  for (const t of terms) {
    if (h.includes(t)) hits++;
  }
  if (hits === 0 && h.includes(q)) hits = 0.5;
  return hits;
}

/**
 * 混合记忆检索（记忆系统 v1）：
 * 记忆条目（DB）+ 章节摘要 + 人物 + 世界观 + 伏笔（store），
 * 关键词命中排序，供 AI 上下文注入与记忆管理搜索使用。
 */
export async function retrieveMemories(
  projectId: string,
  query: string,
  opts?: { limit?: number }
): Promise<RetrievedMemory[]> {
  const limit = opts?.limit ?? 6;
  const results: RetrievedMemory[] = [];

  // 1. 记忆条目（memory_items）
  const memoryRows = await memoryDb.list(projectId);
  const summaryRefIds = new Set<string>();
  for (const m of memoryRows) {
    if (m.type === "summary" && m.ref_id) summaryRefIds.add(m.ref_id);
    const hits = countHits(`${m.title}\n${m.content}\n${m.tags}`, query);
    if (hits > 0) {
      results.push({
        kind: (m.type as RetrievedKind) || "note",
        id: m.id,
        title: m.title || "记忆",
        content: m.content,
        score: hits * 10 + (m.importance || 5),
      });
    }
  }

  // 2. 章节摘要（store；已同步为 memory 条目的章节跳过，避免重复）
  const chapters = useChapterStore.getState().chapters;
  for (const c of chapters) {
    if (c.projectId !== projectId || !c.summary) continue;
    if (summaryRefIds.has(c.id)) continue;
    const hits = countHits(`${c.title}\n${c.summary}`, query);
    if (hits > 0) {
      results.push({
        kind: "summary",
        id: c.id,
        title: `${c.title} · 摘要`,
        content: c.summary,
        score: hits * 10 + 7,
      });
    }
  }

  // 3. 人物卡
  for (const ch of useCharacterStore.getState().characters) {
    if (ch.projectId !== projectId) continue;
    const hay = [
      ch.name,
      ch.aliases.join(" "),
      ch.appearance,
      ch.personality,
      ch.background,
      ch.goals,
      ch.relationships,
      ch.tags.join(" "),
    ].join("\n");
    const hits = countHits(hay, query);
    if (hits > 0) {
      const brief = [ch.personality && `性格：${ch.personality}`, ch.background && `背景：${ch.background}`]
        .filter(Boolean)
        .join("；");
      results.push({
        kind: "character",
        id: ch.id,
        title: `人物 · ${ch.name}`,
        content: brief || ch.appearance || ch.name,
        score: hits * 10 + 8,
      });
    }
  }

  // 4. 世界观设定
  for (const w of useWorldviewStore.getState().items) {
    if (w.projectId !== projectId) continue;
    const hits = countHits(`${w.name}\n${w.description}\n${w.details}\n${w.tags.join(" ")}`, query);
    if (hits > 0) {
      results.push({
        kind: "worldview",
        id: w.id,
        title: `设定 · ${w.name}`,
        content: w.description || w.details,
        score: hits * 10 + 6,
      });
    }
  }

  // 5. 伏笔
  for (const f of useForeshadowingStore.getState().items) {
    if (f.projectId !== projectId) continue;
    const hay = [
      f.name,
      f.description,
      f.plantedContent,
      f.revealContent,
      f.notes,
      f.relatedCharacters.join(" "),
    ].join("\n");
    const hits = countHits(hay, query);
    if (hits > 0) {
      const statusLabel =
        f.status === "planted" ? "已埋设" : f.status === "revealed" ? "已回收" : f.status;
      results.push({
        kind: "foreshadowing",
        id: f.id,
        title: `伏笔 · ${f.name}（${statusLabel}）`,
        content: f.description || f.plantedContent || f.name,
        score: hits * 10 + (f.importance === "high" ? 9 : f.importance === "medium" ? 7 : 5),
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
