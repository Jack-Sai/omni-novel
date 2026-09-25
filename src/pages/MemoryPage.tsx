import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, Brain, Plus, Search, Trash2 } from "lucide-react";
import { memoryDb, type MemoryItemRow, type MemoryType, type MemoryScope } from "../services";
import { useProjectStore } from "../stores/projectStore";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Page,
  PageBody,
  PageHeader,
  Select,
  Textarea,
} from "../components/ui";

const typeLabels: Record<string, string> = {
  summary: "摘要",
  event: "事件",
  entity: "实体",
  note: "笔记",
  preference: "偏好",
};

const scopeLabels: Record<string, string> = {
  chapter: "章节",
  volume: "卷",
  global: "全局",
};

const sourceLabels: Record<string, string> = {
  manual: "手动",
  ai: "AI",
  import: "导入",
};

export function MemoryPage() {
  const { currentProject } = useProjectStore();
  const [items, setItems] = useState<MemoryItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [scopeFilter, setScopeFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<MemoryItemRow | null>(null);
  // 新增表单
  const [newType, setNewType] = useState<MemoryType>("note");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  const load = useCallback(async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const rows = await memoryDb.list(currentProject.id);
      setItems(rows);
    } catch (e) {
      console.warn("加载记忆失败:", e);
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  useEffect(() => {
    setSelected(null);
    setShowAdd(false);
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((m) => {
      if (typeFilter && m.type !== typeFilter) return false;
      if (scopeFilter && m.scope !== scopeFilter) return false;
      if (q) {
        const hay = `${m.title}\n${m.content}\n${m.tags}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, query, typeFilter, scopeFilter]);

  const handleAdd = useCallback(async () => {
    if (!newContent.trim() || !currentProject) return;
    try {
      const row = await memoryDb.create(currentProject.id, {
        type: newType,
        title: newTitle.trim(),
        content: newContent.trim(),
        source: "manual",
        importance: 5,
      });
      setItems((prev) => [row, ...prev]);
      setNewTitle("");
      setNewContent("");
      setShowAdd(false);
    } catch (e) {
      console.warn("创建记忆失败:", e);
    }
  }, [currentProject, newType, newTitle, newContent]);

  const handleUpdate = useCallback(async (updates: Partial<MemoryItemRow>) => {
    if (!selected) return;
    const merged: MemoryItemRow = { ...selected, ...updates };
    setSelected(merged);
    setItems((prev) => prev.map((m) => (m.id === merged.id ? merged : m)));
    try {
      await memoryDb.update(merged.id, {
        type: merged.type as MemoryType,
        scope: merged.scope as MemoryScope,
        title: merged.title,
        content: merged.content,
        importance: merged.importance,
        tags: safeParseTags(merged.tags),
      });
    } catch (e) {
      console.warn("更新记忆失败:", e);
    }
  }, [selected]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await memoryDb.delete(id);
        setItems((prev) => prev.filter((m) => m.id !== id));
        if (selected?.id === id) setSelected(null);
      } catch (e) {
        console.warn("删除记忆失败:", e);
      }
    },
    [selected],
  );

  /* ---------------- 未选择项目 ---------------- */
  if (!currentProject) {
    return (
      <Page>
        <PageHeader title="记忆管理" />
        <PageBody>
          <EmptyState
            icon={Brain}
            title="请先选择一个项目"
            description="在编辑器中打开或创建一个项目后，即可查看与维护项目记忆。"
          />
        </PageBody>
      </Page>
    );
  }

  /* ---------------- 编辑详情 ---------------- */
  if (selected) {
    return (
      <Page>
        <PageHeader
          leading={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="返回列表"
              onClick={() => setSelected(null)}
            >
              <ArrowLeft size={16} />
            </Button>
          }
          title={selected.title || "未命名记忆"}
          description={`${typeLabels[selected.type] ?? selected.type} · ${scopeLabels[selected.scope] ?? selected.scope} · 来源 ${sourceLabels[selected.source] ?? selected.source}`}
          actions={
            <Button
              variant="ghost"
              className="text-danger hover:bg-danger-soft"
              onClick={() => void handleDelete(selected.id)}
            >
              <Trash2 size={15} />
              删除
            </Button>
          }
        />
        <PageBody width="reading">
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="标题">
                <Input
                  value={selected.title}
                  onChange={(e) => void handleUpdate({ title: e.target.value })}
                  placeholder="记忆标题"
                />
              </Field>
              <Field label="类型">
                <Select
                  value={selected.type}
                  onChange={(e) => void handleUpdate({ type: e.target.value as MemoryType })}
                >
                  {Object.entries(typeLabels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="范围">
                <Select
                  value={selected.scope}
                  onChange={(e) => void handleUpdate({ scope: e.target.value as MemoryScope })}
                >
                  {Object.entries(scopeLabels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="重要度" hint="1~10，越高越优先注入">
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={selected.importance}
                  onChange={(e) =>
                    void handleUpdate({
                      importance: Math.min(10, Math.max(1, Number(e.target.value) || 1)),
                    })
                  }
                />
              </Field>
            </div>

            <Field label="内容">
              <Textarea
                value={selected.content}
                onChange={(e) => void handleUpdate({ content: e.target.value })}
                rows={8}
                placeholder="记忆正文"
              />
            </Field>

            <Field label="标签" hint="多个标签用英文逗号分隔">
              <Input
                value={safeParseTags(selected.tags).join(", ")}
                onChange={(e) =>
                  void handleUpdate({
                    tags: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .join(", "),
                  })
                }
                placeholder="例如：主线, 伏笔, 主角"
              />
            </Field>

            <p className="text-[12px] text-ink-3">
              修改自动保存 · 创建于 {formatTime(selected.created_at)} · 更新于{" "}
              {formatTime(selected.updated_at)}
            </p>
          </div>
        </PageBody>
      </Page>
    );
  }

  /* ---------------- 列表 ---------------- */
  return (
    <Page>
      <PageHeader
        title="记忆管理"
        description={`共 ${items.length} 条${filtered.length !== items.length ? ` · 筛选出 ${filtered.length} 条` : ""}`}
        actions={
          <Button variant="primary" onClick={() => setShowAdd(true)}>
            <Plus size={15} />
            新增记忆
          </Button>
        }
      />

      <PageBody>
        <div className="space-y-4">
          {/* 工具行 */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索标题、内容、标签…"
                className="pl-8"
              />
            </div>
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">全部类型</option>
              {Object.entries(typeLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <Select value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)}>
              <option value="">全部范围</option>
              {Object.entries(scopeLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>

          {showAdd && (
            <Card className="omni-pop space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as MemoryType)}
                >
                  {Object.entries(typeLabels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="标题（可选）"
                  className="min-w-40 flex-1"
                />
              </div>
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={3}
                placeholder="记忆内容…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void handleAdd();
                  if (e.key === "Escape") setShowAdd(false);
                }}
              />
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={() => void handleAdd()}
                  disabled={!newContent.trim()}
                >
                  创建
                </Button>
                <Button variant="ghost" onClick={() => setShowAdd(false)}>
                  取消
                </Button>
              </div>
            </Card>
          )}

          {filtered.length === 0 && !loading ? (
            <EmptyState
              icon={Brain}
              title={items.length === 0 ? "还没有记忆" : "没有匹配的记忆"}
              description={
                items.length === 0
                  ? "AI 生成章节摘要后会自动写入记忆，也可以手动新增设定级记忆。"
                  : "调整搜索词或筛选条件试试。"
              }
              action={
                items.length === 0 ? (
                  <Button variant="primary" onClick={() => setShowAdd(true)}>
                    <Plus size={15} />
                    新增第一条记忆
                  </Button>
                ) : undefined
              }
              className="py-16"
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((m) => (
                <Card
                  key={m.id}
                  interactive
                  className="group relative"
                  onClick={() => setSelected(m)}
                >
                  <div className="flex items-start gap-2 pr-6">
                    <Badge variant="primary" size="sm">
                      {typeLabels[m.type] ?? m.type}
                    </Badge>
                    <Badge variant="outline" size="sm">
                      {scopeLabels[m.scope] ?? m.scope}
                    </Badge>
                    <span className="ml-auto shrink-0 text-[11px] text-ink-3">
                      重要度 {m.importance}
                    </span>
                  </div>
                  <h3 className="mt-2 truncate text-sm font-medium text-ink">
                    {m.title || "无标题"}
                  </h3>
                  <p className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-ink-2">
                    {m.content}
                  </p>
                  <p className="mt-2 text-[11px] text-ink-3">
                    {sourceLabels[m.source] ?? m.source} · {formatTime(m.updated_at)}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`删除 ${m.title || "无标题记忆"}`}
                    className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-danger-soft hover:text-danger focus-visible:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(m.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </PageBody>
    </Page>
  );
}

function safeParseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === "string") : [];
  } catch {
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
}

function formatTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
