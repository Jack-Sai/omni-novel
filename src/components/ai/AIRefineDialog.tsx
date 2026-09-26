import { useState } from "react";
import { Loader2, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { Button, Dialog, Field, Textarea } from "../ui";
import type { Project } from "../../stores/projectStore";
import type { Character } from "../../stores/characterStore";
import { refineCharacter, type NewCharacter } from "../../services/aiGenerate";

export interface AIRefineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  character: Character;
  siblingNames?: string[];
  onApply: (updated: NewCharacter) => void;
}

const genderLabel: Record<string, string> = { male: "男", female: "女", other: "其他" };

const refineFields: { key: keyof NewCharacter; label: string }[] = [
  { key: "name", label: "姓名" },
  { key: "aliases", label: "别名" },
  { key: "gender", label: "性别" },
  { key: "age", label: "年龄" },
  { key: "appearance", label: "外貌" },
  { key: "personality", label: "性格" },
  { key: "background", label: "背景" },
  { key: "goals", label: "目标" },
  { key: "conflicts", label: "冲突" },
  { key: "relationships", label: "关系" },
  { key: "abilities", label: "能力" },
  { key: "weaknesses", label: "弱点" },
  { key: "notes", label: "备注" },
  { key: "tags", label: "标签" },
];

function fmt(key: keyof NewCharacter, v: unknown): string {
  if (Array.isArray(v)) return v.join("、");
  if (typeof v === "string") {
    if (key === "gender") return genderLabel[v] ?? v;
    return v;
  }
  return v == null ? "" : String(v);
}

export function AIRefineDialog({
  open,
  onOpenChange,
  project,
  character,
  siblingNames,
  onApply,
}: AIRefineDialogProps) {
  const [requirement, setRequirement] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refined, setRefined] = useState<NewCharacter | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setRefined(null);
      setError(null);
      setGenerating(false);
    }
    onOpenChange(next);
  };

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const data = await refineCharacter(character, {
        projectTitle: project.title,
        projectGenre: project.genre,
        projectSummary: project.synopsis,
        siblingNames,
        requirement,
      });
      if (!data) {
        setError("模型返回内容无法解析，请重试或调整需求描述。");
        return;
      }
      setRefined(data);
    } catch (e) {
      setError(`生成失败：${String(e)}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = () => {
    if (!refined) return;
    onApply(refined);
    handleOpenChange(false);
  };

  const changed = refined
    ? refineFields.filter(
        (f) => fmt(f.key, character[f.key]) !== fmt(f.key, refined[f.key]),
      )
    : [];
  const unchangedCount = refined ? refineFields.length - changed.length : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title="AI 完善人物"
      description="AI 将补全与强化人物档案，应用前逐字段对比确认"
      icon={Wand2}
      size="lg"
      footer={
        refined ? (
          <>
            <Button variant="ghost" onClick={handleGenerate} disabled={generating}>
              <RefreshCw size={14} />
              重新生成
            </Button>
            <Button variant="primary" onClick={handleApply}>
              应用修改
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => handleOpenChange(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {generating ? "生成中…" : "生成"}
            </Button>
          </>
        )
      }
    >
      {refined ? (
        <div className="space-y-3">
          <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-line">
            <div className="border-b border-line bg-subtle px-4 py-3">
              <p className="text-sm font-semibold text-ink">
                {changed.length} 项发生变化
                {unchangedCount > 0 && (
                  <span className="ml-2 text-[12px] font-normal text-ink-3">
                    （另有 {unchangedCount} 项未变化，已隐藏）
                  </span>
                )}
              </p>
            </div>
            {changed.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-ink-3">
                AI 未提出修改，可补充需求描述后重新生成。
              </p>
            ) : (
              <dl className="divide-y divide-line px-4">
                {changed.map((f) => (
                  <div key={f.key} className="grid grid-cols-[3.5rem_1fr] gap-3 py-2.5">
                    <dt className="text-[12px] leading-5 text-ink-3">{f.label}</dt>
                    <dd className="space-y-1.5">
                      <p className="whitespace-pre-wrap text-[12px] leading-5 text-ink-3 line-through decoration-danger/60">
                        {fmt(f.key, character[f.key]) || "（空）"}
                      </p>
                      <p className="whitespace-pre-wrap text-[13px] leading-5 text-ink">
                        {fmt(f.key, refined[f.key]) || "（清空）"}
                      </p>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          {error && <p className="text-[13px] text-danger">{error}</p>}
          <p className="text-[12px] text-ink-3">
            删除线为当前内容，下方为 AI 修改结果。确认后点击「应用修改」。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="补充需求（可选）" hint="留空 = AI 自动判断补全方向；也可指定重点，如：强化口头禅与身世悬念">
            <Textarea
              autoFocus
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleGenerate();
              }}
              rows={4}
              placeholder="例：重点补充他的身世线索，并让性格更立体……"
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
