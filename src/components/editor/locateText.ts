import { flatToPm, type TextSeg } from "./search";

/** 归一化定位：去掉 \n \r 后在归一化串中查找，映射回原文偏移 */
function locateNormalized(full: string, quote: string): [number, number] | null {
  const map: number[] = [];
  let norm = "";
  for (let i = 0; i < full.length; i++) {
    const ch = full[i];
    if (ch === "\n" || ch === "\r") continue;
    norm += ch;
    map.push(i);
  }
  const nq = quote.replace(/[\r\n]/g, "");
  if (!nq) return null;
  const pos = norm.indexOf(nq);
  if (pos < 0) return null;
  const start = map[pos];
  const end = map[pos + nq.length - 1] + 1;
  return [start, end];
}

/**
 * 在纯文本索引中定位 quote：精确偏移 → 直接搜索 → 去换行归一化 → 首行片段。
 * 批注高亮与修订接受/拒绝共用。
 */
export function locateQuote(
  index: { full: string; segs: TextSeg[] },
  quote: string,
  textFrom: number | null = null
): [number, number] | null {
  if (!quote) return null;
  const { full } = index;
  if (textFrom != null && full.slice(textFrom, textFrom + quote.length) === quote) {
    return [textFrom, textFrom + quote.length];
  }
  let pos = full.indexOf(quote);
  if (pos >= 0) return [pos, pos + quote.length];
  const normalized = locateNormalized(full, quote);
  if (normalized) return normalized;
  const firstLine = quote.split(/\r?\n/)[0];
  if (firstLine && firstLine !== quote) {
    pos = full.indexOf(firstLine);
    if (pos >= 0) return [pos, pos + firstLine.length];
  }
  return null;
}

/** 按纯文本偏移区间转 PM 位置（用于删除/插入操作） */
export function flatRangeToPm(
  segs: TextSeg[],
  from: number,
  to: number
): { from: number; to: number } {
  return { from: flatToPm(segs, from), to: flatToPm(segs, to) };
}
