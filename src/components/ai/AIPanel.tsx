import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bot,
  Loader2,
  Maximize2,
  Minimize2,
  PenTool,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { getSystemPrompt, type PromptKey } from "../../services";
import { createAIService, toLlamaConfig } from "../../services/aiService";
import { useSettingsStore } from "../../stores/settingsStore";
import { Button, Input } from "../ui";
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
  action?: PromptKey;
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

export function AIPanel({ editor, selectedText, chapterContent }: AIPanelProps) {
  const { ai } = useSettingsStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const checkConnection = async () => {
    const connected = await aiService.checkConnection();
    setIsConnected(connected);
  };

  const handleQuickAction = useCallback(
    async (action: QuickAction) => {
      if (isLoading) return;

      if (action.needsSelection && !selectedText) return;

      const context =
        action.key === "continuation"
          ? chapterContent.slice(-500)
          : selectedText;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: action.key === "continuation" ? "续写以下内容" : `${action.label}选中内容`,
        action: action.key,
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const systemPrompt = getSystemPrompt(action.key);
        const userContent =
          action.key === "continuation"
            ? "请续写下面的内容，保持风格一致：\n\n" + (context || "（从这里开始续写）")
            : `请对以下内容进行${action.label}：\n\n${context}`;

        let fullResponse = "";
        const assistantId = crypto.randomUUID();

        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: "assistant", content: "", action: action.key, canApply: true, applyMode: action.applyMode },
        ]);

        await aiService.chatStream(
          [
            { role: "system", content: systemPrompt },
            ...messages
              .filter((m) => m.role === "user" || m.role === "assistant")
              .slice(-6)
              .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
            { role: "user", content: userContent },
          ],
          {
            temperature: ai.temperature,
            topP: ai.topP,
            topK: ai.topK,
            repeatPenalty: ai.repeatPenalty,
            numPredict: ai.maxTokens,
            think: ai.think,
          },
          (chunk) => {
            fullResponse += chunk;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: fullResponse } : m,
              ),
            );
          },
        );
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "抱歉，无法连接到 AI 模型。请确保服务已启动。",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, selectedText, chapterContent, messages, ai, aiService],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const systemPrompt = getSystemPrompt("writer");
      const chatMessages = [
        { role: "system" as const, content: systemPrompt },
        ...messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(-6)
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: userMsg.content },
      ];

      let fullResponse = "";
      const assistantId = crypto.randomUUID();

      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      await aiService.chatStream(
        chatMessages,
        {
          temperature: ai.temperature,
          topP: ai.topP,
          topK: ai.topK,
          repeatPenalty: ai.repeatPenalty,
          numPredict: ai.maxTokens,
          think: ai.think,
        },
        (chunk) => {
          fullResponse += chunk;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: fullResponse } : m,
            ),
          );
        },
      );
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "抱歉，无法连接到 AI 模型。请确保服务已启动。",
        },
      ]);
    } finally {
      setIsLoading(false);
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
      </div>

      {/* Quick Actions */}
      <div className="flex gap-1 border-b border-line px-3 py-2">
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
            placeholder="输入需求…"
            disabled={isLoading}
            className="flex-1 text-[13px]"
          />
          <Button
            type="submit"
            variant="primary"
            size="icon"
            aria-label="发送"
            disabled={!input.trim()}
            loading={isLoading}
          >
            {!isLoading && <Send size={14} />}
          </Button>
        </form>
      </div>
    </div>
  );
}
