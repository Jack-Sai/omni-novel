import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { Editor } from "@tiptap/react";
import { invoke } from "@tauri-apps/api/core";
import {
  Bot,
  History,
  Loader2,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  PenTool,
  Plus,
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
  type PromptKey,
  type AiMessageRow,
  type AiSessionRow,
  type CustomPromptRow,
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
  editor: Editor | null;
  selectedText: string;
  chapterContent: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** 模型思考内容（Qwen3 等思考模型，不持久化，仅会话内展示） */
  reasoning?: string;
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

/** DB 消息行 → 面板消息（从 action 推导"应用到正文"能力） */
function rowToMessage(row: AiMessageRow): Message {
  const quick = row.action ? quickActions.find((a) => a.key === row.action) : undefined;
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    action: row.action ?? undefined,
    canApply: row.role === "assistant" && !!quick,
    applyMode: quick?.applyMode,
  };
}

export function AIPanel({ editor, selectedText, chapterContent }: AIPanelProps) {
  const { ai } = useSettingsStore();
  const { currentProject } = useProjectStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [sessions, setSessions] = useState<AiSessionRow[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const checkConnection = async () => {
    const connected = await aiService.checkConnection();
    setIsConnected(connected);
  };

  /** 统一的对话执行流程：追加消息 → 确保会话 → 流式生成 → 落库 */
  const runChat = useCallback(
    async (params: {
      systemPrompt: string;
      /** 发送给模型的用户消息 */
      userContent: string;
      /** 界面上显示的用户消息（默认同 userContent） */
      displayContent?: string;
      action?: string;
      applyMode?: "replace" | "append";
      canApply?: boolean;
    }) => {
      const display = params.displayContent ?? params.userContent;
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: display,
        action: params.action,
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      const sid = await ensureSession(display);
      saveMessage(sid, { role: "user", content: display, action: params.action });

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

        await aiService.chatStream(
          [
            { role: "system", content: params.systemPrompt },
            ...messages
              .filter((m) => m.role === "user" || m.role === "assistant")
              .slice(-Math.max(2, ai.contextMessageCount))
              .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
            { role: "user", content: params.userContent },
          ],
          {
            temperature: ai.temperature,
            topP: ai.topP,
            topK: ai.topK,
            repeatPenalty: ai.repeatPenalty,
            numPredict: ai.maxTokens,
            think: ai.think,
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
        action: action.key,
        applyMode: action.applyMode,
        canApply: true,
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
        action: opts.action,
        canApply: false,
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
    if (!editor || !msg.content) return;

    if (msg.applyMode === "append") {
      editor.chain().focus().setContent(editor.getHTML() + msg.content).run();
    } else {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        editor.chain().focus().deleteSelection().insertContent(msg.content).run();
      } else {
        editor.chain().focus().insertContent(msg.content).run();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const statusColor = isConnected ? "bg-success" : isConnected === false ? "bg-danger" : "bg-warning";

  return (
    <div className="flex w-80 shrink-0 flex-col border-l border-line bg-subtle">
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
          </MenuContent>
        </Menu>
      </div>

      {quickActions.some((a) => a.needsSelection) && !selectedText && (
        <p className="px-3 pt-1.5 text-[11px] text-ink-3">
          润色/扩写/缩写需先选中文字
        </p>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-auto px-3 py-3">
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
            {messages.map((msg) => {
              const isUser = msg.role === "user";
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
                      <div className="whitespace-pre-wrap break-words">
                        {msg.reasoning && (
                          <div className="mb-1.5 max-h-40 overflow-auto whitespace-pre-wrap border-l-2 border-line-strong pl-2 text-[12px] italic leading-relaxed text-ink-3">
                            {msg.reasoning}
                          </div>
                        )}
                        {msg.content}
                      </div>
                    </div>
                    {isUser && (
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-3">
                        <User size={11} />
                      </div>
                    )}
                  </div>

                  {/* Apply button for assistant messages */}
                  {!isUser && msg.canApply && msg.content && (
                    <div className="mt-1.5 flex justify-start pl-7">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleApply(msg)}
                        className="text-xs"
                      >
                        应用到正文
                      </Button>
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

            <div ref={messagesEndRef} />
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
