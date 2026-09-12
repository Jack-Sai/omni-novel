import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
import { Button, Dialog, Field, Input, Select, Textarea } from "../ui";

interface ProjectSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectSettings({ open, onOpenChange }: ProjectSettingsProps) {
  const { currentProject, updateProject } = useProjectStore();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState("");
  const [synopsis, setSynopsis] = useState("");

  useEffect(() => {
    if (currentProject) {
      setTitle(currentProject.title);
      setAuthor(currentProject.author);
      setGenre(currentProject.genre);
      setSynopsis(currentProject.synopsis);
    }
  }, [currentProject]);

  const handleSave = () => {
    if (!currentProject) return;
    updateProject(currentProject.id, { title: title.trim(), author, genre, synopsis });
    onOpenChange(false);
  };

  if (!currentProject) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="项目设置"
      description={currentProject.title}
      icon={Settings}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!title.trim()}>
            保存
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <Field label="书名" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>

        <Field label="作者">
          <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
        </Field>

        <Field label="类型">
          <Select value={genre} onChange={(e) => setGenre(e.target.value)}>
            <option value="">选择类型</option>
            <option value="fantasy">玄幻</option>
            <option value="urban">都市</option>
            <option value="suspense">悬疑</option>
            <option value="scifi">科幻</option>
            <option value="romance">言情</option>
            <option value="historical">历史</option>
            <option value="other">其他</option>
          </Select>
        </Field>

        <Field label="简介">
          <Textarea
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            rows={4}
            placeholder="简要描述故事内容"
          />
        </Field>
      </form>
    </Dialog>
  );
}
