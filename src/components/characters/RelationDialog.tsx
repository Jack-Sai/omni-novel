import { useEffect, useState } from "react";
import { Link2, Trash2 } from "lucide-react";
import { Button, Dialog, Field, Input, Select, Textarea } from "../ui";
import type { Character } from "../../stores/characterStore";
import {
  relationTypes,
  useRelationStore,
  type CharacterRelation,
  type RelationType,
} from "../../stores/relationStore";

export interface RelationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  characters: Character[];
  /** 编辑模式传入现有关系，创建模式传 null */
  relation: CharacterRelation | null;
  /** 创建时的预填（如图谱拖线带出的两端） */
  preset?: { sourceId?: string; targetId?: string };
}

export function RelationDialog({
  open,
  onOpenChange,
  projectId,
  characters,
  relation,
  preset,
}: RelationDialogProps) {
  const { addRelation, updateRelation, deleteRelation } = useRelationStore();
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [type, setType] = useState<RelationType>("friend");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [directed, setDirected] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 打开时从 relation / preset 初始化
  useEffect(() => {
    if (!open) return;
    setError(null);
    setConfirmDelete(false);
    if (relation) {
      setSourceId(relation.sourceId);
      setTargetId(relation.targetId);
      setType(relation.type);
      setLabel(relation.label);
      setDescription(relation.description);
      setDirected(relation.directed);
    } else {
      setSourceId(preset?.sourceId ?? "");
      setTargetId(preset?.targetId ?? "");
      setType("friend");
      setLabel("");
      setDescription("");
      setDirected(true);
    }
  }, [open, relation, preset?.sourceId, preset?.targetId]);

  const nameOf = (id: string) => characters.find((c) => c.id === id)?.name || "未命名";
  const typeLabel = relationTypes.find((t) => t.value === type)?.label ?? "其他";

  const handleSave = () => {
    if (!sourceId || !targetId) {
      setError("请选择关系两端的人物");
      return;
    }
    if (sourceId === targetId) {
      setError("关系两端不能是同一个人物");
      return;
    }
    const payload = { sourceId, targetId, type, label: label.trim(), description: description.trim(), directed };
    if (relation) {
      updateRelation(relation.id, payload);
    } else {
      const added = addRelation({ projectId, ...payload });
      if (!added) {
        setError("已存在相同的关系（同类型、同两端）");
        return;
      }
    }
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!relation) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteRelation(relation.id);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={relation ? "编辑关系" : "添加关系"}
      description="结构化的人物关系会展示在人物档案与关系图谱中"
      icon={Link2}
      footer={
        <>
          {relation && (
            <Button
              variant="ghost"
              className="mr-auto text-danger hover:bg-danger-soft hover:text-danger"
              onClick={handleDelete}
            >
              <Trash2 size={14} />
              {confirmDelete ? "确认删除？" : "删除"}
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!sourceId || !targetId}
          >
            保存
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <Field label="人物 A">
            <Select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
              <option value="">请选择</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || "未命名人物"}
                </option>
              ))}
            </Select>
          </Field>
          <div className="hidden pb-2.5 text-center text-[13px] text-ink-3 sm:block">
            {directed ? "→" : "—"}
          </div>
          <Field label="人物 B">
            <Select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              <option value="">请选择</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || "未命名人物"}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="关系类型">
            <Select value={type} onChange={(e) => setType(e.target.value as RelationType)}>
              {relationTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="关系标签" hint="如：父女、宿敌；留空则显示类型名">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={`${nameOf(sourceId) || "A"} 与 ${nameOf(targetId) || "B"} 的${typeLabel}`}
            />
          </Field>
        </div>

        <Field label="关系描述">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="这段关系的来龙去脉、变化与张力"
          />
        </Field>

        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-2">
          <input
            type="checkbox"
            checked={directed}
            onChange={(e) => setDirected(e.target.checked)}
            className="h-4 w-4 rounded border-line accent-[var(--app-primary,#4f6ef7)]"
          />
          有向关系（A → B 单向指向；不勾选为双向/无向）
        </label>

        {error && <p className="text-[13px] text-danger">{error}</p>}
      </div>
    </Dialog>
  );
}
