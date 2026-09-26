import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, BookOpen, MoreVertical, Trash2, Edit, LogOut, Calendar, FileText } from "lucide-react";
import { useUserStore } from "../stores/userStore";
import { useProjectStore, Project } from "../stores/projectStore";
import { Page, PageHeader, PageBody } from "../components/ui/Page";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { projectDb, loadProjectStores, loadProjectJson } from "../services";
import type { Chapter } from "../stores/chapterStore";

function getWordCount(content: string): number {
  return content.replace(/<[^>]*>/g, "").replace(/\s/g, "").length;
}

export function BookshelfPage() {
  const navigate = useNavigate();
  const { currentUser } = useUserStore();
  const { projects, setCurrentProject, addProjectFromRecord, deleteProject } = useProjectStore();
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [wordCounts, setWordCounts] = useState<Record<string, number>>({});
  /** 打开项目加载中，防重复点击 */
  const [opening, setOpening] = useState(false);

  // 如果未登录，跳转到登录页
  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
    }
  }, [currentUser, navigate]);

  // 启动时从 SQLite 合并历史项目（旧版本创建的项目只存在于数据库）
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    projectDb
      .getByUserId(currentUser.id)
      .then((rows) => {
        if (cancelled) return;
        rows.forEach((row) => addProjectFromRecord(row, { setCurrent: false }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentUser, addProjectFromRecord]);

  // 逐项目读取章节统计字数（chapters.json 在各项目目录下）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const counts: Record<string, number> = {};
      await Promise.all(
        projects.map(async (project) => {
          if (!project.storagePath) return;
          try {
            const data = await loadProjectJson<{ chapters: Chapter[] }>(
              project.storagePath,
              "data",
              "chapters.json",
            );
            if (data?.chapters) {
              counts[project.id] = data.chapters.reduce(
                (sum, c) => sum + getWordCount(c.content),
                0,
              );
            }
          } catch {
            // 忽略读取失败的项目
          }
        }),
      );
      if (!cancelled) setWordCounts(counts);
    })();
    return () => {
      cancelled = true;
    };
  }, [projects]);

  const handleCreateProject = () => {
    navigate("/new-project");
  };

  const handleOpenProject = async (project: Project) => {
    if (opening) return;
    setOpening(true);
    try {
      setCurrentProject(project);
      // 加载该项目的章节与设定数据
      await loadProjectStores(project.storagePath || "");
      navigate("/editor");
    } finally {
      setOpening(false);
    }
  };

  /** 点击卡片：菜单展开时只关闭菜单，否则打开项目进入编辑 */
  const handleCardClick = (project: Project) => {
    if (showMenu) {
      setShowMenu(null);
      return;
    }
    void handleOpenProject(project);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (confirm("确定要删除这个项目吗？")) {
      deleteProject(projectId);
      setShowMenu(null);
      try {
        await projectDb.delete(projectId);
      } catch (e) {
        console.warn("删除项目数据库记录失败:", e);
      }
    }
  };

  const handleLogout = () => {
    useUserStore.getState().logout();
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
    <Page>
      <PageHeader
        title="我的书架"
        description={`${projects.length} 部作品`}
        actions={
          <>
            <Button variant="primary" onClick={handleCreateProject}>
              <Plus size={15} />
              新建作品
            </Button>
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm text-ink-2">
                {currentUser?.display_name || currentUser?.username}
              </span>
              <Button variant="ghost" size="icon-sm" onClick={handleLogout} title="退出登录">
                <LogOut size={16} />
              </Button>
            </div>
          </>
        }
      />

      <PageBody center={projects.length === 0}>
        {projects.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="还没有作品"
            description="创建你的第一部小说"
            action={
              <Button variant="primary" onClick={handleCreateProject}>
                <Plus size={15} />
                新建作品
              </Button>
            }
          />
        ) : (
          <div className="grid w-full max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => handleCardClick(project)}
                className="group relative cursor-pointer rounded-xl border border-neutral-200 bg-white p-5 transition-all hover:border-ink-4 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-semibold text-ink-4 dark:text-ink-5">
                      {project.title}
                    </h3>
                    <p className="mt-1 text-sm text-ink-2">
                      {project.author}
                    </p>
                  </div>
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(showMenu === project.id ? null : project.id);
                      }}
                    >
                      <MoreVertical size={16} />
                    </Button>
                    {showMenu === project.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full z-10 mt-1 w-32 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
                      >
                        <button
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(null);
                            void handleOpenProject(project);
                          }}
                        >
                          <Edit size={14} />
                          打开
                        </button>
                        <button
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteProject(project.id);
                          }}
                        >
                          <Trash2 size={14} />
                          删除
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="mb-4 line-clamp-2 text-sm text-ink-2">
                  {project.synopsis || "暂无简介"}
                </p>

                <div className="flex items-center gap-4 text-xs text-ink-3">
                  <span className="flex items-center gap-1">
                    <FileText size={12} />
                    {wordCounts[project.id] || 0} 字
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {formatDate(project.updatedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageBody>
    </Page>
  );
}
