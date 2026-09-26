import { useChapterStore } from "../stores/chapterStore";
import { memoryDb, versionDb } from "../services";

/**
 * 删除章节并清理关联数据（版本快照 + 章摘要记忆）。
 * chapters.json 由 storeInit 的订阅自动落盘。
 */
export async function deleteChapterCascade(
  projectId: string,
  chapterId: string,
): Promise<void> {
  useChapterStore.getState().deleteChapter(chapterId);
  try {
    await versionDb.deleteByChapter(projectId, chapterId);
    const rows = await memoryDb.list(projectId, {
      type: "summary",
      scope: "chapter",
      refId: chapterId,
    });
    for (const row of rows) {
      await memoryDb.delete(row.id);
    }
  } catch (e) {
    console.warn("清理章节关联数据失败:", e);
  }
}
