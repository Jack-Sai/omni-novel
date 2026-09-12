import { forwardRef, useImperativeHandle } from "react";
import { useEditor, EditorContent, type Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { CharacterCount } from "@tiptap/extensions";
import { Toolbar } from "./Toolbar";

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
    extensions: [StarterKit, CharacterCount],
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

  if (!editor) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface">
      <div className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-4 py-2">
        <Toolbar editor={editor} />
      </div>

      <div className="flex-1 overflow-auto bg-surface">
        <div className="mx-auto w-full max-w-[var(--app-reading-measure)] px-8 py-12 pb-32">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
});
