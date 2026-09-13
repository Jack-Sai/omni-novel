import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ShortcutsHelp } from "../dialog";
import { SearchDialog } from "../search";
import { useKeyboardShortcuts, Shortcut } from "../../hooks";
import { initGlobalStores } from "../../services/storeInit";

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    initGlobalStores();
  }, []);

  const activeTab = location.pathname.split("/")[1] || "editor";

  const shortcuts: Shortcut[] = [
    { key: "1", ctrl: true, description: "编辑器", action: () => navigate("/editor") },
    { key: "2", ctrl: true, description: "大纲", action: () => navigate("/outline") },
    { key: "3", ctrl: true, description: "人物", action: () => navigate("/characters") },
    { key: "4", ctrl: true, description: "世界观", action: () => navigate("/worldview") },
    { key: "5", ctrl: true, description: "伏笔", action: () => navigate("/foreshadowing") },
    { key: "6", ctrl: true, description: "设置", action: () => navigate("/settings") },
    { key: "k", ctrl: true, description: "搜索", action: () => setSearchOpen(true) },
    { key: "?", description: "快捷键帮助", action: () => setShortcutsOpen(true) },
  ];

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar activeTab={activeTab} onTabChange={(tab) => navigate(`/${tab}`)} />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
      <ShortcutsHelp open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
