import { useCallback, useEffect, useState } from "react";
import { Minus, PanelLeftClose, PanelLeftOpen, Square, X } from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { cn } from "../../lib/cn";
import { useUIStore } from "../../stores/uiStore";

/**
 * 自定义标题栏：顶部 32px 拖拽条 + 右上角最小化/最大化/关闭按钮。
 * 需要配合 tauri.conf.json 的 decorations:false；内容区需 pt-8 避让。
 */
export function WindowControls() {
  const win = getCurrentWindow();
  const [maximized, setMaximized] = useState(false);
  const [version, setVersion] = useState("");
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  useEffect(() => {
    void getVersion()
      .then(setVersion)
      .catch(() => {});
  }, []);

  useEffect(() => {
    void win
      .isMaximized()
      .then(setMaximized)
      .catch(() => {});
    const unlisten = win.onResized(() => {
      void win
        .isMaximized()
        .then(setMaximized)
        .catch(() => {});
    });
    return () => {
      void unlisten.then((f) => f());
    };
  }, [win]);

  const handleMinimize = useCallback(() => void win.minimize().catch(() => {}), [win]);
  const handleToggleMax = useCallback(() => {
    void win
      .toggleMaximize()
      .then(() => setMaximized((v) => !v))
      .catch(() => {});
  }, [win]);
  const handleClose = useCallback(() => void win.close().catch(() => {}), [win]);

  const btnCls = (danger?: boolean) =>
    cn(
      "flex h-8 w-12 items-center justify-center text-ink-2 transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-ring)]",
      danger
        ? "hover:bg-red-600 hover:text-white"
        : "hover:bg-hover hover:text-ink",
    );

  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-8">
      <div className="absolute inset-0" data-tauri-drag-region />
      <div className="absolute left-0 top-0 flex h-8 items-center">
        {version && (
          <span className="pointer-events-none select-none pl-2 pr-1 text-[11px] leading-none text-ink-3">
            v{version}
          </span>
        )}
        <button
          type="button"
          aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
          title={collapsed ? "展开侧边栏" : "收起侧边栏"}
          onClick={toggleSidebar}
          className={cn(btnCls(), "w-8")}
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>
      <div className="absolute right-0 top-0 flex h-8">
        <button type="button" aria-label="最小化" title="最小化" className={btnCls()} onClick={handleMinimize}>
          <Minus size={14} />
        </button>
        <button
          type="button"
          aria-label={maximized ? "还原" : "最大化"}
          title={maximized ? "还原" : "最大化"}
          className={btnCls()}
          onClick={handleToggleMax}
        >
          <Square size={12} />
        </button>
        <button type="button" aria-label="关闭" title="关闭" className={btnCls(true)} onClick={handleClose}>
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
