import { useEffect, useReducer, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Button, Input } from "../ui";
import { SEARCH_KEY, type SearchState } from "./search";

interface FindReplaceBarProps {
  editor: Editor;
  mode: "find" | "replace";
  onClose: () => void;
}

function readState(editor: Editor): SearchState | undefined {
  return SEARCH_KEY.getState(editor.state);
}

export function FindReplaceBar({ editor, mode, onClose }: FindReplaceBarProps) {
  const [, tick] = useReducer((x: number) => x + 1, 0);
  const [query, setQuery] = useState(() => readState(editor)?.query ?? "");
  const [replaceText, setReplaceText] = useState(
    () => readState(editor)?.replaceText ?? "",
  );
  const findInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // 每次事务（输入/替换/导航）后重渲以刷新计数
  useEffect(() => {
    editor.on("transaction", tick);
    return () => {
      editor.off("transaction", tick);
    };
  }, [editor]);

  // 打开时聚焦并全选查询词（继承上次查询）
  useEffect(() => {
    const el = mode === "replace" ? replaceInputRef.current : findInputRef.current;
    findInputRef.current?.focus();
    findInputRef.current?.select();
    void el;
  }, [mode]);

  const s = readState(editor);
  const total = s?.matches.length ?? 0;
  const current = s?.current ?? -1;
  const countLabel =
    query.trim() === ""
      ? ""
      : total === 0
        ? "无结果"
        : `${current + 1} / ${total}`;

  const applyQuery = (q: string, r: string) => {
    setQuery(q);
    setReplaceText(r);
    editor.chain().setSearchQuery(q, r).run();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      editor.chain().clearSearch().run();
      onClose();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) editor.chain().findPrevMatch().run();
      else editor.chain().findNextMatch().run();
    }
  };

  const doReplace = () => {
    if (current < 0) return;
    editor.chain().replaceCurrentMatch().run();
    // 替换后跳到下一处（重算后的同位置）
    editor.chain().findNextMatch().run();
  };

  return (
    <div className="flex flex-col gap-1.5 border-b border-line bg-subtle px-3 py-2">
      <div className="flex items-center gap-1.5">
        <Input
          ref={findInputRef}
          value={query}
          onChange={(e) => applyQuery(e.target.value, replaceText)}
          onKeyDown={handleKeyDown}
          placeholder="查找…"
          className="h-7 w-56 text-[13px]"
          aria-label="查找内容"
        />
        <span className="min-w-[64px] text-[12px] tabular-nums text-ink-3">{countLabel}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          title="上一个（Shift+Enter）"
          aria-label="上一个匹配"
          disabled={total === 0}
          onClick={() => editor.chain().findPrevMatch().run()}
        >
          <ChevronUp size={15} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title="下一个（Enter）"
          aria-label="下一个匹配"
          disabled={total === 0}
          onClick={() => editor.chain().findNextMatch().run()}
        >
          <ChevronDown size={15} />
        </Button>
        <div className="ml-auto flex items-center gap-1.5">
          {mode === "replace" && (
            <>
              <Input
                ref={replaceInputRef}
                value={replaceText}
                onChange={(e) => applyQuery(query, e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="替换为…"
                className="h-7 w-56 text-[13px]"
                aria-label="替换为"
              />
              <Button
                variant="secondary"
                size="sm"
                disabled={current < 0}
                onClick={doReplace}
                className="h-7 text-[12px]"
              >
                替换
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={total === 0}
                onClick={() => editor.chain().replaceAllMatches().run()}
                className="h-7 text-[12px]"
              >
                全部替换
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            title="关闭（Esc）"
            aria-label="关闭查找"
            onClick={() => {
              editor.chain().clearSearch().run();
              onClose();
            }}
          >
            <X size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
}
