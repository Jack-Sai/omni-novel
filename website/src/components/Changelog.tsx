import { Check, AlertTriangle } from "lucide-react";
import { useInView } from "../hooks/useInView";

const releases = [
  {
    version: "v1.0.0",
    date: "2026",
    current: true,
    items: [
      "本地优先：作品 100% 存于本地，不联网、不遥测",
      "本地模型：接入 Ollama / llama.cpp / vLLM / LM Studio，支持流式对话",
      "编辑器：TipTap 富文本，自动保存、字数统计、AI 续写 / 润色",
      "设定管理：人物、世界观、伏笔三大模块",
      "大纲：卷 / 章 / 节三级结构，拖拽排序与状态管理",
      "导出：TXT / Markdown / HTML / DOCX",
    ],
  },
];

const knownLimits = [
  "记忆与向量系统（sqlite-vec）尚在开发，AI 暂不会跨章节记忆你的设定",
  "EPUB 导出暂未提供，当前支持 TXT / Markdown / HTML / DOCX",
  "PRD 中的一致性检查、文风系统、版本对比、插件等模块仍在路线图中",
];

export function Changelog() {
  const { ref, isVisible } = useInView(0.1);

  return (
    <section id="changelog" className="py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-6">
        {/* 标题 */}
        <div
          ref={ref}
          className={`text-center max-w-2xl mx-auto mb-14 fade-in-section ${isVisible ? "visible" : ""}`}
        >
          <span className="inline-block text-[13px] font-medium text-primary bg-primary-soft px-3 py-1 rounded-full mb-4">
            更新日志
          </span>
          <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight">
            版本与已知限制
          </h2>
          <p className="mt-4 text-ink-2 text-[15px] leading-relaxed">
            我们如实记录每个版本的变动。当前为首个公开版本，部分规划能力仍在路上。
          </p>
        </div>

        {/* 版本卡片 */}
        <div className="space-y-4">
          {releases.map((r) => (
            <div
              key={r.version}
              className="p-6 rounded-2xl border border-line bg-surface shadow-xs"
            >
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-[18px] font-semibold text-ink">{r.version}</h3>
                {r.current && (
                  <span className="text-[12px] font-medium text-primary bg-primary-soft border border-primary-line px-2.5 h-6 inline-flex items-center rounded-full">
                    当前版本
                  </span>
                )}
                <span className="text-[13px] text-ink-3 ml-auto">{r.date}</span>
              </div>
              <ul className="space-y-2.5">
                {r.items.map((it) => (
                  <li key={it} className="flex items-start gap-2.5 text-[14px] text-ink-2">
                    <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* 已知限制 */}
        <div className="mt-6 p-5 rounded-2xl border border-warning-line bg-warning-soft">
          <div className="flex items-center gap-2 mb-3 text-warning">
            <AlertTriangle className="w-4 h-4" />
            <h3 className="text-[14px] font-semibold">已知限制（诚实说明）</h3>
          </div>
          <ul className="space-y-2">
            {knownLimits.map((it) => (
              <li key={it} className="text-[13px] text-ink-2 leading-relaxed">
                · {it}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
