import { forwardRef, useImperativeHandle, useEffect, useState } from "react";
import { useEditor, EditorContent, type Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { CharacterCount } from "@tiptap/extensions";
import { Search, Replace } from "lucide-react";
import { Toolbar } from "./Toolbar";
import { FindReplaceBar } from "./FindReplaceBar";
import { SearchExtension } from "./search";
import { Button } from "../ui";
import { useSettingsStore } from "../../stores/settingsStore";
import { useCharacterStore } from "../../stores/characterStore";
import { CharacterHighlight, CHARACTER_HIGHLIGHT_KEY } from "./characterHighlight";
import {
  createAnnotationHighlight,
  ANNOTATION_HIGHLIGHT_KEY,
} from "./annotationHighlight";
import { useAnnotationStore } from "../../stores/annotationStore";

export interface EditorRef {
  getEditor: () => TiptapEditor | null;
}

interface EditorProps {
  content?: string;
  onUpdate?: (content: string) => void;
  onSelectionUpdate?: (selectedText: string) => void;
  placeholder?: string;
  /** 当前章 id：批注高亮按章过滤（key=chapterId 重建时闭包捕获） */
  chapterId?: string;
}

export const Editor = forwardRef<EditorRef, EditorProps>(function Editor(
  {
    content = "",
    onUpdate,
    onSelectionUpdate,
    placeholder = "开始写作…",
    chapterId = null,
  },
  ref,
) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      CharacterCount,
      CharacterHighlight,
      SearchExtension,
      createAnnotationHighlight(chapterId),
    ],
    content,
    editorProps: {
      attributes: {
        class: "tiptap",
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        onSelectionUpdate?.(editor.state.doc.textBetween(from, to));
      } else {
        onSelectionUpdate?.("");
      }
    },
  });

  useImperativeHandle(ref, () => ({
    getEditor: () => editor,
  }));

  // 查找替换栏：Ctrl+F 查找 / Ctrl+H 替换（阻止浏览器默认整页查找）
  const [findMode, setFindMode] = useState<"find" | "replace" | null>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "f") {
        e.preventDefault();
        setFindMode((prev) => (prev === "find" ? prev : "find"));
      } else if (key === "h") {
        e.preventDefault();
        setFindMode((prev) => (prev === "replace" ? prev : "replace"));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // 把字体/字号/行高设置写入 CSS 变量（.tiptap 通过 var() 消费）
  const { fontSize, lineHeight, fontFamily } = useSettingsStore((s) => s.editor);
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--app-reading-size", `${fontSize}rem`);
    root.style.setProperty("--app-reading-leading", String(lineHeight));
    if (fontFamily) {
      root.style.setProperty("--app-reading-font", fontFamily);
    } else {
      root.style.removeProperty("--app-reading-font");
    }
  }, [fontSize, lineHeight, fontFamily]);

  // 人物增删改 / 高亮开关变化时重建人名高亮 Decoration
  useEffect(() => {
    if (!editor) return;
    const refresh = () => {
      editor.view.dispatch(editor.state.tr.setMeta(CHARACTER_HIGHLIGHT_KEY, true));
    };
    const unsubChars = useCharacterStore.subscribe(refresh);
    const unsubSettings = useSettingsStore.subscribe((state, prev) => {
      if (state.editor.highlightNames !== prev.editor.highlightNames) refresh();
    });
    refresh();
    return () => {
      unsubChars();
      unsubSettings();
    };
  }, [editor]);

  // 批注增删改 / 激活态变化时重建批注高亮 Decoration
  useEffect(() => {
    if (!editor) return;
    const refresh = () => {
      editor.view.dispatch(editor.state.tr.setMeta(ANNOTATION_HIGHLIGHT_KEY, true));
    };
    const unsub = useAnnotationStore.subscribe(refresh);
    refresh();
    return unsub;
  }, [editor]);

  if (!editor) {
    return null;
  }

  /** 点击正文区域空白处时聚焦编辑器（否则空白属于 wrapper，点击无法获得焦点） */
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (editor.view.dom.contains(e.target as Node)) return;
    e.preventDefault();
    editor.chain().focus("end").run();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface">
      <div className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-4 py-2">
        <Toolbar editor={editor} />
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            title="查找（Ctrl+F）"
            aria-label="查找"
            onClick={() => setFindMode(findMode === "find" ? null : "find")}
            className={
              findMode === "find"
                ? "bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary"
                : undefined
            }
          >
            <Search size={15} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="查找替换（Ctrl+H）"
            aria-label="查找替换"
            onClick={() => setFindMode(findMode === "replace" ? null : "replace")}
            className={
              findMode === "replace"
                ? "bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary"
                : undefined
            }
          >
            <Replace size={15} />
          </Button>
        </div>
      </div>

      {findMode && (
        <FindReplaceBar
          editor={editor}
          mode={findMode}
          onClose={() => setFindMode(null)}
        />
      )}

      <div className="flex-1 overflow-auto bg-surface" onMouseDown={handleCanvasMouseDown}>
        <div className="mx-auto w-full max-w-[var(--app-reading-measure)] px-8 py-12 pb-32">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
});
