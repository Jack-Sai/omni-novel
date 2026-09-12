const techStack = [
  {
    name: "Tauri",
    desc: "轻量级桌面框架，Rust 内核，安全高效",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    name: "React",
    desc: "组件化 UI 库，声明式渲染",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="2.5" />
        <ellipse cx="12" cy="12" rx="10" ry="4" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
      </svg>
    ),
  },
  {
    name: "TypeScript",
    desc: "类型安全的 JavaScript 超集",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M8 13h3v5H8v-5zm5 0h3v5h-3v-5z" />
      </svg>
    ),
  },
  {
    name: "SQLite",
    desc: "嵌入式数据库，数据本地存储",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <ellipse cx="12" cy="6" rx="8" ry="3" />
        <path d="M4 6v6c0 1.657 3.582 3 8 3s8-1.343 8-3V6" />
        <path d="M4 12v6c0 1.657 3.582 3 8 3s8-1.343 8-3v-6" />
      </svg>
    ),
  },
  {
    name: "Vite",
    desc: "下一代前端构建工具",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
];

export function TechStack() {
  return (
    <section id="tech" className="py-20 md:py-28 bg-subtle">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight">
            现代技术栈
          </h2>
          <p className="mt-4 text-ink-2 text-[15px] leading-relaxed">
            基于成熟可靠的开源技术构建，兼顾性能与开发体验。
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {techStack.map((t) => (
            <div
              key={t.name}
              className="flex flex-col items-center text-center p-5 rounded-xl border border-line bg-surface shadow-xs"
            >
              <div className="w-12 h-12 rounded-xl bg-canvas flex items-center justify-center text-ink-2 mb-3">
                {t.icon}
              </div>
              <h3 className="text-[14px] font-medium text-ink">{t.name}</h3>
              <p className="mt-1 text-[12px] text-ink-3 leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
