import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  BookOpen,
  ArrowRight,
  Loader2,
  Phone,
  Lock,
  Sparkles,
  FileText,
  Users,
  Layers,
  Download,
  Wand2,
} from "lucide-react";
import { useUserStore } from "../stores/userStore";

export function LoginPage() {
  const navigate = useNavigate();
  const { currentUser, login, register, isLoading, error, init } = useUserStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (currentUser) {
      navigate("/bookshelf");
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!username.trim()) {
      setLocalError("请输入用户名");
      return;
    }

    if (!password.trim()) {
      setLocalError("请输入密码");
      return;
    }

    if (mode === "register" && password.length < 6) {
      setLocalError("密码至少需要6位");
      return;
    }

    if (mode === "register" && phone && !/^1[3-9]\d{9}$/.test(phone)) {
      setLocalError("手机号格式不正确");
      return;
    }

    let success = false;
    if (mode === "login") {
      success = await login(username.trim(), password.trim());
    } else {
      success = await register(
        username.trim(),
        password.trim(),
        phone.trim() || undefined,
        displayName.trim() || undefined
      );
    }

    if (success) {
      navigate("/bookshelf");
    }
  };

  const handleQuickStart = async () => {
    const defaultUsername = "作者";
    const defaultPassword = "123456";
    setLocalError("");

    let success = await login(defaultUsername, defaultPassword);
    if (!success) {
      success = await register(defaultUsername, defaultPassword, undefined, "作者");
    }

    if (success) {
      navigate("/bookshelf");
    }
  };

  const features = [
    { icon: FileText, title: "智能编辑器", desc: "富文本编辑，AI实时辅助创作" },
    { icon: Users, title: "人物管理", desc: "构建立体角色，管理人物关系" },
    { icon: Layers, title: "世界观设定", desc: "10大类世界观要素系统管理" },
    { icon: Wand2, title: "伏笔追踪", desc: "埋设、回收、废弃全链路管理" },
    { icon: Sparkles, title: "AI 写作助手", desc: "本地模型驱动，续写润色扩写" },
    { icon: Download, title: "多格式导出", desc: "支持 TXT/MD/HTML/DOCX 导出" },
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-bg)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-[var(--color-bg)]">
      {/* 左侧蓝色面板 - 登录模式显示标语 */}
      <div className="relative hidden w-1/2 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-hover)] lg:block">
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center px-8 transition-all duration-500 ease-in-out ${
            mode === "login" ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-12"
          }`}
        >
          <BookOpen className="mb-6 h-16 w-16 text-white drop-shadow-lg" />
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-white">Omni Novel</h1>
          <p className="text-lg text-white/90">AI 驱动的小说创作平台</p>
          <p className="mt-2 text-white/70">让创作更简单，让故事更精彩</p>
        </div>

        {/* 注册模式：功能介绍卡片 */}
        <div
          className={`absolute inset-0 flex items-center justify-center px-8 transition-all duration-500 ease-in-out ${
            mode === "register" ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12"
          }`}
        >
          <div className="w-full max-w-md">
            <div className="mb-6 text-center">
              <BookOpen className="mx-auto mb-4 h-12 w-12 text-white drop-shadow-lg" />
              <h2 className="text-2xl font-bold text-white">开启创作之旅</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className={`rounded-xl bg-white/15 p-4 backdrop-blur-sm transition-all duration-400 hover:bg-white/25 ${
                    mode === "register"
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-4"
                  }`}
                  style={{ transitionDelay: mode === "register" ? `${index * 60}ms` : "0ms" }}
                >
                  <feature.icon className="mb-2 h-5 w-5 text-white" />
                  <h3 className="text-sm font-medium text-white">{feature.title}</h3>
                  <p className="mt-1 text-xs text-white/80">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 右侧表单区域 - 登录模式 */}
      <div
        className={`absolute inset-y-0 right-0 flex w-full items-center justify-center transition-all duration-500 ease-in-out lg:w-1/2 ${
          mode === "login" ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full"
        }`}
      >
        <div className="w-full max-w-md px-8">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-2xl font-bold text-[var(--color-text)]">欢迎回来</h2>
            <p className="text-[var(--color-text-secondary)]">登录您的账号继续创作</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                用户名
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-secondary)]" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="输入用户名"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-3 pl-10 pr-4 text-[var(--color-text)] placeholder-[var(--color-text-secondary)] outline-none transition focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-secondary)]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-3 pl-10 pr-4 text-[var(--color-text)] placeholder-[var(--color-text-secondary)] outline-none transition focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            {(localError || error) && (
              <p className="text-sm text-red-500">{localError || error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-3 font-medium text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  登录
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setLocalError("");
              }}
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              没有账号？立即注册
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--color-border)]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-[var(--color-bg)] px-2 text-[var(--color-text-secondary)]">或者</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleQuickStart}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 font-medium text-[var(--color-text)] transition hover:bg-[var(--color-border)] disabled:opacity-50"
          >
            <User className="h-5 w-5" />
            快速开始（无需注册）
          </button>
        </div>
      </div>

      {/* 左侧表单区域 - 注册模式 */}
      <div
        className={`absolute inset-y-0 left-0 flex w-full items-center justify-center transition-all duration-500 ease-in-out lg:w-1/2 ${
          mode === "register" ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-full"
        }`}
      >
        <div className="w-full max-w-md px-8">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-2xl font-bold text-[var(--color-text)]">创建账号</h2>
            <p className="text-[var(--color-text-secondary)]">注册新账号开始创作之旅</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                用户名
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-secondary)]" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="输入用户名"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-3 pl-10 pr-4 text-[var(--color-text)] placeholder-[var(--color-text-secondary)] outline-none transition focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-secondary)]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码（至少6位）"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-3 pl-10 pr-4 text-[var(--color-text)] placeholder-[var(--color-text-secondary)] outline-none transition focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                手机号（可选）
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-secondary)]" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="输入手机号"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-3 pl-10 pr-4 text-[var(--color-text)] placeholder-[var(--color-text-secondary)] outline-none transition focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                显示名称（可选）
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-secondary)]" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="输入显示名称"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-3 pl-10 pr-4 text-[var(--color-text)] placeholder-[var(--color-text-secondary)] outline-none transition focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            {(localError || error) && (
              <p className="text-sm text-red-500">{localError || error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-3 font-medium text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  注册
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setLocalError("");
              }}
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              已有账号？立即登录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
