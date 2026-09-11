import { BookOpen, FileText, Users, Map, Settings, Sparkles } from "lucide-react";
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
  { id: "ai", icon: Sparkles, label: "AI 助手" },
  { id: "settings", icon: Settings, label: "设置" },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="flex h-full w-16 flex-col items-center border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-4">
      <div className="flex flex-1 flex-col items-center">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`mb-2 flex h-12 w-12 items-center justify-center rounded-lg transition
              ${
                activeTab === item.id
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)]"
              }`}
            title={item.label}
          >
            <item.icon size={20} />
          </button>
        ))}
      </div>
      <ThemeToggle />
    </aside>
  );
}
