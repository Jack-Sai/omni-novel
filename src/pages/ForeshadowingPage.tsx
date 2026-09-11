import { useState } from "react";
import { Plus, Eye, Trash2, ArrowLeft, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { useForeshadowingStore, Foreshadowing, ForeshadowingStatus } from "../stores/foreshadowingStore";
import { useProjectStore } from "../stores/projectStore";

const statusConfig: Record<ForeshadowingStatus, { label: string; icon: React.ElementType; color: string }> = {
  planted: { label: "已埋设", icon: AlertCircle, color: "text-yellow-500" },
  revealed: { label: "已回收", icon: CheckCircle, color: "text-green-500" },
  abandoned: { label: "已废弃", icon: XCircle, color: "text-gray-500" },
};

export function ForeshadowingPage() {
  const { currentProject } = useProjectStore();
  const { items, currentItem, addItem, setCurrentItem, updateItem, deleteItem } = useForeshadowingStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [filterStatus, setFilterStatus] = useState<ForeshadowingStatus | "all">("all");

  const projectItems = currentProject
    ? items.filter((item) => item.projectId === currentProject.id)
    : [];

  const filteredItems =
    filterStatus === "all" ? projectItems : projectItems.filter((item) => item.status === filterStatus);

  const stats = {
    total: projectItems.length,
    planted: projectItems.filter((i) => i.status === "planted").length,
    revealed: projectItems.filter((i) => i.status === "revealed").length,
    abandoned: projectItems.filter((i) => i.status === "abandoned").length,
  };

  const handleAdd = () => {
    if (!newName.trim() || !currentProject) return;
    addItem(currentProject.id, newName.trim());
    setNewName("");
    setShowAdd(false);
  };

  const handleUpdate = (updates: Partial<Foreshadowing>) => {
    if (!currentItem) return;
    updateItem(currentItem.id, updates);
  };

  if (!currentProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <Eye size={48} className="text-[var(--color-text-secondary)]" />
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
          <h1 className="text-2xl font-bold">编辑伏笔</h1>
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
              <label className="mb-1 block text-sm font-medium">状态</label>
              <select
                value={currentItem.status}
                onChange={(e) => handleUpdate({ status: e.target.value as ForeshadowingStatus })}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
              >
                <option value="planted">已埋设</option>
                <option value="revealed">已回收</option>
                <option value="abandoned">已废弃</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">重要程度</label>
              <select
                value={currentItem.importance}
                onChange={(e) => handleUpdate({ importance: e.target.value as "low" | "medium" | "high" })}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">简要描述</label>
            <textarea
              value={currentItem.description}
              onChange={(e) => handleUpdate({ description: e.target.value })}
              rows={2}
              className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
              placeholder="这个伏笔是什么..."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">埋设章节</label>
              <input
                type="text"
                value={currentItem.plantedChapter}
                onChange={(e) => handleUpdate({ plantedChapter: e.target.value })}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
                placeholder="第几章埋设"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">回收章节</label>
              <input
                type="text"
                value={currentItem.revealChapter}
                onChange={(e) => handleUpdate({ revealChapter: e.target.value })}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
                placeholder="第几章回收"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">埋设内容</label>
            <textarea
              value={currentItem.plantedContent}
              onChange={(e) => handleUpdate({ plantedContent: e.target.value })}
              rows={3}
              className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
              placeholder="原文中埋设伏笔的内容..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">回收内容</label>
            <textarea
              value={currentItem.revealContent}
              onChange={(e) => handleUpdate({ revealContent: e.target.value })}
              rows={3}
              className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
              placeholder="回收伏笔的内容..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">关联人物</label>
            <input
              type="text"
              value={currentItem.relatedCharacters.join(", ")}
              onChange={(e) => handleUpdate({ relatedCharacters: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              placeholder="用逗号分隔"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
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
        <h1 className="text-2xl font-bold">伏笔管理</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white transition hover:bg-[var(--color-primary-hover)]"
        >
          <Plus size={18} />
          添加伏笔
        </button>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-3">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-sm text-[var(--color-text-secondary)]">总计</p>
        </div>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-center dark:bg-yellow-900/20">
          <p className="text-2xl font-bold text-yellow-600">{stats.planted}</p>
          <p className="text-sm text-yellow-600">已埋设</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center dark:bg-green-900/20">
          <p className="text-2xl font-bold text-green-600">{stats.revealed}</p>
          <p className="text-sm text-green-600">已回收</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center dark:bg-gray-900/20">
          <p className="text-2xl font-bold text-gray-600">{stats.abandoned}</p>
          <p className="text-sm text-gray-600">已废弃</p>
        </div>
      </div>

      {showAdd && (
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            autoFocus
            placeholder="输入伏笔名称..."
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

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setFilterStatus("all")}
          className={`rounded-lg px-3 py-1.5 text-sm transition ${
            filterStatus === "all"
              ? "bg-[var(--color-primary)] text-white"
              : "border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
          }`}
        >
          全部
        </button>
        {Object.entries(statusConfig).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key as ForeshadowingStatus)}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              filterStatus === key
                ? "bg-[var(--color-primary)] text-white"
                : "border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
            }`}
          >
            {config.label}
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Eye size={48} className="text-[var(--color-text-secondary)]" />
          <p className="text-[var(--color-text-secondary)]">还没有伏笔，开始创建吧</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const config = statusConfig[item.status];
            const Icon = config.icon;
            return (
              <div
                key={item.id}
                className="group flex items-start justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 cursor-pointer transition hover:border-[var(--color-primary)]"
                onClick={() => setCurrentItem(item)}
              >
                <div className="flex items-start gap-3">
                  <Icon size={20} className={config.color} />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{item.name}</h3>
                      <span className={`text-xs ${config.color}`}>{config.label}</span>
                      {item.importance === "high" && (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-600">重要</span>
                      )}
                    </div>
                    {item.description && (
                      <p className="mt-1 text-sm text-[var(--color-text-secondary)] line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <div className="mt-2 flex gap-4 text-xs text-[var(--color-text-secondary)]">
                      {item.plantedChapter && <span>埋设：{item.plantedChapter}</span>}
                      {item.revealChapter && <span>回收：{item.revealChapter}</span>}
                    </div>
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
