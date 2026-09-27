import { BookOpen, Brain, Eye, FileText, Map, Settings, ShieldCheck, Users, LayoutGrid } from "lucide-react";
import type { ElementType } from "react";
import { ThemeSwitcher } from "../ui";
import { cn } from "../../lib/cn";
import { useUIStore } from "../../stores/uiStore";
import { useT } from "../../i18n";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface NavItem {
  id: string;
  icon: ElementType;
  labelKey: string;
}

const groups: { labelKey: string; items: NavItem[] }[] = [
  {
    labelKey: "",
    items: [{ id: "bookshelf", icon: LayoutGrid, labelKey: "nav.bookshelf" }],
  },
  {
    labelKey: "nav.group.create",
    items: [
      { id: "editor", icon: FileText, labelKey: "nav.editor" },
      { id: "chapters", icon: BookOpen, labelKey: "nav.chapters" },
      { id: "consistency", icon: ShieldCheck, labelKey: "nav.consistency" },
    ],
  },
  {
    labelKey: "nav.group.setup",
    items: [
      { id: "characters", icon: Users, labelKey: "nav.characters" },
      { id: "worldview", icon: Map, labelKey: "nav.worldview" },
      { id: "foreshadowing", icon: Eye, labelKey: "nav.foreshadowing" },
      { id: "memory", icon: Brain, labelKey: "nav.memory" },
    ],
  },
  {
    labelKey: "nav.group.workbench",
    items: [{ id: "settings", icon: Settings, labelKey: "nav.settings" }],
  },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const t = useT();

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-line bg-subtle transition-[width] duration-200",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 py-5",
          collapsed ? "justify-center px-0" : "px-4",
        )}
      >
        <img
          src="/logo.png"
          alt=""
          className="h-9 w-9 shrink-0 rounded-lg object-cover"
        />
        <div className={cn("min-w-0 flex-1", collapsed && "hidden")}>
          <p className="truncate text-sm font-semibold tracking-tight text-ink">
            Omni Novel
          </p>
          <p className="truncate text-[12px] text-ink-3">{t("nav.tagline")}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-3">
        {groups.map((group) => (
          <div key={group.labelKey || "root"}>
            {group.labelKey && !collapsed && (
              <p className="px-3 pb-2 pt-4 text-[12px] font-medium text-ink-3">
                {t(group.labelKey)}
              </p>
            )}
            <div className={cn("space-y-1", group.labelKey && collapsed && "mt-3")}>
              {group.items.map((item) => {
                const active = activeTab === item.id;
                const label = t(item.labelKey);
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    aria-label={label}
                    title={collapsed ? label : undefined}
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
                      {label}
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
