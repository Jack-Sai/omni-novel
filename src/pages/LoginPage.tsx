import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, BookOpen, ArrowRight, Loader2 } from "lucide-react";
import { useUserStore } from "../stores/userStore";

export function LoginPage() {
  const navigate = useNavigate();
  const { currentUser, login, register, isLoading, error, init } = useUserStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
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

    let success = false;
    if (mode === "login") {
      success = await login(username.trim());
    } else {
      success = await register(username.trim(), displayName.trim() || undefined);
    }

    if (success) {
      navigate("/bookshelf");
    }
  };

  const handleQuickStart = async () => {
    // 快速开始：创建或登录默认用户
    const defaultUsername = "作者";
    setLocalError("");
    
    // 尝试登录
    let success = await login(defaultUsername);
    if (!success) {
      // 如果用户不存在，注册新用户
      success = await register(defaultUsername, "作者");
    }
    
    if (success) {
      navigate("/bookshelf");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-bg)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[var(--color-bg)]">
      {/* 左侧品牌区域 */}
      <div className="hidden w-1/2 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-hover)] lg:flex lg:flex-col lg:items-center lg:justify-center">
        <div className="text-center text-white">
          <BookOpen className="mx-auto mb-6 h-16 w-16" />
          <h1 className="mb-4 text-4xl font-bold">Omni Novel</h1>
          <p className="text-lg text-white/80">AI 驱动的小说创作平台</p>
          <p className="mt-2 text-white/60">让创作更简单，让故事更精彩</p>
        </div>
      </div>

      {/* 右侧登录区域 */}
      <div className="flex w-full items-center justify-center lg:w-1/2">
        <div className="w-full max-w-md px-8">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="mb-2 text-2xl font-bold text-[var(--color-text)]">
              {mode === "login" ? "欢迎回来" : "创建账号"}
            </h2>
            <p className="text-[var(--color-text-secondary)]">
              {mode === "login" ? "登录您的账号继续创作" : "注册新账号开始创作之旅"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="输入用户名"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 text-[var(--color-text)] placeholder-[var(--color-text-secondary)] outline-none transition focus:border-[var(--color-primary)]"
              />
            </div>

            {mode === "register" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                  显示名称（可选）
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="输入显示名称"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 text-[var(--color-text)] placeholder-[var(--color-text-secondary)] outline-none transition focus:border-[var(--color-primary)]"
                />
              </div>
            )}

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
                  {mode === "login" ? "登录" : "注册"}
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setLocalError("");
              }}
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              {mode === "login" ? "没有账号？立即注册" : "已有账号？立即登录"}
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
    </div>
  );
}
