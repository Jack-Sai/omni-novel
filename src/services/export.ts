export interface ExportOptions {
  format: "txt" | "markdown";
  filename: string;
  content: string;
  title?: string;
  author?: string;
}

export class ExportService {
  static async exportToFile(options: ExportOptions): Promise<void> {
    const { format, filename, content, title, author } = options;

    let fileContent: string;
    let mimeType: string;
    let extension: string;

    if (format === "markdown") {
      fileContent = this.toMarkdown(content, title, author);
      mimeType = "text/markdown";
      extension = "md";
    } else {
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
}

export const exportService = new ExportService();
