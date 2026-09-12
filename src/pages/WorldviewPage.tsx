import { useState, useMemo, useCallback } from "react";
import { Plus, Map, Trash2, ArrowLeft, Globe, Building2, Swords, Zap, Scroll, History } from "lucide-react";
import { useWorldviewStore, WorldviewItem, WorldviewType, worldviewTypes } from "../stores/worldviewStore";
import { useProjectStore } from "../stores/projectStore";

const typeIcons: Record<WorldviewType, React.ElementType> = {
  location: Map,
  organization: Building2,
  item: Swords,
  event: Scroll,
  rule: Globe,
  race: Globe,
  magic: Zap,
  technology: Zap,
  history: History,
  other: Globe,
};

export function WorldviewPage() {
  const { currentProject } = useProjectStore();
  const { items, currentItem, addItem, setCurrentItem, updateItem, deleteItem } = useWorldviewStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<WorldviewType>("location");
  const [filterType, setFilterType] = useState<WorldviewType | "all">("all");

  const projectItems = useMemo(() => {
    return currentProject
      ? items.filter((item) => item.projectId === currentProject.id)
      : [];
  }, [items, currentProject]);

  const filteredItems = useMemo(() => {
    return filterType === "all" ? projectItems : projectItems.filter((item) => item.type === filterType);
  }, [projectItems, filterType]);

  const handleAdd = useCallback(() => {
    if (!newName.trim() || !currentProject) return;
    addItem(currentProject.id, newName.trim(), newType);
    setNewName("");
    setShowAdd(false);
  }, [newName, currentProject, addItem, newType]);

  const handleUpdate = useCallback((updates: Partial<WorldviewItem>) => {
    if (!currentItem) return;
    updateItem(currentItem.id, updates);
  }, [currentItem, updateItem]);

  if (!currentProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <Map size={48} className="text-[var(--color-text-secondary)]" />
        <p className="text-[var(--color-text-secondary)]">请先选择一个项目</p>
      </div>
    );
  }

  if (currentItem) {
    return (
      <div className="flex h-full flex-col p-6">
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => setCurrentItem(null)}
            className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">编辑设定</h1>
        </div>

        <div className="flex-1 space-y-4 overflow-auto">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">名称</label>
              <input
                type="text"
                value={currentItem.name}
                onChange={(e) => handleUpdate({ name: e.target.value })}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">类型</label>
              <select
                value={currentItem.type}
                onChange={(e) => handleUpdate({ type: e.target.value as WorldviewType })}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
              >
                {worldviewTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">简要描述</label>
            <textarea
              value={currentItem.description}
              onChange={(e) => handleUpdate({ description: e.target.value })}
              rows={3}
              className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
              placeholder="简要描述这个设定..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">详细信息</label>
            <textarea
              value={currentItem.details}
              onChange={(e) => handleUpdate({ details: e.target.value })}
              rows={6}
              className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
              placeholder="详细的设定信息..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">关联关系</label>
            <textarea
              value={currentItem.relationships}
              onChange={(e) => handleUpdate({ relationships: e.target.value })}
              rows={3}
              className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
              placeholder="与其他设定的关联关系..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">备注</label>
            <textarea
              value={currentItem.notes}
              onChange={(e) => handleUpdate({ notes: e.target.value })}
              rows={2}
              className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
              placeholder="其他备注信息..."
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">世界观管理</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white transition hover:bg-[var(--color-primary-hover)]"
        >
          <Plus size={18} />
          添加设定
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 flex gap-2">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as WorldviewType)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
          >
            {worldviewTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            autoFocus
            placeholder="输入名称..."
            className="flex-1 rounded-lg border border-[var(--color-primary)] bg-[var(--color-bg)] px-3 py-2 outline-none"
          />
          <button
            onClick={handleAdd}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white transition hover:bg-[var(--color-primary-hover)]"
          >
            添加
          </button>
          <button
            onClick={() => setShowAdd(false)}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 transition hover:bg-[var(--color-bg-secondary)]"
          >
            取消
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setFilterType("all")}
          className={`rounded-lg px-3 py-1.5 text-sm transition ${
            filterType === "all"
              ? "bg-[var(--color-primary)] text-white"
              : "border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
          }`}
        >
          全部 ({projectItems.length})
        </button>
        {worldviewTypes.map((t) => {
          const count = projectItems.filter((item) => item.type === t.value).length;
          if (count === 0) return null;
          return (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                filterType === t.value
                  ? "bg-[var(--color-primary)] text-white"
                  : "border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
              }`}
            >
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      {filteredItems.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Map size={48} className="text-[var(--color-text-secondary)]" />
          <p className="text-[var(--color-text-secondary)]">还没有世界观设定，开始创建吧</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const Icon = typeIcons[item.type] || Globe;
            const typeLabel = worldviewTypes.find((t) => t.value === item.type)?.label || "其他";
            return (
              <div
                key={item.id}
                className="group flex items-start justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 cursor-pointer transition hover:border-[var(--color-primary)]"
                onClick={() => setCurrentItem(item)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                    <Icon size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{item.name}</h3>
                      <span className="rounded-full bg-[var(--color-bg)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]">
                        {typeLabel}
                      </span>
                    </div>
                    {item.description && (
                      <p className="mt-1 text-sm text-[var(--color-text-secondary)] line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteItem(item.id);
                  }}
                  className="rounded p-1 text-[var(--color-text-secondary)] opacity-0 transition hover:bg-red-100 hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
