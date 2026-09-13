import { ChevronDown } from "lucide-react";
import { useInView } from "../hooks/useInView";

const faqs = [
  {
    q: "Omni Novel 是免费的吗？",
    a: "完全免费，采用 MIT 许可。没有内购、没有订阅，也没有隐藏收费。你可以自由使用、修改和分发。",
  },
  {
    q: "我的小说数据安全吗？会不会上传到云端？",
    a: "数据 100% 保存在本地。作品只存在你电脑上的项目目录里，应用不联网、不遥测、不上传任何内容。断网也能完整使用。",
  },
  {
    q: "需要联网或付费的 AI 接口吗？",
    a: "不需要。原生支持 Ollama、llama.cpp、LM Studio、vLLM 等本地推理框架，模型跑在你自己的机器上。如果你想接 OpenAI 兼容的云端模型，那是你自己的选择，并非必需。",
  },
  {
    q: "支持哪些导出格式？",
    a: "支持 TXT、Markdown、HTML 与 DOCX 四种格式，可直接交稿或自行发布。",
  },
  {
    q: "对电脑配置有要求吗？",
    a: "取决于你使用的本地模型大小。7B 级别的模型在普通笔记本上即可流畅运行；更大的模型建议配备独立显卡以获得更好的生成速度。",
  },
  {
    q: "支持哪些平台？有手机版吗？",
    a: "当前主推 Windows 11（x64）。底层基于 Tauri，理论上也支持 macOS 与 Linux，社区已在推进；手机版暂不在路线中，我们专注桌面写作体验。",
  },
];

export function FAQ() {
  const { ref, isVisible } = useInView(0.1);

  return (
    <section id="faq" className="py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-6">
        {/* 标题 */}
        <div
          ref={ref}
          className={`text-center max-w-2xl mx-auto mb-14 fade-in-section ${isVisible ? "visible" : ""}`}
        >
          <span className="inline-block text-[13px] font-medium text-primary bg-primary-soft px-3 py-1 rounded-full mb-4">
            常见问题
          </span>
          <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight">
            你可能想问
          </h2>
          <p className="mt-4 text-ink-2 text-[15px] leading-relaxed">
            关于本地运行、数据安全与功能，这里先回答最常见的几个。
          </p>
        </div>

        {/* 折叠列表 */}
        <div className="divide-y divide-line border-y border-line">
          {faqs.map((item) => (
            <details key={item.q} className="group">
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none py-5 text-[15px] font-medium text-ink select-none [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown className="w-5 h-5 text-ink-3 shrink-0 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="pb-5 text-[14px] text-ink-2 leading-relaxed">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
