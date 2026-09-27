import { diffLines } from "diff";

/** HTML → 纯文本（按块换行），仅用于对比展示 */
export function htmlToText(html: string): string {
  return html
    .replace(/<\/(p|div|h[1-6]|li|blockquote|pre)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 版本时间显示（兼容 SQLite "YYYY-MM-DD HH:MM:SS" 与 ISO） */
export function formatVersionTime(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

/**
 * 行级 diff：两段 HTML 转纯文本后比较。
 * maxLines 控制输出上限（超出插入截断标记）。
 */
export function computeDiffParts(
  fromHtml: string,
  toHtml: string,
  maxLines = 600
): DiffPart[] {
  const parts = diffLines(htmlToText(fromHtml), htmlToText(toHtml));
  let total = 0;
  const out: DiffPart[] = [];
  for (const p of parts) {
    const lines = p.value.split("\n");
    if (total + lines.length > maxLines) {
      out.push({ value: "…（差异过长，已截断）" });
      break;
    }
    out.push(p);
    total += lines.length;
  }
  return out;
}

/** 纯文本字数（去空白），用于字数增减统计 */
export function textWordCount(html: string): number {
  return htmlToText(html).replace(/\s/g, "").length;
}
