import { useState, useMemo, useCallback } from "react";
import { ArrowLeft, Link2, Network, Plus, Sparkles, Trash2, User, Users } from "lucide-react";
import { useCharacterStore, Character } from "../stores/characterStore";
import { useProjectStore } from "../stores/projectStore";
import {
  relationTypes,
  useRelationStore,
  type CharacterRelation,
} from "../stores/relationStore";
import { AICreateDialog } from "../components/ai/AICreateDialog";
import { RelationDialog } from "../components/characters/RelationDialog";
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
import { cn } from "../lib/cn";

const genderLabel: Record<string, string> = {
  male: "男",
  female: "女",
  other: "其他",
};

function CharacterAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const initial = name?.trim()?.[0];

  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        "bg-primary-soft text-primary",
      )}
    >
      {initial ? (
        <span className="text-sm font-semibold">{initial}</span>
      ) : (
        <User size={size * 0.45} aria-hidden />
      )}
    </div>
  );
}

export function CharactersPage() {
  const { currentProject } = useProjectStore();
  const {
    characters,
    currentCharacter,
    addCharacter,
    setCurrentCharacter,
    updateCharacter,
    deleteCharacter,
  } = useCharacterStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [view, setView] = useState<"list" | "graph">("list");
  const { relations } = useRelationStore();
  const [relationOpen, setRelationOpen] = useState(false);
  const [relationTarget, setRelationTarget] = useState<CharacterRelation | null>(null);
  const [relationPreset, setRelationPreset] = useState<
    { sourceId?: string; targetId?: string } | undefined
  >(undefined);

  const projectCharacters = useMemo(
    () =>
      currentProject ? characters.filter((c) => c.projectId === currentProject.id) : [],
    [characters, currentProject],
  );

  const projectRelations = useMemo(
    () => (currentProject ? relations.filter((r) => r.projectId === currentProject.id) : []),
    [relations, currentProject],
  );

  const openNewRelation = (preset?: { sourceId?: string; targetId?: string }) => {
    setRelationTarget(null);
    setRelationPreset(preset);
    setRelationOpen(true);
  };

  const openEditRelation = (r: CharacterRelation) => {
    setRelationTarget(r);
    setRelationPreset(undefined);
    setRelationOpen(true);
  };

  const handleAdd = useCallback(() => {
    if (!newName.trim() || !currentProject) return;
    addCharacter({
      projectId: currentProject.id,
      name: newName.trim(),
      aliases: [],
      gender: "",
      age: "",
      appearance: "",
      personality: "",
      background: "",
      goals: "",
      conflicts: "",
      relationships: "",
      abilities: "",
      weaknesses: "",
      notes: "",
      tags: [],
    });
    setNewName("");
    setShowAdd(false);
  }, [newName, currentProject, addCharacter]);

  const handleUpdate = useCallback(
    (updates: Partial<Character>) => {
      if (!currentCharacter) return;
      updateCharacter(currentCharacter.id, updates);
    },
    [currentCharacter, updateCharacter],
  );

  /* ---------------- 未选择项目 ---------------- */
  if (!currentProject) {
    return (
      <Page>
        <PageHeader title="人物管理" />
        <PageBody>
          <EmptyState
            icon={Users}
            title="请先选择一个项目"
            description="在编辑器中打开或创建一个项目后，即可建立人物档案。"
          />
        </PageBody>
      </Page>
    );
  }

  /* ---------------- 编辑详情 ---------------- */
  if (currentCharacter) {
    return (
      <Page>
        <PageHeader
          leading={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="返回列表"
              onClick={() => setCurrentCharacter(null)}
            >
              <ArrowLeft size={16} />
            </Button>
          }
          title={currentCharacter.name || "未命名人物"}
          description={
            [
              currentCharacter.gender ? genderLabel[currentCharacter.gender] : null,
              currentCharacter.age || null,
            ]
              .filter(Boolean)
              .join(" · ") || "人物档案"
          }
        />
        <PageBody width="reading">
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="姓名">
                <Input
                  value={currentCharacter.name}
                  onChange={(e) => handleUpdate({ name: e.target.value })}
                  placeholder="人物姓名"
                />
              </Field>
              <Field label="别名" hint="多个别名用英文逗号分隔">
                <Input
                  value={currentCharacter.aliases.join(", ")}
                  onChange={(e) =>
                    handleUpdate({
                      aliases: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="例如：凌少, 守陵人"
                />
              </Field>
              <Field label="性别">
                <Select
                  value={currentCharacter.gender}
                  onChange={(e) => handleUpdate({ gender: e.target.value })}
                >
                  <option value="">未指定</option>
                  <option value="male">男</option>
                  <option value="female">女</option>
                  <option value="other">其他</option>
                </Select>
              </Field>
              <Field label="年龄">
                <Input
                  value={currentCharacter.age}
                  onChange={(e) => handleUpdate({ age: e.target.value })}
                  placeholder="例如：24 或 二十余岁"
                />
              </Field>
            </div>

            <Field label="外貌描写">
              <Textarea
                value={currentCharacter.appearance}
                onChange={(e) => handleUpdate({ appearance: e.target.value })}
                rows={3}
                placeholder="五官、身形、衣着习惯、辨识度特征"
              />
            </Field>

            <Field label="性格特点">
              <Textarea
                value={currentCharacter.personality}
                onChange={(e) => handleUpdate({ personality: e.target.value })}
                rows={3}
                placeholder="核心性格、行为倾向、口癖"
              />
            </Field>

            <Field label="背景故事">
              <Textarea
                value={currentCharacter.background}
                onChange={(e) => handleUpdate({ background: e.target.value })}
                rows={4}
                placeholder="出身、经历、转折事件"
              />
            </Field>

            <Field label="目标动机">
              <Textarea
                value={currentCharacter.goals}
                onChange={(e) => handleUpdate({ goals: e.target.value })}
                rows={2}
                placeholder="想要什么，为什么想要"
              />
            </Field>

            <Field label="冲突矛盾">
              <Textarea
                value={currentCharacter.conflicts}
                onChange={(e) => handleUpdate({ conflicts: e.target.value })}
                rows={2}
                placeholder="内在矛盾与外在阻力"
              />
            </Field>

            {/* 结构化关系 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink">关系</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openNewRelation({ sourceId: currentCharacter.id })}
                >
                  <Plus size={14} />
                  添加关系
                </Button>
              </div>
              {projectRelations.filter(
                (r) =>
                  r.sourceId === currentCharacter.id || r.targetId === currentCharacter.id,
              ).length === 0 ? (
                <p className="rounded-xl border border-dashed border-line px-4 py-3 text-[13px] text-ink-3">
                  暂无结构化关系。可点上方按钮添加，或到「关系图谱」中拖线创建。
                </p>
              ) : (
                <div className="group/rel divide-y divide-line rounded-xl border border-line">
                  {projectRelations
                    .filter(
                      (r) =>
                        r.sourceId === currentCharacter.id ||
                        r.targetId === currentCharacter.id,
                    )
                    .map((r) => {
                      const isSource = r.sourceId === currentCharacter.id;
                      const otherId = isSource ? r.targetId : r.sourceId;
                      const other = characters.find((c) => c.id === otherId);
                      const tMeta = relationTypes.find((t) => t.value === r.type);
                      const color =
                        (
                          {
                            family: "#22a06b",
                            friend: "#3b82f6",
                            enemy: "#ef4444",
                            lover: "#ec4899",
                            master: "#8b5cf6",
                            rival: "#f59e0b",
                            ally: "#14b8a6",
                            colleague: "#64748b",
                            other: "#94a3b8",
                          } as Record<string, string>
                        )[r.type] ?? "#94a3b8";
                      return (
                        <div key={r.id} className="flex items-center gap-2 px-3 py-2 text-[13px]">
                          <span
                            className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
                            style={{ background: `${color}1f`, color }}
                          >
                            {tMeta?.label ?? "关系"}
                          </span>
                          <span className="text-ink-3">{isSource ? "→" : "←"}</span>
                          <button
                            type="button"
                            disabled={!other}
                            onClick={() => other && setCurrentCharacter(other)}
                            className="max-w-32 truncate font-medium text-ink hover:text-primary hover:underline disabled:no-underline"
                          >
                            {other?.name || "已删除人物"}
                          </button>
                          {r.label && <span className="shrink-0 text-ink-2">（{r.label}）</span>}
                          <span className="min-w-0 flex-1 truncate text-ink-3">
                            {r.description}
                          </span>
                          <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover/rel:opacity-100 focus-within:opacity-100">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[12px]"
                              onClick={() => openEditRelation(r)}
                            >
                              编辑
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[12px] text-danger hover:bg-danger-soft hover:text-danger"
                              onClick={() => useRelationStore.getState().deleteRelation(r.id)}
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <Field label="人际关系（文本备注）">
              <Textarea
                value={currentCharacter.relationships}
                onChange={(e) => handleUpdate({ relationships: e.target.value })}
                rows={3}
                placeholder="自由文本形式的关系备注，与上方结构化关系并存"
              />
            </Field>

            <Field label="能力特长">
              <Textarea
                value={(currentCharacter as any).abilities || ""}
                onChange={(e) => handleUpdate({ abilities: e.target.value } as any)}
                rows={2}
                placeholder="特殊能力、技能、天赋"
              />
            </Field>

            <Field label="弱点缺陷">
              <Textarea
                value={(currentCharacter as any).weaknesses || ""}
                onChange={(e) => handleUpdate({ weaknesses: e.target.value } as any)}
                rows={2}
                placeholder="性格缺陷、身体弱点、心理阴影"
              />
            </Field>

            <Field label="标签" hint="多个标签用英文逗号分隔">
              <Input
                value={currentCharacter.tags.join(", ")}
                onChange={(e) =>
                  handleUpdate({
                    tags: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="例如：主角, 反派, 喜剧角色"
              />
            </Field>

            <Field label="备注">
              <Textarea
                value={currentCharacter.notes}
                onChange={(e) => handleUpdate({ notes: e.target.value })}
                rows={2}
                placeholder="其他备注信息"
              />
            </Field>
          </div>
        </PageBody>

        <RelationDialog
          open={relationOpen}
          onOpenChange={setRelationOpen}
          projectId={currentProject.id}
          characters={projectCharacters}
          relation={relationTarget}
          preset={relationPreset}
        />
      </Page>
    );
  }

  /* ---------------- 列表 ---------------- */
  return (
    <Page>
      <PageHeader
        title="人物管理"
        description={`共 ${projectCharacters.length} 位人物`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => openNewRelation()}>
              <Link2 size={15} />
              新建关系
            </Button>
            <Button variant="secondary" onClick={() => setAiOpen(true)}>
              <Sparkles size={15} />
              AI 创建
            </Button>
            <Button variant="primary" onClick={() => setShowAdd(true)}>
              <Plus size={15} />
              添加人物
            </Button>
          </div>
        }
      />

      <PageBody>
        <div className="space-y-4">
          <SegmentedControl
            variant="segment"
            value={view}
            onChange={setView}
            items={[
              { value: "list", label: "人物列表", icon: Users },
              { value: "graph", label: "关系图谱", icon: Network },
            ]}
          />

          {view === "graph" ? (
            <EmptyState
              icon={Network}
              title="关系图谱建设中"
              description="下个迭代将支持画布查看与拖线编辑人物关系。"
              className="py-16"
            />
          ) : (
            <>
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
                placeholder="输入人物姓名，回车创建"
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

          {projectCharacters.length === 0 ? (
            <EmptyState
              icon={Users}
              title="还没有人物"
              description="为每个角色建立档案，写作时随时核对性格与关系。"
              action={
                <Button variant="primary" onClick={() => setShowAdd(true)}>
                  <Plus size={15} />
                  创建第一个人物
                </Button>
              }
              className="py-16"
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {projectCharacters.map((character) => (
                <Card
                  key={character.id}
                  interactive
                  className="group relative"
                  onClick={() => setCurrentCharacter(character)}
                >
                  <div className="flex items-start gap-3">
                    <CharacterAvatar name={character.name} />
                    <div className="min-w-0 flex-1 pr-6">
                      <h3 className="truncate text-sm font-medium text-ink">
                        {character.name || "未命名人物"}
                      </h3>
                      <p className="mt-0.5 text-[12px] text-ink-3">
                        {[
                          character.gender ? genderLabel[character.gender] : null,
                          character.age || null,
                          character.aliases.length > 0
                            ? `${character.aliases.length} 个别名`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "尚未补充信息"}
                      </p>
                    </div>
                  </div>

                  {character.personality && (
                    <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-ink-2">
                      {character.personality}
                    </p>
                  )}

                  {character.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {character.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="primary" size="sm">
                          {tag}
                        </Badge>
                      ))}
                      {character.tags.length > 3 && (
                        <Badge variant="outline" size="sm">
                          +{character.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`删除 ${character.name || "未命名人物"}`}
                    className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-danger-soft hover:text-danger focus-visible:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCharacter(character.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </Card>
              ))}
            </div>
          )}
            </>
          )}
        </div>
      </PageBody>

      <RelationDialog
        open={relationOpen}
        onOpenChange={setRelationOpen}
        projectId={currentProject.id}
        characters={projectCharacters}
        relation={relationTarget}
        preset={relationPreset}
      />

      <AICreateDialog
        kind="character"
        open={aiOpen}
        onOpenChange={setAiOpen}
        project={currentProject}
        existingNames={projectCharacters.map((c) => c.name)}
        onCreated={(data) => {
          addCharacter({ projectId: currentProject.id, ...data });
          setAiOpen(false);
        }}
      />
    </Page>
  );
}
