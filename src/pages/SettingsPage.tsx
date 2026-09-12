import { useState, useRef } from "react";
import {
  AlertTriangle,
  Check,
  Database,
  Download,
  ExternalLink,
  Info,
  Palette,
  Save,
  Sparkles,
  Upload,
} from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useSettingsStore } from "../stores/settingsStore";
import { useProjectStore } from "../stores/projectStore";
import { ollama, BackupService } from "../services";
import {
  Badge,
  Button,
  Field,
  Input,
  Page,
  PageBody,
  PageHeader,
  Section,
  SettingRow,
  ThemeToggle,
} from "../components/ui";
export function SettingsPage() {
  const { ai, updateAISettings } = useSettingsStore();
  const { currentProject } = useProjectStore();
  const [saved, setSaved] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "failure" | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    ollama.updateConfig({ baseUrl: ai.baseUrl, model: ai.model });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    ollama.updateConfig({ baseUrl: ai.baseUrl, model: ai.model });
    const connected = await ollama.checkConnection();
    setModels(connected ? await ollama.listModels() : []);
    setTestResult(connected ? "success" : "failure");
    setTesting(false);
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportSuccess(null);

    const success = await BackupService.importBackup(file);
    setImportSuccess(success);
    setImporting(false);

    if (fileInputRef.current) fileInputRef.current.value = "";
    setTimeout(() => setImportSuccess(null), 3000);
  };

  const sliders = [
    {
      label: "Temperature",
      value: ai.temperature,
      min: "0",
      max: "2",
      step: "0.1",
      hint: "控制输出随机性。0 = 确定性输出，越高越发散和创造性。推荐写作场景设 0.7~0.9",
      onChange: (v: string) => updateAISettings({ temperature: parseFloat(v) }),
    },
    {
      label: "Top P",
      value: ai.topP,
      min: "0",
      max: "1",
      step: "0.05",
      hint: "核采样阈值。从概率累计达到 P 的词中采样。0.9 表示过滤掉最不靠谱的 10% 词汇",
      onChange: (v: string) => updateAISettings({ topP: parseFloat(v) }),
    },
    {
      label: "Top K",
      value: ai.topK,
      min: "1",
      max: "100",
      step: "1",
      hint: "每步仅从概率最高的 K 个候选词中选择。值越小输出越集中，越大越多样",
      onChange: (v: string) => updateAISettings({ topK: parseInt(v) }),
    },
    {
      label: "重复惩罚",
      value: ai.repeatPenalty,
      min: "1",
      max: "2",
      step: "0.1",
      hint: "惩罚已出现过的词，减少重复。1.0 = 不惩罚，1.1~1.3 适合大多数场景",
      onChange: (v: string) => updateAISettings({ repeatPenalty: parseFloat(v) }),
    },
  ];

  return (
    <Page>
      <PageHeader
        title="设置"
        description="模型、外观与数据备份"
        actions={
          <Button variant="primary" onClick={handleSave}>
            {saved ? <Check size={15} /> : <Save size={15} />}
            {saved ? "已保存" : "保存设置"}
          </Button>
        }
      />

      <PageBody width="reading">
        <div className="space-y-4">
          {/* 外观 */}
          <Section title="外观" icon={Palette}>
            <SettingRow title="主题" description="选择亮色、暗色或跟随系统">
              <ThemeToggle />
            </SettingRow>
          </Section>

          {/* AI 模型 */}
          <Section
            title="AI 模型"
            description="本地 Ollama 服务"
            icon={Sparkles}
            contentClassName="space-y-5"
          >
            <Field label="模型端点" hint="例如 http://localhost:11434">
              <Input
                value={ai.baseUrl}
                onChange={(e) => updateAISettings({ baseUrl: e.target.value })}
                placeholder="Ollama 端点地址"
              />
            </Field>

            <Field label="模型名称">
              <div className="flex gap-2">
                <Input
                  value={ai.model}
                  onChange={(e) => updateAISettings({ model: e.target.value })}
                  placeholder="输入模型名称"
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  loading={testing}
                  onClick={handleTestConnection}
                  className="shrink-0"
                >
                  {testing ? "检测中" : "检测连接"}
                </Button>
              </div>
              {testResult === "success" && (
                <p className="mt-1.5 text-[13px] text-success">连接成功，模型可用</p>
              )}
              {testResult === "failure" && (
                <p className="mt-1.5 text-[13px] text-danger">连接失败，请检查端点地址和 Ollama 服务是否已启动</p>
              )}
            </Field>

            {models.length > 0 && (
              <div className="omni-pop">
                <p className="mb-2 text-[12px] text-ink-3">检测到 {models.length} 个可用模型</p>
                <div className="flex flex-wrap gap-1.5">
                  {models.map((model) => (
                    <button
                      key={model}
                      type="button"
                      onClick={() => updateAISettings({ model })}
                      className={
                        "rounded-full border px-2.5 py-1 text-xs transition-colors " +
                        (ai.model === model
                          ? "border-primary-line bg-primary-soft font-medium text-primary"
                          : "border-line text-ink-2 hover:border-line-strong hover:bg-hover hover:text-ink")
                      }
                    >
                      {model}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              {sliders.map((slider) => (
                <Field key={slider.label} label={`${slider.label} · ${slider.value}`} hint={slider.hint}>
                  <input
                    type="range"
                    min={slider.min}
                    max={slider.max}
                    step={slider.step}
                    value={slider.value}
                    onChange={(e) => slider.onChange(e.target.value)}
                    className="w-full"
                  />
                </Field>
              ))}
            </div>

            <Field label="最大 Token 数" hint="单次生成的最大长度。1 中文字 ≈ 1.5~2 token，2048 ≈ 1000~1300 字">
              <Input
                type="number"
                value={ai.maxTokens}
                onChange={(e) => updateAISettings({ maxTokens: parseInt(e.target.value) })}
                min="256"
                max="8192"
                step="256"
              />
            </Field>

            <SettingRow
              title="关闭思考"
              description="关闭模型内部推理过程，节省上下文窗口并加快响应速度。推荐开启"
            >
              <button
                type="button"
                role="switch"
                aria-checked={ai.think}
                onClick={() => updateAISettings({ think: !ai.think })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                  ai.think ? "bg-primary" : "bg-line-strong"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                    ai.think ? "translate-x-5.5" : "translate-x-0.5"
                  } mt-0.5`}
                />
              </button>
            </SettingRow>
          </Section>

          {/* 数据备份 */}
          <Section
            title="数据备份与恢复"
            icon={Database}
            contentClassName="space-y-4"
          >
            <SettingRow
              title="导出所有数据"
              description="备份全部项目、章节、人物、世界观等数据"
            >
              <Button variant="secondary" onClick={() => BackupService.exportBackup()}>
                <Download size={15} />
                导出备份
              </Button>
            </SettingRow>

            {currentProject && (
              <SettingRow title="导出当前项目" description={`仅备份「${currentProject.title}」`}>
                <Button
                  variant="secondary"
                  onClick={() => BackupService.exportProject(currentProject.id)}
                >
                  <Download size={15} />
                  导出项目
                </Button>
              </SettingRow>
            )}

            <SettingRow title="导入备份" description="从备份文件恢复，将覆盖当前数据">
              <div className="flex items-center gap-2">
                {importSuccess !== null && (
                  <Badge variant={importSuccess ? "success" : "danger"}>
                    {importSuccess ? "导入成功" : "导入失败"}
                  </Badge>
                )}
                <Button
                  variant="secondary"
                  loading={importing}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={15} />
                  {importing ? "导入中" : "导入备份"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                  disabled={importing}
                />
              </div>
            </SettingRow>

            <div className="flex items-start gap-2 rounded-lg border border-warning-line bg-warning-soft p-3">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" aria-hidden />
              <p className="text-[12px] leading-relaxed text-warning">
                导入备份会覆盖当前所有数据，操作前请确认已导出重要内容。
              </p>
            </div>
          </Section>

          {/* 关于 */}
          <Section title="关于" icon={Info}>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
              <dt className="text-ink-3">版本</dt>
              <dd className="text-ink">Omni Novel v1.0.0</dd>
              <dt className="text-ink-3">简介</dt>
              <dd className="text-ink">AI 驱动的小说创作桌面应用</dd>
              <dt className="text-ink-3">项目地址</dt>
              <dd>
                <button
                  type="button"
                  onClick={() => openUrl("https://github.com/Jack-Sai/omni-novel")}
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  github.com/Jack-Sai/omni-novel
                  <ExternalLink size={12} />
                </button>
              </dd>
            </dl>
          </Section>
        </div>
      </PageBody>
    </Page>
  );
}
