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
    useOutlineStore.getState().saveToDisk(dir);
    useForeshadowingStore.getState().saveToDisk(dir);
  };

  useChapterStore.subscribe(persist);
  useCharacterStore.subscribe(persist);
  useWorldviewStore.subscribe(persist);
  useOutlineStore.subscribe(persist);
  useForeshadowingStore.subscribe(persist);
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
    useOutlineStore.getState().loadFromDisk(projectDir),
    useForeshadowingStore.getState().loadFromDisk(projectDir),
  ]);
}
