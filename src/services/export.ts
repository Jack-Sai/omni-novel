export interface ExportOptions {
  format: "txt" | "markdown" | "html" | "docx";
  filename: string;
  content: string;
  title?: string;
  author?: string;
}

export class ExportService {
  static async exportToFile(options: ExportOptions): Promise<void> {
    const { format, filename, content, title, author } = options;

    if (format === "docx") {
      await this.toDOCX(filename, content, title, author);
      return;
    }

    let fileContent: string;
    let mimeType: string;
    let extension: string;

    switch (format) {
      case "markdown":
        fileContent = this.toMarkdown(content, title, author);
        mimeType = "text/markdown";
        extension = "md";
        break;
      case "html":
        fileContent = this.toHTML(content, title, author);
        mimeType = "text/html";
        extension = "html";
        break;
      default:
        fileContent = this.toPlainText(content, title, author);
        mimeType = "text/plain";
        extension = "txt";
    }

    const blob = new Blob([fileContent], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static toMarkdown(content: string, title?: string, author?: string): string {
    let md = "";

    if (title) {
      md += `# ${title}\n\n`;
    }
    if (author) {
      md += `**作者：${author}**\n\n---\n\n`;
    }

    md += content;
    return md;
  }

  static toHTML(content: string, title?: string, author?: string): string {
    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || "小说"}</title>
  <style>
    body {
      font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.8;
      color: #333;
    }
    h1 {
      text-align: center;
      margin-bottom: 10px;
    }
    .author {
      text-align: center;
      color: #666;
      margin-bottom: 30px;
    }
    .content {
      text-indent: 2em;
    }
    p {
      margin: 10px 0;
    }
  </style>
</head>
<body>`;

    if (title) {
      html += `\n  <h1>${title}</h1>`;
    }
    if (author) {
      html += `\n  <div class="author">作者：${author}</div>`;
    }

    html += `\n  <div class="content">`;
    
    // Convert HTML content to formatted HTML
    const formattedContent = content
      .replace(/<h1[^>]*>(.*?)<\/h1>/g, "\n<h2>$1</h2>")
      .replace(/<h2[^>]*>(.*?)<\/h2>/g, "\n<h3>$1</h3>")
      .replace(/<h3[^>]*>(.*?)<\/h3>/g, "\n<h4>$1</h4>")
      .replace(/<p[^>]*>(.*?)<\/p>/g, "\n<p>$1</p>")
      .replace(/<strong>(.*?)<\/strong>/g, "<strong>$1</strong>")
      .replace(/<em>(.*?)<\/em>/g, "<em>$1</em>");
    
    html += formattedContent;
    html += `\n  </div>\n</body>\n</html>`;

    return html;
  }

  static toPlainText(content: string, title?: string, author?: string): string {
    let text = "";

    if (title) {
      text += `${title}\n`;
      text += "=".repeat(title.length * 2) + "\n\n";
    }
    if (author) {
      text += `作者：${author}\n\n`;
      text += "-".repeat(20) + "\n\n";
    }

    // 简单移除 HTML 标签
    const plainContent = content
      .replace(/<h1[^>]*>(.*?)<\/h1>/g, "$1\n\n")
      .replace(/<h2[^>]*>(.*?)<\/h2>/g, "$1\n\n")
      .replace(/<h3[^>]*>(.*?)<\/h3>/g, "$1\n\n")
      .replace(/<p[^>]*>(.*?)<\/p>/g, "$1\n\n")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    text += plainContent;
    return text;
  }

  static async copyToClipboard(content: string): Promise<void> {
    await navigator.clipboard.writeText(content);
  }

  static async toDOCX(
    filename: string,
    content: string,
    title?: string,
    author?: string
  ): Promise<void> {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import("docx");

    const children: InstanceType<typeof Paragraph>[] = [];

    if (title) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: title,
              bold: true,
              size: 48,
            }),
          ],
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
        })
      );
    }

    if (author) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `作者：${author}`,
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
        })
      );
      children.push(
        new Paragraph({
          children: [],
        })
      );
    }

    const plainContent = content
      .replace(/<h1[^>]*>(.*?)<\/h1>/g, "\n$1\n")
      .replace(/<h2[^>]*>(.*?)<\/h2>/g, "\n$1\n")
      .replace(/<h3[^>]*>(.*?)<\/h3>/g, "\n$1\n")
      .replace(/<p[^>]*>(.*?)<\/p>/g, "$1\n")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<strong>(.*?)<\/strong>/g, "$1")
      .replace(/<em>(.*?)<\/em>/g, "$1")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .trim();

    const paragraphs = plainContent.split("\n");

    paragraphs.forEach((para) => {
      if (para.trim()) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: para,
                size: 24,
              }),
            ],
            spacing: {
              line: 360,
            },
          })
        );
      }
    });

    const doc = new Document({
      sections: [
        {
          properties: {},
          children,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static async exportMultipleFiles(
    files: Array<{ filename: string; content: string; title?: string; author?: string }>,
    format: "txt" | "markdown" | "html" | "docx"
  ): Promise<void> {
    for (const file of files) {
      await this.exportToFile({
        format,
        filename: file.filename,
        content: file.content,
        title: file.title,
        author: file.author,
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  static async exportProject(
    projectId: string,
    format: "txt" | "markdown" | "html" | "docx"
  ): Promise<void> {
    const { useProjectStore } = await import("../stores/projectStore");
    const { useChapterStore } = await import("../stores/chapterStore");

    const projects = useProjectStore.getState().projects;
    const chapters = useChapterStore.getState().chapters;

    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const projectChapters = chapters
      .filter((c) => c.projectId === projectId)
      .sort((a, b) => a.order - b.order);

    if (projectChapters.length === 0) {
      await this.exportToFile({
        format,
        filename: project.title,
        content: project.content || "",
        title: project.title,
        author: project.author,
      });
      return;
    }

    const files = projectChapters.map((chapter) => ({
      filename: `${project.title}-${chapter.title}`,
      content: chapter.content,
      title: chapter.title,
      author: project.author,
    }));

    await this.exportMultipleFiles(files, format);
  }
}

export const exportService = new ExportService();
