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
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        <div className="rounded-lg bg-[var(--color-bg)] p-4">
          <div className="mb-2 flex items-center gap-2 text-[var(--color-text-secondary)]">
            <BookOpen size={16} />
            <span className="text-sm">总字数</span>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text)]">{totalWords.toLocaleString()}</p>
        </div>

        <div className="rounded-lg bg-[var(--color-bg)] p-4">
          <div className="mb-2 flex items-center gap-2 text-[var(--color-text-secondary)]">
            <FileText size={16} />
            <span className="text-sm">本章字数</span>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text)]">{chapterWords.toLocaleString()}</p>
        </div>

        <div className="rounded-lg bg-[var(--color-bg)] p-4">
          <div className="mb-2 flex items-center gap-2 text-[var(--color-text-secondary)]">
            <TrendingUp size={16} />
            <span className="text-sm">均章字数</span>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text)]">{averageWordsPerChapter.toLocaleString()}</p>
        </div>

        <div className="rounded-lg bg-[var(--color-bg)] p-4">
          <div className="mb-2 flex items-center gap-2 text-[var(--color-text-secondary)]">
            <Clock size={16} />
            <span className="text-sm">目标进度</span>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text)]">{progress.toFixed(1)}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
            <div
              className="h-full bg-[var(--color-primary)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            {totalWords.toLocaleString()} / {targetWords.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
