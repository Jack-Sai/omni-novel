import { invoke } from "@tauri-apps/api/core";
import type { BackendType } from "./aiService";

/**
 * 连接检测（Rust 代理，避免 WebView CORS 限制）。
 * ollama → /api/tags；llamacpp → /health；其余 → /v1/models
 */
export async function proxyCheckConnection(
  backend: BackendType,
  baseUrl: string,
): Promise<boolean> {
  try {
    return await invoke<boolean>("ai_check_connection", { backend, baseUrl });
  } catch {
    return false;
  }
}

/**
 * 获取可用模型列表（Rust 代理）。
 * ollama → /api/tags；其余 → /v1/models
 */
export async function proxyListModels(
  backend: BackendType,
  baseUrl: string,
  apiKey?: string,
): Promise<string[]> {
  try {
    return await invoke<string[]>("ai_list_models", {
      backend,
      baseUrl,
      apiKey: apiKey || null,
    });
  } catch {
    return [];
  }
}
