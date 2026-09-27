import { create } from "zustand";
import { saveProjectJson, loadProjectJson } from "../services/storage";

/**
 * 修订（Revision）：模式化的修改记录，支持接受 / 拒绝。
 * - kind=insert：新增文本（含 mark 高亮，拒绝则删除）
 * - kind=delete：删除文本（记录原文，拒绝则插回）
 * - kind=replace：文本被替换（新文含 mark 高亮，拒绝回滚为原文）
 * - kind=suggest：AI 建议（正文未改，quote 高亮，接受才应用）
 * - source=manual（修订模式下手动编辑）/ ai（AI 修订建议）/ ai-rewrite（AI 改写自动进修订）
 * baselines 存每章「同步点」纯文本：接受/拒绝一批后推进，同时作为修订对比基线。
 */
export type RevisionKind = "insert" | "delete" | "replace" | "suggest";
export type RevisionSource = "manual" | "ai" | "ai-rewrite";
export type RevisionStatus = "pending" | "accepted" | "rejected";

export interface Revision {
  id: string;
  projectId: string;
  chapterId: string;
  kind: RevisionKind;
  source: RevisionSource;
  status: RevisionStatus;
  /** delete / replace / suggest：变更前原文；insert 为空 */
  quoteBefore: string;
  /** insert / replace / suggest：变更后文本（suggest 即建议稿）；delete 为空 */
  quoteAfter: string;
  /** 变更点在当前纯文本中的偏移提示（定位兜底，可为 null） */
  textFrom: number | null;
  /** AI 说明 / 变化描述 */
  reason: string;
  createdAt: string;
  resolvedAt: string | null;
}

export type NewRevision = Omit<
  Revision,
  "id" | "status" | "createdAt" | "resolvedAt"
>;

interface RevisionStore {
  revisions: Revision[];
  /** 章 id → 同步点纯文本（doc 无分隔拼接，与 buildIndex.full 同构） */
  baselines: Record<string, string>;
  /** 修订模式开关（会话级，不持久化到磁盘偏好） */
  trackMode: boolean;
  /** 当前激活（正文高亮/卡片展开）的修订 id */
  activeRevisionId: string | null;
  setTrackMode: (v: boolean) => void;
  setActiveRevisionId: (id: string | null) => void;
  addRevision: (input: NewRevision) => Revision;
  updateRevision: (id: string, updates: Partial<Revision>) => void;
  deleteRevision: (id: string) => void;
  setBaseline: (chapterId: string, text: string) => void;
  getByChapter: (chapterId: string, status?: Revision["status"]) => Revision[];
  getByProject: (projectId: string) => Revision[];
  deleteByChapter: (chapterId: string) => void;
  loadFromDisk: (projectDir: string) => Promise<void>;
  saveToDisk: (projectDir: string) => void;
}

let saveTimers: Record<string, ReturnType<typeof setTimeout> | null> = {};

export const useRevisionStore = create<RevisionStore>()((set, get) => ({
  revisions: [],
  baselines: {},
  trackMode: false,
  activeRevisionId: null,

  setTrackMode: (v) => set({ trackMode: v }),

  setActiveRevisionId: (id) => set({ activeRevisionId: id }),

  addRevision: (input) => {
    const now = new Date().toISOString();
    const item: Revision = {
      id: crypto.randomUUID(),
      status: "pending",
      createdAt: now,
      resolvedAt: null,
      ...input,
    };
    set((state) => ({ revisions: [...state.revisions, item] }));
    return item;
  },

  updateRevision: (id, updates) =>
    set((state) => ({
      revisions: state.revisions.map((r) =>
        r.id === id
          ? {
              ...r,
              ...updates,
              resolvedAt:
                updates.status && updates.status !== "pending"
                  ? new Date().toISOString()
                  : updates.status === "pending"
                    ? null
                    : r.resolvedAt,
            }
          : r
      ),
    })),

  deleteRevision: (id) =>
    set((state) => ({ revisions: state.revisions.filter((r) => r.id !== id) })),

  setBaseline: (chapterId, text) =>
    set((state) => ({ baselines: { ...state.baselines, [chapterId]: text } })),

  getByChapter: (chapterId, status) =>
    get()
      .revisions.filter(
        (r) => r.chapterId === chapterId && (!status || r.status === status)
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

  getByProject: (projectId) =>
    get()
      .revisions.filter((r) => r.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

  deleteByChapter: (chapterId) =>
    set((state) => {
      const baselines = { ...state.baselines };
      delete baselines[chapterId];
      return {
        revisions: state.revisions.filter((r) => r.chapterId !== chapterId),
        baselines,
      };
    }),

  loadFromDisk: async (projectDir: string) => {
    const data = await loadProjectJson<{
      revisions: Revision[];
      baselines: Record<string, string>;
    }>(projectDir, "data", "revisions.json");
    set({
      revisions: data?.revisions ?? [],
      baselines: data?.baselines ?? {},
      trackMode: false,
      activeRevisionId: null,
    });
  },

  saveToDisk: (projectDir: string) => {
    const key = projectDir;
    if (saveTimers[key]) clearTimeout(saveTimers[key]!);
    saveTimers[key] = setTimeout(() => {
      const { revisions, baselines } = get();
      saveProjectJson(projectDir, "data", "revisions.json", {
        revisions,
        baselines,
      }).catch((e) => console.error("保存修订数据失败:", e));
      saveTimers[key] = null;
    }, 500);
  },
}));
