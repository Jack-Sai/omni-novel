import { BookOpen, Eye, FileText, Map, Settings, Sparkles, Users } from "lucide-react";
import type { ElementType } from "react";
import { ThemeToggle } from "../ui";
import { cn } from "../../lib/cn";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface NavItem {
  id: string;
  icon: ElementType;
  label: string;
}

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "创作",
    items: [
      { id: "editor", icon: FileText, label: "编辑器" },
      { id: "outline", icon: BookOpen, label: "大纲" },
    ],
  },
  {
    label: "设定",
    items: [
      { id: "characters", icon: Users, label: "人物" },
      { id: "worldview", icon: Map, label: "世界观" },
      { id: "foreshadowing", icon: Eye, label: "伏笔" },
    ],
  },
  {
    label: "工作台",
    items: [
      { id: "ai", icon: Sparkles, label: "AI 助手" },
      { id: "settings", icon: Settings, label: "设置" },
    ],
  },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-line bg-subtle">
      <div className="flex items-center gap-3 px-4 py-5">
        <img
          src="/logo.png"
          alt=""
          className="h-9 w-9 shrink-0 rounded-lg object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-tight text-ink">
            Omni Novel
          </p>
          <p className="truncate text-[12px] text-ink-3">AI 写作工作台</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-3">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-2 pt-4 text-[12px] font-medium text-ink-3">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                      "relative flex h-10 w-full items-center gap-3 rounded-lg pl-3.5 pr-3 text-sm",
                      "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-ring)]",
                      active
                        ? "bg-surface font-medium text-primary shadow-xs"
                        : "text-ink-2 hover:bg-hover hover:text-ink",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
                    )}
                    <item.icon size={18} className="shrink-0" aria-hidden />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <ThemeToggle className="w-full" />
      </div>
    </aside>
  );
}
