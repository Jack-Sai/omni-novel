import {
  mkdir,
  exists,
  writeTextFile,
  readTextFile,
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
 *     data/
 *     memory/
 *     prompts/
 *     workflows/
 *     versions/
 *     logs/
 *     cache/
 *     plugins/
 *     assets/
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
    "data",
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
