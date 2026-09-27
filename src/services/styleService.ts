import { styleDb, type StyleProfileRow } from "./database";

/** 文风卡片 → system prompt 注入片段（无卡片返回空串） */
export function formatStylePrompt(style: StyleProfileRow | null): string {
  if (!style) return "";
  const parts: string[] = [];
  const content = style.content?.trim();
  if (content) parts.push(`[文风要求]（${style.name}）\n${content}`);
  const sample = style.sample?.trim();
  if (sample) parts.push(`[风格范例]\n${sample.slice(0, 2000)}`);
  return parts.join("\n\n");
}

/**
 * 取项目当前激活文风的注入片段（读库失败返回空串，不阻塞 AI 请求）。
 * 每次请求现取，文风卡片的新增/激活即时生效。
 */
export async function getActiveStylePrompt(projectId: string | undefined): Promise<string> {
  if (!projectId) return "";
  try {
    const style = await styleDb.getActive(projectId);
    return formatStylePrompt(style);
  } catch (e) {
    console.warn("读取文风卡片失败:", e);
    return "";
  }
}
