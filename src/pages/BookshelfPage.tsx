import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, BookOpen, MoreVertical, Trash2, Edit, Calendar, FileText } from "lucide-react";
import { useProjectStore } from "../stores/projectStore";
import { useChapterStore } from "../stores/chapterStore";
import { Page, PageHeader, PageBody } from "../components/ui/Page";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";

const genreLabels: Record<string, string> = {
  fantasy: "玄幻",
  urban: "都市",
  suspense: "悬疑",
  scifi: "科幻",
  romance: "言情",
  historical: "历史",
  other: "其他",
};

function getWordCount(content: string): number {
  return content.replace(/<[^>]*>/g, "").replace(/\s/g, "").length;
}

export function BookshelfPage() {
  const navigate = useNavigate();
  const { projects, setCurrentProject, deleteProject } = useProjectStore();
  const { chapters } = useChapterStore();
  const [showMenu, setShowMenu] = useState<string | null>(null);

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
          <Button variant="primary" onClick={handleCreateProject}>
            <Plus size={15} />
            新建作品
          </Button>
        }
      />

      <PageBody center={projects.length === 0}>
        {projects.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="还没有作品"
            description="开始创作你的第一部小说吧"
            action={
              <Button variant="primary" onClick={handleCreateProject}>
                <Plus size={15} />
                创建新作品
              </Button>
            }
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* 创建新作品卡片 */}
            <button
              onClick={handleCreateProject}
              className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-subtle transition hover:border-primary-line hover:bg-primary-soft"
            >
              <Plus className="mb-2 h-12 w-12 text-ink-3" />
              <span className="font-medium text-ink-2">创建新作品</span>
            </button>

            {/* 项目卡片 */}
            {projects.map((project) => (
              <div
                key={project.id}
                className="group relative min-h-[200px] cursor-pointer rounded-xl border border-line bg-surface p-5 shadow-xs transition hover:border-primary-line hover:shadow-md"
                onClick={() => handleOpenProject(project)}
              >
                {/* 操作菜单 */}
                <div className="absolute right-3 top-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(showMenu === project.id ? null : project.id);
                    }}
                    className="rounded-lg p-1.5 text-ink-3 opacity-0 transition hover:bg-hover group-hover:opacity-100"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {showMenu === project.id && (
                    <div className="absolute right-0 top-full z-10 mt-1 w-32 rounded-xl border border-line bg-elevated py-1 shadow-lg">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenProject(project);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-hover"
                      >
                        <Edit className="h-4 w-4" />
                        编辑
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft"
                      >
                        <Trash2 className="h-4 w-4" />
                        删除
                      </button>
                    </div>
                  )}
                </div>

                {/* 卡片内容 */}
                <div className="mb-3 flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-ink">
                      {project.title}
                    </h3>
                    {project.author && (
                      <p className="truncate text-sm text-ink-2">
                        {project.author}
                      </p>
                    )}
                  </div>
                </div>

                {project.synopsis && (
                  <p className="mb-3 line-clamp-2 text-sm text-ink-2">
                    {project.synopsis}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between text-xs text-ink-3">
                  <div className="flex items-center gap-2">
                    {project.genre && (
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-primary">
                        {genreLabels[project.genre] ?? project.genre}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {(projectWordCounts[project.id] || 0).toLocaleString()} 字
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate((project as any).updated_at || (project as any).created_at || project.updatedAt || project.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageBody>
    </Page>
  );
}
