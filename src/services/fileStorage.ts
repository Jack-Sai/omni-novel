import {
  mkdir,
  writeTextFile,
  readTextFile,
  exists,
  readDir,
} from "@tauri-apps/plugin-fs";

export interface ProjectMetadata {
  id: string;
  title: string;
  subtitle?: string;
  author: string;
  penName?: string;
  genre?: string;
  tags?: string[];
  synopsis?: string;
  targetPlatform?: string;
  targetWords?: number;
  currentWords?: number;
  createdAt: string;
  updatedAt: string;
  coverPath?: string;
  language?: string;
  defaultPov?: string;
  defaultTense?: string;
  defaultStyle?: string;
  targetAudience?: string;
  contentRating?: string;
  copyright?: string;
  customFields?: Record<string, unknown>;
  projectVersion?: string;
}

/**
 * 创建项目目录结构（遵循 PRD 规范）
 *
 * 结构：
 * {basePath}/{projectTitle}/
 *   .novel/                    # 软件文件夹
 *     project.json             # 项目元信息
 *     settings/
 *     worldview/
 *     outline/
 *     memory/
 *     prompts/
 *     workflows/
 *     versions/
 *     logs/
 *     cache/
 *     plugins/
 *     assets/
 *   manuscript/                # 正文
 *   drafts/                    # 草稿
 *   exports/                   # 导出结果
 */
export async function createProjectDir(
  basePath: string,
  projectTitle: string,
  metadata?: Partial<ProjectMetadata>,
): Promise<string> {
  const projectDir = `${basePath}/${projectTitle}`;

  // 创建项目根目录
  if (!(await exists(projectDir))) {
    await mkdir(projectDir, { recursive: true });
  }

  // 创建 .novel 软件文件夹
  const novelDir = `${projectDir}/.novel`;
  await mkdir(novelDir, { recursive: true });

  // 创建 .novel 子目录
  const subdirs = [
    "settings",
    "worldview",
    "outline",
    "memory",
    "prompts",
    "workflows",
    "versions",
    "logs",
    "cache",
    "plugins",
    "assets",
  ];
  for (const dir of subdirs) {
    await mkdir(`${novelDir}/${dir}`, { recursive: true });
  }

  // 创建 manuscript 目录（正文）
  await mkdir(`${projectDir}/manuscript`, { recursive: true });

  // 创建 drafts 目录（草稿）
  await mkdir(`${projectDir}/drafts`, { recursive: true });

  // 创建 exports 目录（导出）
  await mkdir(`${projectDir}/exports`, { recursive: true });

  // 创建项目元信息
  const projectMetadata: ProjectMetadata = {
    id: crypto.randomUUID(),
    title: projectTitle,
    author: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    projectVersion: "1.0",
    ...metadata,
  };

  await writeTextFile(
    `${novelDir}/project.json`,
    JSON.stringify(projectMetadata, null, 2),
  );

  return projectDir;
}

/**
 * 保存章节内容到文件
 */
export async function saveChapter(
  projectDir: string,
  filename: string,
  content: string,
  volume?: string,
): Promise<void> {
  const volumeDir = volume || "volume-01";
  const manuscriptDir = `${projectDir}/manuscript/${volumeDir}`;

  // 确保目录存在
  if (!(await exists(manuscriptDir))) {
    await mkdir(manuscriptDir, { recursive: true });
  }

  await writeTextFile(`${manuscriptDir}/${filename}`, content);
}

/**
 * 读取章节内容
 */
export async function loadChapter(
  projectDir: string,
  filename: string,
  volume?: string,
): Promise<string> {
  const volumeDir = volume || "volume-01";
  return await readTextFile(`${projectDir}/manuscript/${volumeDir}/${filename}`);
}

/**
 * 保存项目元信息
 */
export async function saveMetadata(
  projectDir: string,
  metadata: ProjectMetadata,
): Promise<void> {
  await writeTextFile(
    `${projectDir}/.novel/project.json`,
    JSON.stringify(metadata, null, 2),
  );
}

/**
 * 读取项目元信息
 */
export async function loadMetadata(
  projectDir: string,
): Promise<ProjectMetadata | null> {
  try {
    const content = await readTextFile(`${projectDir}/.novel/project.json`);
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * 列出项目目录中的所有章节文件
 */
export async function listChapters(
  projectDir: string,
  volume?: string,
): Promise<string[]> {
  const volumeDir = volume || "volume-01";
  const manuscriptDir = `${projectDir}/manuscript/${volumeDir}`;

  try {
    const entries = await readDir(manuscriptDir);
    return entries
      .filter((e) => !e.isDirectory && e.name?.endsWith(".md"))
      .map((e) => e.name)
      .filter((name): name is string => name !== null);
  } catch {
    return [];
  }
}

/**
 * 列出所有卷
 */
export async function listVolumes(projectDir: string): Promise<string[]> {
  const manuscriptDir = `${projectDir}/manuscript`;

  try {
    const entries = await readDir(manuscriptDir);
    return entries
      .filter((e) => e.isDirectory && e.name?.startsWith("volume-"))
      .map((e) => e.name)
      .filter((name): name is string => name !== null)
      .sort();
  } catch {
    return [];
  }
}

/**
 * 章节标题转文件名
 */
export function titleToFilename(title: string, chapterNumber?: number): string {
  const prefix = chapterNumber ? `${String(chapterNumber).padStart(3, "0")}-` : "";
  return `${prefix}${title.replace(/[<>:"/\\|?*]/g, "_")}.md`;
}

/**
 * 检查是否为 Omni Novel 项目
 */
export async function isNovelProject(projectDir: string): Promise<boolean> {
  return await exists(`${projectDir}/.novel/project.json`);
}

/**
 * 保存草稿
 */
export async function saveDraft(
  projectDir: string,
  filename: string,
  content: string,
): Promise<void> {
  const draftsDir = `${projectDir}/drafts`;

  if (!(await exists(draftsDir))) {
    await mkdir(draftsDir, { recursive: true });
  }

  await writeTextFile(`${draftsDir}/${filename}`, content);
}

/**
 * 保存导出文件
 */
export async function saveExport(
  projectDir: string,
  filename: string,
  content: string,
): Promise<void> {
  const exportsDir = `${projectDir}/exports`;

  if (!(await exists(exportsDir))) {
    await mkdir(exportsDir, { recursive: true });
  }

  await writeTextFile(`${exportsDir}/${filename}`, content);
}
