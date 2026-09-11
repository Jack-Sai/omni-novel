import { useState, useEffect, useRef } from "react";
import { Search, X, FileText, User, Map, Eye } from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
import { useChapterStore } from "../../stores/chapterStore";
import { useCharacterStore } from "../../stores/characterStore";
import { useWorldviewStore } from "../../stores/worldviewStore";
import { useForeshadowingStore } from "../../stores/foreshadowingStore";
import { useNavigate } from "react-router-dom";

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
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim() || !currentProject) {
      setResults([]);
      return;
    }

    const searchResults: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    // Search chapters
    chapters
      .filter((c) => c.projectId === currentProject.id)
      .forEach((chapter) => {
        const contentText = chapter.content.replace(/<[^>]*>/g, "");
        const index = contentText.toLowerCase().indexOf(lowerQuery);
        if (index !== -1) {
          const start = Math.max(0, index - 20);
          const end = Math.min(contentText.length, index + query.length + 20);
          searchResults.push({
            id: chapter.id,
            type: "chapter",
            title: chapter.title,
            content: (start > 0 ? "..." : "") + contentText.slice(start, end) + (end < contentText.length ? "..." : ""),
            matchIndex: index,
          });
        }
      });

    // Search characters
    characters
      .filter((c) => c.projectId === currentProject.id)
      .forEach((character) => {
        const searchText = `${character.name} ${character.personality} ${character.background}`.toLowerCase();
        const index = searchText.indexOf(lowerQuery);
        if (index !== -1) {
          searchResults.push({
            id: character.id,
            type: "character",
            title: character.name,
            content: character.personality || character.background || "",
            matchIndex: index,
          });
        }
      });

    // Search worldview
    worldviewItems
      .filter((w) => w.projectId === currentProject.id)
      .forEach((item) => {
        const searchText = `${item.name} ${item.description} ${item.details}`.toLowerCase();
        const index = searchText.indexOf(lowerQuery);
        if (index !== -1) {
          searchResults.push({
            id: item.id,
            type: "worldview",
            title: item.name,
            content: item.description || item.details || "",
            matchIndex: index,
          });
        }
      });

    // Search foreshadowing
    foreshadowingItems
      .filter((f) => f.projectId === currentProject.id)
      .forEach((item) => {
        const searchText = `${item.name} ${item.description} ${item.plantedContent} ${item.notes}`.toLowerCase();
        const index = searchText.indexOf(lowerQuery);
        if (index !== -1) {
          searchResults.push({
            id: item.id,
            type: "foreshadowing",
            title: item.name,
            content: item.description || item.plantedContent || "",
            matchIndex: index,
          });
        }
      });

    setResults(searchResults.slice(0, 20));
  }, [query, currentProject, chapters, characters, worldviewItems, foreshadowingItems]);

  const handleSelect = (result: SearchResult) => {
    onOpenChange(false);
    setQuery("");

    switch (result.type) {
      case "chapter":
        navigate("/editor");
        break;
      case "character":
        navigate("/characters");
        break;
      case "worldview":
        navigate("/worldview");
        break;
      case "foreshadowing":
        navigate("/foreshadowing");
        break;
    }
  };

  const getTypeIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "chapter":
        return <FileText size={16} className="text-blue-500" />;
      case "character":
        return <User size={16} className="text-green-500" />;
      case "worldview":
        return <Map size={16} className="text-orange-500" />;
      case "foreshadowing":
        return <Eye size={16} className="text-purple-500" />;
    }
  };

  const getTypeLabel = (type: SearchResult["type"]) => {
    switch (type) {
      case "chapter":
        return "章节";
      case "character":
        return "人物";
      case "worldview":
        return "设定";
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[20vh]">
      <div className="w-[90%] max-w-xl rounded-xl bg-[var(--color-bg)] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
          <Search size={20} className="text-[var(--color-text-secondary)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索章节、人物、设定..."
            className="flex-1 bg-transparent outline-none"
            onKeyDown={(e) => {
              if (e.key === "Escape") onOpenChange(false);
            }}
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-auto p-2">
          {results.length === 0 && query.trim() ? (
            <div className="py-8 text-center text-[var(--color-text-secondary)]">
              没有找到匹配的内容
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result)}
                  className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-[var(--color-bg-secondary)]"
                >
                  <div className="mt-0.5">{getTypeIcon(result.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{result.title}</span>
                      <span className="text-xs text-[var(--color-text-secondary)]">{getTypeLabel(result.type)}</span>
                    </div>
                    {result.content && (
                      <p className="mt-1 text-sm text-[var(--color-text-secondary)] truncate">
                        {result.content}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-secondary)]">
          按 ESC 关闭
        </div>
      </div>
    </div>
  );
}
