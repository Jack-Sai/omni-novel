import { useState, useMemo, useCallback } from "react";
import {
  ArrowLeft,
  Building2,
  Globe,
  History,
  Map,
  Plus,
  Scroll,
  Swords,
  Trash2,
  Zap,
} from "lucide-react";
import {
  useWorldviewStore,
  WorldviewItem,
  WorldviewType,
  worldviewTypes,
} from "../stores/worldviewStore";
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
  Textarea,
} from "../components/ui";

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
  const { items, currentItem, addItem, setCurrentItem, updateItem, deleteItem } =
    useWorldviewStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<WorldviewType>("location");
  const [filterType, setFilterType] = useState<WorldviewType | "all">("all");

  const projectItems = useMemo(
    () => (currentProject ? items.filter((item) => item.projectId === currentProject.id) : []),
    [items, currentProject],
  );

  const filteredItems = useMemo(
    () =>
      filterType === "all"
        ? projectItems
        : projectItems.filter((item) => item.type === filterType),
    [projectItems, filterType],
  );

  const handleAdd = useCallback(() => {
    if (!newName.trim() || !currentProject) return;
    addItem({
      projectId: currentProject.id,
      name: newName.trim(),
      type: newType,
      description: "",
      details: "",
      relationships: "",
      notes: "",
      tags: [],
    });
    setNewName("");
    setShowAdd(false);
  }, [newName, currentProject, addItem, newType]);

  const handleUpdate = useCallback(
    (updates: Partial<WorldviewItem>) => {
      if (!currentItem) return;
      updateItem(currentItem.id, updates);
    },
    [currentItem, updateItem],
  );

  /* ---------------- 未选择项目 ---------------- */
  if (!currentProject) {
    return (
      <Page>
        <PageHeader title="世界观管理" />
        <PageBody>
          <EmptyState
            icon={Map}
            title="请先选择一个项目"
            description="在编辑器中打开或创建一个项目后，即可开始搭建设定库。"
          />
        </PageBody>
      </Page>
    );
  }

  /* ---------------- 编辑详情 ---------------- */
  if (currentItem) {
    const typeLabel =
      worldviewTypes.find((t) => t.value === currentItem.type)?.label ?? "其他";

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
          title={currentItem.name || "未命名设定"}
          description={typeLabel}
        />
        <PageBody width="reading">
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="名称">
                <Input
                  value={currentItem.name}
                  onChange={(e) => handleUpdate({ name: e.target.value })}
                />
              </Field>
              <Field label="类型">
                <Select
                  value={currentItem.type}
                  onChange={(e) => handleUpdate({ type: e.target.value as WorldviewType })}
                >
                  {worldviewTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="简要描述">
              <Textarea
                value={currentItem.description}
                onChange={(e) => handleUpdate({ description: e.target.value })}
                rows={3}
                placeholder="一句话概括这个设定"
              />
            </Field>

            <Field label="详细信息">
              <Textarea
                value={currentItem.details}
                onChange={(e) => handleUpdate({ details: e.target.value })}
                rows={7}
                placeholder="展开描述规则、来源、限制等细节"
              />
            </Field>

            <Field label="关联关系">
              <Textarea
                value={currentItem.relationships}
                onChange={(e) => handleUpdate({ relationships: e.target.value })}
                rows={3}
                placeholder="与其他设定的关联"
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
  const filterItems = [
    { value: "all" as const, label: "全部", count: projectItems.length },
    ...worldviewTypes
      .map((t) => ({
        value: t.value,
        label: t.label,
        count: projectItems.filter((item) => item.type === t.value).length,
      }))
      .filter((t) => t.count > 0),
  ];

  return (
    <Page>
      <PageHeader
        title="世界观管理"
        description={`共 ${projectItems.length} 条设定`}
        actions={
          <Button variant="primary" size="md" onClick={() => setShowAdd(true)}>
            <Plus size={15} />
            添加设定
          </Button>
        }
      />

      <PageBody>
        <div className="space-y-4">
          <SegmentedControl
            items={filterItems}
            value={filterType}
            onChange={setFilterType}
            variant="chip"
          />

          {showAdd && (
            <Card className="omni-pop flex flex-wrap items-center gap-2">
              <Select
                value={newType}
                onChange={(e) => setNewType(e.target.value as WorldviewType)}
                className="w-32 shrink-0"
              >
                {worldviewTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") setShowAdd(false);
                }}
                placeholder="输入设定名称，回车创建"
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
              icon={Map}
              title={projectItems.length === 0 ? "还没有世界观设定" : "该分类下暂无内容"}
              description={
                projectItems.length === 0
                  ? "从地理、组织、物品、规则开始，为故事搭好底层设定。"
                  : "换个分类看看，或添加新的设定。"
              }
              action={
                projectItems.length === 0 ? (
                  <Button variant="primary" onClick={() => setShowAdd(true)}>
                    <Plus size={15} />
                    添加第一条设定
                  </Button>
                ) : undefined
              }
              className="py-16"
            />
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => {
                const Icon = typeIcons[item.type] || Globe;
                const typeLabel =
                  worldviewTypes.find((t) => t.value === item.type)?.label ?? "其他";

                return (
                  <Card
                    key={item.id}
                    interactive
                    className="group relative flex items-start gap-3"
                    onClick={() => setCurrentItem(item)}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-subtle text-ink-2">
                      <Icon size={17} aria-hidden />
                    </div>

                    <div className="min-w-0 flex-1 pr-8">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-medium text-ink">{item.name}</h3>
                        <Badge variant="neutral" size="sm">
                          {typeLabel}
                        </Badge>
                      </div>
                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-2">
                          {item.description}
                        </p>
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
