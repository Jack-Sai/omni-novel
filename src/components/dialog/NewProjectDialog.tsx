import { useState } from "react";
import { BookOpen } from "lucide-react";
import { Button, Dialog, Field, Input, Select, Textarea } from "../ui";

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
    if (!title.trim()) return;

    onCreateProject({ title: title.trim(), author, genre, synopsis });
    setTitle("");
    setAuthor("");
    setGenre("");
    setSynopsis("");
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="新建项目"
      description="填写基本信息，创建后可随时修改"
      icon={BookOpen}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button variant="primary" type="submit" form="new-project-form" disabled={!title.trim()}>
            创建项目
          </Button>
        </>
      }
    >
      <form id="new-project-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="书名" required>
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：归墟守陵录"
          />
        </Field>

        <Field label="作者">
          <Input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="笔名或本名"
          />
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
            rows={3}
            placeholder="一句话概括故事核心"
          />
        </Field>
      </form>
    </Dialog>
  );
}
