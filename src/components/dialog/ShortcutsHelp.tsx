import { Keyboard } from "lucide-react";
import { Dialog, Kbd } from "../ui";

interface ShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcutGroups = [
  {
    category: "编辑器",
    items: [
      { keys: ["Ctrl", "B"], description: "加粗" },
      { keys: ["Ctrl", "I"], description: "斜体" },
      { keys: ["Ctrl", "S"], description: "保存" },
      { keys: ["Ctrl", "Z"], description: "撤销" },
      { keys: ["Ctrl", "Y"], description: "重做" },
      { keys: ["Ctrl", "Shift", "V"], description: "粘贴为纯文本" },
    ],
  },
  {
    category: "导航",
    items: [
      { keys: ["Ctrl", "1"], description: "编辑器" },
      { keys: ["Ctrl", "2"], description: "大纲" },
      { keys: ["Ctrl", "3"], description: "人物" },
      { keys: ["Ctrl", "4"], description: "世界观" },
      { keys: ["Ctrl", "5"], description: "伏笔" },
      { keys: ["Ctrl", "6"], description: "AI 助手" },
      { keys: ["Ctrl", "7"], description: "设置" },
    ],
  },
  {
    category: "通用",
    items: [
      { keys: ["Ctrl", "K"], description: "搜索" },
      { keys: ["Ctrl", "N"], description: "新建项目" },
      { keys: ["Ctrl", "E"], description: "导出" },
      { keys: ["?"], description: "显示快捷键帮助" },
    ],
  },
];

export function ShortcutsHelp({ open, onOpenChange }: ShortcutsHelpProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="快捷键"
      description="常用的键盘操作"
      icon={Keyboard}
      size="lg"
    >
      <div className="max-h-[60vh] space-y-5 overflow-auto">
        {shortcutGroups.map((group) => (
          <section key={group.category}>
            <h3 className="mb-2 text-[12px] font-semibold tracking-wide text-ink-3">
              {group.category}
            </h3>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <div
                  key={item.description}
                  className="flex items-center justify-between gap-4 rounded-md px-2 py-1.5 transition-colors hover:bg-subtle"
                >
                  <span className="text-[13px] text-ink">{item.description}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    {item.keys.map((key) => (
                      <Kbd key={key}>{key}</Kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
