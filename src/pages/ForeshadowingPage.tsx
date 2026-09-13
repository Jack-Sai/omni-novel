import { useState, useMemo, useCallback } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Eye,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  useForeshadowingStore,
  Foreshadowing,
  ForeshadowingStatus,
} from "../stores/foreshadowingStore";
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
  SegmentedControl,
  Select,
  StatCard,
  Textarea,
  type BadgeVariant,
  type SegmentedItem,
} from "../components/ui";

const statusConfig: Record<
  ForeshadowingStatus,
  { label: string; icon: React.ElementType; tone: BadgeVariant }
> = {
  planted: { label: "已埋设", icon: AlertCircle, tone: "warning" },
  revealed: { label: "已回收", icon: CheckCircle, tone: "success" },
  abandoned: { label: "已废弃", icon: XCircle, tone: "neutral" },
};

type FilterValue = ForeshadowingStatus | "all";

export function ForeshadowingPage() {
  const { currentProject } = useProjectStore();
  const { items, currentItem, addItem, setCurrentItem, updateItem, deleteItem } =
    useForeshadowingStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterValue>("all");

  const projectItems = useMemo(
    () => (currentProject ? items.filter((item) => item.projectId === currentProject.id) : []),
    [items, currentProject],
  );

  const filteredItems = useMemo(
    () =>
      filterStatus === "all"
        ? projectItems
        : projectItems.filter((item) => item.status === filterStatus),
    [projectItems, filterStatus],
  );

  const stats = useMemo(
    () => ({
      total: projectItems.length,
      planted: projectItems.filter((i) => i.status === "planted").length,
      revealed: projectItems.filter((i) => i.status === "revealed").length,
      abandoned: projectItems.filter((i) => i.status === "abandoned").length,
    }),
    [projectItems],
  );

  const handleAdd = useCallback(() => {
    if (!newName.trim() || !currentProject) return;
    addItem({
      projectId: currentProject.id,
      name: newName.trim(),
      description: "",
      plantedChapter: "",
      plantedContent: "",
      revealChapter: "",
      revealContent: "",
      status: "planted",
      importance: "medium",
      relatedCharacters: [],
      notes: "",
    });
    setNewName("");
    setShowAdd(false);
  }, [newName, currentProject, addItem]);

  const handleUpdate = useCallback(
    (updates: Partial<Foreshadowing>) => {
      if (!currentItem) return;
      updateItem(currentItem.id, updates);
    },
    [currentItem, updateItem],
  );

  /* ---------------- 未选择项目 ---------------- */
  if (!currentProject) {
    return (
      <Page>
        <PageHeader title="伏笔管理" />
        <PageBody>
          <EmptyState
            icon={Eye}
            title="请先选择一个项目"
            description="在编辑器中打开或创建一个项目后，即可开始追踪伏笔。"
          />
        </PageBody>
      </Page>
    );
  }

  /* ---------------- 编辑详情 ---------------- */
  if (currentItem) {
    const config = statusConfig[currentItem.status];

    return (
      <Page>
        <PageHeader
          leading={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="返回列表"
              onClick={() => setCurrentItem(null)}
            >
              <ArrowLeft size={16} />
            </Button>
          }
          title={currentItem.name || "未命名伏笔"}
          description={config.label}
        />
        <PageBody width="reading">
          <div className="space-y-5">
            <Field label="名称">
              <Input
                value={currentItem.name}
                onChange={(e) => handleUpdate({ name: e.target.value })}
              />
            </Field>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="状态">
                <Select
                  value={currentItem.status}
                  onChange={(e) =>
                    handleUpdate({ status: e.target.value as ForeshadowingStatus })
                  }
                >
                  <option value="planted">已埋设</option>
                  <option value="revealed">已回收</option>
                  <option value="abandoned">已废弃</option>
                </Select>
              </Field>
              <Field label="重要程度">
                <Select
                  value={currentItem.importance}
                  onChange={(e) =>
                    handleUpdate({ importance: e.target.value as "low" | "medium" | "high" })
                  }
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </Select>
              </Field>
            </div>

            <Field label="简要描述">
              <Textarea
                value={currentItem.description}
                onChange={(e) => handleUpdate({ description: e.target.value })}
                rows={2}
                placeholder="这个伏笔是什么"
              />
            </Field>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="埋设章节">
                <Input
                  value={currentItem.plantedChapter}
                  onChange={(e) => handleUpdate({ plantedChapter: e.target.value })}
                  placeholder="第几章埋设"
                />
              </Field>
              <Field label="回收章节">
                <Input
                  value={currentItem.revealChapter}
                  onChange={(e) => handleUpdate({ revealChapter: e.target.value })}
                  placeholder="第几章回收"
                />
              </Field>
            </div>

            <Field label="埋设内容">
              <Textarea
                value={currentItem.plantedContent}
                onChange={(e) => handleUpdate({ plantedContent: e.target.value })}
                rows={3}
                placeholder="原文中埋设伏笔的段落"
              />
            </Field>

            <Field label="回收内容">
              <Textarea
                value={currentItem.revealContent}
                onChange={(e) => handleUpdate({ revealContent: e.target.value })}
                rows={3}
                placeholder="回收伏笔的段落"
              />
            </Field>

            <Field label="关联人物" hint="多个姓名用英文逗号分隔">
              <Input
                value={currentItem.relatedCharacters.join(", ")}
                onChange={(e) =>
                  handleUpdate({
                    relatedCharacters: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="例如：凌辰, 苏婉晴"
              />
            </Field>

            <Field label="备注">
              <Textarea
                value={currentItem.notes}
                onChange={(e) => handleUpdate({ notes: e.target.value })}
                rows={2}
                placeholder="其他备注信息"
              />
            </Field>
          </div>
        </PageBody>
      </Page>
    );
  }

  /* ---------------- 列表 ---------------- */
  const filterItems: SegmentedItem<FilterValue>[] = [
    { value: "all", label: "全部", count: stats.total },
    { value: "planted", label: "已埋设", count: stats.planted },
    { value: "revealed", label: "已回收", count: stats.revealed },
    { value: "abandoned", label: "已废弃", count: stats.abandoned },
  ];

  return (
    <Page>
      <PageHeader
        title="伏笔管理"
        description={`共 ${stats.total} 条伏笔，其中 ${stats.planted} 条待回收`}
        actions={
          <Button variant="primary" onClick={() => setShowAdd(true)}>
            <Plus size={15} />
            添加伏笔
          </Button>
        }
      />

      <PageBody>
        <div className="space-y-4">
          <div className="grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="总计" value={stats.total} tone="primary" />
            <StatCard label="已埋设" value={stats.planted} tone="warning" />
            <StatCard label="已回收" value={stats.revealed} tone="success" />
            <StatCard label="已废弃" value={stats.abandoned} />
          </div>

          <SegmentedControl
            items={filterItems}
            value={filterStatus}
            onChange={setFilterStatus}
            variant="chip"
          />

          {showAdd && (
            <Card className="omni-pop flex flex-wrap items-center gap-2">
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") setShowAdd(false);
                }}
                placeholder="输入伏笔名称，回车创建"
                className="min-w-40 flex-1"
              />
              <Button variant="primary" onClick={handleAdd} disabled={!newName.trim()}>
                添加
              </Button>
              <Button variant="ghost" onClick={() => setShowAdd(false)}>
                取消
              </Button>
            </Card>
          )}

          {filteredItems.length === 0 ? (
            <EmptyState
              icon={Eye}
              title={stats.total === 0 ? "还没有伏笔" : "该状态下暂无伏笔"}
              description={
                stats.total === 0
                  ? "记录每一次埋设与回收，避免长篇写作中线索断线。"
                  : "切换到其他状态查看。"
              }
              action={
                stats.total === 0 ? (
                  <Button variant="primary" onClick={() => setShowAdd(true)}>
                    <Plus size={15} />
                    添加第一条伏笔
                  </Button>
                ) : undefined
              }
              className="py-16"
            />
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => {
                const config = statusConfig[item.status];
                const Icon = config.icon;

                return (
                  <Card
                    key={item.id}
                    interactive
                    className="group relative flex items-start gap-3"
                    onClick={() => setCurrentItem(item)}
                  >
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-subtle">
                      <Icon
                        size={17}
                        aria-hidden
                        className={
                          config.tone === "warning"
                            ? "text-warning"
                            : config.tone === "success"
                              ? "text-success"
                              : "text-ink-3"
                        }
                      />
                    </div>

                    <div className="min-w-0 flex-1 pr-8">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-medium text-ink">{item.name}</h3>
                        <Badge variant={config.tone} size="sm">
                          {config.label}
                        </Badge>
                        {item.importance === "high" && (
                          <Badge variant="danger" size="sm">
                            重要
                          </Badge>
                        )}
                      </div>

                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-2">
                          {item.description}
                        </p>
                      )}

                      {(item.plantedChapter || item.revealChapter) && (
                        <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-ink-3">
                          {item.plantedChapter && <span>埋设：{item.plantedChapter}</span>}
                          {item.revealChapter && <span>回收：{item.revealChapter}</span>}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`删除 ${item.name}`}
                      className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-danger-soft hover:text-danger focus-visible:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteItem(item.id);
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </PageBody>
    </Page>
  );
}
