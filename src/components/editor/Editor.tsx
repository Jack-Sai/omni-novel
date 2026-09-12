import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { CharacterCount } from "@tiptap/extensions";
import { Sparkles } from "lucide-react";
import { Toolbar } from "./Toolbar";
import { AIAction } from "../ai";
import { Button } from "../ui";

interface EditorProps {
  content?: string;
  onUpdate?: (content: string) => void;
  placeholder?: string;
}

export function Editor({ content = "", onUpdate, placeholder = "开始写作…" }: EditorProps) {
  const [showAI, setShowAI] = useState(false);
  const [selectedText, setSelectedText] = useState("");

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
        setSelectedText(editor.state.doc.textBetween(from, to));
      } else {
        setSelectedText("");
      }
    },
  });

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
    <div className="flex min-h-0 flex-1 flex-col bg-surface">
      <div className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-4 py-2">
        <Toolbar editor={editor} />

        {/* 面板锚定在按钮下方，避免溢出到编辑区之外 */}
        <div className="relative ml-auto shrink-0">
          <Button
            variant={showAI ? "primary" : "secondary"}
            size="sm"
            aria-pressed={showAI}
            onClick={() => setShowAI(!showAI)}
          >
            <Sparkles size={13} />
            AI 助手
          </Button>

          {showAI && (
            <AIAction
              selectedText={selectedText}
              onApply={handleApplyAI}
              onClose={() => setShowAI(false)}
            />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-surface">
        <div className="mx-auto w-full max-w-[var(--app-reading-measure)] px-8 py-12 pb-32">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
