import { useProjectStore } from "../stores/projectStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useChapterStore } from "../stores/chapterStore";
import { useCharacterStore } from "../stores/characterStore";
import { useWorldviewStore } from "../stores/worldviewStore";
import { useVolumeStore, Volume } from "../stores/volumeStore";
import { useForeshadowingStore } from "../stores/foreshadowingStore";
import { useRelationStore } from "../stores/relationStore";
import { loadProjectJson, saveProjectJson } from "./storage";

/**
 * 应用启动时调用，从磁盘加载全局数据
 */
export async function initGlobalStores(): Promise<void> {
  await Promise.all([
    useProjectStore.getState().loadFromDisk(),
    useSettingsStore.getState().loadFromDisk(),
  ]);
}

let activeProjectDir: string | null = null;
let persistenceInstalled = false;

/**
 * 安装项目级 store 自动落盘订阅。
 * 各 store 的 saveToDisk 内部自带 500ms debounce。
 * 注：若在一次编辑后的 500ms 内切换项目，理论上旧目录可能收到新数据（概率极低，接受）。
 */
function installProjectPersistence(): void {
  if (persistenceInstalled) return;
  persistenceInstalled = true;

  const persist = () => {
    const dir = activeProjectDir;
    if (!dir) return;
    useChapterStore.getState().saveToDisk(dir);
    useCharacterStore.getState().saveToDisk(dir);
    useWorldviewStore.getState().saveToDisk(dir);
    useVolumeStore.getState().saveToDisk(dir);
    useForeshadowingStore.getState().saveToDisk(dir);
    useRelationStore.getState().saveToDisk(dir);
  };

  useChapterStore.subscribe(persist);
  useCharacterStore.subscribe(persist);
  useWorldviewStore.subscribe(persist);
  useVolumeStore.subscribe(persist);
  useForeshadowingStore.subscribe(persist);
  useRelationStore.subscribe(persist);
}

/** 旧大纲数据结构（outline.json，含大纲章与场景） */
interface LegacyOutlineChapter {
  id: string;
  title: string;
  summary?: string;
  status?: "draft" | "writing" | "completed";
}

interface LegacyOutlineVolume {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  chapters?: LegacyOutlineChapter[];
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 一次性迁移：outline.json（卷/大纲章）→ volumes.json + chapters.json。
 * - 卷沿用原 id 直接写入 volumes.json
 * - 大纲章按同 title 匹配正文章 → 合并 volumeId/status（正文章内容优先）
 * - 未匹配的大纲章新建空正文章插入对应卷
 * - 未匹配的正文章保持 volumeId = null（未分卷）
 * - 完成后 outline.json 重命名为 outline.json.migrated 留底
 */
async function migrateOutlineIfNeeded(projectDir: string): Promise<void> {
  try {
    const existing = await loadProjectJson(projectDir, "data", "volumes.json");
    if (existing) return;
    const outline = await loadProjectJson<{ volumes: LegacyOutlineVolume[] }>(
      projectDir,
      "data",
      "outline.json",
    );
    if (!outline?.volumes?.length) return;

    const { chapters } = useChapterStore.getState();
    const usedIds = new Set<string>();
    const newVolumes: Volume[] = [];
    const newChapters = [...chapters];
    let nextOrder = newChapters.reduce((max, c) => Math.max(max, c.order), -1) + 1;

    for (const ov of outline.volumes) {
      newVolumes.push({
        id: ov.id,
        projectId: ov.projectId,
        title: ov.title,
        description: ov.description ?? "",
        order: ov.order ?? newVolumes.length,
        createdAt: ov.createdAt ?? new Date().toISOString(),
        updatedAt: ov.updatedAt ?? new Date().toISOString(),
      });

      for (const oc of ov.chapters ?? []) {
        const matched = newChapters.find(
          (c) =>
            c.projectId === ov.projectId &&
            c.title === oc.title &&
            !usedIds.has(c.id),
        );
        if (matched) {
          usedIds.add(matched.id);
          const idx = newChapters.findIndex((c) => c.id === matched.id);
          newChapters[idx] = {
            ...matched,
            volumeId: ov.id,
            status: oc.status ?? matched.status ?? "draft",
            summary: matched.summary || oc.summary || "",
          };
        } else {
          const now = new Date().toISOString();
          newChapters.push({
            id: crypto.randomUUID(),
            projectId: ov.projectId,
            volumeId: ov.id,
            title: oc.title,
            content: "",
            summary: oc.summary ?? "",
            status: oc.status ?? "draft",
            order: nextOrder++,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    useVolumeStore.setState({ volumes: newVolumes });
    useChapterStore.setState({ chapters: newChapters });
    await saveProjectJson(projectDir, "data", "volumes.json", { volumes: newVolumes });
    await saveProjectJson(projectDir, "data", "chapters.json", { chapters: newChapters });

    // 原始大纲留底
    const base = projectDir.replace(/[\\/]+$/, "");
    try {
      const { exists, rename } = await import("@tauri-apps/plugin-fs");
      if (await exists(`${base}/data/outline.json`)) {
        await rename(`${base}/data/outline.json`, `${base}/data/outline.json.migrated`);
      }
    } catch (e) {
      console.warn("重命名旧大纲文件失败（迁移已完成）:", e);
    }
    console.info("大纲数据已迁移到 volumes.json + chapters.json");
  } catch (e) {
    console.error("大纲数据迁移失败:", e);
  }
}

/**
 * 切换项目时调用，从磁盘加载项目数据
 */
export async function loadProjectStores(projectDir: string): Promise<void> {
  activeProjectDir = projectDir;
  installProjectPersistence();
  await Promise.all([
    useChapterStore.getState().loadFromDisk(projectDir),
    useCharacterStore.getState().loadFromDisk(projectDir),
    useWorldviewStore.getState().loadFromDisk(projectDir),
    useVolumeStore.getState().loadFromDisk(projectDir),
    useForeshadowingStore.getState().loadFromDisk(projectDir),
    useRelationStore.getState().loadFromDisk(projectDir),
  ]);
  await migrateOutlineIfNeeded(projectDir);
}
