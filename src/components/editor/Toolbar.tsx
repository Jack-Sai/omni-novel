import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Undo,
  Redo,
} from "lucide-react";

interface ToolbarProps {
  editor: Editor;
}

export function Toolbar({ editor }: ToolbarProps) {
  const groups = [
    {
      items: [
        { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold"), disabled: false },
        { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic"), disabled: false },
        { icon: Strikethrough, action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike"), disabled: false },
      ],
    },
    {
      items: [
        { icon: Heading1, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive("heading", { level: 1 }), disabled: false },
        { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }), disabled: false },
        { icon: Heading3, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive("heading", { level: 3 }), disabled: false },
      ],
    },
    {
      items: [
        { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList"), disabled: false },
        { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList"), disabled: false },
        { icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote"), disabled: false },
        { icon: Code, action: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive("codeBlock"), disabled: false },
        { icon: Minus, action: () => editor.chain().focus().setHorizontalRule().run(), active: false, disabled: false },
      ],
    },
    {
      items: [
        { icon: Undo, action: () => editor.chain().focus().undo().run(), active: false, disabled: !editor.can().undo() },
        { icon: Redo, action: () => editor.chain().focus().redo().run(), active: false, disabled: !editor.can().redo() },
      ],
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1">
      {groups.map((group, groupIndex) => (
        <div key={groupIndex} className="flex items-center">
          {groupIndex > 0 && <div className="mx-2 h-5 w-px bg-[var(--color-border)]" />}
          {group.items.map((item, itemIndex) => (
            <button
              key={itemIndex}
              onClick={item.action}
              disabled={item.disabled}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                item.active
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)]"
              } ${item.disabled ? "cursor-not-allowed opacity-50" : ""}`}
              title={item.icon.displayName}
            >
              <item.icon size={16} />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
