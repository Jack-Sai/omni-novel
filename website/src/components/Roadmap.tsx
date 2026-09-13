import { CheckCircle2, CircleDashed, Loader2 } from "lucide-react";
import { useInView } from "../hooks/useInView";

type Status = "done" | "doing" | "plan";

const roadmap: { title: string; status: Status; note: string }[] = [
  {
    title: "本地模型接入（Ollama / llama.cpp / vLLM / LM Studio）",
    status: "done",
    note: "流式对话已接通，断网也能用，AI 写你定。",
  },
  {
    title: "核心编辑器与设定管理（人物 / 世界观 / 伏笔）",
    status: "done",
    note: "TipTap 编辑器 + 三大设定模块，灵感不再散落。",
  },
  {
    title: "大纲管理与多格式导出（TXT / MD / HTML / DOCX）",
    status: "done",
    note: "卷 / 章 / 节三级结构，一键导出交稿。",
  },
  {
    title: "EPUB 导出",
    status: "doing",
    note: "面向电子书分发，补齐标准导出格式。",
  },
  {
    title: "记忆与向量系统",
    status: "doing",
    note: "sqlite-vec 分层记忆 + 混合检索，让 AI 记住你的世界观与设定。",
  },
  {
    title: "一致性与质量检查",
    status: "plan",
    note: "人设崩坏、伏笔遗漏、AI 腔检测，写作中的自动校对。",
  },
  {
    title: "文风系统",
    status: "plan",
    note: "可学习的作者文风，统一全篇语气与笔触。",
  },
  {
    title: "版本对比与提示词库",
    status: "plan",
    note: "章节版本差异比对，常用提示词沉淀复用。",
  },
  {
    title: "可视化工作流 / 插件系统 / 写作统计",
    status: "plan",
    note: "更高阶的创作自动化与写作洞察。",
  },
];

const statusMeta: Record<
  Status,
  { label: string; icon: typeof CheckCircle2; cls: string; spin?: boolean }
> = {
  done: { label: "已落地", icon: CheckCircle2, cls: "text-success bg-success-soft border-success-line" },
  doing: { label: "进行中", icon: Loader2, cls: "text-primary bg-primary-soft border-primary-line", spin: true },
  plan: { label: "计划中", icon: CircleDashed, cls: "text-ink-3 bg-subtle border-line" },
};

export function Roadmap() {
  const { ref, isVisible } = useInView(0.1);

  return (
    <section id="roadmap" className="py-20 md:py-28 bg-subtle">
      <div className="mx-auto max-w-3xl px-6">
        {/* 标题 */}
        <div
          ref={ref}
          className={`text-center max-w-2xl mx-auto mb-14 fade-in-section ${isVisible ? "visible" : ""}`}
        >
          <span className="inline-block text-[13px] font-medium text-primary bg-primary-soft px-3 py-1 rounded-full mb-4">
            路线图
          </span>
          <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight">
            我们下一步去哪
          </h2>
          <p className="mt-4 text-ink-2 text-[15px] leading-relaxed">
            一个本地优先的创作工具，会沿着"更懂你的故事"一路打磨。下面是当前进度与计划。
          </p>
        </div>

        {/* 路线图列表 */}
        <ul className="space-y-3">
          {roadmap.map((item) => {
            const meta = statusMeta[item.status];
            const Icon = meta.icon;
            return (
              <li
                key={item.title}
                className="flex items-start gap-4 p-5 rounded-xl border border-line bg-surface shadow-xs hover:shadow-sm transition-all duration-150"
              >
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full border text-[12px] font-medium shrink-0 mt-0.5 ${meta.cls}`}
                >
                  <Icon className={`w-3.5 h-3.5 ${meta.spin ? "animate-spin" : ""}`} />
                  {meta.label}
                </span>
                <div>
                  <h3 className="text-[15px] font-medium text-ink leading-snug">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-[13px] text-ink-2 leading-relaxed">
                    {item.note}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
