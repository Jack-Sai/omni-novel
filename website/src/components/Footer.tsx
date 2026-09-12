const GITHUB_URL = "https://github.com/Jack-Sai/omni-novel";

export function Footer() {
  return (
    <footer className="border-t border-line bg-subtle">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* 左侧 */}
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Omni Novel" className="w-6 h-6" />
            <span className="text-[14px] font-medium text-ink">Omni Novel</span>
            <span className="text-[13px] text-ink-3">v1.0.0</span>
          </div>

          {/* 中间 */}
          <p className="text-[13px] text-ink-3 text-center">
            AI 驱动的小说创作桌面应用 · MIT License
          </p>

          {/* 右侧 */}
          <div className="flex items-center gap-4">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-ink-2 hover:text-ink transition-colors duration-150 no-underline"
            >
              GitHub
            </a>
            <a
              href={`${GITHUB_URL}/blob/main/LICENSE`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-ink-2 hover:text-ink transition-colors duration-150 no-underline"
            >
              MIT License
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
