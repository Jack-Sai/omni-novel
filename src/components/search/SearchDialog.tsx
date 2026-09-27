import { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  Brain,
  Eye,
  FileText,
  FolderKanban,
  Layers,
  Map,
  MessageSquare,
  Palette,
  Search,
  Share2,
  ShieldAlert,
  Terminal,
  User,
  X,
} from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
import { useChapterStore } from "../../stores/chapterStore";
import { useSceneStore } from "../../stores/sceneStore";
import { useVolumeStore } from "../../stores/volumeStore";
import { useCharacterStore } from "../../stores/characterStore";
import { useWorldviewStore } from "../../stores/worldviewStore";
import { useForeshadowingStore } from "../../stores/foreshadowingStore";
import { useRelationStore } from "../../stores/relationStore";
import { useUIStore } from "../../stores/uiStore";
import {
  aiDb,
  consistencyReportDb,
  memoryDb,
  promptDb,
  styleDb,
} from "../../services";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Dialog, Kbd, type BadgeVariant } from "../ui";
import { cn } from "../../lib/cn";

/** 全局搜索覆盖的 13 类内容 */
type SearchType =
  | "chapter"
  | "character"
  | "worldview"
  | "foreshadowing"
  | "scene"
  | "volume"
  | "relation"
  | "memory"
  | "aiSession"
  | "prompt"
  | "styleProfile"
  | "consistencyReport"
  | "project";

interface SearchResult {
  id: string;
  type: SearchType;
  title: string;
  content: string;
  matchIndex: number;
}

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeMeta: Record<
  SearchType,
  { label: string; icon: typeof FileText; tone: BadgeVariant; path: string }
> = {
  chapter: { label: "章节", icon: FileText, tone: "primary", path: "/editor" },
  character: { label: "人物", icon: User, tone: "success", path: "/characters" },
  worldview: { label: "设定", icon: Map, tone: "warning", path: "/worldview" },
  foreshadowing: { label: "伏笔", icon: Eye, tone: "neutral", path: "/foreshadowing" },
  scene: { label: "场景", icon: Layers, tone: "primary", path: "/chapters" },
  volume: { label: "卷", icon: BookOpen, tone: "outline", path: "/chapters" },
  relation: { label: "关系", icon: Share2, tone: "success", path: "/characters" },
  memory: { label: "记忆", icon: Brain, tone: "warning", path: "/memory" },
  aiSession: { label: "AI 会话", icon: MessageSquare, tone: "neutral", path: "/editor" },
  prompt: { label: "提示词", icon: Terminal, tone: "outline", path: "/settings" },
  styleProfile: { label: "文风", icon: Palette, tone: "primary", path: "/settings" },
  consistencyReport: {
    label: "一致性报告",
    icon: ShieldAlert,
    tone: "danger",
    path: "/consistency",
  },
  project: { label: "项目", icon: FolderKanban, tone: "outline", path: "/bookshelf" },
};

/** 统一截取命中上下文片段 */
function snippet(text: string, index: number, len: number): string {
  const start = Math.max(0, index - 20);
  const end = Math.min(text.length, index + len + 20);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

const MAX_RESULTS = 30;

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { currentProject, projects } = useProjectStore();
  const { chapters } = useChapterStore();
  const { scenes } = useSceneStore();
  const { volumes } = useVolumeStore();
  const { characters } = useCharacterStore();
  const { items: worldviewItems } = useWorldviewStore();
  const { items: foreshadowingItems } = useForeshadowingStore();
  const { relations } = useRelationStore();

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const lowerQuery = query.trim().toLowerCase();
    const matches = (haystack: string) => haystack.toLowerCase().indexOf(lowerQuery);

    const run = async () => {
      const found: SearchResult[] = [];
      const pid = currentProject?.id;

      // ── 同步 store 源 ──

      if (pid) {
        chapters
          .filter((c) => c.projectId === pid)
          .forEach((chapter) => {
            const text = chapter.content.replace(/<[^>]*>/g, "");
            const index = matches(`${chapter.title} ${chapter.summary} ${text}`);
            if (index === -1) return;
            const hit = matches(text) >= 0 ? matches(text) : matches(chapter.title);
            found.push({
              id: chapter.id,
              type: "chapter",
              title: chapter.title,
              content: snippet(text || chapter.summary, Math.max(hit, 0), query.length),
              matchIndex: index,
            });
          });

        scenes
          .filter((s) => s.projectId === pid)
          .forEach((s) => {
            const index = matches(`${s.title} ${s.summary}`);
            if (index === -1) return;
            found.push({
              id: s.id,
              type: "scene",
              title: s.title,
              content: s.summary || snippet(s.title, 0, query.length),
              matchIndex: index,
            });
          });

        volumes
          .filter((v) => v.projectId === pid)
          .forEach((v) => {
            const index = matches(`${v.title} ${v.description}`);
            if (index === -1) return;
            found.push({
              id: v.id,
              type: "volume",
              title: v.title,
              content: v.description || "",
              matchIndex: index,
            });
          });

        characters
          .filter((c) => c.projectId === pid)
          .forEach((character) => {
            const index = matches(
              `${character.name} ${character.personality} ${character.background}`,
            );
            if (index === -1) return;
            found.push({
              id: character.id,
              type: "character",
              title: character.name,
              content: character.personality || character.background || "",
              matchIndex: index,
            });
          });

        worldviewItems
          .filter((w) => w.projectId === pid)
          .forEach((item) => {
            const index = matches(`${item.name} ${item.description} ${item.details}`);
            if (index === -1) return;
            found.push({
              id: item.id,
              type: "worldview",
              title: item.name,
              content: item.description || item.details || "",
              matchIndex: index,
            });
          });

        foreshadowingItems
          .filter((f) => f.projectId === pid)
          .forEach((item) => {
            const index = matches(
              `${item.name} ${item.description} ${item.plantedContent} ${item.notes}`,
            );
            if (index === -1) return;
            found.push({
              id: item.id,
              type: "foreshadowing",
              title: item.name,
              content: item.description || item.plantedContent || "",
              matchIndex: index,
            });
          });

        relations
          .filter((r) => r.projectId === pid)
          .forEach((r) => {
            const nameOf = (id: string) =>
              characters.find((c) => c.id === id)?.name ?? "";
            const index = matches(
              `${r.label} ${r.description} ${nameOf(r.sourceId)} ${nameOf(r.targetId)}`,
            );
            if (index === -1) return;
            found.push({
              id: r.id,
              type: "relation",
              title: `${nameOf(r.sourceId)} — ${nameOf(r.targetId)}`,
              content: r.label || r.description || "",
              matchIndex: index,
            });
          });
      }

      // 项目（跨项目名，始终可搜）
      projects.forEach((p) => {
        const index = matches(`${p.title} ${p.content ?? ""}`);
        if (index === -1) return;
        found.push({
          id: p.id,
          type: "project",
          title: p.title,
          content: p.content || "项目",
          matchIndex: index,
        });
      });

      // ── 异步 DB 源 ──

      if (pid) {
        try {
          const [memories, sessions, prompts, styles, reports] = await Promise.all([
            memoryDb.list(pid),
            aiDb.listSessions(pid),
            promptDb.list(),
            styleDb.list(pid),
            consistencyReportDb.list(pid, 50),
          ]);

          if (cancelled) return;

          memories.forEach((m) => {
            const index = matches(`${m.title} ${m.content} ${m.tags}`);
            if (index === -1) return;
            found.push({
              id: m.id,
              type: "memory",
              title: m.title || "记忆",
              content: snippet(m.content, Math.max(index, 0), query.length),
              matchIndex: index,
            });
          });

          sessions.forEach((s) => {
            const index = matches(s.title);
            if (index === -1) return;
            found.push({
              id: s.id,
              type: "aiSession",
              title: s.title || "AI 会话",
              content: `更新于 ${s.updated_at}`,
              matchIndex: index,
            });
          });

          prompts.forEach((p) => {
            const index = matches(`${p.name} ${p.description} ${p.content}`);
            if (index === -1) return;
            found.push({
              id: p.id,
              type: "prompt",
              title: p.name,
              content: p.description || snippet(p.content, Math.max(index, 0), query.length),
              matchIndex: index,
            });
          });

          styles.forEach((s) => {
            const index = matches(`${s.name} ${s.description} ${s.content}`);
            if (index === -1) return;
            found.push({
              id: s.id,
              type: "styleProfile",
              title: s.name,
              content: s.description || snippet(s.content, Math.max(index, 0), query.length),
              matchIndex: index,
            });
          });

          reports.forEach((r) => {
            const titles = r.chapter_titles.replace(/[[\]"]/g, "");
            const index = matches(`${titles} ${r.issues}`);
            if (index === -1) return;
            found.push({
              id: r.id,
              type: "consistencyReport",
              title: `${r.issue_count} 个问题 · ${titles || "全书"}`,
              content: `检查时间 ${r.created_at}${r.model ? ` · ${r.model}` : ""}`,
              matchIndex: index,
            });
          });
        } catch (e) {
          console.warn("搜索数据库源失败:", e);
        }
      }

      if (!cancelled) setResults(found.slice(0, MAX_RESULTS));
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [query, currentProject, projects, chapters, scenes, volumes, characters, worldviewItems, foreshadowingItems, relations]);

  const handleSelect = (result: SearchResult) => {
    onOpenChange(false);
    setQuery("");
    // 章节：跨页定位到具体章（EditorPage 消费 pendingOpenChapterId）
    if (result.type === "chapter") {
      useUIStore.getState().setPendingOpenChapterId(result.id);
    }
    navigate(typeMeta[result.type].path);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="搜索"
      position="top"
      hideHeader
      flush
      size="xl"
      className="shadow-xl"
    >
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Search size={16} className="shrink-0 text-ink-3" aria-hidden />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索章节、场景、人物、记忆、提示词…（13 类）"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="清空搜索"
            onClick={() => setQuery("")}
          >
            <X size={14} />
          </Button>
        )}
      </div>

      <div className="max-h-[52vh] overflow-auto p-1.5">
        {!query.trim() ? (
          <p className="px-3 py-8 text-center text-[13px] text-ink-3">
            {currentProject
              ? "输入关键词搜索章节、场景、卷、人物、设定、伏笔、关系、记忆、AI 会话、提示词、文风、报告与项目"
              : "输入项目名开始搜索（打开项目后可搜索全部 13 类内容）"}
          </p>
        ) : results.length === 0 ? (
          <p className="px-3 py-8 text-center text-[13px] text-ink-3">
            没有找到匹配的内容
          </p>
        ) : (
          <div className="space-y-0.5">
            {results.map((result) => {
              const meta = typeMeta[result.type];
              const Icon = meta.icon;

              return (
                <button
                  key={`${result.type}-${result.id}`}
                  type="button"
                  onClick={() => handleSelect(result)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-md px-3 py-2 text-left",
                    "transition-colors duration-150 hover:bg-hover",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-ring)]",
                  )}
                >
                  <Icon size={15} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-medium text-ink">
                        {result.title || "未命名"}
                      </span>
                      <Badge variant={meta.tone} size="sm">
                        {meta.label}
                      </Badge>
                    </div>
                    {result.content && (
                      <p className="mt-0.5 truncate text-[12px] text-ink-2">{result.content}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-line px-4 py-2 text-[11px] text-ink-3">
        <Kbd>Esc</Kbd>
        <span>关闭</span>
        {results.length > 0 && <span className="ml-auto">{results.length} 条结果</span>}
      </div>
    </Dialog>
  );
}
