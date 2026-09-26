import { useProjectStore } from "../stores/projectStore";
import { useChapterStore } from "../stores/chapterStore";
import { useCharacterStore } from "../stores/characterStore";
import { useWorldviewStore } from "../stores/worldviewStore";
import { useVolumeStore } from "../stores/volumeStore";
import { useForeshadowingStore } from "../stores/foreshadowingStore";

export interface BackupData {
  version: string;
  timestamp: string;
  projects: any[];
  chapters: any[];
  characters: any[];
  worldviewItems: any[];
  volumes: any[];
  foreshadowingItems: any[];
}

export class BackupService {
  static async exportBackup(): Promise<void> {
    const projects = useProjectStore.getState().projects;
    const chapters = useChapterStore.getState().chapters;
    const characters = useCharacterStore.getState().characters;
    const worldviewItems = useWorldviewStore.getState().items;
    const volumes = useVolumeStore.getState().volumes;
    const foreshadowingItems = useForeshadowingStore.getState().items;

    const backupData: BackupData = {
      version: "1.1.0",
      timestamp: new Date().toISOString(),
      projects,
      chapters,
      characters,
      worldviewItems,
      volumes,
      foreshadowingItems,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `omni-novel-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static async importBackup(file: File): Promise<boolean> {
    try {
      const text = await file.text();
      const backupData: BackupData = JSON.parse(text);

      if (!backupData.version || !backupData.timestamp) {
        throw new Error("无效的备份文件格式");
      }

      if (backupData.projects) {
        useProjectStore.setState({ projects: backupData.projects });
      }
      if (backupData.chapters) {
        useChapterStore.setState({ chapters: backupData.chapters });
      }
      if (backupData.characters) {
        useCharacterStore.setState({ characters: backupData.characters });
      }
      if (backupData.worldviewItems) {
        useWorldviewStore.setState({ items: backupData.worldviewItems });
      }
      if (backupData.volumes) {
        useVolumeStore.setState({ volumes: backupData.volumes });
      }
      if (backupData.foreshadowingItems) {
        useForeshadowingStore.setState({ items: backupData.foreshadowingItems });
      }

      return true;
    } catch (error) {
      console.error("导入备份失败:", error);
      return false;
    }
  }

  static async exportProject(projectId: string): Promise<void> {
    const projects = useProjectStore.getState().projects;
    const chapters = useChapterStore.getState().chapters;
    const characters = useCharacterStore.getState().characters;
    const worldviewItems = useWorldviewStore.getState().items;
    const volumes = useVolumeStore.getState().volumes;
    const foreshadowingItems = useForeshadowingStore.getState().items;

    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const projectChapters = chapters.filter((c) => c.projectId === projectId);
    const projectCharacters = characters.filter((c) => c.projectId === projectId);
    const projectWorldviewItems = worldviewItems.filter((w) => w.projectId === projectId);
    const projectVolumes = volumes.filter((v) => v.projectId === projectId);
    const projectForeshadowingItems = foreshadowingItems.filter((f) => f.projectId === projectId);

    const backupData: BackupData = {
      version: "1.1.0",
      timestamp: new Date().toISOString(),
      projects: [project],
      chapters: projectChapters,
      characters: projectCharacters,
      worldviewItems: projectWorldviewItems,
      volumes: projectVolumes,
      foreshadowingItems: projectForeshadowingItems,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.title}-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
