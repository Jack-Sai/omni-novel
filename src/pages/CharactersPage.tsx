import { useState } from "react";
import { Plus, User, Trash2, ArrowLeft, Save } from "lucide-react";
import { useCharacterStore, Character } from "../stores/characterStore";
import { useProjectStore } from "../stores/projectStore";

export function CharactersPage() {
  const { currentProject } = useProjectStore();
  const { characters, currentCharacter, addCharacter, setCurrentCharacter, updateCharacter, deleteCharacter } = useCharacterStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");

  const projectCharacters = currentProject
    ? characters.filter((c) => c.projectId === currentProject.id)
    : [];

  const handleAdd = () => {
    if (!newName.trim() || !currentProject) return;
    addCharacter(currentProject.id, newName.trim());
    setNewName("");
    setShowAdd(false);
  };

  const handleUpdate = (updates: Partial<Character>) => {
    if (!currentCharacter) return;
    updateCharacter(currentCharacter.id, updates);
  };

  if (!currentProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <User size={48} className="text-[var(--color-text-secondary)]" />
        <p className="text-[var(--color-text-secondary)]">请先选择一个项目</p>
      </div>
    );
  }

  if (currentCharacter) {
    return (
      <div className="flex h-full flex-col p-6">
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => setCurrentCharacter(null)}
            className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">编辑人物</h1>
        </div>

        <div className="flex-1 space-y-4 overflow-auto">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">姓名</label>
              <input
                type="text"
                value={currentCharacter.name}
                onChange={(e) => handleUpdate({ name: e.target.value })}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">别名</label>
              <input
                type="text"
                value={currentCharacter.aliases.join(", ")}
                onChange={(e) => handleUpdate({ aliases: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                placeholder="用逗号分隔"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">性别</label>
              <select
                value={currentCharacter.gender}
                onChange={(e) => handleUpdate({ gender: e.target.value })}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
              >
                <option value="">未指定</option>
                <option value="male">男</option>
                <option value="female">女</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">年龄</label>
              <input
                type="text"
                value={currentCharacter.age}
                onChange={(e) => handleUpdate({ age: e.target.value })}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">外貌描写</label>
            <textarea
              value={currentCharacter.appearance}
              onChange={(e) => handleUpdate({ appearance: e.target.value })}
              rows={3}
              className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
              placeholder="描述人物的外貌特征..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">性格特点</label>
            <textarea
              value={currentCharacter.personality}
              onChange={(e) => handleUpdate({ personality: e.target.value })}
              rows={3}
              className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
              placeholder="描述人物的性格..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">背景故事</label>
            <textarea
              value={currentCharacter.background}
              onChange={(e) => handleUpdate({ background: e.target.value })}
              rows={4}
              className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
              placeholder="人物的过去经历..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">目标动机</label>
            <textarea
              value={currentCharacter.goals}
              onChange={(e) => handleUpdate({ goals: e.target.value })}
              rows={2}
              className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
              placeholder="人物想要什么？为什么？"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">冲突矛盾</label>
            <textarea
              value={currentCharacter.conflicts}
              onChange={(e) => handleUpdate({ conflicts: e.target.value })}
              rows={2}
              className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
              placeholder="人物面临的冲突..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">人际关系</label>
            <textarea
              value={currentCharacter.relationships}
              onChange={(e) => handleUpdate({ relationships: e.target.value })}
              rows={3}
              className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
              placeholder="与其他人物的关系..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">备注</label>
            <textarea
              value={currentCharacter.notes}
              onChange={(e) => handleUpdate({ notes: e.target.value })}
              rows={2}
              className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
              placeholder="其他备注信息..."
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">人物管理</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white transition hover:bg-[var(--color-primary-hover)]"
        >
          <Plus size={18} />
          添加人物
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            autoFocus
            placeholder="输入人物姓名..."
            className="flex-1 rounded-lg border border-[var(--color-primary)] bg-[var(--color-bg)] px-3 py-2 outline-none"
          />
          <button
            onClick={handleAdd}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white transition hover:bg-[var(--color-primary-hover)]"
          >
            添加
          </button>
          <button
            onClick={() => setShowAdd(false)}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 transition hover:bg-[var(--color-bg-secondary)]"
          >
            取消
          </button>
        </div>
      )}

      {projectCharacters.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <User size={48} className="text-[var(--color-text-secondary)]" />
          <p className="text-[var(--color-text-secondary)]">还没有人物，开始创建吧</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projectCharacters.map((character) => (
            <div
              key={character.id}
              className="group relative cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 transition hover:border-[var(--color-primary)]"
              onClick={() => setCurrentCharacter(character)}
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="font-semibold">{character.name}</h3>
                  {character.gender && (
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {character.gender === "male" ? "男" : character.gender === "female" ? "女" : "其他"}
                      {character.age && ` · ${character.age}`}
                    </p>
                  )}
                </div>
              </div>

              {character.personality && (
                <p className="mb-2 line-clamp-2 text-sm text-[var(--color-text-secondary)]">
                  {character.personality}
                </p>
              )}

              {character.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {character.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[var(--color-primary-light)] px-2 py-0.5 text-xs text-[var(--color-primary)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteCharacter(character.id);
                }}
                className="absolute right-2 top-2 rounded p-1 text-[var(--color-text-secondary)] opacity-0 transition hover:bg-red-100 hover:text-red-500 group-hover:opacity-100"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
