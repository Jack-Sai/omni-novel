import { writingStatsDb } from "./database";
import { useChapterStore } from "../stores/chapterStore";

/**
 * 写作时长/产出追踪器（统计系统）。
 *
 * 时长模型：编辑器输入作为活跃信号（noteActivity），30s 心跳检查一次——
 * 距最近活跃 < 2 分钟视为"仍在写作"，累加 30s 到当日 writing_stats。
 * 产出模型：每次心跳对比全项目总字数，正向增量计入当日 words_written
 * （删改不回退，按"产出"语义）；跨天时基线重置为当前总量。
 *
 * 仅在编辑器页（EditorPage）挂载期间运行。
 */

const TICK_MS = 30_000;
/** 超过该间隔无输入视为离开键盘 */
const IDLE_MS = 2 * 60_000;

let timer: ReturnType<typeof setInterval> | null = null;
let lastActivityAt = 0;
let lastTickAt = 0;
let projectId: string | null = null;
let lastTotalWords = -1;
let lastDate = "";
let pendingWords = 0;
let sessionStarted = false;

function today(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function countTotalWords(): number {
  const pid = projectId;
  if (!pid) return 0;
  const chapters = useChapterStore.getState().chapters;
  let sum = 0;
  for (const c of chapters) {
    if (c.projectId !== pid) continue;
    const text = c.content.replace(/<[^>]*>/g, "").replace(/\s/g, "");
    sum += text.length;
  }
  return sum;
}

function dateChanged(): boolean {
  const t = today();
  if (t !== lastDate) {
    lastDate = t;
    return true;
  }
  return false;
}

async function tick(): Promise<void> {
  if (!projectId) return;
  const now = Date.now();
  const date = today();
  const changedDay = dateChanged();

  // 时长：距上次活跃 < 2min 视为写作中
  if (lastActivityAt > 0 && now - lastActivityAt < IDLE_MS) {
    const elapsed = lastTickAt > 0 ? Math.min(now - lastTickAt, TICK_MS * 2) : TICK_MS;
    await writingStatsDb.addDuration(projectId, date, Math.round(elapsed / 1000));
  }
  lastTickAt = now;

  // 会话计数：本次编辑器打开后第一次活跃记一次 session
  if (!sessionStarted && lastActivityAt > 0 && now - lastActivityAt < IDLE_MS) {
    sessionStarted = true;
    await writingStatsDb.startSession(projectId, date);
  }

  // 产出：对比总字数增量（跨天重置基线）
  const total = countTotalWords();
  if (changedDay) {
    lastTotalWords = total;
    pendingWords = 0;
  } else if (lastTotalWords < 0) {
    // 首次 tick：以当前为基线（历史存量不计入"今日产出"）
    lastTotalWords = total;
  } else if (total > lastTotalWords) {
    pendingWords += total - lastTotalWords;
    lastTotalWords = total;
  } else if (total < lastTotalWords) {
    // 大幅删减（如粘贴覆盖）：基线跟随下调，避免次日虚高
    lastTotalWords = total;
  }

  if (pendingWords > 0) {
    await writingStatsDb.addWords(projectId, date, pendingWords);
    pendingWords = 0;
  }
}

/** 编辑器有输入时调用（活跃信号） */
export function noteActivity(): void {
  lastActivityAt = Date.now();
}

/** 开始追踪指定项目（EditorPage 挂载/切换项目时调用，重复调用会重启） */
export function startWritingTracker(pid: string): void {
  stopWritingTracker();
  projectId = pid;
  lastActivityAt = 0;
  lastTickAt = Date.now();
  lastTotalWords = -1;
  lastDate = today();
  pendingWords = 0;
  sessionStarted = false;
  timer = setInterval(() => {
    void tick();
  }, TICK_MS);
}

/** 停止追踪（EditorPage 卸载时调用），先冲刷一次未落库的增量 */
export function stopWritingTracker(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
    void tick();
  }
  projectId = null;
  sessionStarted = false;
}
