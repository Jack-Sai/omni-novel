import { create } from "zustand";

interface UIStore {
  /** 侧边栏收起状态（跨组件共享：标题栏按钮 ↔ 侧边栏） */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
