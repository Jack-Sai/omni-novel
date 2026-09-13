import { useProjectStore } from "../stores/projectStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useChapterStore } from "../stores/chapterStore";
import { useCharacterStore } from "../stores/characterStore";
import { useWorldviewStore } from "../stores/worldviewStore";
import { useOutlineStore } from "../stores/outlineStore";
import { useForeshadowingStore } from "../stores/foreshadowingStore";

/**
 * 应用启动时调用，从磁盘加载全局数据
 */
export async function initGlobalStores(): Promise<void> {
  await Promise.all([
    useProjectStore.getState().loadFromDisk(),
    useSettingsStore.getState().loadFromDisk(),
  ]);
}

/**
 * 切换项目时调用，从磁盘加载项目数据
 */
export async function loadProjectStores(projectDir: string): Promise<void> {
  await Promise.all([
    useChapterStore.getState().loadFromDisk(projectDir),
    useCharacterStore.getState().loadFromDisk(projectDir),
    useWorldviewStore.getState().loadFromDisk(projectDir),
    useOutlineStore.getState().loadFromDisk(projectDir),
    useForeshadowingStore.getState().loadFromDisk(projectDir),
  ]);
}
