import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, FolderOpen } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useUserStore } from "../stores/userStore";
import { projectDb } from "../services/database";
import { useProjectStore } from "../stores/projectStore";
import { Page, PageHeader, PageBody } from "../components/ui/Page";
import { Section } from "../components/ui/Section";
import { Field, Input, Select, Textarea } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

const genres = [
  "玄幻",
  "奇幻",
  "武侠",
  "仙侠",
  "都市",
  "现实",
  "军事",
  "历史",
  "游戏",
  "体育",
  "悬疑",
  "科幻",
  "言情",
  "轻小说",
  "其他",
];

export function NewProjectPage() {
  const navigate = useNavigate();
  const { currentUser } = useUserStore();
  const { setCurrentProject } = useProjectStore();

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [targetWords, setTargetWords] = useState(100000);
  const [storagePath, setStoragePath] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSelectPath = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "选择项目存储位置",
      });

      if (selected) {
        setStoragePath(selected as string);
      }
    } catch (err) {
      console.error("Failed to select path:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("请输入书名");
      return;
    }

    if (!currentUser) {
      setError("请先登录");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const newProject = await projectDb.create({
        user_id: currentUser.id,
        title: title.trim(),
        author: author.trim() || currentUser.display_name,
        genre,
        synopsis: synopsis.trim(),
        storage_path: storagePath,
      });

      if (newProject) {
        setCurrentProject(newProject as any);
        navigate("/editor");
      }
    } catch (err) {
      console.error("Failed to create project:", err);
      setError("创建失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Page>
      <PageHeader
        leading={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="返回书架"
            onClick={() => navigate("/bookshelf")}
          >
            <ArrowLeft size={16} />
          </Button>
        }
        title="创建新作品"
      />

      <PageBody width="reading">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Section title="基本信息" icon={BookOpen}>
            <div className="space-y-4">
              <Field label="书名" required>
                <Input
                  value={title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                  placeholder="输入你的作品名称"
                />
              </Field>

              <Field label="作者" hint="默认使用用户昵称">
                <Input
                  value={author}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAuthor(e.target.value)}
                  placeholder="笔名或本名"
                />
              </Field>

              <Field label="类型">
                <Select
                  value={genre}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGenre(e.target.value)}
                >
                  <option value="">选择类型</option>
                  {genres.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="目标字数" hint="当前设置：10万字">
                <Input
                  type="number"
                  value={targetWords}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const v = parseInt(e.target.value);
                    if (!isNaN(v) && v >= 10000) setTargetWords(v);
                  }}
                  min={10000}
                />
              </Field>
            </div>
          </Section>

          <Section title="存储设置" icon={FolderOpen}>
            <Field label="项目存储路径" hint="自定义项目文件的存储位置，方便备份和管理">
              <div className="flex gap-2">
                <Input
                  value={storagePath}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStoragePath(e.target.value)}
                  placeholder="留空则使用默认路径"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSelectPath}
                  className="shrink-0"
                >
                  <FolderOpen size={15} />
                  选择
                </Button>
              </div>
            </Field>
          </Section>

          <Section title="作品简介">
            <Textarea
              value={synopsis}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSynopsis(e.target.value)}
              placeholder="用一两句话概括你的故事核心，吸引读者的注意力..."
              rows={4}
            />
            <p className="mt-2 text-xs text-ink-3">
              {synopsis.length} / 500 字
            </p>
          </Section>

          {error && (
            <div className="rounded-lg bg-danger-soft p-4 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/bookshelf")}
            >
              取消
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={!title.trim()}
            >
              创建作品
            </Button>
          </div>
        </form>
      </PageBody>
    </Page>
  );
}
