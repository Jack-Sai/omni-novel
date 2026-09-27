/**
 * 文风检测（本地启发式，即时运行）：
 * - repeat：重复词——相邻同字（功能字）与同段高频词
 * - filler：口水词——高频口语连接词/陈词
 * - aiTone：AI 腔——模型高频套话与模板句式
 * offset 为纯文本（块间无分隔拼接）内偏移，供正文定位。
 */
export type StyleIssueType = "repeat" | "filler" | "aiTone";

export interface StyleIssue {
  type: StyleIssueType;
  /** 命中的词或片段 */
  word: string;
  /** 原文中的位置（纯文本偏移） */
  offset: number;
  /** 上下文（命中处前后各 16 字，单行展示用） */
  excerpt: string;
  suggestion: string;
}

export const styleIssueLabels: Record<StyleIssueType, string> = {
  repeat: "重复词",
  filler: "口水词",
  aiTone: "AI 腔",
};

/** 相邻重复的虚词（"的的""了了"类；实词叠词如"姐姐"属正常不列入） */
const DUP_FUNCTION_CHARS = "的了是在有和与就都而也很么吗呢吧着过把被让给对从向于";

/** 口水词（高频连接词、陈词滥调，按频率超标报） */
const FILLER_WORDS = [
  "然后",
  "接着",
  "突然",
  "忽然",
  "不禁",
  "下意识",
  "仿佛",
  "似乎",
  "缓缓",
  "微微",
  "淡淡",
  "默默",
  "轻轻",
  "静静",
  "深深",
  "缓缓地",
  "慢慢地",
  "静静地",
  "凝视",
  "注视",
  "闪过",
  "浮现",
  "涌上",
  "愣了愣",
  "顿了顿",
  "深吸一口气",
];

/** AI 腔（模型高频套话与模板句式；命中一次即报） */
const AI_TONE_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /眼中闪过一(?:丝|抹|缕)/, label: "「眼中闪过一丝…」套话" },
  { pattern: /嘴角勾起一抹/, label: "「嘴角勾起一抹…」套话" },
  { pattern: /深吸一口气/, label: "「深吸一口气」高频动作" },
  { pattern: /心中一(?:凛|紧|惊|震)/, label: "「心中一凛」套话" },
  { pattern: /仿佛[^。！？\n]{0,10}一般/, label: "「仿佛…一般」句式" },
  { pattern: /空气仿佛/, label: "「空气仿佛凝固」套话" },
  { pattern: /时间仿佛/, label: "「时间仿佛静止」套话" },
  { pattern: /多了几分/, label: "「多了几分」模糊量词" },
  { pattern: /少了几分/, label: "「少了几分」模糊量词" },
  { pattern: /深邃的眼(?:眸|睛)/, label: "「深邃的眼眸」套话" },
  { pattern: /涌上心头/, label: "「涌上心头」套话" },
  { pattern: /不由(?:得|自主)/, label: "「不由自主」口头禅" },
  { pattern: /一抹(?:笑意|弧度|讥讽|冷笑|倦意)/, label: "「一抹…」量词套话" },
  { pattern: /显得格外/, label: "「显得格外」冗余" },
  { pattern: /这个世界/, label: "「这个世界」AI 口癖" },
  { pattern: /值得注意的是/, label: "「值得注意的是」公文腔" },
  { pattern: /总而言之|综上所述/, label: "总结腔" },
];

const FILLER_RATE_LIMIT = 6; // 每千字口水词出现次数上限（超过则报频率问题）
const REPEAT_WINDOW = 80; // 同段高频词统计窗口（字符）
const REPEAT_MAX = 3; // 窗口内出现次数达到即报
const MAX_ISSUES = 120;

function makeExcerpt(text: string, offset: number, len: number): string {
  const start = Math.max(0, offset - 16);
  const end = Math.min(text.length, offset + len + 16);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

export function runStyleCheck(text: string): StyleIssue[] {
  const issues: StyleIssue[] = [];
  if (!text) return issues;

  // ── 重复词：相邻同字（仅虚词字符） ──
  for (let i = 1; i < text.length && issues.length < MAX_ISSUES; i++) {
    const a = text[i - 1];
    const b = text[i];
    if (a === b && DUP_FUNCTION_CHARS.includes(a)) {
      issues.push({
        type: "repeat",
        word: a + a,
        offset: i - 1,
        excerpt: makeExcerpt(text, i - 1, 2),
        suggestion: `叠字「${a}${a}」疑似多打，删其一`,
      });
      i++; // 跳过连续三连
    }
  }

  // ── 重复词：同窗口高频词 ──
  const wordSet = new Set([...FILLER_WORDS, "他", "她", "它", "那", "这"]);
  for (const w of wordSet) {
    let idx = text.indexOf(w);
    const hits: number[] = [];
    while (idx !== -1 && issues.length < MAX_ISSUES) {
      hits.push(idx);
      idx = text.indexOf(w, idx + w.length);
    }
    // 滑动窗口找密集区（REPEAT_WINDOW 内出现 >= REPEAT_MAX 次）
    for (let s = 0; s < hits.length; s++) {
      const start = hits[s];
      let count = 0;
      let first = start;
      for (let k = s; k < hits.length; k++) {
        if (hits[k] - start > REPEAT_WINDOW) break;
        if (count === 0) first = hits[k];
        count++;
      }
      if (count >= REPEAT_MAX) {
        issues.push({
          type: "repeat",
          word: w,
          offset: first,
          excerpt: makeExcerpt(text, first, w.length),
          suggestion: `「${w}」在 ${REPEAT_WINDOW} 字内出现 ${count} 次，注意替换或删减`,
        });
        break; // 每个词只报最密集的一处
      }
    }
  }

  // ── 口水词：逐个命中记录，频率超标时整体报 ──
  const fillerHits: StyleIssue[] = [];
  for (const w of FILLER_WORDS) {
    let idx = text.indexOf(w);
    while (idx !== -1) {
      fillerHits.push({
        type: "filler",
        word: w,
        offset: idx,
        excerpt: makeExcerpt(text, idx, w.length),
        suggestion: `「${w}」属于口水词，视语境替换或删减`,
      });
      idx = text.indexOf(w, idx + w.length);
      if (fillerHits.length >= MAX_ISSUES * 2) break;
    }
  }
  const perThousand = (fillerHits.length / Math.max(text.length, 1)) * 1000;
  if (perThousand > FILLER_RATE_LIMIT || fillerHits.length >= 8) {
    // 频率超标：按词聚合报，附带出现最多的一处
    const byWord = new Map<string, StyleIssue[]>();
    for (const h of fillerHits) {
      const arr = byWord.get(h.word) ?? [];
      arr.push(h);
      byWord.set(h.word, arr);
    }
    for (const [word, hits] of byWord) {
      if (issues.length >= MAX_ISSUES) break;
      const h = hits[0];
      issues.push({
        ...h,
        suggestion: `「${word}」全文出现 ${hits.length} 次（${perThousand.toFixed(1)}/千字），建议替换或删减`,
      });
    }
  }

  // ── AI 腔：模板句式命中即报 ──
  for (const { pattern, label } of AI_TONE_PATTERNS) {
    if (issues.length >= MAX_ISSUES) break;
    pattern.lastIndex = 0;
    const m = pattern.exec(text);
    if (m) {
      issues.push({
        type: "aiTone",
        word: m[0],
        offset: m.index,
        excerpt: makeExcerpt(text, m.index, m[0].length),
        suggestion: `${label}，常见于 AI 生成文本，建议改写为具体动作或独有表达`,
      });
    }
  }

  // 排序：按出现位置
  issues.sort((a, b) => a.offset - b.offset);
  return issues.slice(0, MAX_ISSUES);
}
