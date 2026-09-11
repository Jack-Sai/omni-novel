import { BookOpen, FileText, Clock, TrendingUp } from "lucide-react";

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
  const progress = Math.min((totalWords / targetWords) * 100, 100);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
        <div className="mb-1 flex items-center gap-2 text-[var(--color-text-secondary)]">
          <BookOpen size={14} />
          <span className="text-xs">总字数</span>
        </div>
        <p className="text-lg font-bold">{totalWords.toLocaleString()}</p>
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
        <div className="mb-1 flex items-center gap-2 text-[var(--color-text-secondary)]">
          <FileText size={14} />
          <span className="text-xs">本章字数</span>
        </div>
        <p className="text-lg font-bold">{chapterWords.toLocaleString()}</p>
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
        <div className="mb-1 flex items-center gap-2 text-[var(--color-text-secondary)]">
          <TrendingUp size={14} />
          <span className="text-xs">均章字数</span>
        </div>
        <p className="text-lg font-bold">{averageWordsPerChapter.toLocaleString()}</p>
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
        <div className="mb-1 flex items-center gap-2 text-[var(--color-text-secondary)]">
          <Clock size={14} />
          <span className="text-xs">目标进度</span>
        </div>
        <p className="text-lg font-bold">{progress.toFixed(1)}%</p>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
          <div
            className="h-full bg-[var(--color-primary)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
