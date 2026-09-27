/**
 * 段落与阅读时长统计（正文 HTML → 展示指标）。
 * 阅读速度按中文一般默读 400 字/分钟估算。
 */
const READ_SPEED = 400;

export interface ChapterTextStats {
  paragraphs: number;
  /** 平均段落字数（去空白） */
  avgParagraph: number;
  /** 最长段落字数（去空白） */
  maxParagraph: number;
  /** 对话字数占比 0~1（引号内） */
  dialogRatio: number;
  /** 预计阅读分钟数（至少 1） */
  readingMinutes: number;
  totalChars: number;
}

function stripTags(html: string): string {
  return html
    .replace(/<\/(p|div|h[1-6]|li|blockquote|pre)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function computeChapterTextStats(html: string): ChapterTextStats {
  const raw = stripTags(html);
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const paras = lines.length > 0 ? lines : raw.trim() ? [raw.trim()] : [];

  let totalChars = 0;
  let maxParagraph = 0;
  for (const p of paras) {
    const n = p.replace(/\s/g, "").length;
    totalChars += n;
    if (n > maxParagraph) maxParagraph = n;
  }
  const avgParagraph = paras.length > 0 ? Math.round(totalChars / paras.length) : 0;

  let dialogChars = 0;
  const dialogRe = /[“"「『]([^”"」』]{1,500})[”"」』]/g;
  let m: RegExpExecArray | null;
  while ((m = dialogRe.exec(raw)) !== null) {
    dialogChars += m[1].replace(/\s/g, "").length;
  }
  const dialogRatio = totalChars > 0 ? Math.min(1, dialogChars / totalChars) : 0;

  const readingMinutes = Math.max(1, Math.round(totalChars / READ_SPEED));

  return {
    paragraphs: paras.length,
    avgParagraph,
    maxParagraph,
    dialogRatio,
    readingMinutes,
    totalChars,
  };
}
