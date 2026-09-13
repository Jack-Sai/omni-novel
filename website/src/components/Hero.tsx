import { Download, Sparkles, Lock, PenTool, BookOpen } from "lucide-react";
import { useInView } from "../hooks/useInView";

const GITHUB_URL = "https://github.com/Jack-Sai/omni-novel";
const RELEASE_URL = "https://github.com/Jack-Sai/omni-novel/releases";

const highlights = [
  {
    icon: Lock,
    title: "隐私优先",
    desc: "100% 本地运行，无云服务，无遥测",
  },
  {
    icon: Sparkles,
    title: "本地 AI",
    desc: "支持 Ollama / llama.cpp / LM Studio 等本地模型",
  },
  {
    icon: PenTool,
    title: "作者主导",
    desc: "AI 生成内容可审阅、可回滚、可对比",
  },
  {
    icon: BookOpen,
    title: "全流程创作",
    desc: "灵感 → 设定 → 大纲 → 章节 → 正文 → 导出",
  },
];

export function Hero() {
  const { ref: titleRef, isVisible: titleVisible } = useInView(0.1);
  const { ref: cardsRef, isVisible: cardsVisible } = useInView(0.1);

  return (
    <section className="relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary-soft/50 to-canvas pointer-events-none" />

      <div className="relative mx-auto max-w-6xl px-6 pt-24 pb-20 md:pt-32 md:pb-28">
        {/* 主标题 */}
        <div
          ref={titleRef}
          className={`max-w-3xl mx-auto text-center fade-in-section ${titleVisible ? "visible" : ""}`}
        >
          <h1 className="text-4xl md:text-6xl font-semibold text-ink tracking-tight leading-tight">
            Omni{" "}
            <span className="text-primary">Novel</span>
          </h1>

          <p className="mt-5 text-lg md:text-xl text-ink-2 leading-relaxed">
            AI 驱动的小说创作桌面应用
            <br className="hidden sm:block" />
            让创作更简单，让故事更精彩
          </p>

          <p className="mt-3 text-base text-ink-3 font-medium tracking-wide">
            AI 写，你定。
          </p>

          {/* CTA 按钮 */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={RELEASE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-7 h-12 rounded-xl bg-primary text-on-primary text-[15px] font-medium hover:bg-primary-hover transition-all duration-150 shadow-md hover:shadow-lg no-underline"
            >
              <Download className="w-5 h-5" />
              免费下载
            </a>

            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-7 h-12 rounded-xl border border-line bg-surface text-ink text-[15px] font-medium hover:bg-hover hover:border-line-strong transition-all duration-150 no-underline"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>
          </div>

          <p className="mt-4 text-xs text-ink-3">
            支持 Windows 11 · 开源免费
          </p>
        </div>

        {/* 亮点卡片 */}
        <div
          ref={cardsRef}
          className={`mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 fade-in-section ${cardsVisible ? "visible" : ""}`}
        >
          {highlights.map((item, i) => (
            <div
              key={item.title}
              className={`highlight-card flex flex-col items-center text-center p-6 rounded-xl border border-line bg-surface shadow-xs hover:shadow-sm transition-all duration-200 fade-in-delay-${i + 1}`}
            >
              <div className="w-11 h-11 rounded-xl bg-primary-soft flex items-center justify-center mb-4">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-[15px] font-medium text-ink">{item.title}</h3>
              <p className="mt-1.5 text-[13px] text-ink-2 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
