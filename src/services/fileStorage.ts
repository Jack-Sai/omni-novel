import {
  mkdir,
  writeTextFile,
  readTextFile,
  exists,
  readDir,
} from "@tauri-apps/plugin-fs";

export interface ProjectMetadata {
  title: string;
  author?: string;
  genre?: string;
  synopsis?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建项目目录结构
 */
export async function createProjectDir(
  basePath: string,
  projectTitle: string,
): Promise<string> {
  const projectDir = `${basePath}/${projectTitle}`;

  if (!(await exists(projectDir))) {
    await mkdir(projectDir, { recursive: true });
  }

  const metadata: ProjectMetadata = {
    title: projectTitle,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await writeTextFile(
    `${projectDir}/metadata.json`,
    JSON.stringify(metadata, null, 2),
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
): Promise<void> {
  await writeTextFile(`${projectDir}/${filename}`, content);
}

/**
 * 读取章节内容
 */
export async function loadChapter(
  projectDir: string,
  filename: string,
): Promise<string> {
  return await readTextFile(`${projectDir}/${filename}`);
}

/**
 * 保存项目元信息
 */
export async function saveMetadata(
  projectDir: string,
  metadata: ProjectMetadata,
): Promise<void> {
  await writeTextFile(
    `${projectDir}/metadata.json`,
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
    const content = await readTextFile(`${projectDir}/metadata.json`);
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * 列出项目目录中的所有章节文件
 */
export async function listChapters(projectDir: string): Promise<string[]> {
  try {
    const entries = await readDir(projectDir);
    return entries
      .filter((e) => !e.isDirectory && e.name !== "metadata.json")
      .map((e) => e.name)
      .filter((name): name is string => name !== null);
  } catch {
    return [];
  }
}

/**
 * 章节标题转文件名
 */
export function titleToFilename(title: string): string {
  return `${title.replace(/[<>:"/\\|?*]/g, "_")}.md`;
}
