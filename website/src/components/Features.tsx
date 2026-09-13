import {
  PenTool,
  BookOpen,
  Users,
  Map,
  Eye,
  Sparkles,
} from "lucide-react";
import { useInView } from "../hooks/useInView";

const features = [
  {
    icon: PenTool,
    title: "核心编辑器",
    desc: "基于 TipTap 的富文本编辑器，支持自动保存、字数统计、格式化工具栏。编辑器内集成 AI 快捷操作：续写、润色、扩写、缩写。",
    color: "text-primary",
    bg: "bg-primary-soft",
  },
  {
    icon: BookOpen,
    title: "大纲管理",
    desc: "卷 / 章 / 节三级层级结构，支持拖拽排序。状态标签：草稿、初稿、修改、定稿，长篇写作不易跑偏。",
    color: "text-success",
    bg: "bg-success-soft",
  },
  {
    icon: Users,
    title: "人物管理",
    desc: "完整人物卡片系统：姓名、性格、背景、目标、冲突、关系、能力、弱点、标签。写作时随时核对人物设定。",
    color: "text-warning",
    bg: "bg-warning-soft",
  },
  {
    icon: Map,
    title: "世界观管理",
    desc: "10 类世界观要素：地理、历史、政治、经济、社会、文化、科技、宗教、生物、其他。为故事搭好底层设定。",
    color: "text-primary",
    bg: "bg-primary-soft",
  },
  {
    icon: Eye,
    title: "伏笔管理",
    desc: "埋设、回收、废弃三种状态追踪。重要程度标记，关联人物，埋设 / 回收章节追踪，避免线索断线。",
    color: "text-danger",
    bg: "bg-danger-soft",
  },
  {
    icon: Sparkles,
    title: "AI 智能助手",
    desc: "支持 Ollama、llama.cpp、vLLM、LM Studio 等本地推理框架。多轮对话、流式输出、快捷操作，AI 写你定。",
    color: "text-primary",
    bg: "bg-primary-soft",
  },
];

export function Features() {
  const { ref, isVisible } = useInView(0.1);

  return (
    <section id="features" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        {/* 标题 */}
        <div
          ref={ref}
          className={`text-center max-w-2xl mx-auto mb-14 fade-in-section ${isVisible ? "visible" : ""}`}
        >
          <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight">
            全流程创作工具
          </h2>
          <p className="mt-4 text-ink-2 text-[15px] leading-relaxed">
            从灵感萌生到作品导出，每一个环节都有对应的工具辅助，
            让你专注于故事本身。
          </p>
        </div>

        {/* 功能网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => {
            const { ref: cardRef, isVisible: cardVisible } = useInView(0.1);
            return (
              <div
                key={f.title}
                ref={cardRef}
                className={`group p-6 rounded-xl border border-line bg-surface shadow-xs hover:shadow-sm hover:border-line-strong transition-all duration-150 fade-in-section ${cardVisible ? "visible" : ""} fade-in-delay-${(i % 6) + 1}`}
              >
                <div
                  className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-4`}
                >
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="text-[15px] font-medium text-ink">{f.title}</h3>
                <p className="mt-2 text-[13px] text-ink-2 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
