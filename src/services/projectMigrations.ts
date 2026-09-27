import { loadMetadata, saveMetadata, type ProjectMetadata } from "./fileStorage";
import { loadProjectJson, saveProjectJson } from "./storage";

/**
 * 项目数据格式版本（.novel/project.json 的 projectVersion）。
 * 规则：
 * - 数据格式无变化时保持不变；
 * - 任何不兼容的数据结构变更（新文件、字段语义变化、结构调整）都 bump 一次，
 *   并在 `projectMigrations` 注册一条到该版本的迁移；
 * - 打开旧版本项目时按 `to` 升序依次执行迁移，每步完成后立即写回版本号（可断点续迁）。
 */
export const CURRENT_PROJECT_VERSION = "1.1";

export interface ProjectMigration {
  /** 迁移到的目标版本（如 "1.1"），须大于其前一条注册记录 */
  to: string;
  /** 人类可读说明（用于日志与问题排查） */
  description: string;
  /** 迁移实现：只读写 projectDir 下的数据文件 */
  migrate: (projectDir: string) => Promise<void>;
}

/** 版本迁移注册表（按 to 升序执行）。示例：registerProjectMigration({ to: "1.1", ... }) */
const projectMigrations: ProjectMigration[] = [];

export function registerProjectMigration(m: ProjectMigration): void {
  if (projectMigrations.some((x) => x.to === m.to)) {
    throw new Error(`重复的项目迁移版本: ${m.to}`);
  }
  projectMigrations.push(m);
  projectMigrations.sort((a, b) => compareVersion(a.to, b.to));
}

/** 点分数字版本比较：a<b 负、a>b 正、相等 0（缺段按 0） */
export function compareVersion(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * 打开项目时执行版本迁移（须在数据 store 加载**之前**调用）：
 * - 无 project.json → 直接返回（数据层自行兜底）
 * - 已达 CURRENT → 直通
 * - 旧版本 → 顺序执行所有 to > 当前 且 <= CURRENT 的已注册迁移，每步写回 projectVersion
 * - 迁移失败向上抛错：宁可阻止打开也不让半迁移数据进入 store
 */
export async function migrateProjectIfNeeded(projectDir: string): Promise<void> {
  const meta = await loadMetadata(projectDir);
  if (!meta) return;

  let version = meta.projectVersion || "1.0";
  if (compareVersion(version, CURRENT_PROJECT_VERSION) >= 0) return;

  for (const m of projectMigrations) {
    if (compareVersion(m.to, version) <= 0) continue;
    if (compareVersion(m.to, CURRENT_PROJECT_VERSION) > 0) break;
    console.info(`项目迁移 ${version} → ${m.to}: ${m.description}`);
    await m.migrate(projectDir);
    version = m.to;
    await writeVersion(projectDir, meta, version);
  }

  // 注册表为空/仅覆盖部分版本时，最终补写到 CURRENT（如仅元字段规范化）
  if (compareVersion(version, CURRENT_PROJECT_VERSION) < 0) {
    await writeVersion(projectDir, meta, CURRENT_PROJECT_VERSION);
  }
}

async function writeVersion(
  projectDir: string,
  meta: ProjectMetadata,
  version: string,
): Promise<void> {
  await saveMetadata(projectDir, {
    ...meta,
    projectVersion: version,
    updatedAt: new Date().toISOString(),
  });
}

// ── 已注册迁移 ──

// v1.1：卷 → 章 → 场景三级大纲回归；就绪 scenes.json（无场景数据的旧项目
// 后续由 sceneStore 惰性读写，此处显式建文件让结构变更登记在案）
registerProjectMigration({
  to: "1.1",
  description: "场景三级大纲：初始化 scenes.json",
  migrate: async (projectDir) => {
    const existing = await loadProjectJson(projectDir, "data", "scenes.json");
    if (!existing) {
      await saveProjectJson(projectDir, "data", "scenes.json", { scenes: [] });
    }
  },
});
