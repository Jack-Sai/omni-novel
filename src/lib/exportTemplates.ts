import { loadGlobalConfig, saveGlobalConfig } from "../services/storage";

/**
 * 导出模板（#12）：整书导出（TXT/MD/HTML/DOCX/EPUB）的排版样式配置。
 * 模板存全局配置 ~/.omni-novel/data/export_templates.json；激活模板由
 * ExportService.exportProject 内部解析，调用方无需感知。
 */

export type ChapterHeadingStyle = "markdown" | "underline" | "plain";

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  /** 导出首部插入扉页（书名/作者/日期） */
  titlePage: boolean;
  /** 章标题格式（txt/md；html 恒为 <h2>） */
  chapterHeadingStyle: ChapterHeadingStyle;
  /** 每章末尾附「本章 N 字」 */
  showWordCount: boolean;
  /** HTML 导出追加的自定义 CSS */
  css: string;
  isBuiltin: boolean;
}

export const headingStyleLabels: Record<ChapterHeadingStyle, string> = {
  markdown: "Markdown 标题（# ）",
  underline: "下划线（====）",
  plain: "纯文本标题",
};

const EDITORIAL_CSS = `
  body { font-family: Georgia, "Songti SC", "SimSun", serif; line-height: 1.9; color: #2b2b2b; }
  h1, h2 { font-weight: 600; letter-spacing: 0.05em; }
  h2.chapter-title { text-align: center; margin-top: 3em; }
  hr.chapter-break { border: none; border-top: 1px solid #ccc; width: 30%; margin: 3em auto; }
  .title-page { text-align: center; padding-top: 20vh; }
  .title-page .book-title { font-size: 2.4em; letter-spacing: 0.3em; }
  .title-page .book-author { margin-top: 2em; color: #666; }
  .word-count { text-align: right; color: #999; font-size: 0.85em; }
`;

const PLAIN_CSS = `
  body { font-family: "Microsoft YaHei", sans-serif; line-height: 1.7; color: #111; }
  h2.chapter-title { font-size: 1.2em; margin-top: 2.2em; }
  hr.chapter-break { border: none; border-top: 1px dashed #bbb; margin: 2.5em auto; }
  .title-page { text-align: center; padding-top: 25vh; }
  .word-count { text-align: right; color: #888; font-size: 0.8em; }
`;

export const BUILTIN_TEMPLATES: ExportTemplate[] = [
  {
    id: "builtin-standard",
    name: "标准",
    description: "雅黑无衬线、含扉页与章间分隔线，通用默认",
    titlePage: true,
    chapterHeadingStyle: "markdown",
    showWordCount: false,
    css: PLAIN_CSS,
    isBuiltin: true,
  },
  {
    id: "builtin-plain",
    name: "简洁",
    description: "无扉页、纯文本章标题、最轻排版",
    titlePage: false,
    chapterHeadingStyle: "plain",
    showWordCount: false,
    css: "",
    isBuiltin: true,
  },
  {
    id: "builtin-editorial",
    name: "书刊",
    description: "衬线字体、扉页、下划线章题与章末字数，接近纸质书",
    titlePage: true,
    chapterHeadingStyle: "underline",
    showWordCount: true,
    css: EDITORIAL_CSS,
    isBuiltin: true,
  },
];

export interface TemplateState {
  templates: ExportTemplate[];
  activeId: string;
}

const FILE = "export_templates.json";
const DEFAULT_STATE: TemplateState = {
  templates: BUILTIN_TEMPLATES,
  activeId: "builtin-standard",
};

let cache: TemplateState | null = null;

/** 读取模板状态（含内置），带内存缓存 */
export async function getTemplateState(): Promise<TemplateState> {
  if (cache) return cache;
  try {
    const data = await loadGlobalConfig<TemplateState>("data", FILE);
    if (data && Array.isArray(data.templates) && data.templates.length > 0) {
      // 内置模板始终以代码为准（升级可更新描述/样式）
      const custom = data.templates.filter((t) => !t.isBuiltin);
      const builtinIds = new Set(BUILTIN_TEMPLATES.map((t) => t.id));
      cache = {
        templates: [...BUILTIN_TEMPLATES, ...custom.filter((t) => !builtinIds.has(t.id))],
        activeId: data.activeId || DEFAULT_STATE.activeId,
      };
      return cache;
    }
  } catch (e) {
    console.warn("加载导出模板失败，使用内置模板:", e);
  }
  cache = { ...DEFAULT_STATE, templates: [...BUILTIN_TEMPLATES] };
  return cache;
}

/** 保存模板状态并更新缓存 */
export async function saveTemplateState(state: TemplateState): Promise<void> {
  cache = state;
  await saveGlobalConfig("data", FILE, state);
}

/** 当前激活模板（exportProject 解析入口） */
export async function getActiveTemplate(): Promise<ExportTemplate> {
  const state = await getTemplateState();
  return (
    state.templates.find((t) => t.id === state.activeId) ??
    BUILTIN_TEMPLATES[0]
  );
}

/** 新建自定义模板（基于拷贝的字段） */
export function createTemplateFrom(base: ExportTemplate, name: string): ExportTemplate {
  return {
    ...base,
    id: crypto.randomUUID(),
    name,
    isBuiltin: false,
  };
}
