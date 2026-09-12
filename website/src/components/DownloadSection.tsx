import { Download, Monitor } from "lucide-react";

const RELEASE_URL = "https://github.com/Jack-Sai/omni-novel/releases";

export function DownloadSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-2xl border border-line bg-surface shadow-md p-10 md:p-14 text-center">
          {/* 背景装饰 */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-soft/30 to-transparent pointer-events-none" />

          <div className="relative">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-soft mb-6">
              <Download className="w-7 h-7 text-primary" />
            </div>

            <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight">
              开始创作你的小说
            </h2>

            <p className="mt-4 text-ink-2 text-[15px] max-w-lg mx-auto leading-relaxed">
              免费下载 Omni Novel，100% 本地运行，
              <br className="hidden sm:block" />
              你的数据永远只属于你。
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={RELEASE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-8 h-13 rounded-xl bg-primary text-on-primary text-[16px] font-medium hover:bg-primary-hover transition-all duration-150 shadow-md hover:shadow-lg no-underline"
              >
                <Download className="w-5 h-5" />
                下载 v1.0.0
              </a>
            </div>

            <div className="mt-5 flex items-center justify-center gap-4 text-[13px] text-ink-3">
              <span className="inline-flex items-center gap-1.5">
                <Monitor className="w-4 h-4" />
                Windows 11 (x64)
              </span>
              <span className="w-1 h-1 rounded-full bg-ink-3" />
              <span>开源免费 · MIT License</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
