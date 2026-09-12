import { BookOpen, FileText, TrendingUp, Target } from "lucide-react";
import { StatCard } from "./StatCard";
import { Progress } from "./Progress";

interface WordStatsProps {
  totalWords: number;
  chapterWords?: number;
  targetWords?: number;
  averageWordsPerChapter?: number;
}

export function WordStats({
  totalWords,
  chapterWords = 0,
  targetWords = 100000,
  averageWordsPerChapter = 0,
}: WordStatsProps) {
  const percent = targetWords > 0 ? Math.min((totalWords / targetWords) * 100, 100) : 0;

  return (
    <div className="space-y-2.5">
      <StatCard
        label="总字数"
        value={totalWords.toLocaleString()}
        icon={BookOpen}
        align="left"
      />
      <StatCard
        label="本章字数"
        value={chapterWords.toLocaleString()}
        icon={FileText}
        align="left"
      />
      <StatCard
        label="平均每章"
        value={averageWordsPerChapter.toLocaleString()}
        icon={TrendingUp}
        align="left"
      />

      <div className="rounded-lg border border-line bg-surface p-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
            <Target size={13} aria-hidden className="opacity-70" />
            目标进度
          </span>
          <span className="text-xs font-semibold tabular-nums text-ink">
            {percent.toFixed(1)}%
          </span>
        </div>
        <Progress value={totalWords} max={targetWords} className="mt-2" />
        <p className="mt-1.5 text-[11px] tabular-nums text-ink-3">
          {totalWords.toLocaleString()} / {targetWords.toLocaleString()} 字
        </p>
      </div>
    </div>
  );
}
