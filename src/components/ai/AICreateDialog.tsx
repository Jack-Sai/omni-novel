import { useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button, Dialog, Field, Select, Textarea } from "../ui";
import type { Project } from "../../stores/projectStore";
import { worldviewTypes, type WorldviewType } from "../../stores/worldviewStore";
import {
  generateCharacter,
  generateForeshadowing,
  generateWorldviewItem,
  type GenerateKind,
  type NewCharacter,
  type NewForeshadowing,
  type NewWorldviewItem,
} from "../../services/aiGenerate";

export type AICreateData<K extends GenerateKind> = K extends "character"
  ? NewCharacter
  : K extends "worldview"
    ? NewWorldviewItem
    : NewForeshadowing;

export interface AICreateDialogProps<K extends GenerateKind> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: K;
  project: Project;
  existingNames: string[];
  onCreated: (data: AICreateData<K>) => void;
}

const genderLabel: Record<string, string> = { male: "男", female: "女", other: "其他" };
const importanceLabel: Record<string, string> = { low: "低", medium: "中", high: "高" };

const kindMeta: Record<
  GenerateKind,
  { title: string; description: string; placeholder: string }
> = {
  character: {
    title: "AI 创建人物",
    description: "描述你想要的角色，AI 生成完整档案供你确认",
    placeholder:
      "例：一位背负家族诅咒的年轻剑客，表面冷漠内心重情，擅长用剑却惧怕杀戮……（越具体越贴合）",
  },
  worldview: {
    title: "AI 创建世界观设定",
    description: "描述设定的要点，AI 生成条目供你确认",
    placeholder: "例：大陆东部的海上贸易城邦，由七大家族轮值执政，禁止魔法物品交易……",
  },
  foreshadowing: {
    title: "AI 创建伏笔",
    description: "描述伏笔的线索与走向，AI 生成条目供你确认",
    placeholder: "例：主角每次梦中出现的红色月亮，与三年前的灭村之夜有关，中后期回收……",
  },
};

function previewEntries(
  kind: GenerateKind,
  data: NewCharacter | NewWorldviewItem | NewForeshadowing,
): [string, string][] {
  const entries: [string, string][] = [];
  const push = (label: string, value: unknown) => {
    if (Array.isArray(value)) {
      if (value.length) entries.push([label, value.join("、")]);
    } else if (typeof value === "string" && value.trim()) {
      entries.push([label, value.trim()]);
    }
  };

  if (kind === "character") {
    const d = data as NewCharacter;
    push("别名", d.aliases);
    push("性别", genderLabel[d.gender] ?? d.gender);
    push("年龄", d.age);
    push("外貌", d.appearance);
    push("性格", d.personality);
    push("背景", d.background);
    push("目标", d.goals);
    push("冲突", d.conflicts);
    push("关系", d.relationships);
    push("能力", d.abilities);
    push("弱点", d.weaknesses);
    push("备注", d.notes);
    push("标签", d.tags);
  } else if (kind === "worldview") {
    const d = data as NewWorldviewItem;
    push("类型", worldviewTypes.find((t) => t.value === d.type)?.label ?? d.type);
    push("概要", d.description);
    push("详细", d.details);
    push("关联", d.relationships);
    push("备注", d.notes);
    push("标签", d.tags);
  } else {
    const d = data as NewForeshadowing;
    push("内容", d.description);
    push("重要度", importanceLabel[d.importance] ?? d.importance);
    push("埋设章节", d.plantedChapter);
    push("埋设方式", d.plantedContent);
    push("回收章节", d.revealChapter);
    push("回收方式", d.revealContent);
    push("相关人物", d.relatedCharacters);
    push("备注", d.notes);
  }
  return entries;
}

export function AICreateDialog<K extends GenerateKind>({
  open,
  onOpenChange,
  kind,
  project,
  existingNames,
  onCreated,
}: AICreateDialogProps<K>) {
  const meta = kindMeta[kind];
  const [requirement, setRequirement] = useState("");
  const [selectedType, setSelectedType] = useState<WorldviewType | "">("");
  const [selectedImportance, setSelectedImportance] = useState<"low" | "medium" | "high" | "">(
    "",
  );
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AICreateData<K> | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPreview(null);
      setError(null);
      setGenerating(false);
    }
    onOpenChange(next);
  };

  const handleGenerate = async () => {
    const req = requirement.trim();
    if (!req || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const base = {
        requirement: req,
        projectTitle: project.title,
        projectGenre: project.genre,
        projectSummary: project.synopsis,
        existingNames,
        worldviewType: kind === "worldview" ? selectedType : "",
        importance: kind === "foreshadowing" ? selectedImportance : "",
      };
      const data =
        kind === "character"
          ? await generateCharacter(base)
          : kind === "worldview"
            ? await generateWorldviewItem(base)
            : await generateForeshadowing(base);
      if (!data) {
        setError("模型返回内容无法解析，请调整描述后重试。");
        return;
      }
      setPreview(data as AICreateData<K>);
    } catch (e) {
      setError(`生成失败：${String(e)}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleCreate = () => {
    if (!preview) return;
    onCreated(preview);
    handleOpenChange(false);
  };

  const entries = preview ? previewEntries(kind, preview) : [];
  const headline = preview
    ? ((preview as NewCharacter | NewWorldviewItem | NewForeshadowing).name ?? "")
    : "";

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title={meta.title}
      description={meta.description}
      icon={Sparkles}
      size="lg"
      footer={
        preview ? (
          <>
            <Button variant="ghost" onClick={handleGenerate} disabled={generating}>
              <RefreshCw size={14} />
              重新生成
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              创建
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => handleOpenChange(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={!requirement.trim() || generating}
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {generating ? "生成中…" : "生成"}
            </Button>
          </>
        )
      }
    >
      {preview ? (
        <div className="space-y-3">
          <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-line">
            <div className="border-b border-line bg-subtle px-4 py-3">
              <p className="text-sm font-semibold text-ink">{headline}</p>
            </div>
            <dl className="divide-y divide-line px-4">
              {entries.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[5rem_1fr] gap-3 py-2.5">
                  <dt className="text-[12px] leading-5 text-ink-3">{label}</dt>
                  <dd className="whitespace-pre-wrap text-[13px] leading-5 text-ink-2">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          {error && <p className="text-[13px] text-danger">{error}</p>}
          <p className="text-[12px] text-ink-3">
            确认无误后点击「创建」，条目会直接进入列表，之后可继续编辑。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {kind === "worldview" && (
            <Field label="类型" hint="留空 = 由 AI 根据描述自动判断">
              <Select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as WorldviewType | "")}
              >
                <option value="">自动判断</option>
                {worldviewTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {kind === "foreshadowing" && (
            <Field label="重要度" hint="留空 = 由 AI 根据描述自动判断">
              <Select
                value={selectedImportance}
                onChange={(e) =>
                  setSelectedImportance(e.target.value as "low" | "medium" | "high" | "")
                }
              >
                <option value="">自动判断</option>
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </Select>
            </Field>
          )}
          <Field label="需求描述" hint="生成结果不满意时可调整描述重试">
            <Textarea
              autoFocus
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleGenerate();
              }}
              rows={5}
              placeholder={meta.placeholder}
            />
          </Field>
          {error && <p className="text-[13px] text-danger">{error}</p>}
          {generating && (
            <p className="text-[13px] text-ink-3">正在生成，依模型不同可能需要 10~60 秒…</p>
          )}
        </div>
      )}
    </Dialog>
  );
}
