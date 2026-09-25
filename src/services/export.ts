export interface ExportOptions {
  format: "txt" | "markdown" | "html" | "docx" | "epub";
  filename: string;
  content: string;
  title?: string;
  author?: string;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** HTML 片段转 well-formed XHTML（自闭合空标签） */
function htmlToXhtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "<br/>")
    .replace(/<hr\s*\/?>/gi, "<hr/>")
    .replace(
      /<(img|input|meta|link|source|wbr)\b([^>]*)>/gi,
      (_m, tag: string, attrs: string) =>
        attrs.trimEnd().endsWith("/") ? `<${tag}${attrs}>` : `<${tag}${attrs}/>`,
    );
}

export class ExportService {
  static async exportToFile(options: ExportOptions): Promise<void> {
    const { format, filename, content, title, author } = options;

    if (format === "epub") {
      await this.toEPUB(filename, title || filename, author, [
        { title: title || filename, html: content },
      ]);
      return;
    }

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

  /** 生成 EPUB 3 电子书（单个 .epub 文件包含全部章节） */
  static async toEPUB(
    filename: string,
    title: string | undefined,
    author: string | undefined,
    chapters: { title: string; html: string }[],
  ): Promise<void> {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    const bookTitle = title || filename || "未命名";
    const uid = `urn:uuid:${crypto.randomUUID()}`;
    const modified = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const lang = "zh-CN";

    const chapterMeta = chapters.map((ch, i) => ({
      id: `ch${i + 1}`,
      href: `chapter_${i + 1}.xhtml`,
      title: ch.title || `第 ${i + 1} 章`,
      html: ch.html,
    }));

    // mimetype 必须是 zip 中第一个条目且不压缩
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

    zip.file(
      "META-INF/container.xml",
      `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
    );

    const manifestItems = chapterMeta
      .map(
        (c) => `    <item id="${c.id}" href="${c.href}" media-type="application/xhtml+xml"/>`,
      )
      .join("\n");
    const spineItems = chapterMeta
      .map((c) => `    <itemref idref="${c.id}"/>`)
      .join("\n");

    zip.file(
      "OEBPS/content.opf",
      `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="${lang}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">${uid}</dc:identifier>
    <dc:title>${escapeXml(bookTitle)}</dc:title>
    ${author ? `<dc:creator>${escapeXml(author)}</dc:creator>` : ""}
    <dc:language>${lang}</dc:language>
    <meta property="dcterms:modified">${modified}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="css" href="style.css" media-type="text/css"/>
${manifestItems}
  </manifest>
  <spine>
${spineItems}
  </spine>
</package>`,
    );

    const navItems = chapterMeta
      .map((c) => `        <li><a href="${c.href}">${escapeXml(c.title)}</a></li>`)
      .join("\n");

    zip.file(
      "OEBPS/nav.xhtml",
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${lang}">
<head>
  <title>目录</title>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>目录</h1>
    <ol>
${navItems}
    </ol>
  </nav>
</body>
</html>`,
    );

    zip.file(
      "OEBPS/style.css",
      `body {
  font-family: sans-serif;
  line-height: 1.8;
  margin: 1em;
}
h1, h2, h3 {
  text-align: center;
}
p {
  text-indent: 2em;
  margin: 0.6em 0;
}
img {
  max-width: 100%;
}`,
    );

    for (const ch of chapterMeta) {
      zip.file(
        `OEBPS/${ch.href}`,
        `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="${lang}">
<head>
  <title>${escapeXml(ch.title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>${escapeXml(ch.title)}</h1>
${htmlToXhtml(ch.html)}
</body>
</html>`,
      );
    }

    const blob = await zip.generateAsync({
      type: "blob",
      mimeType: "application/epub+zip",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.epub`;
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
    format: "txt" | "markdown" | "html" | "docx" | "epub"
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

    // EPUB：整本书打包为单个文件（而非逐章下载）
    if (format === "epub") {
      const epubChapters =
        projectChapters.length > 0
          ? projectChapters.map((c) => ({ title: c.title, html: c.content }))
          : [{ title: project.title, html: project.content || "" }];
      await this.toEPUB(project.title, project.title, project.author, epubChapters);
      return;
    }

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
