import type { Annotation } from "../stores/annotationStore";
import type { Chapter } from "../stores/chapterStore";

const kindLabels: Record<Annotation["kind"], string> = {
  manual: "手动批注",
  ai: "AI 批注",
  reader: "读者模拟",
};

const scopeLabels: Record<Annotation["scope"], string> = {
  text: "文本",
  chapter: "章节",
  global: "全局",
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 批注列表 → Markdown 文本（全局在前，再按章分组） */
export function buildAnnotationMarkdown(
  bookTitle: string,
  annotations: Annotation[],
  chapters: Chapter[],
): string {
  const lines: string[] = [];
  lines.push(`# 《${bookTitle}》批注导出`);
  lines.push("");
  lines.push(
    `共 ${annotations.length} 条 · 导出于 ${fmtTime(new Date().toISOString())} · ` +
      `待解决 ${annotations.filter((a) => a.status === "open").length} 条`,
  );
  lines.push("");

  const renderOne = (a: Annotation) => {
    const status = a.status === "open" ? "待解决" : "已解决";
    lines.push(`### [${status}] ${a.title}`);
    lines.push(
      `- 类型：${kindLabels[a.kind]} · 级别：${scopeLabels[a.scope]} · 创建于 ${fmtTime(a.createdAt)}`,
    );
    if (a.quote) {
      lines.push("");
      lines.push(
        a.quote
          .split(/\r?\n/)
          .map((l) => `> ${l}`)
          .join("\n"),
      );
    }
    lines.push("");
    lines.push(a.content);
    if (a.replies.length > 0) {
      lines.push("");
      a.replies.forEach((r, i) => {
        lines.push(`${i + 1}. **回复**（${fmtTime(r.createdAt)}）：${r.content}`);
      });
    }
    lines.push("");
  };

  const globals = annotations.filter((a) => a.scope === "global");
  if (globals.length > 0) {
    lines.push("## 全局批注");
    lines.push("");
    globals.forEach(renderOne);
  }

  const byChapter = new Map<string, Annotation[]>();
  for (const a of annotations) {
    if (a.scope === "global" || !a.chapterId) continue;
    const list = byChapter.get(a.chapterId) ?? [];
    list.push(a);
    byChapter.set(a.chapterId, list);
  }
  for (const ch of chapters) {
    const list = byChapter.get(ch.id);
    if (!list || list.length === 0) continue;
    lines.push(`## ${ch.title}`);
    lines.push("");
    list.forEach(renderOne);
    byChapter.delete(ch.id);
  }
  // 已删章节的孤儿批注兜底
  for (const [, list] of byChapter) {
    lines.push("## （章节已删除）");
    lines.push("");
    list.forEach(renderOne);
  }

  return lines.join("\n");
}

/** 下载为 .md 文件 */
export function downloadAnnotationMarkdown(filename: string, markdown: string): void {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
