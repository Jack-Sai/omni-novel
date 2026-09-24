import { useState, useRef, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Check,
  Database,
  Download,
  ExternalLink,
  FileText,
  Info,
  Palette,
  Play,
  Save,
  Sparkles,
  Square,
  Upload,
} from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "../stores/settingsStore";
import { useProjectStore } from "../stores/projectStore";
import {
  createAIService,
  backendPresets,
  toLlamaConfig,
  type BackendType,
} from "../services/aiService";
import { BackupService } from "../services";
import {
  Badge,
  Button,
  Field,
  Input,
  Page,
  PageBody,
  PageHeader,
  Section,
  SegmentedControl,
  SettingRow,
  ThemeToggle,
} from "../components/ui";

interface LlamaServerStatus {
  running: boolean;
  loading: boolean;
  pid: number | null;
  idle_minutes: number;
}

const backendItems = (Object.keys(backendPresets) as BackendType[]).map((key) => ({
  value: key,
  label: backendPresets[key].label,
}));

export function SettingsPage() {
  const { ai, editor, updateAISettings, updateEditorSettings } = useSettingsStore();
  const { currentProject } = useProjectStore();
  const [saved, setSaved] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "failure" | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleBackendChange = (backend: BackendType) => {
    const preset = backendPresets[backend];
    updateAISettings({
      backend,
      baseUrl: preset.defaultUrl,
      model: preset.defaultModel,
    });
    setModels([]);
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    const service = createAIService({
      backend: ai.backend,
      baseUrl: ai.baseUrl,
      model: ai.model,
      apiKey: ai.apiKey,
    });

    const connected = await service.checkConnection();
    if (connected) {
      const detectedModels = await service.listModels();
      setModels(detectedModels);
    }
    setTestResult(connected ? "success" : "failure");
    setTesting(false);
  };

  // ── llama-server 进程管理 ──
  const [llamaStatus, setLlamaStatus] = useState<LlamaServerStatus | null>(null);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const refreshLlamaStatus = useCallback(async () => {
    try {
      const status = await invoke<LlamaServerStatus>("get_llama_server_status", {
        baseUrl: ai.baseUrl,
      });
      setLlamaStatus(status);
    } catch {
      setLlamaStatus(null);
    }
  }, [ai.baseUrl]);

  useEffect(() => {
    if (ai.backend !== "llamacpp") {
      setLlamaStatus(null);
      return;
    }
    refreshLlamaStatus();
    const timer = setInterval(refreshLlamaStatus, 3000);
    return () => clearInterval(timer);
  }, [ai.backend, refreshLlamaStatus]);

  const handleStartServer = async () => {
    setStarting(true);
    setStartError(null);
    try {
      await invoke("ensure_llama_ready", {
        llama: toLlamaConfig({
          baseUrl: ai.baseUrl,
          llamaServerPath: ai.llamaServerPath,
          llamaModelPath: ai.llamaModelPath,
          llamaExtraArgs: ai.llamaExtraArgs,
          idleUnloadMinutes: ai.idleUnloadMinutes,
        }),
      });
      await refreshLlamaStatus();
    } catch (e) {
      setStartError(String(e));
    } finally {
      setStarting(false);
    }
  };

  const handleStopServer = async () => {
    setStopping(true);
    setStartError(null);
    try {
      await invoke("stop_llama_server");
      await refreshLlamaStatus();
    } catch (e) {
      setStartError(String(e));
    } finally {
      setStopping(false);
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

    if (fileInputRef.current) fileInputRef.current.value = "";
    setTimeout(() => setImportSuccess(null), 3000);
  };

  const currentBackend = ai.backend ?? "ollama";
  const backendPreset = backendPresets[currentBackend];
  const isOllama = currentBackend === "ollama";
  const isLlama = currentBackend === "llamacpp";

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
    ...(isOllama
      ? [
          {
            label: "Top K",
            value: ai.topK,
            min: "1",
            max: "100",
            step: "1",
            hint: "每步仅从概率最高的 K 个候选词中选择。值越小输出越集中，越大越多样",
            onChange: (v: string) => updateAISettings({ topK: parseInt(v) }),
          },
        ]
      : []),
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

      <PageBody padded>
        <div className="mx-auto w-full max-w-4xl space-y-4">
          {/* 外观 */}
          <Section title="外观" icon={Palette}>
            <ThemeToggle />
          </Section>

          {/* 编辑器 */}
          <Section
            title="编辑器"
            description="写作体验与自动保存"
            icon={FileText}
            contentClassName="space-y-5"
          >
            <SettingRow
              title="自动保存"
              description="编辑时自动保存到磁盘，防止内容丢失"
            >
              <button
                type="button"
                role="switch"
                aria-checked={editor.autoSaveEnabled}
                onClick={() => updateEditorSettings({ autoSaveEnabled: !editor.autoSaveEnabled })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                  editor.autoSaveEnabled ? "bg-primary" : "bg-line-strong"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                    editor.autoSaveEnabled ? "translate-x-5.5" : "translate-x-0.5"
                  } mt-0.5`}
                />
              </button>
            </SettingRow>

            {editor.autoSaveEnabled && (
              <Field
                label={`自动保存间隔 · ${editor.autoSaveInterval / 1000} 秒`}
                hint="单位：秒。范围 10~300 秒"
              >
                <input
                  type="range"
                  min="10000"
                  max="300000"
                  step="5000"
                  value={editor.autoSaveInterval}
                  onChange={(e) =>
                    updateEditorSettings({ autoSaveInterval: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
              </Field>
            )}

            <Field
              label={`编辑器宽度 · ${editor.editorWidth} 字`}
              hint="正文区域的推荐字符宽度，影响阅读体验"
            >
              <input
                type="range"
                min="30"
                max="60"
                step="2"
                value={editor.editorWidth}
                onChange={(e) =>
                  updateEditorSettings({ editorWidth: parseInt(e.target.value) })
                }
                className="w-full"
              />
            </Field>
          </Section>

          {/* AI 模型 */}
          <Section
            title="AI 模型"
            description={backendPreset.description}
            icon={Sparkles}
            contentClassName="space-y-5"
          >
            {/* 后端类型选择 */}
            <Field label="推理后端" hint="选择本地模型服务类型">
              <SegmentedControl
                items={backendItems}
                value={currentBackend}
                onChange={handleBackendChange}
                variant="segment"
                fill
                size="sm"
              />
            </Field>

            {/* 端点地址 */}
            <Field label="模型端点" hint={`例如 ${backendPreset.defaultUrl}`}>
              <Input
                value={ai.baseUrl}
                onChange={(e) => updateAISettings({ baseUrl: e.target.value })}
                placeholder={backendPreset.defaultUrl}
              />
            </Field>

            {/* llama-server 进程托管（仅 llamacpp） */}
            {isLlama && (
              <div className="space-y-4 rounded-lg border border-line bg-subtle p-4">
                <SettingRow
                  title="llama-server 进程"
                  description={
                    llamaStatus?.running
                      ? llamaStatus.idle_minutes > 0
                        ? `PID ${llamaStatus.pid ?? "-"} · 已空闲 ${llamaStatus.idle_minutes} 分钟，超时自动卸载`
                        : `PID ${llamaStatus.pid ?? "-"} · 服务就绪`
                      : llamaStatus?.loading
                        ? "正在加载模型，完成后自动就绪…"
                        : "未启动。发送对话时会自动拉起，也可手动启动"
                  }
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        llamaStatus?.running
                          ? "success"
                          : llamaStatus?.loading
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {llamaStatus?.running
                        ? "运行中"
                        : llamaStatus?.loading
                          ? "加载中"
                          : "未启动"}
                    </Badge>
                    {llamaStatus?.running || llamaStatus?.loading ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={stopping}
                        onClick={handleStopServer}
                      >
                        <Square size={13} />
                        停止
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        loading={starting}
                        onClick={handleStartServer}
                      >
                        <Play size={13} />
                        {starting ? "启动中" : "启动服务"}
                      </Button>
                    )}
                  </div>
                </SettingRow>

                {startError && (
                  <p className="text-[13px] text-danger">{startError}</p>
                )}

                <Field label="llama-server 路径" hint="llama-server.exe 可执行文件位置">
                  <Input
                    value={ai.llamaServerPath}
                    onChange={(e) => updateAISettings({ llamaServerPath: e.target.value })}
                    placeholder="D:\llama.cpp\llama-server.exe"
                  />
                </Field>

                <Field label="模型文件路径" hint="GGUF 模型文件位置">
                  <Input
                    value={ai.llamaModelPath}
                    onChange={(e) => updateAISettings({ llamaModelPath: e.target.value })}
                    placeholder="E:\Models\Qwen3.8-9B-Q8_0.gguf"
                  />
                </Field>

                <Field
                  label="启动参数"
                  hint="不含 -m / --host / --port，由应用自动追加"
                >
                  <Input
                    value={ai.llamaExtraArgs}
                    onChange={(e) => updateAISettings({ llamaExtraArgs: e.target.value })}
                    placeholder="-ngl 99 -c 16384 -fa on --jinja -t 8"
                  />
                </Field>

                <Field
                  label={`空闲自动卸载 · ${ai.idleUnloadMinutes} 分钟`}
                  hint="超过该时长无对话自动停止服务释放显存；0 = 不卸载"
                >
                  <Input
                    type="number"
                    value={ai.idleUnloadMinutes}
                    min="0"
                    max="120"
                    step="5"
                    onChange={(e) =>
                      updateAISettings({
                        idleUnloadMinutes: Math.max(0, parseInt(e.target.value) || 0),
                      })
                    }
                  />
                </Field>
              </div>
            )}

            {/* API Key（仅非 Ollama） */}
            {!isOllama && (
              <Field label="API Key" hint="可选，某些服务需要认证">
                <Input
                  type="password"
                  value={ai.apiKey}
                  onChange={(e) => updateAISettings({ apiKey: e.target.value })}
                  placeholder="留空则不需要认证"
                />
              </Field>
            )}

            {/* 模型名称 */}
            <Field label="模型名称">
              <div className="flex gap-2">
                <Input
                  value={ai.model}
                  onChange={(e) => updateAISettings({ model: e.target.value })}
                  placeholder={isOllama ? "例如 qwen2.5:7b" : "例如 default"}
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
                <p className="mt-1.5 text-[13px] text-danger">
                  连接失败，请检查端点地址和服务是否已启动
                </p>
              )}
            </Field>

            {/* 模型列表 */}
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

            {/* 参数滑块 */}
            <div className="grid gap-5 sm:grid-cols-2">
              {sliders.map((slider) => (
                <Field
                  key={slider.label}
                  label={`${slider.label} · ${slider.value}`}
                  hint={slider.hint}
                >
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

            {/* 最大 Token 数 */}
            <Field
              label="最大 Token 数"
              hint="单次生成的最大长度。1 中文字 ≈ 1.5~2 token，2048 ≈ 1000~1300 字"
            >
              <Input
                type="number"
                value={ai.maxTokens}
                onChange={(e) => updateAISettings({ maxTokens: parseInt(e.target.value) })}
                min="256"
                max="8192"
                step="256"
              />
            </Field>

            {/* 关闭思考（仅 Ollama） */}
            {isOllama && (
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
            )}

            {/* 后端说明 */}
            {!isOllama && (
              <div className="rounded-lg border border-line bg-subtle p-3">
                <p className="text-[12px] leading-relaxed text-ink-2">
                  <strong>{backendPreset.label}</strong> — {backendPreset.description}
                </p>
              </div>
            )}
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
              <dt className="text-ink-3">开发者</dt>
              <dd>
                <button
                  type="button"
                  onClick={() => openUrl("https://github.com/Jack-Sai")}
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  Jack
                  <ExternalLink size={12} />
                </button>
              </dd>
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
