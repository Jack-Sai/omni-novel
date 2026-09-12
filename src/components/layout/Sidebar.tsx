import { BookOpen, FileText, Users, Map, Eye, Settings, Sparkles } from "lucide-react";
import { ThemeToggle } from "../ui";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: "editor", icon: FileText, label: "编辑器" },
  { id: "outline", icon: BookOpen, label: "大纲" },
  { id: "characters", icon: Users, label: "人物" },
  { id: "worldview", icon: Map, label: "世界观" },
  { id: "foreshadowing", icon: Eye, label: "伏笔" },
  { id: "ai", icon: Sparkles, label: "AI 助手" },
  { id: "settings", icon: Settings, label: "设置" },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="flex h-full w-56 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-[var(--color-border)]">
        <Sparkles size={24} className="text-[var(--color-primary)]" />
        <span className="font-bold text-lg">Omni Novel</span>
      </div>
      <nav className="flex-1 py-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 transition ${
              activeTab === item.id
                ? "bg-[var(--color-primary)] text-white"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)]"
            }`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-[var(--color-border)]">
        <ThemeToggle />
      </div>
    </aside>
  );
}
