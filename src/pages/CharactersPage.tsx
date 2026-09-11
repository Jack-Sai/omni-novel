import { useState } from "react";
import { Plus, User, Trash2 } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

interface Character {
  id: string;
  name: string;
  description: string;
}

export function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCharacters([
      ...characters,
      { id: crypto.randomUUID(), name: name.trim(), description: description.trim() },
    ]);
    setName("");
    setDescription("");
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setCharacters(characters.filter((c) => c.id !== id));
  };

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">人物管理</h1>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white transition hover:bg-[var(--color-primary-hover)]"
        >
          <Plus size={18} />
          添加人物
        </button>
      </div>

      {characters.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <User size={48} className="text-[var(--color-text-secondary)]" />
          <p className="text-[var(--color-text-secondary)]">还没有人物，开始创建吧</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((character) => (
            <div
              key={character.id}
              className="group relative rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                  <User size={20} />
                </div>
                <h3 className="font-semibold">{character.name}</h3>
              </div>
              {character.description && (
                <p className="text-sm text-[var(--color-text-secondary)]">{character.description}</p>
              )}
              <button
                onClick={() => handleDelete(character.id)}
                className="absolute right-2 top-2 rounded p-1 text-[var(--color-text-secondary)] opacity-0 transition hover:bg-red-100 hover:text-red-500 group-hover:opacity-100"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[var(--color-bg)] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="text-xl font-bold">添加人物</Dialog.Title>
              <Dialog.Close className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
                <X size={20} />
              </Dialog.Close>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">姓名 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
                  placeholder="输入人物姓名"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">简介</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
                  placeholder="简要描述人物"
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
                  添加
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
