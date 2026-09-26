import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, BookOpen, MoreVertical, Trash2, Edit, LogOut, Calendar, FileText } from "lucide-react";
import { useUserStore } from "../stores/userStore";
import { useProjectStore } from "../stores/projectStore";
import { useChapterStore } from "../stores/chapterStore";
import { Page, PageHeader, PageBody } from "../components/ui/Page";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";

function getWordCount(content: string): number {
  return content.replace(/<[^>]*>/g, "").replace(/\s/g, "").length;
}

export function BookshelfPage() {
  const navigate = useNavigate();
  const { currentUser } = useUserStore();
  const { projects, setCurrentProject, deleteProject } = useProjectStore();
  const { chapters } = useChapterStore();
  const [showMenu, setShowMenu] = useState<string | null>(null);

  // 如果未登录，跳转到登录页
  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
    }
  }, [currentUser, navigate]);

  const projectWordCounts = useMemo(() => {
    const wordCounts: Record<string, number> = {};
    projects.forEach((project) => {
      const projectChapters = chapters.filter((c) => c.projectId === project.id);
      wordCounts[project.id] = projectChapters.reduce((sum, c) => {
        return sum + getWordCount(c.content);
      }, 0);
    });
    return wordCounts;
  }, [projects, chapters]);

  const handleCreateProject = () => {
    navigate("/new-project");
  };

  const handleOpenProject = (project: any) => {
    setCurrentProject(project);
    navigate("/editor");
  };

  const handleDeleteProject = async (projectId: string) => {
    if (confirm("确定要删除这个项目吗？")) {
      deleteProject(projectId);
      setShowMenu(null);
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
            <span className="text-sm text-ink-2">
              {currentUser?.display_name || currentUser?.username}
            </span>
            <Button variant="ghost" size="icon-sm" onClick={handleLogout} title="退出登录">
              <LogOut size={16} />
            </Button>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group relative rounded-xl border border-neutral-200 bg-white p-5 transition-all hover:border-ink-4 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900"
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
                      onClick={() => setShowMenu(showMenu === project.id ? null : project.id)}
                    >
                      <MoreVertical size={16} />
                    </Button>
                    {showMenu === project.id && (
                      <div className="absolute right-0 top-full z-10 mt-1 w-32 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
                        <button
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
                          onClick={() => handleOpenProject(project)}
                        >
                          <Edit size={14} />
                          打开
                        </button>
                        <button
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => handleDeleteProject(project.id)}
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
                    {projectWordCounts[project.id] || 0} 字
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
