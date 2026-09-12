import { create } from "zustand";
import { userDb } from "../services/database";

export interface User {
  id: string;
  username: string;
  phone: string | null;
  password: string;
  display_name: string;
  avatar: string | null;
  created_at: string;
  updated_at: string;
}

interface UserStore {
  currentUser: User | null;
  users: User[];
  isLoading: boolean;
  error: string | null;
  
  // 初始化
  init: () => Promise<void>;
  
  // 用户操作
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string, phone?: string, displayName?: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: { display_name?: string; avatar?: string; phone?: string; password?: string }) => Promise<void>;
  
  // 获取用户列表
  getUsers: () => User[];
}

export const useUserStore = create<UserStore>()((set, get) => ({
  currentUser: null,
  users: [],
  isLoading: false,
  error: null,

  init: async () => {
    set({ isLoading: true, error: null });
    try {
      // 从 localStorage 获取当前用户 ID
      const savedUserId = localStorage.getItem("currentUserId");
      if (savedUserId) {
        const user = await userDb.getById(savedUserId);
        if (user) {
          set({ currentUser: user as User, isLoading: false });
          return;
        }
      }
      set({ isLoading: false });
    } catch (error) {
      console.error("Failed to initialize user:", error);
      set({ error: "Failed to load user", isLoading: false });
    }
  },

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await userDb.verifyPassword(username, password);
      if (!user) {
        set({ error: "用户名或密码错误", isLoading: false });
        return false;
      }
      
      localStorage.setItem("currentUserId", user.id);
      set({ currentUser: user as User, isLoading: false });
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      set({ error: "登录失败", isLoading: false });
      return false;
    }
  },

  register: async (username: string, password: string, phone?: string, displayName?: string) => {
    set({ isLoading: true, error: null });
    try {
      // 检查用户名是否已存在
      const existingUser = await userDb.getByUsername(username);
      if (existingUser) {
        set({ error: "用户名已存在", isLoading: false });
        return false;
      }

      // 检查手机号是否已存在
      if (phone) {
        const existingPhone = await userDb.getByPhone(phone);
        if (existingPhone) {
          set({ error: "手机号已注册", isLoading: false });
          return false;
        }
      }

      const newUser = await userDb.create(username, password, phone, displayName);
      localStorage.setItem("currentUserId", newUser.id);
      
      // 构造完整的 User 对象
      const fullUser: User = {
        id: newUser.id,
        username: newUser.username,
        phone: newUser.phone,
        password: password,
        display_name: newUser.displayName || newUser.username,
        avatar: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      set({ currentUser: fullUser, isLoading: false });
      return true;
    } catch (error) {
      console.error("Register failed:", error);
      set({ error: "注册失败", isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem("currentUserId");
    set({ currentUser: null });
  },

  updateProfile: async (updates) => {
    const { currentUser } = get();
    if (!currentUser) return;

    try {
      const updatedUser = await userDb.update(currentUser.id, updates);
      if (updatedUser) {
        set({ currentUser: updatedUser as User });
      }
    } catch (error) {
      console.error("Update profile failed:", error);
      set({ error: "更新失败" });
    }
  },

  getUsers: () => {
    return get().users;
  },
}));
