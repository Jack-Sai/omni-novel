import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { ShieldAlert, X } from "lucide-react";

/**
 * 数据恢复提示（崩溃恢复 #17）：Rust 端检测到 JSON 损坏并从 .bak 自愈后
 * 发出 data-recovered 事件，这里展示非阻塞横幅告知用户。
 * 损坏原件已留证为 *.corrupt-<ts>，用户可手动取证。
 */
export function DataRecoveryBanner() {
  const [file, setFile] = useState<string | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let disposed = false;
    let dismissTimer: ReturnType<typeof setTimeout> | null = null;

    void listen<string>("data-recovered", (event) => {
      const path = event.payload;
      console.warn("检测到数据损坏，已从备份恢复:", path);
      setFile(path);
      if (dismissTimer) clearTimeout(dismissTimer);
      dismissTimer = setTimeout(() => setFile(null), 12_000);
    }).then((fn) => {
      if (disposed) fn();
      else unlisten = fn;
    });

    return () => {
      disposed = true;
      unlisten?.();
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, []);

  if (!file) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-50 flex max-w-md items-start gap-3 rounded-lg border border-warning-line bg-warning-soft px-4 py-3 shadow-lg"
    >
      <ShieldAlert size={18} aria-hidden className="mt-0.5 shrink-0 text-warning" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">检测到数据损坏，已自动从备份恢复</p>
        <p className="mt-0.5 break-all text-xs text-ink-3">{file}</p>
        <p className="mt-1 text-[11px] text-ink-3">
          损坏原件已保留为同目录 *.corrupt-* 文件；若内容有缺失，可从版本历史找回。
        </p>
      </div>
      <button
        type="button"
        aria-label="关闭提示"
        className="shrink-0 rounded p-1 text-ink-3 transition-colors hover:bg-warning-line/50 hover:text-ink"
        onClick={() => setFile(null)}
      >
        <X size={14} />
      </button>
    </div>
  );
}
