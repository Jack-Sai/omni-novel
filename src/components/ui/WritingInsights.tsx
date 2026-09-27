import { useEffect, useMemo, useState } from "react";
import { Flame, Timer, CalendarDays, Zap } from "lucide-react";
import { writingStatsDb, type WritingStatRow } from "../../services/database";

/**
 * 写作洞察面板（统计系统 #14）：今日/累计时长、连续写作天数、13 周字数热力图。
 * 数据来自 writing_stats（writingTracker 每 30s 心跳落库），组件每 60s 自刷新。
 */

interface Props {
  projectId: string;
}

const HEATMAP_DAYS = 91; // 13 周
const REFRESH_MS = 60_000;

function toDateString(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function fmtDuration(sec: number): string {
  if (sec <= 0) return "0m";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return `${m}m`;
  return `${sec}s`;
}

function fmtDurationLong(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h} 小时 ${m} 分钟`;
  if (m > 0) return `${m} 分钟`;
  return `${sec} 秒`;
}

/** 连续写作天数：从今天（或昨天，今天未写不断）向前数有记录的连续日期 */
function calcStreak(byDate: Map<string, WritingStatRow>): number {
  const d = new Date();
  let streak = 0;
  if (!byDate.has(toDateString(d))) {
    d.setDate(d.getDate() - 1); // 今天还没写，从昨天起算
  }
  while (byDate.has(toDateString(d))) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/** 热力图色阶（按当日产出字数） */
function heatClass(words: number): string {
  if (words <= 0) return "bg-line/60";
  if (words < 200) return "bg-primary/25";
  if (words < 600) return "bg-primary/50";
  if (words < 1200) return "bg-primary/75";
  return "bg-primary";
}

export function WritingInsights({ projectId }: Props) {
  const [rows, setRows] = useState<WritingStatRow[]>([]);
  const [totals, setTotals] = useState({
    duration_sec: 0,
    words_written: 0,
    days: 0,
    sessions: 0,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - (HEATMAP_DAYS - 1));
        const [range, t] = await Promise.all([
          writingStatsDb.getRange(projectId, toDateString(start), toDateString(end)),
          writingStatsDb.getTotals(projectId),
        ]);
        if (!cancelled) {
          setRows(range);
          setTotals(t);
        }
      } catch (err) {
        console.warn("加载写作统计失败:", err);
      }
    };

    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [projectId]);

  const { todayRow, streak, cells } = useMemo(() => {
    const byDate = new Map<string, WritingStatRow>();
    for (const r of rows) byDate.set(r.date, r);
    const today = toDateString(new Date());
    const todayRow = byDate.get(today);
    const streak = calcStreak(byDate);

    // 13 列（周）× 7 行（周日..周六），列按周日对齐
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (HEATMAP_DAYS - 1));
    start.setDate(start.getDate() - start.getDay()); // 回退到周日
    const cells: { date: string; row: WritingStatRow | undefined }[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      const ds = toDateString(cur);
      cells.push({ date: ds, row: byDate.get(ds) });
      cur.setDate(cur.getDate() + 1);
    }
    return { byDate, todayRow, streak, cells };
  }, [rows]);

  const todaySec = todayRow?.duration_sec ?? 0;
  const todayWords = todayRow?.words_written ?? 0;

  const stat = (
    icon: React.ReactNode,
    label: string,
    value: string,
    sub?: string
  ) => (
    <div className="rounded-lg border border-line bg-surface p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-ink">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] tabular-nums text-ink-3">{sub}</div>}
    </div>
  );

  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {stat(
          <Timer size={13} aria-hidden className="opacity-70" />,
          "今日时长",
          fmtDuration(todaySec),
          todayWords > 0 ? `今日 +${todayWords.toLocaleString()} 字` : "尚无产出"
        )}
        {stat(
          <Flame size={13} aria-hidden className="opacity-70" />,
          "连续写作",
          `${streak} 天`,
          streak > 0 ? "保持手感" : "今天写一段就开张"
        )}
        {stat(
          <CalendarDays size={13} aria-hidden className="opacity-70" />,
          "累计时长",
          fmtDuration(totals.duration_sec),
          `${totals.days} 个写作日 · ${totals.sessions} 次`
        )}
        {stat(
          <Zap size={13} aria-hidden className="opacity-70" />,
          "累计产出",
          totals.words_written.toLocaleString(),
          "追踪以来新增字数"
        )}
      </div>

      <div className="rounded-lg border border-line bg-surface p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-ink-2">近 13 周字数热力</span>
          <span className="flex items-center gap-1 text-[10px] text-ink-3">
            少
            <span className="h-2.5 w-2.5 rounded-[3px] bg-line/60" />
            <span className="h-2.5 w-2.5 rounded-[3px] bg-primary/25" />
            <span className="h-2.5 w-2.5 rounded-[3px] bg-primary/50" />
            <span className="h-2.5 w-2.5 rounded-[3px] bg-primary/75" />
            <span className="h-2.5 w-2.5 rounded-[3px] bg-primary" />
            多
          </span>
        </div>
        <div className="mt-2 flex gap-0.5 overflow-x-auto pb-1">
          {Array.from({ length: Math.ceil(cells.length / 7) }).map((_, week) => (
            <div key={week} className="flex flex-col gap-0.5">
              {cells.slice(week * 7, week * 7 + 7).map((cell) => {
                const w = cell.row?.words_written ?? 0;
                const sec = cell.row?.duration_sec ?? 0;
                return (
                  <span
                    key={cell.date}
                    title={`${cell.date} · ${w.toLocaleString()} 字 · ${fmtDurationLong(sec)}`}
                    className={`h-2.5 w-2.5 rounded-[3px] transition-colors ${heatClass(w)}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
