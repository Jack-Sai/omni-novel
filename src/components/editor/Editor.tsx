import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CharacterCount from "@tiptap/extension-character-count";
import { Toolbar } from "./Toolbar";

interface EditorProps {
  content?: string;
  onUpdate?: (content: string) => void;
  placeholder?: string;
}

export function Editor({ content = "", onUpdate, placeholder = "开始写作..." }: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      CharacterCount,
    ],
    content,
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] p-4",
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="flex h-full flex-col">
      <Toolbar editor={editor} />
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
      <div className="border-t border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)]">
        {editor.storage.characterCount.characters()} 字
      </div>
    </div>
  );
}
