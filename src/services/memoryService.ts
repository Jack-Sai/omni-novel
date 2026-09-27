import { invoke } from "@tauri-apps/api/core";
import { memoryDb, type MemoryItemRow } from "./database";
import { useChapterStore } from "../stores/chapterStore";
import { useCharacterStore } from "../stores/characterStore";
import { useWorldviewStore } from "../stores/worldviewStore";
import { useForeshadowingStore } from "../stores/foreshadowingStore";
import { useSettingsStore } from "../stores/settingsStore";

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

// ── 向量检索（embeddingModel 配置后启用，失败/未配置自动降级为纯关键词） ──

interface EmbedConfig {
  backend: string;
  baseUrl: string;
  model: string;
  apiKey: string | null;
}

function embedConfig(): EmbedConfig | null {
  const ai = useSettingsStore.getState().ai;
  const model = ai.embeddingModel.trim();
  if (!model) return null;
  return {
    backend: ai.backend,
    baseUrl: ai.baseUrl,
    model,
    apiKey: ai.apiKey || null,
  };
}

/** 生成向量；接口失败返回 null（调用方降级关键词） */
export async function embedText(text: string): Promise<number[] | null> {
  const cfg = embedConfig();
  if (!cfg || !text.trim()) return null;
  try {
    return await invoke<number[]>("ai_embed", {
      backend: cfg.backend,
      baseUrl: cfg.baseUrl,
      model: cfg.model,
      apiKey: cfg.apiKey,
      text: text.slice(0, 4000),
    });
  } catch (e) {
    console.warn("embedding 生成失败（降级关键词检索）:", e);
    return null;
  }
}

export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function rowVector(row: MemoryItemRow, model: string): number[] | null {
  if (!row.embedding || row.embedding_model !== model) return null;
  try {
    const v = JSON.parse(row.embedding);
    return Array.isArray(v) && typeof v[0] === "number" ? (v as number[]) : null;
  } catch {
    return null;
  }
}

/** query embedding 会话级缓存（key 含模型配置，改设置自动失效） */
const queryVecCache = new Map<string, number[] | null>();

async function queryEmbedding(query: string, cfg: EmbedConfig): Promise<number[] | null> {
  const key = `${cfg.backend}|${cfg.baseUrl}|${cfg.model}|${query}`;
  if (queryVecCache.has(key)) return queryVecCache.get(key) ?? null;
  const vec = await embedText(query);
  if (queryVecCache.size > 50) queryVecCache.clear();
  queryVecCache.set(key, vec);
  return vec;
}

/** 记忆条目向量回填：缺向量或模型切换后异步补齐（并发去重，单次最多 maxN 条） */
const backfillingIds = new Set<string>();

export async function backfillMemoryEmbedding(
  row: MemoryItemRow,
  opts?: { force?: boolean }
): Promise<void> {
  const cfg = embedConfig();
  if (!cfg) return;
  if (!opts?.force && row.embedding && row.embedding_model === cfg.model) return;
  if (backfillingIds.has(row.id)) return;
  backfillingIds.add(row.id);
  try {
    const vec = await embedText(`${row.title}\n${row.content}`);
    if (vec) await memoryDb.setEmbedding(row.id, vec, cfg.model);
  } catch (e) {
    console.warn("记忆向量回填失败:", e);
  } finally {
    backfillingIds.delete(row.id);
  }
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

  // 1. 记忆条目（memory_items）：关键词命中 + 向量相似度融合（启用 embedding 时）
  const embedCfg = embedConfig();
  const queryVec = embedCfg ? await queryEmbedding(query, embedCfg) : null;
  const memoryRows = await memoryDb.list(projectId);
  const summaryRefIds = new Set<string>();
  let backfilled = 0;
  for (const m of memoryRows) {
    if (m.type === "summary" && m.ref_id) summaryRefIds.add(m.ref_id);
    const hits = countHits(`${m.title}\n${m.content}\n${m.tags}`, query);
    let matched = hits > 0;
    let score = hits * 10 + (m.importance || 5);
    if (queryVec && embedCfg) {
      const rv = rowVector(m, embedCfg.model);
      if (rv) {
        const cos = cosine(queryVec, rv);
        // 语义相关（cos > 0.3）可独立入选；命中时取更优分
        if (cos > 0.3) {
          matched = true;
          score = Math.max(score, cos * 25 + (m.importance || 5));
        }
      } else if (backfilled < 3 && !backfillingIds.has(m.id)) {
        backfilled++;
        void backfillMemoryEmbedding(m);
      }
    }
    if (matched) {
      results.push({
        kind: (m.type as RetrievedKind) || "note",
        id: m.id,
        title: m.title || "记忆",
        content: m.content,
        score,
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
