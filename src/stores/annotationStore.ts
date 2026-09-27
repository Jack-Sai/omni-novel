import { create } from "zustand";
import { saveProjectJson, loadProjectJson } from "../services/storage";

/**
 * 批注（Annotation）：作者对正文的标注与协作意见。
 * - scope=text（选中文本批注，带 quote + 纯文本偏移定位）
 * - scope=chapter（章节级批注）
 * - scope=global（全局批注，不挂章节）
 * - kind=manual（手动）/ ai（AI 审校、AI 内容标记）/ reader（读者模拟）
 * 回复 / 解决 / 删除均落 annotations.json（store 自动落盘）。
 */
export type AnnotationScope = "text" | "chapter" | "global";
export type AnnotationKind = "manual" | "ai" | "reader";
export type AnnotationStatus = "open" | "resolved";

export interface AnnotationReply {
  id: string;
  author: "author" | "ai" | "reader";
  content: string;
  createdAt: string;
}

export interface Annotation {
  id: string;
  projectId: string;
  scope: AnnotationScope;
  kind: AnnotationKind;
  status: AnnotationStatus;
  /** text/chapter 级必有；global 为 null */
  chapterId: string | null;
  title: string;
  content: string;
  /** text 级：被选中的原文（定位兜底） */
  quote: string;
  /** text 级：章节纯文本（doc 全文去标签）内的字符偏移 */
  textFrom: number | null;
  textTo: number | null;
  replies: AnnotationReply[];
  createdAt: string;
  updatedAt: string;
}

export type NewAnnotation = Omit<Annotation, "id" | "createdAt" | "updatedAt">;

interface AnnotationStore {
  annotations: Annotation[];
  /** 当前激活（正文高亮）的批注 id */
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  addAnnotation: (input: NewAnnotation) => Annotation;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  addReply: (
    id: string,
    reply: Pick<AnnotationReply, "author" | "content">,
  ) => void;
  toggleStatus: (id: string) => void;
  getByProject: (projectId: string) => Annotation[];
  /** 章删除级联清理（chapter/text 级，global 保留） */
  deleteByChapter: (chapterId: string) => void;
  loadFromDisk: (projectDir: string) => Promise<void>;
  saveToDisk: (projectDir: string) => void;
}

let saveTimers: Record<string, ReturnType<typeof setTimeout> | null> = {};

export const useAnnotationStore = create<AnnotationStore>()((set, get) => ({
  annotations: [],
  activeId: null,

  setActiveId: (id) => set({ activeId: id }),

  addAnnotation: (input) => {
    const now = new Date().toISOString();
    const item: Annotation = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ annotations: [...state.annotations, item] }));
    return item;
  },

  updateAnnotation: (id, updates) =>
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
      ),
    })),

  deleteAnnotation: (id) =>
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
      activeId: state.activeId === id ? null : state.activeId,
    })),

  addReply: (id, reply) =>
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === id
          ? {
              ...a,
              replies: [
                ...a.replies,
                {
                  id: crypto.randomUUID(),
                  content: reply.content,
                  author: reply.author,
                  createdAt: new Date().toISOString(),
                },
              ],
              updatedAt: new Date().toISOString(),
            }
          : a
      ),
    })),

  toggleStatus: (id) =>
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === id
          ? {
              ...a,
              status: a.status === "open" ? "resolved" : "open",
              updatedAt: new Date().toISOString(),
            }
          : a
      ),
    })),

  getByProject: (projectId) =>
    get()
      .annotations.filter((a) => a.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

  deleteByChapter: (chapterId) =>
    set((state) => ({
      annotations: state.annotations.filter(
        (a) => !(a.chapterId === chapterId && a.scope !== "global")
      ),
      activeId:
        state.activeId &&
        state.annotations.find((a) => a.id === state.activeId)?.chapterId === chapterId
          ? null
          : state.activeId,
    })),

  loadFromDisk: async (projectDir: string) => {
    const data = await loadProjectJson<{ annotations: Annotation[] }>(
      projectDir,
      "data",
      "annotations.json"
    );
    // 无数据时清空，避免切换项目后残留上一项目内容
    set({ annotations: data?.annotations ?? [], activeId: null });
  },

  saveToDisk: (projectDir: string) => {
    const key = projectDir;
    if (saveTimers[key]) clearTimeout(saveTimers[key]!);
    saveTimers[key] = setTimeout(() => {
      const { annotations } = get();
      saveProjectJson(projectDir, "data", "annotations.json", { annotations }).catch((e) =>
        console.error("保存批注数据失败:", e)
      );
      saveTimers[key] = null;
    }, 500);
  },
}));
