import { invoke } from "@tauri-apps/api/core";

/**
 * 保存全局配置到 ~/.omni-novel/{subPath}/{filename}
 */
export async function saveGlobalConfig(subPath: string, filename: string, data: unknown): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  await invoke("save_global_json", { subPath, filename, dataJson: json });
}

/**
 * 读取全局配置
 */
export async function loadGlobalConfig<T>(subPath: string, filename: string): Promise<T | null> {
  try {
    const json = await invoke<string>("load_global_json", { subPath, filename });
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * 保存项目数据到 {projectDir}/.novel/{subDir}/{filename}
 */
export async function saveProjectJson(projectDir: string, subDir: string, filename: string, data: unknown): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  await invoke("save_novel_json", { projectDir, subDir, filename, dataJson: json });
}

/**
 * 读取项目数据
 */
export async function loadProjectJson<T>(projectDir: string, subDir: string, filename: string): Promise<T | null> {
  try {
    const json = await invoke<string>("load_novel_json", { projectDir, subDir, filename });
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Debounce helper
 */
export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}
