import { useState } from "react";
import { Plus, BookOpen, Trash2 } from "lucide-react";
import { NewProjectDialog, NewProject } from "../components/dialog";
import { useProjectStore } from "../stores/projectStore";

export function EditorPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { projects, currentProject, addProject, setCurrentProject, deleteProject } = useProjectStore();

  const handleCreateProject = (project: NewProject) => {
    addProject(project);
  };

  if (!currentProject) {
    return (
      <div className="flex h-full flex-col p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">我的项目</h1>
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white transition hover:bg-[var(--color-primary-hover)]"
          >
            <Plus size={18} />
            新建项目
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <BookOpen size={48} className="text-[var(--color-text-secondary)]" />
            <p className="text-[var(--color-text-secondary)]">还没有项目，开始创建吧</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group relative cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 transition hover:border-[var(--color-primary)]"
                onClick={() => setCurrentProject(project)}
              >
                <h3 className="mb-2 text-lg font-semibold">{project.title}</h3>
                {project.author && (
                  <p className="mb-1 text-sm text-[var(--color-text-secondary)]">作者：{project.author}</p>
                )}
                {project.genre && (
                  <span className="mb-2 inline-block rounded-full bg-[var(--color-primary-light)] px-2 py-0.5 text-xs text-[var(--color-primary)]">
                    {project.genre}
                  </span>
                )}
                {project.synopsis && (
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--color-text-secondary)]">
                    {project.synopsis}
                  </p>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteProject(project.id);
                  }}
                  className="absolute right-2 top-2 rounded p-1 text-[var(--color-text-secondary)] opacity-0 transition hover:bg-red-100 hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <NewProjectDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreateProject={handleCreateProject}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      <h1 className="mb-4 text-2xl font-bold">{currentProject.title}</h1>
      <div className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
        <p className="text-[var(--color-text-secondary)]">开始写作...</p>
      </div>
    </div>
  );
}
