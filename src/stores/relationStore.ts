import { create } from "zustand";
import { saveProjectJson, loadProjectJson } from "../services/storage";

export type RelationType =
  | "family"
  | "friend"
  | "enemy"
  | "lover"
  | "master"
  | "rival"
  | "ally"
  | "colleague"
  | "other";

export const relationTypes: { value: RelationType; label: string }[] = [
  { value: "family", label: "亲属" },
  { value: "friend", label: "朋友" },
  { value: "enemy", label: "敌对" },
  { value: "lover", label: "恋人" },
  { value: "master", label: "师徒" },
  { value: "rival", label: "对手" },
  { value: "ally", label: "盟友" },
  { value: "colleague", label: "同事" },
  { value: "other", label: "其他" },
];

/** 关系类型 → 边颜色（图谱与列表共用） */
export const relationTypeColors: Record<RelationType, string> = {
  family: "#22a06b",
  friend: "#3b82f6",
  enemy: "#ef4444",
  lover: "#ec4899",
  master: "#8b5cf6",
  rival: "#f59e0b",
  ally: "#14b8a6",
  colleague: "#64748b",
  other: "#94a3b8",
};

export interface CharacterRelation {
  id: string;
  projectId: string;
  sourceId: string;
  targetId: string;
  type: RelationType;
  /** 显示文本，如「父女」「宿敌」，可自定义 */
  label: string;
  description: string;
  /** true = 有向（A → B 箭头），false = 无向 */
  directed: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NewRelation = Omit<CharacterRelation, "id" | "createdAt" | "updatedAt">;

export interface GraphPosition {
  x: number;
  y: number;
}

interface RelationStore {
  relations: CharacterRelation[];
  /** 图谱节点布局：characterId → 画布坐标（随 relations.json 一并持久化） */
  positions: Record<string, GraphPosition>;
  /** 返回 false 表示重复（同向或无向反向同类型）被忽略 */
  addRelation: (relation: NewRelation) => boolean;
  updateRelation: (id: string, updates: Partial<CharacterRelation>) => void;
  deleteRelation: (id: string) => void;
  deleteByCharacter: (characterId: string) => void;
  getRelationsByProject: (projectId: string) => CharacterRelation[];
  setPosition: (characterId: string, pos: GraphPosition) => void;
  loadFromDisk: (projectDir: string) => Promise<void>;
  saveToDisk: (projectDir: string) => void;
}

interface RelationsFile {
  relations: CharacterRelation[];
  positions: Record<string, GraphPosition>;
}

let saveTimers: Record<string, ReturnType<typeof setTimeout> | null> = {};

export const useRelationStore = create<RelationStore>()((set, get) => ({
  relations: [],
  positions: {},

  addRelation: (relation) => {
    const dup = get().relations.some(
      (r) =>
        r.projectId === relation.projectId &&
        r.type === relation.type &&
        ((r.sourceId === relation.sourceId && r.targetId === relation.targetId) ||
          (!relation.directed &&
            r.sourceId === relation.targetId &&
            r.targetId === relation.sourceId)),
    );
    if (dup) return false;
    const now = new Date().toISOString();
    set((state) => ({
      relations: [...state.relations, { id: crypto.randomUUID(), ...relation, createdAt: now, updatedAt: now }],
    }));
    return true;
  },

  updateRelation: (id, updates) =>
    set((state) => ({
      relations: state.relations.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r,
      ),
    })),

  deleteRelation: (id) =>
    set((state) => ({ relations: state.relations.filter((r) => r.id !== id) })),

  deleteByCharacter: (characterId) =>
    set((state) => ({
      relations: state.relations.filter(
        (r) => r.sourceId !== characterId && r.targetId !== characterId,
      ),
      positions: Object.fromEntries(
        Object.entries(state.positions).filter(([key]) => key !== characterId),
      ),
    })),

  getRelationsByProject: (projectId) =>
    get().relations.filter((r) => r.projectId === projectId),

  setPosition: (characterId, pos) =>
    set((state) => ({ positions: { ...state.positions, [characterId]: pos } })),

  loadFromDisk: async (projectDir: string) => {
    const data = await loadProjectJson<RelationsFile>(projectDir, "data", "relations.json");
    set({ relations: data?.relations ?? [], positions: data?.positions ?? {} });
  },

  saveToDisk: (projectDir: string) => {
    const key = projectDir;
    if (saveTimers[key]) clearTimeout(saveTimers[key]!);
    saveTimers[key] = setTimeout(() => {
      const { relations, positions } = get();
      saveProjectJson(projectDir, "data", "relations.json", { relations, positions }).catch(
        (e) => console.error("保存人物关系失败:", e),
      );
      saveTimers[key] = null;
    }, 500);
  },
}));
