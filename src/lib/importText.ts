/**
 * 外部文本导入（TXT/MD → 章节）。导入后可经 ExportService 导出 DOCX/EPUB。
 */

export interface ImportedChapter {
  title: string;
  /** 富文本 HTML（编辑器可直接 setContent） */
  content: string;
}

/** TXT 章标题行：第X章/回/节/卷、Chapter N（整行且行首至多3空格缩进） */
const TXT_HEADING =
  /^[ \t]{0,3}(?:第[0-9０-９一二三四五六七八九十百千万零〇两]{1,8}[章回节卷][^\n]*|Chapter\s+\d+[^\n]*)[ \t]*$/i;

/** MD 章标题行：# / ## / ### */
const MD_HEADING = /^#{1,3}[ \t]+(.+?)[ \t]*#*[ \t]*$/;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 纯文本段落 → HTML（空行分段，段内换行 <br/>） */
function textToHtml(body: string): string {
  const paragraphs = body
    .split(/\n[ \t]*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paragraphs
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

/**
 * 按标题行把整文件拆成章节：
 * - `.md` / `.markdown` → `#`~`###` 标题
 * - `.txt` → 「第X章/回/节/卷」「Chapter N」整行
 * - 无任何标题 → 单章（标题取文件名）
 * - 首个标题前的引言内容并入第一章开头
 */
export function splitImportedText(text: string, filename: string): ImportedChapter[] {
  const normalized = text.replace(/\r\n?/g, "\n");
  const isMarkdown = /\.(md|markdown)$/i.test(filename);
  const headingRe = isMarkdown ? MD_HEADING : TXT_HEADING;

  const lines = normalized.split("\n");
  const cuts: { index: number; title: string }[] = [];
  lines.forEach((line, i) => {
    const m = line.match(headingRe);
    if (!m) return;
    const title = (isMarkdown ? m[1] : line).trim();
    if (title) cuts.push({ index: i, title });
  });

  const fallbackTitle = filename.replace(/\.[^.]+$/, "") || "导入内容";

  if (cuts.length === 0) {
    const content = textToHtml(normalized);
    return content ? [{ title: fallbackTitle, content }] : [];
  }

  const chapters: ImportedChapter[] = [];

  // 首个标题前的非空内容并入第一章
  const preamble = lines.slice(0, cuts[0].index).join("\n").trim();

  cuts.forEach((cut, i) => {
    const bodyStart = cut.index + 1;
    const bodyEnd = i + 1 < cuts.length ? cuts[i + 1].index : lines.length;
    const body = lines.slice(bodyStart, bodyEnd).join("\n");
    const merged = i === 0 && preamble ? `${preamble}\n\n${body}` : body;
    const content = textToHtml(merged);
    if (content || i === 0) chapters.push({ title: cut.title, content });
  });

  return chapters;
}
