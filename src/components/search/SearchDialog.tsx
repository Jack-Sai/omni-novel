import { useState, useEffect, useRef } from "react";
import { Eye, FileText, Map, Search, User, X } from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
import { useChapterStore } from "../../stores/chapterStore";
import { useCharacterStore } from "../../stores/characterStore";
import { useWorldviewStore } from "../../stores/worldviewStore";
import { useForeshadowingStore } from "../../stores/foreshadowingStore";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Dialog, Kbd, type BadgeVariant } from "../ui";
import { cn } from "../../lib/cn";

interface SearchResult {
  id: string;
  type: "chapter" | "character" | "worldview" | "foreshadowing";
  title: string;
  content: string;
  matchIndex: number;
}

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeMeta: Record<
  SearchResult["type"],
  { label: string; icon: typeof FileText; tone: BadgeVariant; path: string }
> = {
  chapter: { label: "章节", icon: FileText, tone: "primary", path: "/editor" },
  character: { label: "人物", icon: User, tone: "success", path: "/characters" },
  worldview: { label: "设定", icon: Map, tone: "warning", path: "/worldview" },
  foreshadowing: { label: "伏笔", icon: Eye, tone: "neutral", path: "/foreshadowing" },
};

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { currentProject } = useProjectStore();
  const { chapters } = useChapterStore();
  const { characters } = useCharacterStore();
  const { items: worldviewItems } = useWorldviewStore();
  const { items: foreshadowingItems } = useForeshadowingStore();

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (!query.trim() || !currentProject) {
      setResults([]);
      return;
    }

    const found: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    const matches = (haystack: string) => haystack.toLowerCase().indexOf(lowerQuery);

    chapters
      .filter((c) => c.projectId === currentProject.id)
      .forEach((chapter) => {
        const text = chapter.content.replace(/<[^>]*>/g, "");
        const index = matches(text);
        if (index === -1) return;

        const start = Math.max(0, index - 20);
        const end = Math.min(text.length, index + query.length + 20);
        found.push({
          id: chapter.id,
          type: "chapter",
          title: chapter.title,
          content:
            (start > 0 ? "…" : "") +
            text.slice(start, end) +
            (end < text.length ? "…" : ""),
          matchIndex: index,
        });
      });

    characters
      .filter((c) => c.projectId === currentProject.id)
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
      .filter((w) => w.projectId === currentProject.id)
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
      .filter((f) => f.projectId === currentProject.id)
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

    setResults(found.slice(0, 20));
  }, [query, currentProject, chapters, characters, worldviewItems, foreshadowingItems]);

  const handleSelect = (result: SearchResult) => {
    onOpenChange(false);
    setQuery("");
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
          placeholder="搜索章节、人物、设定、伏笔…"
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
        {!currentProject ? (
          <p className="px-3 py-8 text-center text-[13px] text-ink-3">
            请先选择一个项目后再搜索
          </p>
        ) : !query.trim() ? (
          <p className="px-3 py-8 text-center text-[13px] text-ink-3">
            输入关键词开始搜索当前项目内的所有内容
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
