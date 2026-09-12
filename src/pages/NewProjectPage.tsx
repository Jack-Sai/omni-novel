import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";
import { useUserStore } from "../stores/userStore";
import { projectDb } from "../services/database";
import { useProjectStore } from "../stores/projectStore";

const genres = [
  "玄幻",
  "奇幻",
  "武侠",
  "仙侠",
  "都市",
  "现实",
  "军事",
  "历史",
  "游戏",
  "体育",
  "悬疑",
  "科幻",
  "言情",
  "轻小说",
  "其他",
];

export function NewProjectPage() {
  const navigate = useNavigate();
  const { currentUser } = useUserStore();
  const { setCurrentProject } = useProjectStore();
  
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [targetWords, setTargetWords] = useState(100000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError("请输入书名");
      return;
    }
    
    if (!currentUser) {
      setError("请先登录");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const newProject = await projectDb.create({
        user_id: currentUser.id,
        title: title.trim(),
        author: author.trim() || currentUser.display_name,
        genre,
        synopsis: synopsis.trim(),
      });

      if (newProject) {
        setCurrentProject(newProject as any);
        navigate("/editor");
      }
    } catch (err) {
      console.error("Failed to create project:", err);
      setError("创建失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg)]">
      {/* 顶部导航栏 */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/bookshelf")}
            className="rounded-lg p-2 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-border)]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-[var(--color-primary)]" />
            <h1 className="text-xl font-bold text-[var(--color-text)]">创建新作品</h1>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基本信息 */}
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6">
              <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">基本信息</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                    书名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="输入你的作品名称"
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-[var(--color-text)] placeholder-[var(--color-text-secondary)] outline-none transition focus:border-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                    作者
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="笔名或本名（默认使用用户昵称）"
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-[var(--color-text)] placeholder-[var(--color-text-secondary)] outline-none transition focus:border-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                    类型
                  </label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
                  >
                    <option value="">选择类型</option>
                    {genres.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                    目标字数
                  </label>
                  <input
                    type="number"
                    value={targetWords}
                    onChange={(e) => setTargetWords(parseInt(e.target.value) || 100000)}
                    min={1000}
                    step={10000}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
                  />
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    当前设置：{(targetWords / 10000).toFixed(0)}万字
                  </p>
                </div>
              </div>
            </section>

            {/* 作品简介 */}
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6">
              <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">作品简介</h2>
              <textarea
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                placeholder="用一两句话概括你的故事核心，吸引读者的注意力..."
                rows={4}
                className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-[var(--color-text)] placeholder-[var(--color-text-secondary)] outline-none transition focus:border-[var(--color-primary)]"
              />
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                {synopsis.length} / 500 字
              </p>
            </section>

            {/* 错误提示 */}
            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            {/* 提交按钮 */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate("/bookshelf")}
                className="rounded-lg border border-[var(--color-border)] px-6 py-3 font-medium text-[var(--color-text)] transition hover:bg-[var(--color-border)]"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-3 font-medium text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    创建中...
                  </>
                ) : (
                  "创建作品"
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
