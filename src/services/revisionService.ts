import { diffChars } from "diff";
import type { Editor } from "@tiptap/core";
import { buildIndex, flatToPm } from "../components/editor/search";
import { locateQuote } from "../components/editor/locateText";
import {
  useRevisionStore,
  type Revision,
  type RevisionSource,
} from "../stores/revisionStore";
import { versionDb } from "./database";

/**
 * 修订服务：
 * - diffToBlocks：新旧纯文本 → 合并后的变更块（相邻碎变化按 MERGE_GAP 吞并）
 * - createRevisionsFromDiff：按块生成 pending 修订并给新文打 revision mark
 * - resolveRevision：接受/拒绝单条（正文级操作 + 状态更新）
 * - 快照联动：进出修订模式、批量接受/拒绝、AI 改写时写版本快照
 */

/** 变更块之间小于该长度的未变文本并入块内（减少碎片） */
const MERGE_GAP = 4;

interface ChangeBlock {
  oldText: string;
  newText: string;
  /** 块在旧文本中的起点 */
  oldOffset: number;
  /** 块在新文本中的起点 */
  newOffset: number;
}

type Seg = { type: "eq" | "del" | "add"; value: string };

function diffSegs(oldText: string, newText: string): Seg[] {
  const parts = diffChars(oldText, newText);
  const segs: Seg[] = [];
  for (const p of parts) {
    if (!p.value) continue;
    if (p.added) segs.push({ type: "add", value: p.value });
    else if (p.removed) segs.push({ type: "del", value: p.value });
    else segs.push({ type: "eq", value: p.value });
  }
  return segs;
}

export function diffToBlocks(oldText: string, newText: string): ChangeBlock[] {
  if (oldText === newText) return [];
  const segs = diffSegs(oldText, newText);
  const blocks: ChangeBlock[] = [];
  let oldCursor = 0;
  let newCursor = 0;
  let i = 0;
  while (i < segs.length) {
    const seg = segs[i];
    if (seg.type === "eq") {
      oldCursor += seg.value.length;
      newCursor += seg.value.length;
      i++;
      continue;
    }
    let blockOld = "";
    let blockNew = "";
    const oldStart = oldCursor;
    const newStart = newCursor;
    while (i < segs.length) {
      const s = segs[i];
      if (s.type === "eq") {
        const next = segs[i + 1];
        if (next && next.type !== "eq" && s.value.length <= MERGE_GAP) {
          // 短未变段吞入块内（保持原文顺序拼接）
          blockOld += s.value;
          blockNew += s.value;
          oldCursor += s.value.length;
          newCursor += s.value.length;
          i++;
          continue;
        }
        break;
      }
      if (s.type === "del") {
        blockOld += s.value;
        oldCursor += s.value.length;
      } else {
        blockNew += s.value;
        newCursor += s.value.length;
      }
      i++;
    }
    if (blockOld === blockNew) continue;
    blocks.push({
      oldText: blockOld,
      newText: blockNew,
      oldOffset: oldStart,
      newOffset: newStart,
    });
  }
  return blocks;
}

interface MarkSpec {
  from: number;
  to: number;
  id: string;
  kind: string;
}

/** 按变更块生成修订并给新文范围打 mark（一个事务提交） */
export function createRevisionsFromDiff(
  ed: Editor,
  projectId: string,
  chapterId: string,
  oldText: string,
  source: RevisionSource,
  reason: string,
): number {
  const index = buildIndex(ed.state.doc);
  if (oldText === index.full) return 0;
  const blocks = diffToBlocks(oldText, index.full);
  if (blocks.length === 0) return 0;

  const store = useRevisionStore.getState();
  const marks: MarkSpec[] = [];
  for (const b of blocks) {
    const kind = !b.oldText ? "insert" : !b.newText ? "delete" : "replace";
    const rev = store.addRevision({
      projectId,
      chapterId,
      kind,
      source,
      quoteBefore: b.oldText,
      quoteAfter: b.newText,
      // 变更点在新文本中的位置：insert/replace 为新文起点，delete 为删除点
      textFrom: b.newOffset,
      reason,
    });
    if (b.newText) {
      marks.push({
        from: b.newOffset,
        to: b.newOffset + b.newText.length,
        id: rev.id,
        kind,
      });
    }
  }

  if (marks.length > 0) {
    const schema = ed.state.schema;
    const tr = ed.state.tr;
    for (const m of marks) {
      const from = flatToPm(index.segs, m.from);
      const to = flatToPm(index.segs, m.to);
      if (to > from) {
        tr.addMark(
          from,
          to,
          schema.marks.revision.create({ revisionId: m.id, revKind: m.kind }),
        );
      }
    }
    ed.view.dispatch(tr);
  }
  useRevisionStore.getState().setBaseline(chapterId, index.full);
  return blocks.length;
}

/** 修订模式下手动编辑：baseline → 当前文本，生成修订并推进同步点 */
export function applyManualDiff(
  ed: Editor,
  projectId: string,
  chapterId: string,
): number {
  const store = useRevisionStore.getState();
  const index = buildIndex(ed.state.doc);
  const baseline = store.baselines[chapterId];
  if (baseline == null) {
    store.setBaseline(chapterId, index.full);
    return 0;
  }
  return createRevisionsFromDiff(ed, projectId, chapterId, baseline, "manual", "");
}

export type ResolveAction = "accept" | "reject";

export interface ResolveResult {
  ok: boolean;
  message?: string;
}

/** 接受/拒绝单条修订（正文级操作 + 状态更新） */
export function resolveRevision(
  ed: Editor,
  rev: Revision,
  action: ResolveAction,
): ResolveResult {
  const index = buildIndex(ed.state.doc);
  const schema = ed.state.schema;
  const tr = ed.state.tr;
  let changed = false;
  // AI 建议的引文来自 HTML 转文本（可能含换行），定位靠归一化兜底；
  // 应用时去掉换行，避免字面 \n 进入正文
  const norm = (s: string) => s.replace(/[\r\n]+/g, "");

  if (action === "accept") {
    if (rev.kind === "insert" || rev.kind === "replace") {
      const range = locateQuote(index, rev.quoteAfter, rev.textFrom);
      if (range) {
        const from = flatToPm(index.segs, range[0]);
        const to = flatToPm(index.segs, range[1]);
        tr.removeMark(from, to, schema.marks.revision);
        changed = true;
      }
    } else if (rev.kind === "delete") {
      // 已删除的文本保持删除，仅定状态
    } else {
      // suggest：应用建议文本
      const range = locateQuote(index, rev.quoteBefore, rev.textFrom);
      if (!range) return { ok: false, message: "原文已变化，无法应用建议" };
      const from = flatToPm(index.segs, range[0]);
      const to = flatToPm(index.segs, range[1]);
      const replacement = norm(rev.quoteAfter);
      try {
        if (replacement) tr.replaceWith(from, to, schema.text(replacement));
        else tr.delete(from, to);
      } catch {
        return { ok: false, message: "该建议跨越段落，无法自动应用，请手动修改" };
      }
      changed = true;
    }
  } else {
    if (rev.kind === "insert" || rev.kind === "replace") {
      const range = locateQuote(index, rev.quoteAfter, rev.textFrom);
      if (!range) return { ok: false, message: "新文本已不在正文中" };
      const from = flatToPm(index.segs, range[0]);
      const to = flatToPm(index.segs, range[1]);
      tr.delete(from, to);
      changed = true;
    } else if (rev.kind === "delete") {
      if (rev.textFrom == null) return { ok: false, message: "缺少删除位置，无法恢复" };
      const pos = Math.min(Math.max(rev.textFrom, 0), index.full.length);
      const pmPos = flatToPm(index.segs, pos);
      const restore = norm(rev.quoteBefore);
      if (restore) tr.insertText(restore, pmPos);
      changed = true;
    }
    // suggest 拒绝：正文未动，仅定状态
  }

  if (changed) ed.view.dispatch(tr);
  useRevisionStore.getState().updateRevision(rev.id, {
    status: action === "accept" ? "accepted" : "rejected",
  });
  // 处理后推进该章同步点（避免后续手动 diff 把已处理变化重复计入）
  useRevisionStore.getState().setBaseline(rev.chapterId, buildIndex(ed.state.doc).full);
  return { ok: true };
}

/** 批量接受/拒绝（按定位偏移降序处理，降低漂移影响） */
export function resolveAll(
  ed: Editor,
  revisions: Revision[],
  action: ResolveAction,
): { ok: number; failed: number } {
  const sorted = [...revisions].sort(
    (a, b) => (b.textFrom ?? 0) - (a.textFrom ?? 0),
  );
  let ok = 0;
  let failed = 0;
  for (const rev of sorted) {
    const res = resolveRevision(ed, rev, action);
    if (res.ok) ok++;
    else failed++;
  }
  return { ok, failed };
}

export interface RevisionStats {
  pending: number;
  accepted: number;
  rejected: number;
  addedChars: number;
  removedChars: number;
  aiCount: number;
}

/** 修订统计：状态计数 + 预计/已定增删字数 + AI 修订数 */
export function computeRevisionStats(revisions: Revision[]): RevisionStats {
  const stats: RevisionStats = {
    pending: 0,
    accepted: 0,
    rejected: 0,
    addedChars: 0,
    removedChars: 0,
    aiCount: 0,
  };
  for (const r of revisions) {
    if (r.status === "pending") stats.pending++;
    else if (r.status === "accepted") stats.accepted++;
    else stats.rejected++;
    if (r.source !== "manual") stats.aiCount++;
    if (r.status === "rejected") continue;
    if (r.kind === "insert") stats.addedChars += r.quoteAfter.length;
    else if (r.kind === "delete") stats.removedChars += r.quoteBefore.length;
    else if (r.kind === "replace") {
      stats.addedChars += r.quoteAfter.length;
      stats.removedChars += r.quoteBefore.length;
    }
  }
  return stats;
}

/** 版本快照联动：修订关键节点写入版本历史（内容无变化时 versionDb 内部跳过） */
export async function revisionSnapshot(
  projectId: string,
  chapterId: string,
  content: string,
  title: string,
): Promise<void> {
  try {
    await versionDb.create(projectId, chapterId, {
      title,
      content,
      source: "manual",
    });
  } catch (e) {
    console.warn("修订版本快照失败:", e);
  }
}
