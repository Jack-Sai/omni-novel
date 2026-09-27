import { create } from "zustand";

interface UIStore {
  /** 侧边栏收起状态（跨组件共享：标题栏按钮 ↔ 侧边栏） */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  /**
   * 待打开的章节 id（跨页定位：一致性报告「定位章节」等 → 编辑器消费后清空）。
   * 只在编辑器已挂载时生效；若从其他页跳转，路由先到 /editor 再由 effect 消费。
   */
  pendingOpenChapterId: string | null;
  setPendingOpenChapterId: (id: string | null) => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  pendingOpenChapterId: null,
  setPendingOpenChapterId: (id) => set({ pendingOpenChapterId: id }),
}));
