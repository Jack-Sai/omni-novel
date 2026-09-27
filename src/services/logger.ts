import { create } from "zustand";
import { saveGlobalConfig, loadGlobalConfig } from "./storage";

/**
 * 应用日志（v1.3.3 日志与诊断）：
 * - 分类：operation 操作 / ai AI 请求 / model 模型 / error 错误 / performance 性能 / plugin 插件调用 / io 导入导出
 * - 内存环形缓冲（2000 条）+ 落盘 ~/.omni-novel/logs/app-log.json（保存最近 500 条，启动恢复）
 * - useLogStore 驱动日志查看器实时刷新；log() 同步入列
 */
export type LogCategory =
  | "operation"
  | "ai"
  | "model"
  | "error"
  | "performance"
  | "plugin"
  | "io";

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  id: string;
  /** ISO 时间 */
  ts: string;
  category: LogCategory;
  level: LogLevel;
  message: string;
  /** 可选明细（对象会 JSON 序列化） */
  detail?: string;
}

export const logCategoryLabels: Record<LogCategory, string> = {
  operation: "操作",
  ai: "AI",
  model: "模型",
  error: "错误",
  performance: "性能",
  plugin: "插件",
  io: "导入导出",
};

const MEMORY_LIMIT = 2000;
const PERSIST_LIMIT = 500;

interface LogStore {
  entries: LogEntry[];
  /** 是否已从磁盘恢复（避免启动时把空列表写回覆盖） */
  loaded: boolean;
  append: (entry: LogEntry) => void;
  clear: () => void;
  loadFromDisk: () => Promise<void>;
  saveToDisk: () => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useLogStore = create<LogStore>()((set, get) => ({
  entries: [],
  loaded: false,

  append: (entry) =>
    set((state) => {
      const entries = [...state.entries, entry];
      while (entries.length > MEMORY_LIMIT) entries.shift();
      return { entries };
    }),

  clear: () => set({ entries: [], loaded: true }),

  loadFromDisk: async () => {
    const data = await loadGlobalConfig<{ entries: LogEntry[] }>("logs", "app-log.json");
    set({ entries: data?.entries ?? [], loaded: true });
  },

  saveToDisk: () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const { entries, loaded } = get();
      if (!loaded) return;
      const toSave = entries.slice(-PERSIST_LIMIT);
      saveGlobalConfig("logs", "app-log.json", { entries: toSave }).catch((e) =>
        console.error("保存日志失败:", e),
      );
      saveTimer = null;
    }, 800);
  },
}));

function stringifyDetail(detail?: unknown): string | undefined {
  if (detail == null) return undefined;
  if (typeof detail === "string") return detail;
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

/** 记一条日志（同步入列，落盘走 store debounce） */
export function log(
  category: LogCategory,
  level: LogLevel,
  message: string,
  detail?: unknown,
): void {
  const store = useLogStore.getState();
  store.append({
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    category,
    level,
    message,
    detail: stringifyDetail(detail),
  });
  store.saveToDisk();
}

/** 导出日志为 JSON 文本并触发下载 */
export function exportLogs(entries: LogEntry[], filename = "omni-novel-logs"): void {
  const text = JSON.stringify(
    { exportedAt: new Date().toISOString(), count: entries.length, entries },
    null,
    2,
  );
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** 全局错误捕获：window.onerror 与未处理的 Promise 拒绝 → error 日志 */
let handlersInstalled = false;
export function installGlobalErrorHandlers(): void {
  if (handlersInstalled) return;
  handlersInstalled = true;

  window.addEventListener("error", (e) => {
    log("error", "error", e.message || "未捕获异常", {
      source: e.filename,
      line: e.lineno,
      stack: e.error instanceof Error ? e.error.stack : undefined,
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    log(
      "error",
      "error",
      reason instanceof Error ? reason.message : String(reason),
      reason instanceof Error ? reason.stack : undefined,
    );
  });
}
