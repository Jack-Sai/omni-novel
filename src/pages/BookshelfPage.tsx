import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, BookOpen, MoreVertical, Trash2, Edit, Calendar } from "lucide-react";
import { useProjectStore } from "../stores/projectStore";
import { useUserStore } from "../stores/userStore";
import { projectDb } from "../services/database";

export function BookshelfPage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useUserStore();
  const { projects, setCurrentProject, deleteProject } = useProjectStore();
  const [showMenu, setShowMenu] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    loadProjects();
  }, [currentUser, navigate]);

  const loadProjects = async () => {
    if (!currentUser) return;
    try {
      const userProjects = await projectDb.getByUserId(currentUser.id);
      // 更新 store 中的项目列表
      useProjectStore.setState({ projects: userProjects as any[] });
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  };

  const handleCreateProject = () => {
    navigate("/new-project");
  };

  const handleOpenProject = (project: any) => {
    setCurrentProject(project);
    navigate("/editor");
  };

  const handleDeleteProject = async (projectId: string) => {
    if (confirm("确定要删除这个项目吗？")) {
      await projectDb.delete(projectId);
      deleteProject(projectId);
      setShowMenu(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg)]">
      {/* 顶部导航栏 */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-[var(--color-primary)]" />
            <h1 className="text-xl font-bold text-[var(--color-text)]">我的书架</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--color-text-secondary)]">
              {currentUser?.display_name || currentUser?.username}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            >
              退出登录
            </button>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="flex-1 overflow-auto p-6">
        {projects.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <BookOpen className="mb-4 h-16 w-16 text-[var(--color-text-secondary)]" />
            <h2 className="mb-2 text-xl font-semibold text-[var(--color-text)]">
              还没有作品
            </h2>
            <p className="mb-6 text-[var(--color-text-secondary)]">
              开始创作你的第一部小说吧
            </p>
            <button
              onClick={handleCreateProject}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-3 font-medium text-white transition hover:bg-[var(--color-primary-hover)]"
            >
              <Plus className="h-5 w-5" />
              创建新作品
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* 创建新作品卡片 */}
            <button
              onClick={handleCreateProject}
              className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]"
            >
              <Plus className="mb-2 h-12 w-12 text-[var(--color-text-secondary)]" />
              <span className="font-medium text-[var(--color-text-secondary)]">
                创建新作品
              </span>
            </button>

            {/* 项目卡片 */}
            {projects.map((project) => (
              <div
                key={project.id}
                className="group relative min-h-[200px] cursor-pointer rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5 transition hover:border-[var(--color-primary)] hover:shadow-lg"
                onClick={() => handleOpenProject(project)}
              >
                {/* 操作菜单 */}
                <div className="absolute right-3 top-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(showMenu === project.id ? null : project.id);
                    }}
                    className="rounded-lg p-1.5 text-[var(--color-text-secondary)] opacity-0 transition hover:bg-[var(--color-border)] group-hover:opacity-100"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {showMenu === project.id && (
                    <div className="absolute right-0 top-full z-10 mt-1 w-32 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-1 shadow-lg">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenProject(project);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-secondary)]"
                      >
                        <Edit className="h-4 w-4" />
                        编辑
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                        删除
                      </button>
                    </div>
                  )}
                </div>

                {/* 卡片内容 */}
                <div className="mb-3 flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-[var(--color-text)]">
                      {project.title}
                    </h3>
                    {project.author && (
                      <p className="truncate text-sm text-[var(--color-text-secondary)]">
                        {project.author}
                      </p>
                    )}
                  </div>
                </div>

                {project.synopsis && (
                  <p className="mb-3 line-clamp-2 text-sm text-[var(--color-text-secondary)]">
                    {project.synopsis}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  {project.genre && (
                    <span className="rounded-full bg-[var(--color-primary-light)] px-2 py-0.5 text-[var(--color-primary)]">
                      {project.genre}
                    </span>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate((project as any).updated_at || (project as any).created_at || project.updatedAt || project.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
