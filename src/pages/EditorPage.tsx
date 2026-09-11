import { useState } from "react";
import { Plus } from "lucide-react";
import { NewProjectDialog, NewProject } from "../components/dialog";
import { useProjectStore } from "../stores/projectStore";

export function EditorPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { currentProject, addProject } = useProjectStore();

  const handleCreateProject = (project: NewProject) => {
    addProject(project);
  };

  if (!currentProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-2xl font-bold">欢迎使用 Omni Novel</h1>
        <p className="text-[var(--color-text-secondary)]">开始你的创作之旅</p>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white transition hover:bg-[var(--color-primary-hover)]"
        >
          <Plus size={18} />
          新建项目
        </button>
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
