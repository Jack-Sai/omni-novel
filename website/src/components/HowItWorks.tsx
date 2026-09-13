import { Image } from "lucide-react";
import { useInView } from "../hooks/useInView";

const steps = [
  {
    title: "新建项目",
    desc: "创建你的作品，填写书名、类型与目标读者。所有内容只存在本地，不会上传任何服务器。",
    shot: "书架 / 新建项目",
  },
  {
    title: "搭建设定",
    desc: "用人物卡、世界观、伏笔三大模块系统化沉淀灵感，写作时随时回看，设定不再散落各处。",
    shot: "人物 / 世界观面板",
  },
  {
    title: "规划大纲",
    desc: "卷 / 章 / 节三级层级，拖拽排序，草稿 / 初稿 / 定稿状态一目了然，长篇结构不跑偏。",
    shot: "大纲编辑器",
  },
  {
    title: "撰写正文",
    desc: "TipTap 富文本编辑器自动保存、实时字数统计。AI 助手在编辑器内续写、润色、扩写，你始终是执笔人。",
    shot: "编辑器 + AI 助手",
  },
  {
    title: "导出发布",
    desc: "一键导出 TXT / Markdown / HTML / DOCX，带着完整排版交稿或自行发布。",
    shot: "导出对话框",
  },
];

export function HowItWorks() {
  const { ref, isVisible } = useInView(0.1);

  return (
    <section id="howitworks" className="py-20 md:py-28 bg-subtle">
      <div className="mx-auto max-w-6xl px-6">
        {/* 标题 */}
        <div
          ref={ref}
          className={`text-center max-w-2xl mx-auto mb-14 fade-in-section ${isVisible ? "visible" : ""}`}
        >
          <span className="inline-block text-[13px] font-medium text-primary bg-primary-soft px-3 py-1 rounded-full mb-4">
            创作流程
          </span>
          <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight">
            五步，从空白页到成稿
          </h2>
          <p className="mt-4 text-ink-2 text-[15px] leading-relaxed">
            不需要复杂的教程，打开就能写。Omni Novel 把长篇小说创作拆成清晰可循的几步。
          </p>
        </div>

        {/* 步骤列表 */}
        <div className="space-y-5">
          {steps.map((s, i) => {
            const { ref: cardRef, isVisible: cardVisible } = useInView(0.1);
            return (
              <div
                key={s.title}
                ref={cardRef}
                className={`group grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-center p-6 rounded-2xl border border-line bg-surface shadow-xs hover:shadow-sm hover:border-line-strong transition-all duration-150 fade-in-section ${cardVisible ? "visible" : ""} fade-in-delay-${(i % 5) + 1}`}
              >
                {/* 序号 + 连接线 */}
                <div className="flex items-center gap-4 md:flex-col">
                  <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center text-lg font-semibold shrink-0">
                    {i + 1}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-px h-6 bg-line-strong hidden md:block" />
                  )}
                </div>

                {/* 内容 + 截图占位 */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-5 items-center">
                  <div>
                    <h3 className="text-[17px] font-medium text-ink">{s.title}</h3>
                    <p className="mt-2 text-[14px] text-ink-2 leading-relaxed">
                      {s.desc}
                    </p>
                  </div>
                  <div
                    className="h-28 rounded-xl border border-dashed border-line-strong bg-subtle flex flex-col items-center justify-center text-ink-3 gap-1.5"
                    aria-hidden="true"
                  >
                    <Image className="w-5 h-5" />
                    <span className="text-[12px]">{s.shot}</span>
                    <span className="text-[11px] opacity-70">截图占位</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
