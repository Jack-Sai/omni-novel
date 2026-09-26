import { BookOpen, Brain, Eye, FileText, Map, Settings, Users, LayoutGrid } from "lucide-react";
import type { ElementType } from "react";
import { ThemeSwitcher } from "../ui";
import { cn } from "../../lib/cn";
import { useUIStore } from "../../stores/uiStore";

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
    label: "",
    items: [
      { id: "bookshelf", icon: LayoutGrid, label: "书架" },
    ],
  },
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
      { id: "memory", icon: Brain, label: "记忆" },
    ],
  },
  {
    label: "工作台",
    items: [
      { id: "settings", icon: Settings, label: "设置" },
    ],
  },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-line bg-subtle transition-[width] duration-200",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className={cn("flex items-center gap-3 py-5", collapsed ? "px-2" : "px-4")}>
        <img
          src="/logo.png"
          alt=""
          className="h-9 w-9 shrink-0 rounded-lg object-cover"
        />
        <div className={cn("min-w-0 flex-1", collapsed && "hidden")}>
          <p className="truncate text-sm font-semibold tracking-tight text-ink">
            Omni Novel
          </p>
          <p className="truncate text-[12px] text-ink-3">AI 写作工作台</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-3">
        {groups.map((group) => (
          <div key={group.label}>
            {group.label && !collapsed && (
              <p className="px-3 pb-2 pt-4 text-[12px] font-medium text-ink-3">
                {group.label}
              </p>
            )}
            <div className={cn("space-y-1", group.label && collapsed && "mt-3")}>
              {group.items.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    aria-label={item.label}
                    title={collapsed ? item.label : undefined}
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                      "relative flex h-10 w-full items-center gap-3 rounded-lg text-sm",
                      collapsed ? "justify-center pl-0 pr-0" : "pl-3.5 pr-3",
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
                    <span className={cn("truncate", collapsed && "hidden")}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div
        className={cn(
          "border-t border-line py-2.5",
          collapsed ? "px-2" : "px-3",
        )}
      >
        <ThemeSwitcher
          className={cn("w-full", collapsed && "flex-col justify-center gap-1")}
        />
      </div>
    </aside>
  );
}
