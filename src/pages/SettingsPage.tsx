import { useState, useRef, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Database,
  Download,
  Edit3,
  ExternalLink,
  Feather,
  FileText,
  Info,
  Loader2,
  MessageSquare,
  Palette,
  Play,
  Plus,
  Save,
  Sparkles,
  Square,
  Trash2,
  Upload,
} from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "../stores/settingsStore";
import { cn } from "../lib/cn";
import { useProjectStore } from "../stores/projectStore";
import {
  createAIService,
  backendPresets,
  toLlamaConfig,
  type BackendType,
} from "../services/aiService";
import {
  BackupService,
  builtinPromptList,
  systemPrompts,
  promptDb,
  styleDb,
  type CustomPromptRow,
  type StyleProfileRow,
} from "../services";
import {
  Badge,
  Button,
  Dialog,
  Field,
  Input,
  Page,
  PageBody,
  PageHeader,
  Section,
  SearchSelect,
  SegmentedControl,
  Select,
  SettingRow,
  Textarea,
  ThemeToggle,
} from "../components/ui";

interface LlamaServerStatus {
  running: boolean;
  loading: boolean;
  pid: number | null;
  idle_minutes: number;
}

/** 系统字体：zh = 本地化名（如"微软雅黑"），en = 英文/PS 名（CSS 安全值） */
interface SystemFont {
  zh: string;
  en: string;
}

const backendItems = (Object.keys(backendPresets) as BackendType[]).map((key) => ({
  value: key,
  label: backendPresets[key].label,
}));

/** 编辑器正文字体预设（值为空串 = 默认衬线） */
const fontPresets: { value: string; label: string }[] = [
  { value: "", label: "默认衬线" },
  { value: 'SimSun, "宋体", serif', label: "宋体" },
  { value: 'KaiTi, "楷体", "STKaiti", serif', label: "楷体" },
  { value: 'FangSong, "仿宋", "STFangsong", serif', label: "仿宋" },
  { value: '"Microsoft YaHei", "微软雅黑", "PingFang SC", sans-serif', label: "黑体" },
];

export function SettingsPage() {
  const {
    ai,
    editor,
    modelPresets,
    updateAISettings,
    updateEditorSettings,
    saveModelPreset,
    removeModelPreset,
    applyModelPreset,
  } = useSettingsStore();
  const { currentProject } = useProjectStore();
  const [settingsTab, setSettingsTab] = useState("appearance");
  const [saved, setSaved] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "failure" | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<boolean | null>(null);
  /** 系统已安装字体列表（供正文字体检索选择，含中英文名） */
  const [systemFonts, setSystemFonts] = useState<SystemFont[]>([]);
  /** llama-server PATH 自动检测状态 */
  const [serverDetect, setServerDetect] = useState<"loading" | "found" | "missing">("loading");
  const [detectedServerPath, setDetectedServerPath] = useState("");
  /** 点过「手动指定」后强制显示输入框 */
  const [serverPathManual, setServerPathManual] = useState(false);
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

  // 用 getState() 读取最新配置，避免异步回调里的 stale closure
  const refreshLlamaStatus = useCallback(async () => {
    try {
      const { baseUrl } = useSettingsStore.getState().ai;
      const status = await invoke<LlamaServerStatus>("get_llama_server_status", {
        baseUrl,
      });
      setLlamaStatus(status);
    } catch {
      setLlamaStatus(null);
    }
  }, []);

  // 加载系统字体列表（解析字体文件 name table，含中文本地化名）
  useEffect(() => {
    let cancelled = false;
    invoke<SystemFont[]>("list_system_fonts")
      .then((fonts) => {
        if (!cancelled) setSystemFonts(fonts);
      })
      .catch((e) => console.warn("获取系统字体失败:", e));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (ai.backend !== "llamacpp") {
      setLlamaStatus(null);
      return;
    }
    refreshLlamaStatus();
    const timer = setInterval(refreshLlamaStatus, 3000);
    return () => clearInterval(timer);
  }, [ai.backend, refreshLlamaStatus]);

  // llama-server 路径自动寻找：进入设置页时从环境变量 PATH 检测一次
  useEffect(() => {
    if (ai.backend !== "llamacpp") return;
    let cancelled = false;
    (async () => {
      try {
        const found = await invoke<string | null>("find_llama_server_in_path");
        if (cancelled) return;
        if (found) {
          setServerDetect("found");
          setDetectedServerPath(found);
          // 当前路径为空才自动填充，不覆盖用户已有配置
          if (!useSettingsStore.getState().ai.llamaServerPath) {
            updateAISettings({ llamaServerPath: found });
          }
        } else {
          setServerDetect("missing");
        }
      } catch (e) {
        console.warn("PATH 中查找 llama-server 失败:", e);
        if (!cancelled) setServerDetect("missing");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ai.backend]);

  const handleStartServer = async () => {
    setStarting(true);
    setStartError(null);
    try {
      const { ai: current } = useSettingsStore.getState();
      // 路径为空时先从 PATH 兜底检测一次
      let serverPath = current.llamaServerPath;
      if (!serverPath) {
        const found = await invoke<string | null>("find_llama_server_in_path");
        if (found) {
          updateAISettings({ llamaServerPath: found });
          serverPath = found;
        }
      }
      if (!serverPath) {
        setStartError("未找到 llama-server 路径，请在下方手动指定或浏览选择。");
        return;
      }
      await invoke("ensure_llama_ready", {
        llama: toLlamaConfig({
          baseUrl: current.baseUrl,
          llamaServerPath: serverPath,
          llamaModelPath: current.llamaModelPath,
          llamaExtraArgs: current.llamaExtraArgs,
          idleUnloadMinutes: current.idleUnloadMinutes,
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

  // ── 路径文件选择 ──
  const handlePickServerPath = async () => {
    try {
      const selected = await open({
        multiple: false,
        title: "选择 llama-server 可执行文件",
        filters: [{ name: "可执行文件", extensions: ["exe"] }],
      });
      if (selected) updateAISettings({ llamaServerPath: selected as string });
    } catch (e) {
      console.error("选择文件失败:", e);
    }
  };

  const handlePickModelPath = async () => {
    try {
      const selected = await open({
        multiple: false,
        title: "选择 GGUF 模型文件",
        filters: [{ name: "GGUF 模型", extensions: ["gguf"] }],
      });
      if (selected) updateAISettings({ llamaModelPath: selected as string });
    } catch (e) {
      console.error("选择文件失败:", e);
    }
  };

  // ── 模型档案 ──
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [presetName, setPresetName] = useState("");

  const activePreset =
    modelPresets.find(
      (p) =>
        p.llamaModelPath === ai.llamaModelPath &&
        p.llamaExtraArgs === ai.llamaExtraArgs &&
        p.model === ai.model &&
        p.baseUrl === ai.baseUrl,
    ) ?? null;

  const handlePresetChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (!id) return;
    applyModelPreset(id);
    // 已托管的进程仍运行旧模型，切换后重启以加载新模型
    if (llamaStatus?.running || llamaStatus?.loading) {
      try {
        await invoke("stop_llama_server");
      } catch {
        // 忽略停止失败，后续启动会自行处理
      }
      await handleStartServer();
    }
    await refreshLlamaStatus();
  };

  const openSaveDialog = () => {
    const baseName = (activePreset?.name ?? ai.llamaModelPath.split(/[\\/]/).pop() ?? "")
      .replace(/\.gguf$/i, "");
    setPresetName(baseName);
    setSavePresetOpen(true);
  };

  const handleSavePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    saveModelPreset({
      name,
      llamaModelPath: ai.llamaModelPath,
      llamaExtraArgs: ai.llamaExtraArgs,
      model: ai.model,
      baseUrl: ai.baseUrl,
      idleUnloadMinutes: ai.idleUnloadMinutes,
    });
    setSavePresetOpen(false);
  };

  // ── 自定义提示词 ──
  const [customPrompts, setCustomPrompts] = useState<CustomPromptRow[]>([]);
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [promptForm, setPromptForm] = useState({ name: "", description: "", content: "" });
  const [openBuiltin, setOpenBuiltin] = useState<string | null>(null);

  // ── 文风卡片 ──
  const [styleProfiles, setStyleProfiles] = useState<StyleProfileRow[]>([]);
  const [styleDialogOpen, setStyleDialogOpen] = useState(false);
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
  const [styleForm, setStyleForm] = useState({
    name: "",
    description: "",
    content: "",
    sample: "",
  });
  const [styleGenerating, setStyleGenerating] = useState(false);
  const [styleError, setStyleError] = useState<string | null>(null);

  const reloadStyles = useCallback(async () => {
    const project = useProjectStore.getState().currentProject;
    if (!project) {
      setStyleProfiles([]);
      return;
    }
    try {
      setStyleProfiles(await styleDb.list(project.id));
    } catch (e) {
      console.warn("加载文风卡片失败:", e);
    }
  }, []);

  useEffect(() => {
    void reloadStyles();
  }, [reloadStyles, currentProject?.id]);

  const openCreateStyle = () => {
    setEditingStyleId(null);
    setStyleForm({ name: "", description: "", content: "", sample: "" });
    setStyleError(null);
    setStyleDialogOpen(true);
  };

  const openEditStyle = (p: StyleProfileRow) => {
    setEditingStyleId(p.id);
    setStyleForm({
      name: p.name,
      description: p.description,
      content: p.content,
      sample: p.sample,
    });
    setStyleError(null);
    setStyleDialogOpen(true);
  };

  const handleSaveStyle = async () => {
    const name = styleForm.name.trim();
    const content = styleForm.content.trim();
    if (!name || !content) return;
    try {
      const payload = {
        name,
        description: styleForm.description.trim(),
        content,
        sample: styleForm.sample,
      };
      if (editingStyleId) {
        await styleDb.update(editingStyleId, payload);
      } else {
        await styleDb.create(currentProject!.id, {
          ...payload,
          source: styleForm.sample.trim() ? "ai" : "manual",
        });
      }
      await reloadStyles();
      setStyleDialogOpen(false);
    } catch (e) {
      console.warn("保存文风卡片失败:", e);
    }
  };

  const handleDeleteStyle = async (id: string) => {
    try {
      await styleDb.delete(id);
      setStyleProfiles((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.warn("删除文风卡片失败:", e);
    }
  };

  const handleSetActiveStyle = async (p: StyleProfileRow, active: boolean) => {
    try {
      await styleDb.update(p.id, { isActive: active });
      await reloadStyles();
    } catch (e) {
      console.warn("切换文风状态失败:", e);
    }
  };

  /** 从样本 AI 生成文风画像（填入画像正文，可再编辑） */
  const handleGenerateStyle = async () => {
    const sample = styleForm.sample.trim();
    if (!sample || styleGenerating) return;
    setStyleGenerating(true);
    setStyleError(null);
    try {
      const service = createAIService({
        backend: ai.backend,
        baseUrl: ai.baseUrl,
        model: ai.model,
        apiKey: ai.apiKey,
        llama:
          ai.backend === "llamacpp"
            ? toLlamaConfig({
                baseUrl: ai.baseUrl,
                llamaServerPath: ai.llamaServerPath,
                llamaModelPath: ai.llamaModelPath,
                llamaExtraArgs: ai.llamaExtraArgs,
                idleUnloadMinutes: ai.idleUnloadMinutes,
              })
            : undefined,
      });
      const profile = await service.chat(
        [
          { role: "system", content: systemPrompts.styleProfile },
          { role: "user", content: `文本样本：\n\n${sample.slice(0, 6000)}` },
        ],
        { temperature: 0.4, numPredict: 800, think: false },
      );
      const clean = profile.trim();
      if (!clean) {
        setStyleError("模型没有返回内容，请检查模型设置后重试。");
        return;
      }
      setStyleForm((f) => ({
        ...f,
        content: clean,
        name: f.name || "AI 生成文风",
      }));
    } catch (e) {
      console.warn("生成文风画像失败:", e);
      setStyleError("生成失败，请确认 AI 模型已就绪。");
    } finally {
      setStyleGenerating(false);
    }
  };

  useEffect(() => {
    promptDb
      .list()
      .then(setCustomPrompts)
      .catch((e) => console.warn("加载提示词失败:", e));
  }, []);

  const openCreatePrompt = () => {
    setEditingPromptId(null);
    setPromptForm({ name: "", description: "", content: "" });
    setPromptDialogOpen(true);
  };

  const openEditPrompt = (p: CustomPromptRow) => {
    setEditingPromptId(p.id);
    setPromptForm({ name: p.name, description: p.description, content: p.content });
    setPromptDialogOpen(true);
  };

  const handleSavePrompt = async () => {
    const name = promptForm.name.trim();
    const content = promptForm.content.trim();
    if (!name || !content) return;
    try {
      const payload = {
        name,
        description: promptForm.description.trim(),
        content,
      };
      if (editingPromptId) {
        await promptDb.update(editingPromptId, payload);
      } else {
        await promptDb.create(payload);
      }
      setCustomPrompts(await promptDb.list());
      setPromptDialogOpen(false);
    } catch (e) {
      console.warn("保存提示词失败:", e);
    }
  };

  const handleDeletePrompt = async (id: string) => {
    try {
      await promptDb.delete(id);
      setCustomPrompts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.warn("删除提示词失败:", e);
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

  const settingsTabs = [
    { key: "appearance", label: "外观", icon: Palette },
    { key: "editor", label: "编辑器", icon: FileText },
    { key: "ai", label: "AI 模型", icon: Sparkles },
    { key: "style", label: "文风", icon: Feather },
    { key: "prompts", label: "提示词", icon: MessageSquare },
    { key: "backup", label: "数据备份与恢复", icon: Database },
    { key: "about", label: "关于", icon: Info },
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
        <div className="mx-auto flex w-full max-w-7xl items-start gap-8">
          <aside className="sticky top-8 w-56 shrink-0 rounded-xl border border-line bg-surface p-2">
            <nav className="flex flex-col gap-0.5">
              {settingsTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSettingsTab(tab.key)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-ring)]",
                    settingsTab === tab.key
                      ? "bg-primary-soft font-medium text-primary"
                      : "text-ink-2 hover:bg-hover hover:text-ink",
                  )}
                >
                  <tab.icon size={15} />
                  <span className="truncate">{tab.label}</span>
                </button>
              ))}
            </nav>
          </aside>
          <div className="min-w-0 flex-1 space-y-4">
          {/* 外观 */}
          <div className={settingsTab !== "appearance" ? "hidden" : undefined}>
          <Section title="外观" icon={Palette} contentClassName="space-y-5">
            <ThemeToggle />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="正文字体"
                hint="输入可检索系统已安装字体，也支持直接输入字体名（CSS font-family）"
              >
                <SearchSelect
                  value={editor.fontFamily}
                  onChange={(v) => updateEditorSettings({ fontFamily: v })}
                  options={[
                    ...fontPresets,
                    ...systemFonts
                      .filter((f) => f.en && !fontPresets.some((p) => p.label === f.zh))
                      .map((f) => ({ value: f.en, label: f.zh })),
                  ]}
                  placeholder="搜索或输入字体…"
                />
              </Field>
              <Field
                label={`正文字号 · ${Math.round(editor.fontSize * 16)}px`}
                hint="小说正文的字体大小，范围 14~24px"
              >
                <input
                  type="range"
                  min="0.875"
                  max="1.5"
                  step="0.0625"
                  value={editor.fontSize}
                  onChange={(e) => updateEditorSettings({ fontSize: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </Field>
            </div>
            <Field
              label={`正文行高 · ${editor.lineHeight.toFixed(2)}`}
              hint="段落行间距，越大行与行之间越宽松"
            >
              <input
                type="range"
                min="1.4"
                max="2.4"
                step="0.05"
                value={editor.lineHeight}
                onChange={(e) => updateEditorSettings({ lineHeight: parseFloat(e.target.value) })}
                className="w-full"
              />
            </Field>
          </Section>
          </div>

          {/* 编辑器 */}
          <div className={settingsTab !== "editor" ? "hidden" : undefined}>
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

            <SettingRow
              title="打字机滚动"
              description="输入时保持光标在视口中部，视线始终跟住光标"
            >
              <button
                type="button"
                role="switch"
                aria-checked={editor.typewriterScroll}
                onClick={() =>
                  updateEditorSettings({ typewriterScroll: !editor.typewriterScroll })
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                  editor.typewriterScroll ? "bg-primary" : "bg-line-strong"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                    editor.typewriterScroll ? "translate-x-5.5" : "translate-x-0.5"
                  } mt-0.5`}
                />
              </button>
            </SettingRow>

            <SettingRow
              title="人名高亮"
              description="正文中出现的人物姓名与别名按角色着色，点击可查看人物卡"
            >
              <button
                type="button"
                role="switch"
                aria-checked={editor.highlightNames}
                onClick={() =>
                  updateEditorSettings({ highlightNames: !editor.highlightNames })
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                  editor.highlightNames ? "bg-primary" : "bg-line-strong"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                    editor.highlightNames ? "translate-x-5.5" : "translate-x-0.5"
                  } mt-0.5`}
                />
              </button>
            </SettingRow>

            <Field
              label={`章节目标字数 · ${editor.chapterWordTarget || "关闭"}`}
              hint="编辑器底部显示章节进度条；0 = 不显示"
            >
              <input
                type="range"
                min="0"
                max="10000"
                step="500"
                value={editor.chapterWordTarget}
                onChange={(e) =>
                  updateEditorSettings({ chapterWordTarget: parseInt(e.target.value) })
                }
                className="w-full"
              />
            </Field>
          </Section>
          </div>

          {/* AI 模型 */}
          <div className={settingsTab !== "ai" ? "hidden" : undefined}>
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
                {/* 模型档案：保存/切换模型位置与启动参数 */}
                <Field
                  label="模型档案"
                  hint="保存当前模型路径与启动参数，下次切换模型时一键套用，无需重新填写"
                >
                  <div className="flex gap-2">
                    <Select
                      className="flex-1"
                      value={activePreset?.id ?? ""}
                      onChange={handlePresetChange}
                    >
                      <option value="">自定义配置（未保存）</option>
                      {modelPresets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </Select>
                    <Button
                      variant="secondary"
                      className="shrink-0"
                      onClick={openSaveDialog}
                    >
                      <Save size={14} />
                      {activePreset ? "更新档案" : "保存当前"}
                    </Button>
                    {activePreset && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="删除当前档案"
                        onClick={() => removeModelPreset(activePreset.id)}
                      >
                        <Trash2 size={15} />
                      </Button>
                    )}
                  </div>
                </Field>

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

                {serverDetect === "loading" ? (
                  <Field label="llama-server 路径" hint="自动从环境变量 PATH 查找可执行文件">
                    <p className="text-[13px] text-ink-3">正在从 PATH 查找 llama-server…</p>
                  </Field>
                ) : serverDetect === "found" &&
                  !serverPathManual &&
                  ai.llamaServerPath === detectedServerPath ? (
                  <Field
                    label="llama-server 路径"
                    hint="已通过环境变量 PATH 自动找到，无需手动配置"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-subtle px-3 py-2 text-[13px] text-ink-2">
                        <Check size={14} className="shrink-0 text-success" />
                        <span className="truncate">{detectedServerPath}</span>
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setServerPathManual(true)}
                        className="shrink-0"
                      >
                        手动指定
                      </Button>
                    </div>
                  </Field>
                ) : (
                  <Field
                    label="llama-server 路径"
                    hint={
                      serverDetect === "missing"
                        ? "未在环境变量 PATH 中找到 llama-server，请手动输入或浏览选择"
                        : "llama-server.exe 可执行文件位置"
                    }
                  >
                    <div className="flex gap-2">
                      <Input
                        value={ai.llamaServerPath}
                        onChange={(e) => updateAISettings({ llamaServerPath: e.target.value })}
                        placeholder="D:\llama.cpp\llama-server.exe"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handlePickServerPath}
                        className="shrink-0"
                      >
                        浏览
                      </Button>
                    </div>
                  </Field>
                )}

                <Field label="模型文件路径" hint="GGUF 模型文件位置">
                  <div className="flex gap-2">
                    <Input
                      value={ai.llamaModelPath}
                      onChange={(e) => updateAISettings({ llamaModelPath: e.target.value })}
                      placeholder="E:\Models\Qwen3.8-9B-Q8_0.gguf"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handlePickModelPath}
                      className="shrink-0"
                    >
                      浏览
                    </Button>
                  </div>
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
              hint="单次生成的最大长度。1 中文字 ≈ 1.5~2 token，2048 ≈ 1000~1300 字。开启思考模式时思考与正文共用此预算，建议 ≥ 4096，否则正文可能被思考挤掉"
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

            {/* 上下文窗口 */}
            <Field
              label={`上下文消息条数 · ${ai.contextMessageCount} 条`}
              hint="每次生成时附带的最近消息数量，越大上下文越连贯、耗时与占用越多。范围 2~100"
            >
              <Input
                type="number"
                value={ai.contextMessageCount}
                onChange={(e) =>
                  updateAISettings({
                    contextMessageCount: Math.min(
                      100,
                      Math.max(2, parseInt(e.target.value) || 2),
                    ),
                  })
                }
                min="2"
                max="100"
                step="1"
              />
            </Field>

            {/* 续写字数 */}
            <Field
              label="续写字数"
              hint="续写任务的建议篇幅，仅写入提示词让模型参考，不强制截断；0 = 不指定（按情节自然收束）。范围 0~4000"
            >
              <Input
                type="number"
                value={ai.continuationLength}
                onChange={(e) =>
                  updateAISettings({
                    continuationLength: Math.min(
                      4000,
                      Math.max(0, parseInt(e.target.value) || 0),
                    ),
                  })
                }
                min="0"
                max="4000"
                step="50"
              />
            </Field>

            {/* 思考模式（所有后端可用） */}
            <SettingRow
              title="思考模式"
              description="开启后模型先内部推理（灰色思考块）再回答，质量更佳但消耗更多 token；思考与正文共用最大 Token 数预算，建议 ≥ 4096"
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

            {/* 后端说明 */}
            {!isOllama && (
              <div className="rounded-lg border border-line bg-subtle p-3">
                <p className="text-[12px] leading-relaxed text-ink-2">
                  <strong>{backendPreset.label}</strong> — {backendPreset.description}
                </p>
              </div>
            )}
          </Section>
          </div>

          {/* 提示词库 */}
          {/* 文风卡片 */}
          <div className={settingsTab !== "style" ? "hidden" : undefined}>
          <Section
            title="文风"
            description="从样本提炼文风画像，启用后 AI 对话将自动套用（续写、润色等全部生效）"
            icon={Feather}
            contentClassName="space-y-4"
          >
            <SettingRow
              title="文风卡片"
              description="粘贴样本一键生成画像，或手动编写；启用的卡片会注入 AI 上下文"
            >
              <Button variant="secondary" onClick={openCreateStyle}>
                <Plus size={15} />
                新建文风
              </Button>
            </SettingRow>

            {styleProfiles.length === 0 ? (
              <p className="text-[13px] text-ink-3">
                还没有文风卡片。点击「新建文风」，粘贴一段你满意的文字样本让 AI 提炼画像。
              </p>
            ) : (
              styleProfiles.map((p) => (
                <div
                  key={p.id}
                  className={
                    "flex items-start gap-3 rounded-lg border p-3 " +
                    (p.is_active
                      ? "border-primary/40 bg-primary-soft/40"
                      : "border-line bg-surface")
                  }
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13px] font-medium text-ink">{p.name}</p>
                      {p.is_active ? (
                        <Badge variant="primary" size="sm">
                          启用中
                        </Badge>
                      ) : null}
                      <Badge variant="outline" size="sm">
                        {p.source === "ai" ? "AI 生成" : "手动"}
                      </Badge>
                    </div>
                    {p.description && (
                      <p className="mt-0.5 text-[12px] text-ink-3">{p.description}</p>
                    )}
                    <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-2">
                      {p.content}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title={p.is_active ? "停用" : "启用"}
                      onClick={() => void handleSetActiveStyle(p, !p.is_active)}
                    >
                      {p.is_active ? <Square size={14} /> : <Play size={14} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="编辑"
                      onClick={() => openEditStyle(p)}
                    >
                      <Edit3 size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="删除"
                      onClick={() => void handleDeleteStyle(p.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </Section>
          </div>

          <div className={settingsTab !== "prompts" ? "hidden" : undefined}>
          <Section
            title="提示词"
            description="内置提示词与自定义提示词，供 AI 面板调用"
            icon={MessageSquare}
            contentClassName="space-y-4"
          >
            <SettingRow
              title="自定义提示词"
              description="可复用的系统提示词，保存后可在 AI 面板“更多”菜单中一键调用"
            >
              <Button variant="secondary" onClick={openCreatePrompt}>
                <Plus size={15} />
                新建提示词
              </Button>
            </SettingRow>

            {customPrompts.map((p) => (
              <div
                key={p.id}
                className="flex items-start gap-3 rounded-lg border border-line bg-surface p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-ink">{p.name}</p>
                  {p.description && (
                    <p className="mt-0.5 text-[12px] text-ink-3">{p.description}</p>
                  )}
                  <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-2">
                    {p.content}
                  </p>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="编辑"
                    onClick={() => openEditPrompt(p)}
                  >
                    <Edit3 size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="删除"
                    onClick={() => handleDeletePrompt(p.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}

            <div>
              <p className="mb-2 text-[12px] font-medium text-ink-3">
                内置提示词（只读，点击展开）
              </p>
              <div className="space-y-1.5">
                {builtinPromptList.map((p) => (
                  <div key={p.key} className="rounded-lg border border-line bg-surface">
                    <button
                      type="button"
                      onClick={() => setOpenBuiltin(openBuiltin === p.key ? null : p.key)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-ring)]"
                    >
                      <span className="w-20 shrink-0 text-[13px] font-medium text-ink">
                        {p.label}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12px] text-ink-3">
                        {p.description}
                      </span>
                      <ChevronDown
                        size={14}
                        className={
                          "shrink-0 text-ink-3 transition-transform " +
                          (openBuiltin === p.key ? "rotate-180" : "")
                        }
                      />
                    </button>
                    {openBuiltin === p.key && (
                      <pre className="max-h-52 overflow-auto whitespace-pre-wrap border-t border-line px-3 py-2.5 text-[12px] leading-relaxed text-ink-2">
                        {systemPrompts[p.key]}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Section>
          </div>

          {/* 数据备份 */}
          <div className={settingsTab !== "backup" ? "hidden" : undefined}>
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
          </div>

          {/* 关于 */}
          <div className={settingsTab !== "about" ? "hidden" : undefined}>
          <Section title="关于" icon={Info}>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
              <dt className="text-ink-3">版本</dt>
              <dd className="text-ink">Omni Novel v1.0.3</dd>
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
              <dt className="text-ink-3">官网</dt>
              <dd>
                <button
                  type="button"
                  onClick={() => openUrl("https://omni-novel.vercel.app")}
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  omni-novel.vercel.app
                  <ExternalLink size={12} />
                </button>
              </dd>
              <dt className="text-ink-3">掘金主页</dt>
              <dd>
                <button
                  type="button"
                  onClick={() => openUrl("https://juejin.cn/user/3946585868220169")}
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  juejin.cn/user/3946585868220169
                  <ExternalLink size={12} />
                </button>
              </dd>
            </dl>
          </Section>
          </div>
          </div>
        </div>
      </PageBody>

      {/* 保存模型档案 */}
      <Dialog
        open={savePresetOpen}
        onOpenChange={setSavePresetOpen}
        title="保存模型档案"
        description="记录当前模型路径与启动参数，下次切换模型时直接使用"
        icon={Save}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSavePresetOpen(false)}>
              取消
            </Button>
            <Button variant="primary" disabled={!presetName.trim()} onClick={handleSavePreset}>
              {activePreset ? "更新" : "保存"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="档案名称" required>
            <Input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && presetName.trim()) handleSavePreset();
              }}
              placeholder="例如 Qwen3.8-9B-Q8"
              autoFocus
            />
          </Field>
          <div className="space-y-1 rounded-lg border border-line bg-subtle p-3 text-[12px] text-ink-2">
            <p className="truncate">模型：{ai.llamaModelPath}</p>
            <p className="truncate">参数：{ai.llamaExtraArgs}</p>
            <p className="truncate">端点：{ai.baseUrl}</p>
          </div>
        </div>
      </Dialog>

      {/* 新建/编辑提示词 */}
      <Dialog
        open={promptDialogOpen}
        onOpenChange={setPromptDialogOpen}
        title={editingPromptId ? "编辑提示词" : "新建提示词"}
        description="系统提示词将作为 AI 对话的角色设定"
        icon={MessageSquare}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPromptDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              disabled={!promptForm.name.trim() || !promptForm.content.trim()}
              onClick={handleSavePrompt}
            >
              保存
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="名称" required>
            <Input
              value={promptForm.name}
              onChange={(e) => setPromptForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="例如：玄幻打斗描写"
            />
          </Field>
          <Field label="描述" hint="可选，一句话说明用途">
            <Input
              value={promptForm.description}
              onChange={(e) => setPromptForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="例如：专业的小说战斗场景描写助手"
            />
          </Field>
          <Field label="提示词内容" required hint="发送给模型的系统提示词（角色设定）">
            <Textarea
              rows={8}
              value={promptForm.content}
              onChange={(e) => setPromptForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="你是一位……"
            />
          </Field>
        </div>
      </Dialog>

      {/* 新建/编辑文风 */}
      <Dialog
        open={styleDialogOpen}
        onOpenChange={setStyleDialogOpen}
        title={editingStyleId ? "编辑文风" : "新建文风"}
        description="画像将以指令形式注入 AI 上下文；启用状态决定是否生效"
        icon={Feather}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setStyleDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              disabled={!styleForm.name.trim() || !styleForm.content.trim()}
              onClick={() => void handleSaveStyle()}
            >
              保存
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="名称" required>
            <Input
              value={styleForm.name}
              onChange={(e) => setStyleForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="例如：冷硬派悬疑风"
            />
          </Field>
          <Field label="描述" hint="可选，一句话说明">
            <Input
              value={styleForm.description}
              onChange={(e) => setStyleForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="例如：短句、克制、留白"
            />
          </Field>
          <Field
            label="文风样本"
            hint="粘贴 300 字以上你满意的文字，点击「AI 提炼画像」自动生成下方画像"
          >
            <Textarea
              rows={5}
              value={styleForm.sample}
              onChange={(e) => setStyleForm((f) => ({ ...f, sample: e.target.value }))}
              placeholder="粘贴你的作品片段或喜欢的文段…"
            />
          </Field>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              disabled={!styleForm.sample.trim() || styleGenerating}
              onClick={() => void handleGenerateStyle()}
            >
              {styleGenerating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {styleGenerating ? "提炼中…" : "AI 提炼画像"}
            </Button>
            {styleError && <span className="text-[12px] text-danger">{styleError}</span>}
          </div>
          <Field label="文风画像" required hint="直接注入 system prompt 的指令正文，可手动修改">
            <Textarea
              rows={8}
              value={styleForm.content}
              onChange={(e) => setStyleForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="请模仿以下文风写作：…"
            />
          </Field>
        </div>
      </Dialog>
    </Page>
  );
}
