import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CharacterCount from "@tiptap/extension-character-count";
import { Sparkles } from "lucide-react";
import { Toolbar } from "./Toolbar";
import { AIAction } from "../ai";

interface EditorProps {
  content?: string;
  onUpdate?: (content: string) => void;
  placeholder?: string;
}

export function Editor({ content = "", onUpdate, placeholder = "开始写作..." }: EditorProps) {
  const [showAI, setShowAI] = useState(false);
  const [selectedText, setSelectedText] = useState("");

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
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const text = editor.state.doc.textBetween(from, to);
        setSelectedText(text);
      } else {
        setSelectedText("");
      }
    },
  });

  const handleAIAction = () => {
    setShowAI(!showAI);
  };

  const handleApplyAI = (result: string) => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    if (from !== to) {
      editor.chain().focus().deleteSelection().insertContent(result).run();
    } else {
      editor.chain().focus().insertContent(result).run();
    }
    onUpdate?.(editor.getHTML());
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-2 py-1">
        <Toolbar editor={editor} />
        <div className="ml-auto">
          <button
            onClick={handleAIAction}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]"
          >
            <Sparkles size={14} />
            AI
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
      <div className="border-t border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)]">
        {editor.storage.characterCount.characters()} 字
      </div>

      {showAI && (
        <AIAction
          selectedText={selectedText}
          onApply={handleApplyAI}
          onClose={() => setShowAI(false)}
        />
      )}
    </div>
  );
}
