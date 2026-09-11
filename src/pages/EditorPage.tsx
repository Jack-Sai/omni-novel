import { useState } from "react";
import { Plus, BookOpen, Trash2, Download } from "lucide-react";
import { NewProjectDialog, NewProject } from "../components/dialog";
import { useProjectStore } from "../stores/projectStore";
import { Editor } from "../components/editor";
import { exportService } from "../services";

export function EditorPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const { projects, currentProject, addProject, setCurrentProject, deleteProject } = useProjectStore();

  const handleCreateProject = (project: NewProject) => {
    addProject(project);
  };

  const handleExport = async (format: "txt" | "markdown") => {
    if (!currentProject || !editorContent) return;

    await exportService.exportToFile({
      format,
      filename: currentProject.title,
      content: editorContent,
      title: currentProject.title,
      author: currentProject.author,
    });
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
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--color-border)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{currentProject.title}</h1>
            {currentProject.author && (
              <p className="text-sm text-[var(--color-text-secondary)]">{currentProject.author}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative group">
              <button
                className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm transition hover:bg-[var(--color-bg-secondary)]"
              >
                <Download size={16} />
                导出
              </button>
              <div className="invisible group-hover:visible absolute right-0 top-full mt-1 w-36 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-1 shadow-lg z-10">
                <button
                  onClick={() => handleExport("markdown")}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-secondary)]"
                >
                  导出 Markdown
                </button>
                <button
                  onClick={() => handleExport("txt")}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-secondary)]"
                >
                  导出 TXT
                </button>
              </div>
            </div>
            <button
              onClick={() => setCurrentProject(null)}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm transition hover:bg-[var(--color-bg-secondary)]"
            >
              返回列表
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <Editor
          placeholder="开始你的创作..."
          onUpdate={setEditorContent}
        />
      </div>
    </div>
  );
}
