import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { Editor } from "@tiptap/react";
import { invoke } from "@tauri-apps/api/core";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  Check,
  Copy,
  History,
  Loader2,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  PenTool,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Square,
  User,
} from "lucide-react";
import {
  getSystemPrompt,
  systemPrompts,
  builtinPromptList,
  aiDb,
  promptDb,
  retrieveMemories,
  styleDb,
  type PromptKey,
  type AiMessageRow,
  type AiSessionRow,
  type CustomPromptRow,
  type RetrievedMemory,
  type StyleProfileRow,
} from "../../services";
import { createAIService, toLlamaConfig } from "../../services/aiService";
import { useSettingsStore } from "../../stores/settingsStore";
import { useProjectStore } from "../../stores/projectStore";
import {
  Button,
  Input,
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from "../ui";
import { cn } from "../../lib/cn";

interface AIPanelProps {
  /** 延迟获取编辑器实例：render 阶段直接读 ref 会拿到 null 或已销毁的旧实例 */
  getEditor: () => Editor | null;
  selectedText: string;
  chapterContent: string;
  /** 应用内容到正文后的同步回调（把最新 HTML 显式写回 store，保证文件同步） */
  onContentApplied?: (html: string) => void;
  /** 外部触发的预填输入（点「问 AI」时传入，消费后由调用方清空） */
  prefill?: string;
  onPrefillConsumed?: () => void;
}

interface ChatParams {
  systemPrompt: string;
  /** 发送给模型的用户消息 */
  userContent: string;
  /** 界面上显示的用户消息（默认同 userContent） */
  displayContent?: string;
  /** 记忆检索词（默认同 userContent，快捷操作传正文片段以提升命中） */
  retrievalQuery?: string;
  action?: string;
  applyMode?: "replace" | "append";
  canApply?: boolean;
  /** 重新生成用：不追加/不落库用户消息，直接发起新一轮回复 */
  skipUserMessage?: boolean;
  /** 覆盖 ai.think：正文快捷任务（续写/润色/扩写/缩写）传 false，思考不再挤占输出预算 */
  thinkOverride?: boolean;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** 模型思考内容（Qwen3 等思考模型，不持久化，仅会话内展示） */
  reasoning?: string;
  /** 本次发送注入的相关记忆（不持久化，仅会话内展示） */
  memories?: RetrievedMemory[];
  action?: string;
  canApply?: boolean;
  applyMode?: "replace" | "append";
}

interface QuickAction {
  key: PromptKey;
  label: string;
  icon: typeof PenTool;
  needsSelection: boolean;
  applyMode: "replace" | "append";
}

const quickActions: QuickAction[] = [
  { key: "continuation", label: "续写", icon: PenTool, needsSelection: false, applyMode: "append" },
  { key: "polish", label: "润色", icon: Sparkles, needsSelection: true, applyMode: "replace" },
  { key: "expand", label: "扩写", icon: Maximize2, needsSelection: true, applyMode: "replace" },
  { key: "compress", label: "缩写", icon: Minimize2, needsSelection: true, applyMode: "replace" },
];

/** DB 消息行 → 面板消息（所有有内容的回复都可插入正文） */
function rowToMessage(row: AiMessageRow): Message {
  const quick = row.action ? quickActions.find((a) => a.key === row.action) : undefined;
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    action: row.action ?? undefined,
    canApply: row.role === "assistant" && !!row.content,
    applyMode: quick?.applyMode ?? "append",
  };
}

/** 剥离首行客套/引导语（"好的""以下是……"等），仅当其后确有正文时生效 */
function stripChatter(raw: string): string {
  const lines = raw.split("\n");
  if (lines.length < 2) return raw;
  const first = lines[0].trim();
  if (
    first.length <= 40 &&
    /^(好的|好的[，,]|以下是|没问题|当然可以|我来|稍等|修改后|润色后|扩写后|缩写后|续写)/.test(first)
  ) {
    return lines.slice(1).join("\n").replace(/^\s+/, "");
  }
  return raw;
}

const memoryKindLabels: Record<string, string> = {
  summary: "摘要",
  event: "事件",
  entity: "实体",
  note: "笔记",
  preference: "偏好",
  character: "人物",
  worldview: "设定",
  foreshadowing: "伏笔",
};

/** AI 回复的 Markdown 渲染（GFM），手写紧凑样式贴合气泡 */
function MarkdownText({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
        h1: ({ children }) => (
          <h3 className="mb-1 mt-3 text-[14px] font-semibold text-ink first:mt-0">{children}</h3>
        ),
        h2: ({ children }) => (
          <h4 className="mb-1 mt-3 text-[13.5px] font-semibold text-ink first:mt-0">{children}</h4>
        ),
        h3: ({ children }) => (
          <h5 className="mb-1 mt-2.5 text-[13px] font-semibold text-ink first:mt-0">{children}</h5>
        ),
        ul: ({ children }) => (
          <ul className="my-1.5 list-disc space-y-1 pl-5 marker:text-ink-3">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-1.5 list-decimal space-y-1 pl-5 marker:text-ink-3 marker:tabular-nums">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        code: ({ className, children, ...props }) => {
          const isBlock = /language-/.test(className || "");
          if (isBlock) {
            return (
              <code className={`block font-mono text-[12px] ${className || ""}`} {...props}>
                {children}
              </code>
            );
          }
          return (
            <code
              className="rounded bg-subtle px-1 py-0.5 font-mono text-[12px] text-ink-2"
              {...props}
            >
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="my-2 overflow-auto rounded-lg bg-subtle p-2.5 text-[12px] leading-relaxed">
            {children}
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-2 border-l-2 border-line-strong pl-2.5 italic text-ink-3">
            {children}
          </blockquote>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-2"
          >
            {children}
          </a>
        ),
        hr: () => <hr className="my-3 border-line" />,
        table: ({ children }) => (
          <div className="my-2 overflow-auto">
            <table className="w-full border-collapse text-[12px]">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-line bg-subtle px-2 py-1 text-left font-medium text-ink-2">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-line px-2 py-1 text-ink-2">{children}</td>
        ),
        strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function AIPanel({ getEditor, selectedText, chapterContent, onContentApplied, prefill, onPrefillConsumed }: AIPanelProps) {
  const { ai, aiPanelWidth, updateAiPanelWidth, updateAISettings } = useSettingsStore();
  const { currentProject } = useProjectStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [sessions, setSessions] = useState<AiSessionRow[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  /** 展开记忆注入明细的消息 ID */
  const [expandedMemoriesId, setExpandedMemoriesId] = useState<string | null>(null);
  /** 刚复制成功的消息 ID（短暂显示"已复制"） */
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  /** 最近一次发起的对话参数（供"重新生成"复用） */
  const lastRunParamsRef = useRef<ChatParams | null>(null);
  /** runChat 的稳定引用，供"重新生成"按钮回调 */
  const runChatRef = useRef<((params: ChatParams) => Promise<void>) | null>(null);
  /** 当前进行中的流式请求 ID，用于取消生成 */
  const requestIdRef = useRef<string | null>(null);

  // 切换项目时加载最近会话（无则空会话，首条消息时懒创建）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMessages([]);
      setSessionId(null);
      if (!currentProject) {
        setSessions([]);
        return;
      }
      try {
        const list = await aiDb.listSessions(currentProject.id);
        if (cancelled) return;
        setSessions(list);
        const latest = list[0];
        if (latest) {
          const rows = await aiDb.listMessages(latest.id);
          if (cancelled) return;
          setSessionId(latest.id);
          setMessages(rows.map(rowToMessage));
        }
      } catch (e) {
        console.warn("加载 AI 会话失败:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentProject?.id]);

  /** 确保当前会话存在（懒创建），返回会话 ID（无项目时返回空串表示不落库） */
  const ensureSession = useCallback(
    async (firstContent: string): Promise<string> => {
      if (sessionId) {
        void aiDb.touchSession(sessionId).catch(() => {});
        return sessionId;
      }
      const project = useProjectStore.getState().currentProject;
      if (!project) return "";
      try {
        const title = firstContent.replace(/\s+/g, " ").trim().slice(0, 20) || "新会话";
        const session = await aiDb.createSession(project.id, title);
        setSessionId(session.id);
        setSessions((prev) => [session, ...prev]);
        return session.id;
      } catch (e) {
        console.warn("创建 AI 会话失败:", e);
        return "";
      }
    },
    [sessionId],
  );

  /** 消息落库（失败仅告警，不打断对话） */
  const saveMessage = useCallback(
    (sid: string, msg: { role: "user" | "assistant"; content: string; action?: string }) => {
      if (!sid || !msg.content) return;
      aiDb.addMessage(sid, msg).catch((e) => console.warn("保存 AI 消息失败:", e));
    },
    [],
  );

  // 根据设置创建 AI 服务实例
  const aiService = useMemo(() => {
    return createAIService({
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
  }, [
    ai.backend,
    ai.baseUrl,
    ai.model,
    ai.apiKey,
    ai.llamaServerPath,
    ai.llamaModelPath,
    ai.llamaExtraArgs,
    ai.idleUnloadMinutes,
  ]);

  useEffect(() => {
    checkConnection();
  }, [aiService]);

  // 加载自定义提示词（供"更多"菜单）
  const [morePrompts, setMorePrompts] = useState<CustomPromptRow[]>([]);
  useEffect(() => {
    promptDb
      .list()
      .then(setMorePrompts)
      .catch((e) => console.warn("加载自定义提示词失败:", e));
  }, []);

  // 就近自动滚动：仅当用户在底部附近时跟随，上翻阅读时不打扰
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // 外部「问 AI」预填
  useEffect(() => {
    if (prefill) {
      setInput(prefill);
      onPrefillConsumed?.();
    }
  }, [prefill, onPrefillConsumed]);

  const checkConnection = async () => {
    const connected = await aiService.checkConnection();
    setIsConnected(connected);
  };

  /** 统一的对话执行流程：追加消息 → 确保会话 → 流式生成 → 落库 */
  const runChat = useCallback(
    async (params: ChatParams) => {
      lastRunParamsRef.current = params;
      const display = params.displayContent ?? params.userContent;

      // 检索相关记忆 + 启用的文风卡片（注入 AI 上下文）
      let memories: RetrievedMemory[] = [];
      let styleProfile: StyleProfileRow | null = null;
      const project = useProjectStore.getState().currentProject;
      if (project) {
        if (ai.memoryInject) {
          try {
            memories = await retrieveMemories(
              project.id,
              params.retrievalQuery ?? params.userContent,
              { limit: 6 },
            );
          } catch (e) {
            console.warn("记忆检索失败:", e);
          }
        }
        try {
          styleProfile = await styleDb.getActive(project.id);
        } catch (e) {
          console.warn("读取文风卡片失败:", e);
        }
      }

      if (!params.skipUserMessage) {
        const userMsg: Message = {
          id: crypto.randomUUID(),
          role: "user",
          content: display,
          action: params.action,
          memories: memories.length > 0 ? memories : undefined,
        };
        setMessages((prev) => [...prev, userMsg]);
      }
      setIsLoading(true);

      const sid = await ensureSession(display);
      if (!params.skipUserMessage) {
        saveMessage(sid, { role: "user", content: display, action: params.action });
      }

      const requestId = crypto.randomUUID();
      requestIdRef.current = requestId;

      // 本地模型未就绪时插入启动提示，首帧输出后自动移除
      let hintId: string | null = null;
      if (ai.backend === "llamacpp") {
        try {
          const st = await invoke<{ running: boolean; loading: boolean }>(
            "get_llama_server_status",
            { baseUrl: ai.baseUrl },
          );
          if (!st.running) {
            hintId = crypto.randomUUID();
            const hintContent = st.loading
              ? "正在加载模型，预计 1~2 分钟，请稍候…"
              : "本地模型未运行，正在启动，预计 1~2 分钟，请稍候…";
            const id = hintId;
            setMessages((prev) => [
              ...prev,
              { id, role: "assistant", content: hintContent },
            ]);
          }
        } catch {
          // 状态查询失败不影响正常发送
        }
      }

      try {
        let fullResponse = "";
        let fullReasoning = "";
        const assistantId = crypto.randomUUID();

        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content: "",
            action: params.action,
            canApply: params.canApply,
            applyMode: params.applyMode,
          },
        ]);

        // 组装 system prompt：基础提示词 + 启用的文风 + 相关记忆
        const systemParts = [params.systemPrompt];
        // 思考模式下引导模型用中文推理（Qwen3 等默认倾向英文思考）
        const effectiveThink = params.thinkOverride ?? ai.think;
        if (effectiveThink) {
          systemParts.push("思考过程（reasoning）请一律使用中文。");
        }
        if (styleProfile) {
          systemParts.push(`[文风要求]\n${styleProfile.content}`);
        }
        if (memories.length > 0) {
          systemParts.push(
            `[相关记忆]\n${memories
              .map((m) => `- ${m.title}：${m.content.slice(0, 300)}`)
              .join("\n")}\n（以上是项目相关记忆，仅供参考，请勿直接复述。）`,
          );
        }
        const systemContent = systemParts.join("\n\n");

        // Qwen3 思考语言主要跟随最后一条 user 消息：user 级注入中文思考指令（仅发送副本，不落库）
        const sendUserContent = effectiveThink
          ? `${params.userContent}\n\n（请用中文思考。）`
          : params.userContent;

        await aiService.chatStream(
          [
            { role: "system", content: systemContent },
            ...messages
              .filter((m) => m.role === "user" || m.role === "assistant")
              .slice(-Math.max(2, ai.contextMessageCount))
              .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
            { role: "user", content: sendUserContent },
          ],
          {
            temperature: ai.temperature,
            topP: ai.topP,
            topK: ai.topK,
            repeatPenalty: ai.repeatPenalty,
            numPredict: ai.maxTokens,
            think: effectiveThink,
          },
          (chunk, meta) => {
            if (meta?.reasoning) {
              fullReasoning += chunk;
            } else {
              fullResponse += chunk;
            }
            const hideHint = hintId;
            if (hideHint) hintId = null;
            setMessages((prev) => {
              const base = hideHint
                ? prev.filter((m) => m.id !== hideHint)
                : prev;
              return base.map((m) =>
                m.id === assistantId
                  ? { ...m, content: fullResponse, reasoning: fullReasoning || undefined }
                  : m,
              );
            });
          },
          requestId,
        );
        saveMessage(sid, { role: "assistant", content: fullResponse, action: params.action });
      } catch {
        const errorContent = "抱歉，无法连接到 AI 模型。请确保服务已启动。";
        const hideHint = hintId;
        setMessages((prev) => {
          const base = hideHint ? prev.filter((m) => m.id !== hideHint) : prev;
          return [
            ...base,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: errorContent,
            },
          ];
        });
        saveMessage(sid, { role: "assistant", content: errorContent, action: params.action });
      } finally {
        requestIdRef.current = null;
        setIsLoading(false);
      }
    },
    [messages, ai, aiService, ensureSession, saveMessage],
  );

  useEffect(() => {
    runChatRef.current = runChat;
  }, [runChat]);

  /** 重新生成：删除最后一条回复，复用上一次参数跳过用户消息重发 */
  const handleRegenerate = useCallback(async () => {
    const last = lastRunParamsRef.current;
    if (!last || isLoading) return;
    setMessages((prev) => {
      const next = [...prev];
      while (next.length > 0 && next[next.length - 1].role === "assistant") {
        next.pop();
      }
      return next;
    });
    await runChat({ ...last, skipUserMessage: true });
  }, [isLoading, runChat]);

  /** 复制消息内容 */
  const handleCopy = useCallback(async (msgId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(msgId);
      setTimeout(() => setCopiedId((prev) => (prev === msgId ? null : prev)), 1500);
    } catch (e) {
      console.warn("复制失败:", e);
    }
  }, []);

  const handleQuickAction = useCallback(
    async (action: QuickAction) => {
      if (isLoading) return;
      if (action.needsSelection && !selectedText) return;

      const context =
        action.key === "continuation" ? chapterContent.slice(-500) : selectedText;
      const userContent =
        action.key === "continuation"
          ? "请续写下面的内容，保持风格一致：\n\n" + (context || "（从这里开始续写）")
          : `请对以下内容进行${action.label}：\n\n${context}`;

      await runChat({
        systemPrompt: getSystemPrompt(action.key),
        userContent,
        displayContent:
          action.key === "continuation" ? "续写以下内容" : `${action.label}选中内容`,
        retrievalQuery: context || undefined,
        action: action.key,
        applyMode: action.applyMode,
        canApply: true,
        // 正文执行任务不思考：思考与正文共享 max_tokens 预算，思考过长会吃掉全部输出
        thinkOverride: false,
      });
    },
    [isLoading, selectedText, chapterContent, runChat],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const content = input.trim();
    setInput("");
    await runChat({
      systemPrompt: getSystemPrompt("writer"),
      userContent: content,
      canApply: true,
      applyMode: "append",
    });
  };

  /** 使用"更多"菜单中的提示词（内置或自定义）发起对话 */
  const handleUsePrompt = useCallback(
    async (opts: { label: string; systemPrompt: string; action?: string }) => {
      if (isLoading) return;
      const context = selectedText || chapterContent.slice(-500);
      const userContent = context
        ? `请运用「${opts.label}」处理以下内容：\n\n${context}`
        : `请以「${opts.label}」的职责开始工作，我随后提供具体内容。`;

      await runChat({
        systemPrompt: opts.systemPrompt,
        userContent,
        retrievalQuery: context || undefined,
        action: opts.action,
        canApply: true,
        applyMode: "append",
      });
    },
    [isLoading, selectedText, chapterContent, runChat],
  );

  const handleStop = async () => {
    const requestId = requestIdRef.current;
    if (requestId) {
      try {
        await invoke("ai_cancel_stream", { requestId });
      } catch {
        // 忽略：请求可能已结束
      }
    }
  };

  // ── 会话切换 / 新建 / 删除 ──

  const handleSelectSession = async (id: string) => {
    if (isLoading || id === sessionId) return;
    try {
      const rows = await aiDb.listMessages(id);
      setSessionId(id);
      setMessages(rows.map(rowToMessage));
    } catch (e) {
      console.warn("加载会话消息失败:", e);
    }
  };

  const handleNewSession = () => {
    if (isLoading) return;
    setSessionId(null);
    setMessages([]);
  };

  const handleDeleteSession = async (id: string) => {
    if (isLoading) return;
    try {
      await aiDb.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (sessionId === id) {
        setSessionId(null);
        setMessages([]);
      }
    } catch (e) {
      console.warn("删除会话失败:", e);
    }
  };

  const handleApply = (msg: Message) => {
    if (!msg.content) return;
    const editor = getEditor();
    // 实例为空或已销毁（切章重挂载）时直接返回，避免静默失效造成不同步
    if (!editor || editor.isDestroyed) return;

    const content = stripChatter(msg.content);
    if (!content) return;

    if (msg.applyMode === "append") {
      editor.chain().focus().setContent(editor.getHTML() + content).run();
    } else {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        editor.chain().focus().deleteSelection().insertContent(content).run();
      } else {
        editor.chain().focus().insertContent(content).run();
      }
    }
    // 显式同步回 store（onUpdate 之外的兜底，保证自动保存写入最新内容）
    onContentApplied?.(editor.getHTML());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  /** 左缘拖拽调整面板宽度 */
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = useSettingsStore.getState().aiPanelWidth;
    const onMove = (ev: MouseEvent) => {
      updateAiPanelWidth(startWidth + (startX - ev.clientX));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const statusColor = isConnected ? "bg-success" : isConnected === false ? "bg-danger" : "bg-warning";

  return (
    <div
      className="relative flex shrink-0 flex-col border-l border-line bg-subtle"
      style={{ width: aiPanelWidth }}
    >
      {/* 拖拽调整宽度 */}
      <div
        role="separator"
        aria-orientation="vertical"
        title="拖拽调整宽度"
        onMouseDown={handleResizeStart}
        className="absolute inset-y-0 left-0 z-10 w-1.5 cursor-col-resize transition-colors hover:bg-primary/50 active:bg-primary"
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-primary" />
          <span className="text-sm font-medium text-ink">AI 助手</span>
          <span className={cn("h-1.5 w-1.5 rounded-full", statusColor)} />
        </div>
        <div className="flex items-center gap-0.5">
          <Menu>
            <MenuTrigger asChild>
              <button
                type="button"
                aria-label="历史会话"
                title="历史会话"
                disabled={isLoading}
                className={cn(
                  "rounded-md p-1.5 text-ink-3 transition-colors",
                  "hover:bg-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-ring)]",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                )}
              >
                <History size={14} />
              </button>
            </MenuTrigger>
            <MenuContent align="end" className="max-h-72 w-56 overflow-auto">
              <MenuLabel>历史会话</MenuLabel>
              {sessions.length === 0 ? (
                <p className="px-2 py-1.5 text-[13px] text-ink-3">暂无历史会话</p>
              ) : (
                sessions.map((s) => (
                  <MenuItem
                    key={s.id}
                    onSelect={() => handleSelectSession(s.id)}
                    className={cn(
                      "justify-between",
                      s.id === sessionId && "bg-primary-soft text-primary",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{s.title || "未命名会话"}</span>
                    {s.id === sessionId && <span className="text-[11px]">当前</span>}
                  </MenuItem>
                ))
              )}
              {sessionId && (
                <>
                  <MenuSeparator />
                  <MenuItem destructive onSelect={() => handleDeleteSession(sessionId)}>
                    删除当前会话
                  </MenuItem>
                </>
              )}
            </MenuContent>
          </Menu>
          <button
            type="button"
            aria-label="新会话"
            title="新会话"
            disabled={isLoading}
            onClick={handleNewSession}
            className={cn(
              "rounded-md p-1.5 text-ink-3 transition-colors",
              "hover:bg-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-ring)]",
              "disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-between gap-1 border-b border-line px-3 py-2">
        <div className="flex gap-1">
          {quickActions.map((action) => {
            const disabled = isLoading || (action.needsSelection && !selectedText);
            return (
              <button
                key={action.key}
                type="button"
                disabled={disabled}
                onClick={() => handleQuickAction(action)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-ring)]",
                  "disabled:cursor-not-allowed disabled:opacity-45",
                  "border-line text-ink-2 hover:border-line-strong hover:bg-hover hover:text-ink",
                )}
              >
                <action.icon size={11} />
                {action.label}
              </button>
            );
          })}
        </div>

        {/* 更多提示词（内置其余 + 自定义） */}
        <Menu>
          <MenuTrigger asChild>
            <button
              type="button"
              aria-label="更多提示词"
              title="更多提示词"
              disabled={isLoading}
              className={cn(
                "rounded-md p-1.5 text-ink-3 transition-colors",
                "hover:bg-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-ring)]",
                "disabled:cursor-not-allowed disabled:opacity-40",
              )}
            >
              <MoreHorizontal size={14} />
            </button>
          </MenuTrigger>
          <MenuContent align="end" className="max-h-80 w-56 overflow-auto">
            <MenuLabel>内置提示词</MenuLabel>
            {builtinPromptList
              .filter((p) => !quickActions.some((q) => q.key === p.key))
              .map((p) => (
                <MenuItem
                  key={p.key}
                  onSelect={() =>
                    handleUsePrompt({
                      label: p.label,
                      systemPrompt: systemPrompts[p.key],
                      action: p.key,
                    })
                  }
                >
                  <span className="min-w-0 flex-1 truncate">{p.label}</span>
                  <span className="ml-2 shrink-0 truncate text-[11px] text-ink-3">
                    {p.description}
                  </span>
                </MenuItem>
              ))}
            {morePrompts.length > 0 && (
              <>
                <MenuSeparator />
                <MenuLabel>自定义提示词</MenuLabel>
                {morePrompts.map((p) => (
                  <MenuItem
                    key={p.id}
                    onSelect={() =>
                      handleUsePrompt({ label: p.name, systemPrompt: p.content })
                    }
                  >
                    <span className="min-w-0 flex-1 truncate" title={p.description || p.name}>
                      {p.name}
                    </span>
                  </MenuItem>
                ))}
              </>
            )}
            <MenuSeparator />
            <MenuItem
              onSelect={() => updateAISettings({ memoryInject: !ai.memoryInject })}
            >
              <span className="min-w-0 flex-1">注入项目记忆</span>
              <span
                className={cn(
                  "ml-2 shrink-0 text-[11px]",
                  ai.memoryInject ? "text-primary" : "text-ink-3",
                )}
              >
                {ai.memoryInject ? "开" : "关"}
              </span>
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>

      {quickActions.some((a) => a.needsSelection) && !selectedText && (
        <p className="px-3 pt-1.5 text-[11px] text-ink-3">
          润色/扩写/缩写需先选中文字
        </p>
      )}

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-auto px-3 py-3">
        {messages.length === 0 && !isLoading ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Bot size={32} className="mb-3 text-ink-3" />
            <p className="text-sm font-medium text-ink-2">开始与 AI 对话</p>
            <p className="mt-1 text-xs text-ink-3">
              使用上方快捷操作或直接输入需求
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, index) => {
              const isUser = msg.role === "user";
              const isLast = index === messages.length - 1;
              const isStreaming = !isUser && isLast && isLoading && !!msg.content;
              return (
                <div key={msg.id}>
                  <div
                    className={cn(
                      "flex gap-2",
                      isUser ? "justify-end" : "justify-start",
                    )}
                  >
                    {!isUser && (
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                        <Bot size={11} />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-2.5 py-2 text-[13px] leading-relaxed",
                        isUser
                          ? "rounded-tr-sm bg-primary text-on-primary"
                          : "rounded-tl-sm border border-line bg-surface text-ink",
                      )}
                    >
                      <div
                        className={cn(
                          "break-words",
                          isUser && "whitespace-pre-wrap",
                        )}
                      >
                        {msg.reasoning && (
                          <div className="mb-1.5 max-h-40 overflow-auto whitespace-pre-wrap border-l-2 border-line-strong pl-2 text-[12px] italic leading-relaxed text-ink-3">
                            {msg.reasoning}
                          </div>
                        )}
                        {isUser ? (
                          msg.content
                        ) : (
                          <>
                            <MarkdownText content={msg.content} />
                            {isStreaming && (
                              <span
                                aria-hidden
                                className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-[2px] animate-pulse bg-primary"
                              />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {isUser && (
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-3">
                        <User size={11} />
                      </div>
                    )}
                  </div>

                  {/* 记忆注入明细（仅当前会话展示） */}
                  {isUser && msg.memories && msg.memories.length > 0 && (
                    <div className="mt-1 flex justify-end">
                      <div className="max-w-[85%]">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedMemoriesId(
                              expandedMemoriesId === msg.id ? null : msg.id,
                            )
                          }
                          className={cn(
                            "text-[11px] transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-ring)]",
                            expandedMemoriesId === msg.id
                              ? "text-primary"
                              : "text-ink-3 hover:text-ink-2",
                          )}
                        >
                          注入 {msg.memories.length} 条记忆{" "}
                          {expandedMemoriesId === msg.id ? "▴" : "▾"}
                        </button>
                        {expandedMemoriesId === msg.id && (
                          <div className="mt-1 space-y-1.5 rounded-md border border-line bg-surface p-2">
                            {msg.memories.map((m) => (
                              <div key={`${m.kind}-${m.id}`} className="text-[11px] leading-relaxed">
                                <span className="font-medium text-primary">
                                  {memoryKindLabels[m.kind] ?? "记忆"} · {m.title}
                                </span>
                                <p className="text-ink-3">{m.content.slice(0, 160)}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* assistant 操作栏：应用 / 复制 / 重新生成 */}
                  {!isUser && msg.content && !isStreaming && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-7">
                      {msg.canApply && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleApply(msg)}
                          className="text-xs"
                        >
                          应用到正文
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleCopy(msg.id, msg.content)}
                        className="h-6 gap-1 px-1.5 text-[11px] text-ink-3"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check size={11} className="text-success" />
                            已复制
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            复制
                          </>
                        )}
                      </Button>
                      {isLast && !isLoading && lastRunParamsRef.current && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleRegenerate()}
                          className="h-6 gap-1 px-1.5 text-[11px] text-ink-3"
                        >
                          <RefreshCw size={11} />
                          重新生成
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-2">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Bot size={11} />
                </div>
                <div className="flex items-center gap-1.5 rounded-lg rounded-tl-sm border border-line bg-surface px-2.5 py-2 text-xs text-ink-2">
                  <Loader2 size={12} className="animate-spin" />
                  思考中…
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-line px-3 py-2.5">
        <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? "生成中…" : "输入需求…"}
            disabled={isLoading}
            className="flex-1 text-[13px]"
          />
          {isLoading ? (
            <Button
              type="button"
              variant="danger"
              size="icon"
              aria-label="停止生成"
              title="停止生成"
              onClick={handleStop}
            >
              <Square size={14} />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              size="icon"
              aria-label="发送"
              disabled={!input.trim()}
            >
              <Send size={14} />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
