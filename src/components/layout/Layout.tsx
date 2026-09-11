import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ShortcutsHelp } from "../dialog";
import { useKeyboardShortcuts, Shortcut } from "../../hooks";

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const activeTab = location.pathname.split("/")[1] || "editor";

  const shortcuts: Shortcut[] = [
    { key: "1", ctrl: true, description: "编辑器", action: () => navigate("/editor") },
    { key: "2", ctrl: true, description: "大纲", action: () => navigate("/outline") },
    { key: "3", ctrl: true, description: "人物", action: () => navigate("/characters") },
    { key: "4", ctrl: true, description: "世界观", action: () => navigate("/worldview") },
    { key: "5", ctrl: true, description: "AI 助手", action: () => navigate("/ai") },
    { key: "6", ctrl: true, description: "设置", action: () => navigate("/settings") },
    { key: "?", description: "快捷键帮助", action: () => setShortcutsOpen(true) },
  ];

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="flex h-screen bg-[var(--color-bg)]">
      <Sidebar activeTab={activeTab} onTabChange={(tab) => navigate(`/${tab}`)} />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <ShortcutsHelp open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
