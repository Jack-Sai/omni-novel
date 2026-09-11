import { ThemeToggle } from "../components/ui";

export function SettingsPage() {
  return (
    <div className="flex h-full flex-col p-6">
      <h1 className="mb-6 text-2xl font-bold">设置</h1>

      <div className="space-y-6">
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <h2 className="mb-3 font-semibold">外观</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">主题</p>
              <p className="text-sm text-[var(--color-text-secondary)]">选择亮色、暗色或跟随系统</p>
            </div>
            <ThemeToggle />
          </div>
        </section>

        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <h2 className="mb-3 font-semibold">AI 模型</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">模型端点</label>
              <input
                type="text"
                defaultValue="http://localhost:11434"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
                placeholder="Ollama 端点地址"
              />
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                默认为 Ollama 本地服务地址
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">模型名称</label>
              <input
                type="text"
                defaultValue="qwen2.5:7b"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
                placeholder="输入模型名称"
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <h2 className="mb-3 font-semibold">关于</h2>
          <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
            <p>Omni Novel v0.1.0</p>
            <p>AI 驱动的小说创作桌面应用</p>
            <p>技术栈：Tauri v2 + React 19 + TypeScript</p>
          </div>
        </section>
      </div>
    </div>
  );
}
