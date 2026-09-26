import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useProjectStore } from "../stores/projectStore";
import { useChapterStore, Chapter, ChapterStatus } from "../stores/chapterStore";
import { useVolumeStore, Volume } from "../stores/volumeStore";
import { deleteChapterCascade } from "../lib/chapterActions";
import { htmlWordCount } from "../lib/text";
import { cn } from "../lib/cn";
import {
  Badge,
  type BadgeVariant,
  Button,
  Card,
  EmptyState,
  Input,
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuTrigger,
  Page,
  PageBody,
  PageHeader,
} from "../components/ui";

const statusOrder: ChapterStatus[] = ["draft", "writing", "completed"];
const statusMeta: Record<ChapterStatus, { label: string; tone: BadgeVariant }> = {
  draft: { label: "草稿", tone: "neutral" },
  writing: { label: "写作中", tone: "primary" },
  completed: { label: "已完成", tone: "success" },
};

type DropTarget =
  | { kind: "row"; beforeChapterId: string }
  | { kind: "volume-end"; volumeId: string | null };

export function ChaptersPage() {
  const navigate = useNavigate();
  const { currentProject } = useProjectStore();
  const { chapters, addChapter, updateChapter, reorderChapters } = useChapterStore();
  const { volumes, addVolume, updateVolume, deleteVolume } = useVolumeStore();

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [showAddVolume, setShowAddVolume] = useState(false);
  const [newVolumeTitle, setNewVolumeTitle] = useState("");
  /** 正在加章的卷 id；"none" = 未分卷组 */
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  /** 正在 inline 改名的目标：`v:{id}` / `c:{id}` */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [dragChapterId, setDragChapterId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const projectVolumes = useMemo(
    () =>
      currentProject
        ? volumes
            .filter((v) => v.projectId === currentProject.id)
            .sort((a, b) => a.order - b.order)
        : [],
    [volumes, currentProject],
  );

  const projectChapters = useMemo(
    () =>
      currentProject
        ? chapters
            .filter((c) => c.projectId === currentProject.id)
            .sort((a, b) => a.order - b.order)
        : [],
    [chapters, currentProject],
  );

  const chaptersByVolume = useMemo(() => {
    const map = new Map<string | null, Chapter[]>();
    for (const c of projectChapters) {
      const key = c.volumeId;
      const list = map.get(key);
      if (list) list.push(c);
      else map.set(key, [c]);
    }
    return map;
  }, [projectChapters]);

  const unassigned = chaptersByVolume.get(null) ?? [];
  const totalWords = useMemo(
    () => projectChapters.reduce((sum, c) => sum + htmlWordCount(c.content), 0),
    [projectChapters],
  );

  /** 当前显示顺序拍平为全局 chapterIds（拖拽重排用） */
  const flatIds = useCallback(() => {
    const ids: string[] = [];
    for (const v of projectVolumes) {
      for (const c of chaptersByVolume.get(v.id) ?? []) ids.push(c.id);
    }
    for (const c of unassigned) ids.push(c.id);
    return ids;
  }, [projectVolumes, chaptersByVolume, unassigned]);

  const chapterById = useCallback(
    (id: string) => projectChapters.find((c) => c.id === id),
    [projectChapters],
  );

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAddVolume = useCallback(() => {
    const title = newVolumeTitle.trim();
    if (!title || !currentProject) return;
    addVolume({
      projectId: currentProject.id,
      title,
      description: "",
      order: volumes.filter((v) => v.projectId === currentProject.id).length,
    });
    setNewVolumeTitle("");
    setShowAddVolume(false);
  }, [newVolumeTitle, currentProject, addVolume, volumes]);

  const handleDeleteVolume = useCallback(
    (volume: Volume) => {
      if (!window.confirm(`删除卷《${volume.title}》？卷内章节将变为未分卷（正文保留）`)) {
        return;
      }
      const volChapters = chaptersByVolume.get(volume.id) ?? [];
      for (const c of volChapters) {
        updateChapter(c.id, { volumeId: null });
      }
      deleteVolume(volume.id);
    },
    [chaptersByVolume, updateChapter, deleteVolume],
  );

  const handleAddChapter = useCallback(
    (volumeId: string | null) => {
      const title = newChapterTitle.trim();
      if (!title || !currentProject) return;
      addChapter({
        projectId: currentProject.id,
        volumeId,
        title,
        content: "",
        summary: "",
        status: "draft",
        order: projectChapters.reduce((max, c) => Math.max(max, c.order), -1) + 1,
      });
      setNewChapterTitle("");
      setAddingIn(null);
    },
    [newChapterTitle, currentProject, addChapter, projectChapters],
  );

  const handleOpenChapter = useCallback(
    (chapter: Chapter) => {
      useChapterStore.getState().setCurrentChapter(chapter);
      void navigate("/editor");
    },
    [navigate],
  );

  const handleCycleStatus = useCallback(
    (chapter: Chapter) => {
      const idx = statusOrder.indexOf(chapter.status);
      const next = statusOrder[(idx + 1) % statusOrder.length];
      updateChapter(chapter.id, { status: next });
    },
    [updateChapter],
  );

  const beginEdit = useCallback((key: string, value: string) => {
    setEditingId(key);
    setEditText(value);
  }, []);

  const commitEdit = useCallback(() => {
    if (!editingId) return;
    const text = editText.trim();
    if (text) {
      const [kind, id] = editingId.split(":");
      if (kind === "v") updateVolume(id, { title: text });
      else if (kind === "c") updateChapter(id, { title: text });
    }
    setEditingId(null);
  }, [editingId, editText, updateVolume, updateChapter]);

  /** 把章移动到目标位置并重排全局顺序 */
  const moveChapter = useCallback(
    (chapterId: string, target: DropTarget) => {
      const chapter = chapterById(chapterId);
      if (!chapter || !currentProject) return;
      const ids = flatIds().filter((id) => id !== chapterId);

      let insertAt: number;
      if (target.kind === "row") {
        insertAt = ids.indexOf(target.beforeChapterId);
        if (insertAt < 0) insertAt = ids.length;
      } else {
        const volChapters = ids.filter((id) => chapterById(id)?.volumeId === target.volumeId);
        if (volChapters.length) {
          insertAt = ids.indexOf(volChapters[volChapters.length - 1]) + 1;
        } else {
          // 空卷：放到该卷之后第一个有章的卷的首章前；其后无章则放末尾
          const volIdx = projectVolumes.findIndex((v) => v.id === target.volumeId);
          insertAt = ids.length;
          if (volIdx >= 0) {
            for (const v of projectVolumes.slice(volIdx + 1)) {
              const first = (chaptersByVolume.get(v.id) ?? [])[0];
              const i = first ? ids.indexOf(first.id) : -1;
              if (i >= 0) {
                insertAt = i;
                break;
              }
            }
          }
        }
      }

      ids.splice(insertAt, 0, chapterId);

      // 目标卷 = 落点行所属卷，或 volume-end 的卷
      let targetVolumeId: string | null;
      if (target.kind === "row") {
        targetVolumeId = chapterById(target.beforeChapterId)?.volumeId ?? chapter.volumeId;
      } else {
        targetVolumeId = target.volumeId;
      }
      if (chapter.volumeId !== targetVolumeId) {
        updateChapter(chapterId, { volumeId: targetVolumeId });
      }
      reorderChapters(currentProject.id, ids);
    },
    [chapterById, currentProject, flatIds, projectVolumes, chaptersByVolume, updateChapter, reorderChapters],
  );

  const renderAddChapterInput = (volumeId: string | null) => (
    <div className="px-3 pb-2 pt-1">
      <Input
        autoFocus
        inputSize="sm"
        value={newChapterTitle}
        onChange={(e) => setNewChapterTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAddChapter(volumeId);
          if (e.key === "Escape") {
            setNewChapterTitle("");
            setAddingIn(null);
          }
        }}
        onBlur={() => {
          if (newChapterTitle.trim()) handleAddChapter(volumeId);
          else setAddingIn(null);
        }}
        placeholder="输入章节标题，回车创建"
      />
    </div>
  );

  const renderChapterRow = (chapter: Chapter, index: number, indent: boolean) => {
    const editing = editingId === `c:${chapter.id}`;
    const isDragging = dragChapterId === chapter.id;
    const beforeTarget = dropTarget?.kind === "row" && dropTarget.beforeChapterId === chapter.id;

    return (
      <div key={chapter.id}>
        {beforeTarget && <div className="mx-3 h-0.5 rounded bg-primary" />}
        <div
          draggable={!editing}
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", chapter.id);
            e.dataTransfer.effectAllowed = "move";
            setDragChapterId(chapter.id);
          }}
          onDragEnd={() => {
            setDragChapterId(null);
            setDropTarget(null);
          }}
          onDragOver={(e) => {
            if (!dragChapterId || dragChapterId === chapter.id) return;
            e.preventDefault();
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const before = e.clientY < rect.top + rect.height / 2;
            if (before) {
              setDropTarget({ kind: "row", beforeChapterId: chapter.id });
            } else {
              const next = nextRowId(chapter);
              setDropTarget(
                next
                  ? { kind: "row", beforeChapterId: next }
                  : { kind: "volume-end", volumeId: chapter.volumeId },
              );
            }
          }}
          onDrop={(e) => {
            if (!dragChapterId) return;
            e.preventDefault();
            e.stopPropagation();
            const id = dragChapterId;
            const target = dropTarget;
            setDragChapterId(null);
            setDropTarget(null);
            if (target) moveChapter(id, target);
          }}
          className={cn(
            "group/chapter flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
            isDragging ? "opacity-40" : "hover:bg-hover",
            indent && "pl-6",
          )}
        >
          <span className="w-5 shrink-0 cursor-grab text-right text-[12px] tabular-nums text-ink-3">
            {index + 1}
          </span>

          {editing ? (
            <Input
              autoFocus
              inputSize="sm"
              className="flex-1"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") setEditingId(null);
              }}
              onBlur={commitEdit}
            />
          ) : (
            <button
              type="button"
              onClick={() => handleOpenChapter(chapter)}
              title={chapter.summary || chapter.title}
              className="min-w-0 flex-1 truncate text-left text-[13px] text-ink-2 hover:text-ink"
            >
              {chapter.title}
            </button>
          )}

          <span className="shrink-0 text-[11px] tabular-nums text-ink-3">
            {htmlWordCount(chapter.content)}
          </span>

          <button
            type="button"
            title="点击切换状态"
            onClick={() => handleCycleStatus(chapter)}
            className="shrink-0"
          >
            <Badge variant={statusMeta[chapter.status].tone} size="sm">
              {statusMeta[chapter.status].label}
            </Badge>
          </button>

          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/chapter:opacity-100 focus-within:opacity-100">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`重命名 ${chapter.title}`}
              className="h-6 w-6"
              onClick={() => beginEdit(`c:${chapter.id}`, chapter.title)}
            >
              <Pencil size={12} />
            </Button>
            <Menu>
              <MenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`移动 ${chapter.title}`}
                  className="h-6 w-6 text-[11px]"
                  title="移动到卷"
                >
                  移
                </Button>
              </MenuTrigger>
              <MenuContent align="end">
                <MenuLabel>移动到</MenuLabel>
                {projectVolumes
                  .filter((v) => v.id !== chapter.volumeId)
                  .map((v) => (
                    <MenuItem
                      key={v.id}
                      onSelect={() => moveChapter(chapter.id, { kind: "volume-end", volumeId: v.id })}
                    >
                      {v.title}
                    </MenuItem>
                  ))}
                {chapter.volumeId !== null && (
                  <MenuItem
                    onSelect={() =>
                      moveChapter(chapter.id, { kind: "volume-end", volumeId: null })
                    }
                  >
                    未分卷
                  </MenuItem>
                )}
              </MenuContent>
            </Menu>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`删除 ${chapter.title}`}
              className="h-6 w-6 hover:bg-danger-soft hover:text-danger"
              onClick={() => {
                if (window.confirm(`删除章节《${chapter.title}》？正文与版本记录一并删除`)) {
                  void deleteChapterCascade(currentProject!.id, chapter.id);
                }
              }}
            >
              <Trash2 size={12} />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  /** 行级 drop 的下一行（用于放本行之后） */
  function nextRowId(chapter: Chapter): string | null {
    const siblings =
      chapter.volumeId === null
        ? unassigned
        : (chaptersByVolume.get(chapter.volumeId) ?? []);
    const idx = siblings.findIndex((c) => c.id === chapter.id);
    return idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1].id : null;
  }

  if (!currentProject) {
    return (
      <Page>
        <PageHeader title="章节" description="先在书架打开一个项目" />
      </Page>
    );
  }

  const isEmpty = projectVolumes.length === 0 && projectChapters.length === 0;

  return (
    <Page>
      <PageHeader
        title="章节"
        description={`${projectVolumes.length} 卷 · ${projectChapters.length} 章 · ${totalWords.toLocaleString()} 字`}
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowAddVolume(true)}>
            <Plus size={14} />
            新建卷
          </Button>
        }
      />
      <PageBody>
        {isEmpty ? (
          <EmptyState
            icon={BookOpen}
            title="还没有卷和章节"
            description="长篇通常按卷组织；短篇可以直接开始创建章节。"
            action={
              <Button variant="primary" onClick={() => setShowAddVolume(true)}>
                <Plus size={14} />
                新建第一卷
              </Button>
            }
            className="py-16"
          />
        ) : (
          <div className="space-y-4">
            {showAddVolume && (
              <div className="omni-pop flex items-center gap-2">
                <Input
                  autoFocus
                  inputSize="sm"
                  value={newVolumeTitle}
                  onChange={(e) => setNewVolumeTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddVolume();
                    if (e.key === "Escape") setShowAddVolume(false);
                  }}
                  placeholder="输入卷名，回车创建"
                  className="max-w-72"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddVolume}
                  disabled={!newVolumeTitle.trim()}
                >
                  创建
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowAddVolume(false)}>
                  取消
                </Button>
              </div>
            )}

            {projectVolumes.map((volume) => {
              const isOpen = !collapsed.has(volume.id);
              const volChapters = chaptersByVolume.get(volume.id) ?? [];
              const volWords = volChapters.reduce((s, c) => s + htmlWordCount(c.content), 0);
              const editing = editingId === `v:${volume.id}`;
              const isDropEnd =
                dropTarget?.kind === "volume-end" && dropTarget.volumeId === volume.id;

              return (
                <Card
                  key={volume.id}
                  padded={false}
                  className={cn("overflow-hidden", isDropEnd && "ring-2 ring-primary")}
                  onDragOver={(e) => {
                    if (!dragChapterId) return;
                    e.preventDefault();
                    setDropTarget({ kind: "volume-end", volumeId: volume.id });
                  }}
                  onDrop={(e) => {
                    if (!dragChapterId) return;
                    e.preventDefault();
                    const id = dragChapterId;
                    setDragChapterId(null);
                    setDropTarget(null);
                    moveChapter(id, { kind: "volume-end", volumeId: volume.id });
                  }}
                >
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <button
                      type="button"
                      aria-label={isOpen ? "折叠" : "展开"}
                      aria-expanded={isOpen}
                      onClick={() => toggleCollapse(volume.id)}
                      className="rounded p-0.5 text-ink-3 hover:text-ink"
                    >
                      {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>

                    {editing ? (
                      <Input
                        autoFocus
                        inputSize="sm"
                        className="max-w-56"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        onBlur={commitEdit}
                      />
                    ) : (
                      <span
                        className="cursor-text truncate text-sm font-medium text-ink"
                        onDoubleClick={() => beginEdit(`v:${volume.id}`, volume.title)}
                        title="双击重命名"
                      >
                        {volume.title}
                      </span>
                    )}

                    <span className="shrink-0 text-[12px] tabular-nums text-ink-3">
                      {volChapters.length} 章 · {volWords.toLocaleString()} 字
                    </span>

                    <div className="ml-auto flex shrink-0 items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="向卷内添加章节"
                        onClick={() => {
                          setAddingIn(volume.id);
                          setNewChapterTitle("");
                        }}
                      >
                        <Plus size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="重命名卷"
                        onClick={() => beginEdit(`v:${volume.id}`, volume.title)}
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="删除卷"
                        className="hover:bg-danger-soft hover:text-danger"
                        onClick={() => handleDeleteVolume(volume)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>

                  {addingIn === volume.id && renderAddChapterInput(volume.id)}

                  {isOpen && (
                    <div className="border-t border-line px-2 py-2">
                      {volChapters.length === 0 && addingIn !== volume.id ? (
                        <p className="px-2 py-3 text-center text-[12px] text-ink-3">
                          卷内暂无章节，点击 + 添加
                        </p>
                      ) : (
                        volChapters.map((c, i) => renderChapterRow(c, i, false))
                      )}
                    </div>
                  )}
                </Card>
              );
            })}

            {(unassigned.length > 0 || projectVolumes.length === 0) && (
              <Card padded={false} className="overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <FileText size={15} className="text-ink-3" aria-hidden />
                  <span className="text-sm font-medium text-ink">未分卷</span>
                  <span className="text-[12px] tabular-nums text-ink-3">
                    {unassigned.length} 章
                  </span>
                  <div className="ml-auto">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="添加章节到未分卷"
                      onClick={() => {
                        setAddingIn("none");
                        setNewChapterTitle("");
                      }}
                    >
                      <Plus size={13} />
                    </Button>
                  </div>
                </div>
                <div className="border-t border-line px-2 py-2">
                  {unassigned.length === 0 && addingIn !== "none" ? (
                    <p className="px-2 py-3 text-center text-[12px] text-ink-3">
                      所有章节都已归卷，可将章节拖入上方卷中
                    </p>
                  ) : (
                    unassigned.map((c, i) => renderChapterRow(c, i, false))
                  )}
                </div>
                {addingIn === "none" && renderAddChapterInput(null)}
              </Card>
            )}
          </div>
        )}
      </PageBody>
    </Page>
  );
}
