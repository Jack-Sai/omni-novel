import { useMemo, useState } from "react";
import { Eraser, ScanText } from "lucide-react";
import { Badge, Button, Dialog } from "../ui";
import type { BadgeVariant } from "../ui/Badge";
import { cn } from "../../lib/cn";
import {
  runStyleCheck,
  styleIssueLabels,
  type StyleIssue,
  type StyleIssueType,
} from "../../lib/styleCheck";
import { htmlToText } from "../../lib/textDiff";

export interface StyleCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterTitle: string;
  /** 当前章 HTML */
  chapterContent: string;
  /** 点击结果 → 正文定位（quote=命中片段，textFrom=纯文本偏移） */
  onLocate: (quote: string, textFrom: number) => void;
}

const tabs: { value: StyleIssueType; label: string }[] = [
  { value: "repeat", label: "重复词" },
  { value: "filler", label: "口水词" },
  { value: "aiTone", label: "AI 腔" },
];

const tabVariant: Record<StyleIssueType, BadgeVariant> = {
  repeat: "warning",
  filler: "primary",
  aiTone: "danger",
};

/** 检查基于纯文本（块间无分隔），定位偏移与编辑器 buildIndex 同构 */
function toPlain(html: string): string {
  return htmlToText(html).replace(/[\r\n]/g, "");
}

export function StyleCheckDialog({
  open,
  onOpenChange,
  chapterTitle,
  chapterContent,
  onLocate,
}: StyleCheckDialogProps) {
  const [tab, setTab] = useState<StyleIssueType>("repeat");
  const [ran, setRan] = useState(false);

  const plain = useMemo(() => toPlain(chapterContent), [chapterContent]);

  const issues = useMemo<StyleIssue[]>(
    () => (ran ? runStyleCheck(plain) : []),
    [ran, plain],
  );
  const filtered = useMemo(
    () => issues.filter((i) => i.type === tab),
    [issues, tab],
  );
  const counts = useMemo(() => {
    const c: Record<StyleIssueType, number> = { repeat: 0, filler: 0, aiTone: 0 };
    for (const i of issues) c[i.type]++;
    return c;
  }, [issues]);

  const handleOpenChange = (next: boolean) => {
    if (!next) setRan(false);
    onOpenChange(next);
  };

  const handleLocate = (issue: StyleIssue) => {
    onLocate(issue.word, issue.offset);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title="文风检查"
      description={`${chapterTitle}：本地即时检测重复词、口水词与 AI 腔（不联网）`}
      icon={ScanText}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            关闭
          </Button>
          <Button variant="primary" onClick={() => setRan(true)}>
            <ScanText size={14} />
            {ran ? "重新检查" : "开始检查"}
          </Button>
        </>
      }
    >
      {!ran ? (
        <div className="space-y-3">
          <p className="text-[13px] leading-relaxed text-ink-2">
            对当前章做三类启发式检测：
          </p>
          <ul className="list-inside list-disc space-y-1 text-[13px] text-ink-2">
            <li>
              <b>重复词</b>：相邻叠字与短窗口内的高频词（含单字虚词滥用）
            </li>
            <li>
              <b>口水词</b>：然后、突然、缓缓、微微等口语连接词与陈词的频率
            </li>
            <li>
              <b>AI 腔</b>：眼中闪过一丝、仿佛…一般、深吸一口气等模型套话
            </li>
          </ul>
          <p className="text-[12px] text-ink-3">检测完全本地运行，点击结果可跳转正文定位。</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-1.5">
            {tabs.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTab(t.value)}
                className={cn(
                  "rounded-full px-3 py-1 text-[12px] transition-colors",
                  tab === t.value
                    ? "bg-primary-soft font-medium text-primary"
                    : "text-ink-3 hover:bg-hover hover:text-ink-2",
                )}
              >
                {t.label}
                <span className="ml-1 tabular-nums opacity-70">{counts[t.value]}</span>
              </button>
            ))}
          </div>

          <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-line">
            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-ink-3">
                未发现{styleIssueLabels[tab]}问题
              </p>
            ) : (
              <div className="divide-y divide-line">
                {filtered.map((issue, i) => (
                  <button
                    key={`${issue.type}-${issue.offset}-${i}`}
                    type="button"
                    onClick={() => handleLocate(issue)}
                    className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-hover"
                  >
                    <Badge variant={tabVariant[issue.type]} size="sm" className="mt-0.5 shrink-0">
                      {styleIssueLabels[issue.type]}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-[12.5px] text-ink">
                        {issue.word}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-ink-3">
                        {issue.excerpt}
                      </p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-ink-2">
                        {issue.suggestion}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="flex items-center gap-1 text-[12px] text-ink-3">
            <Eraser size={12} />
            共 {issues.length} 处问题，点击条目可跳转到正文位置
          </p>
        </div>
      )}
    </Dialog>
  );
}
