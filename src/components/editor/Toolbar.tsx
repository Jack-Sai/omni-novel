import type { ElementType } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo,
  Strikethrough,
  Undo,
} from "lucide-react";
import { Button } from "../ui";

interface ToolbarProps {
  editor: Editor;
}

export function Toolbar({ editor }: ToolbarProps) {
  const groups: {
    items: {
      icon: ElementType;
      label: string;
      action: () => void;
      active: boolean;
      disabled: boolean;
    }[];
  }[] = [
    {
      items: [
        {
          icon: Bold,
          label: "加粗",
          action: () => editor.chain().focus().toggleBold().run(),
          active: editor.isActive("bold"),
          disabled: false,
        },
        {
          icon: Italic,
          label: "斜体",
          action: () => editor.chain().focus().toggleItalic().run(),
          active: editor.isActive("italic"),
          disabled: false,
        },
        {
          icon: Strikethrough,
          label: "删除线",
          action: () => editor.chain().focus().toggleStrike().run(),
          active: editor.isActive("strike"),
          disabled: false,
        },
      ],
    },
    {
      items: [
        {
          icon: Heading1,
          label: "一级标题",
          action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
          active: editor.isActive("heading", { level: 1 }),
          disabled: false,
        },
        {
          icon: Heading2,
          label: "二级标题",
          action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          active: editor.isActive("heading", { level: 2 }),
          disabled: false,
        },
        {
          icon: Heading3,
          label: "三级标题",
          action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
          active: editor.isActive("heading", { level: 3 }),
          disabled: false,
        },
      ],
    },
    {
      items: [
        {
          icon: List,
          label: "无序列表",
          action: () => editor.chain().focus().toggleBulletList().run(),
          active: editor.isActive("bulletList"),
          disabled: false,
        },
        {
          icon: ListOrdered,
          label: "有序列表",
          action: () => editor.chain().focus().toggleOrderedList().run(),
          active: editor.isActive("orderedList"),
          disabled: false,
        },
        {
          icon: Quote,
          label: "引用",
          action: () => editor.chain().focus().toggleBlockquote().run(),
          active: editor.isActive("blockquote"),
          disabled: false,
        },
        {
          icon: Code,
          label: "代码块",
          action: () => editor.chain().focus().toggleCodeBlock().run(),
          active: editor.isActive("codeBlock"),
          disabled: false,
        },
        {
          icon: Minus,
          label: "分隔线",
          action: () => editor.chain().focus().setHorizontalRule().run(),
          active: false,
          disabled: false,
        },
      ],
    },
    {
      items: [
        {
          icon: Undo,
          label: "撤销",
          action: () => editor.chain().focus().undo().run(),
          active: false,
          disabled: !editor.can().undo(),
        },
        {
          icon: Redo,
          label: "重做",
          action: () => editor.chain().focus().redo().run(),
          active: false,
          disabled: !editor.can().redo(),
        },
      ],
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-0.5">
      {groups.map((group, groupIndex) => (
        <div key={groupIndex} className="flex items-center">
          {groupIndex > 0 && <div className="mx-1.5 h-4 w-px bg-line" />}
          {group.items.map((item) => (
            <Button
              key={item.label}
              variant="ghost"
              size="icon-sm"
              title={item.label}
              aria-label={item.label}
              aria-pressed={item.active}
              disabled={item.disabled}
              onClick={item.action}
              className={
                item.active
                  ? "bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary"
                  : undefined
              }
            >
              <item.icon size={15} />
            </Button>
          ))}
        </div>
      ))}
    </div>
  );
}
