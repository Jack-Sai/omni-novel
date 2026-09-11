import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProject: (project: NewProject) => void;
}

export interface NewProject {
  title: string;
  author: string;
  genre: string;
  synopsis: string;
}

export function NewProjectDialog({ open, onOpenChange, onCreateProject }: NewProjectDialogProps) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState("");
  const [synopsis, setSynopsis] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateProject({ title, author, genre, synopsis });
    setTitle("");
    setAuthor("");
    setGenre("");
    setSynopsis("");
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[var(--color-bg)] p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-xl font-bold">新建项目</Dialog.Title>
            <Dialog.Close className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
              <X size={20} />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">书名 *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
                placeholder="输入书名"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">作者</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
                placeholder="输入作者名"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">类型</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
              >
                <option value="">选择类型</option>
                <option value="fantasy">玄幻</option>
                <option value="urban">都市</option>
                <option value="suspense">悬疑</option>
                <option value="scifi">科幻</option>
                <option value="romance">言情</option>
                <option value="historical">历史</option>
                <option value="other">其他</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">简介</label>
              <textarea
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
                placeholder="简要描述故事内容"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Dialog.Close
                type="button"
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 transition hover:bg-[var(--color-bg-secondary)]"
              >
                取消
              </Dialog.Close>
              <button
                type="submit"
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white transition hover:bg-[var(--color-primary-hover)]"
              >
                创建
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
