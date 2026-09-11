import * as Dialog from "@radix-ui/react-dialog";
import { X, Keyboard } from "lucide-react";

interface ShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  { category: "编辑器", items: [
    { keys: ["Ctrl", "B"], description: "加粗" },
    { keys: ["Ctrl", "I"], description: "斜体" },
    { keys: ["Ctrl", "S"], description: "保存" },
    { keys: ["Ctrl", "Z"], description: "撤销" },
    { keys: ["Ctrl", "Y"], description: "重做" },
    { keys: ["Ctrl", "Shift", "V"], description: "粘贴为纯文本" },
  ]},
  { category: "导航", items: [
    { keys: ["Ctrl", "1"], description: "编辑器" },
    { keys: ["Ctrl", "2"], description: "大纲" },
    { keys: ["Ctrl", "3"], description: "人物" },
    { keys: ["Ctrl", "4"], description: "世界观" },
    { keys: ["Ctrl", "5"], description: "伏笔" },
    { keys: ["Ctrl", "6"], description: "AI 助手" },
    { keys: ["Ctrl", "7"], description: "设置" },
  ]},
  { category: "通用", items: [
    { keys: ["Ctrl", "K"], description: "搜索" },
    { keys: ["Ctrl", "N"], description: "新建项目" },
    { keys: ["Ctrl", "E"], description: "导出" },
    { keys: ["?"], description: "显示快捷键帮助" },
  ]},
];

export function ShortcutsHelp({ open, onOpenChange }: ShortcutsHelpProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[90%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[var(--color-bg)] p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Keyboard size={20} className="text-[var(--color-primary)]" />
              <Dialog.Title className="text-xl font-bold">快捷键</Dialog.Title>
            </div>
            <Dialog.Close className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
              <X size={20} />
            </Dialog.Close>
          </div>

          <div className="max-h-[60vh] space-y-4 overflow-auto">
            {shortcuts.map((group) => (
              <div key={group.category}>
                <h3 className="mb-2 font-medium text-[var(--color-primary)]">{group.category}</h3>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <div key={item.description} className="flex items-center justify-between rounded-lg px-3 py-1.5 hover:bg-[var(--color-bg-secondary)]">
                      <span className="text-sm">{item.description}</span>
                      <div className="flex gap-1">
                        {item.keys.map((key) => (
                          <kbd
                            key={key}
                            className="rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-1.5 py-0.5 text-xs font-mono"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
