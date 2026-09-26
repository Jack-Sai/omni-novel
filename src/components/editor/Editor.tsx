import { forwardRef, useImperativeHandle, useEffect } from "react";
import { useEditor, EditorContent, type Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { CharacterCount } from "@tiptap/extensions";
import { Toolbar } from "./Toolbar";
import { useSettingsStore } from "../../stores/settingsStore";
import { useCharacterStore } from "../../stores/characterStore";
import { CharacterHighlight, CHARACTER_HIGHLIGHT_KEY } from "./characterHighlight";

export interface EditorRef {
  getEditor: () => TiptapEditor | null;
}

interface EditorProps {
  content?: string;
  onUpdate?: (content: string) => void;
  onSelectionUpdate?: (selectedText: string) => void;
  placeholder?: string;
}

export const Editor = forwardRef<EditorRef, EditorProps>(function Editor(
  { content = "", onUpdate, onSelectionUpdate, placeholder = "开始写作…" },
  ref,
) {
  const editor = useEditor({
    extensions: [StarterKit, CharacterCount, CharacterHighlight],
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
      </div>

      <div className="flex-1 overflow-auto bg-surface" onMouseDown={handleCanvasMouseDown}>
        <div className="mx-auto w-full max-w-[var(--app-reading-measure)] px-8 py-12 pb-32">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
});
