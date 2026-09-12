import { useState, useRef } from "react";
import { Save, Check, Download, Upload, AlertTriangle } from "lucide-react";
import { ThemeToggle } from "../components/ui";
import { useSettingsStore } from "../stores/settingsStore";
import { useProjectStore } from "../stores/projectStore";
import { ollama, BackupService } from "../services";

export function SettingsPage() {
  const { ai, updateAISettings } = useSettingsStore();
  const { currentProject } = useProjectStore();
  const [saved, setSaved] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    ollama.updateConfig({
      baseUrl: ai.baseUrl,
      model: ai.model,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    ollama.updateConfig({ baseUrl: ai.baseUrl, model: ai.model });
    const connected = await ollama.checkConnection();
    if (connected) {
      const modelList = await ollama.listModels();
      setModels(modelList);
    } else {
      setModels([]);
    }
    setTesting(false);
  };

  const handleExportBackup = async () => {
    await BackupService.exportBackup();
  };

  const handleExportProject = async () => {
    if (currentProject) {
      await BackupService.exportProject(currentProject.id);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportSuccess(null);

    const success = await BackupService.importBackup(file);
    setImportSuccess(success);
    setImporting(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setTimeout(() => setImportSuccess(null), 3000);
  };

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">设置</h1>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white transition hover:bg-[var(--color-primary-hover)]"
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saved ? "已保存" : "保存设置"}
        </button>
      </div>

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
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">模型端点</label>
              <input
                type="text"
                value={ai.baseUrl}
                onChange={(e) => updateAISettings({ baseUrl: e.target.value })}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
                placeholder="Ollama 端点地址"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">模型名称</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ai.model}
                  onChange={(e) => updateAISettings({ model: e.target.value })}
                  className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
                  placeholder="输入模型名称"
                />
                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="rounded-lg border border-[var(--color-border)] px-4 py-2 transition hover:bg-[var(--color-bg)] disabled:opacity-50"
                >
                  {testing ? "检测中..." : "检测连接"}
                </button>
              </div>
              {models.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {models.map((model) => (
                    <button
                      key={model}
                      onClick={() => updateAISettings({ model })}
                      className={`rounded-full px-3 py-1 text-xs transition ${
                        ai.model === model
                          ? "bg-[var(--color-primary)] text-white"
                          : "border border-[var(--color-border)] hover:bg-[var(--color-bg)]"
                      }`}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Temperature ({ai.temperature})</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={ai.temperature}
                  onChange={(e) => updateAISettings({ temperature: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">创造性（越高越随机）</p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Top P ({ai.topP})</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={ai.topP}
                  onChange={(e) => updateAISettings({ topP: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">采样范围</p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Top K ({ai.topK})</label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={ai.topK}
                  onChange={(e) => updateAISettings({ topK: parseInt(e.target.value) })}
                  className="w-full"
                />
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">候选词数量</p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">重复惩罚 ({ai.repeatPenalty})</label>
                <input
                  type="range"
                  min="1"
                  max="2"
                  step="0.1"
                  value={ai.repeatPenalty}
                  onChange={(e) => updateAISettings({ repeatPenalty: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">避免重复</p>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">最大 Token 数</label>
              <input
                type="number"
                value={ai.maxTokens}
                onChange={(e) => updateAISettings({ maxTokens: parseInt(e.target.value) })}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
                min="256"
                max="8192"
                step="256"
              />
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">单次生成的最大长度</p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <h2 className="mb-3 font-semibold">数据备份与恢复</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">导出所有数据</p>
                <p className="text-sm text-[var(--color-text-secondary)]">备份所有项目、章节、人物、世界观等数据</p>
              </div>
              <button
                onClick={handleExportBackup}
                className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 transition hover:bg-[var(--color-bg)]"
              >
                <Download size={16} />
                导出备份
              </button>
            </div>

            {currentProject && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">导出当前项目</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">仅备份当前项目的数据</p>
                </div>
                <button
                  onClick={handleExportProject}
                  className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 transition hover:bg-[var(--color-bg)]"
                >
                  <Download size={16} />
                  导出项目
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">导入备份</p>
                <p className="text-sm text-[var(--color-text-secondary)]">从备份文件恢复数据（将覆盖当前数据）</p>
              </div>
              <div className="flex items-center gap-2">
                {importSuccess !== null && (
                  <span className={`text-sm ${importSuccess ? "text-green-500" : "text-red-500"}`}>
                    {importSuccess ? "导入成功" : "导入失败"}
                  </span>
                )}
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 transition hover:bg-[var(--color-bg)]">
                  <Upload size={16} />
                  {importing ? "导入中..." : "导入备份"}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                    disabled={importing}
                  />
                </label>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <p>导入备份将覆盖当前所有数据，请确保已备份重要数据。</p>
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
