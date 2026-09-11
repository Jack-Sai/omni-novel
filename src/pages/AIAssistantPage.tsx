import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, BookOpen, PenTool, Search } from "lucide-react";
import { ollama, getSystemPrompt, PromptKey } from "../services";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const quickActions = [
  { key: "writer" as PromptKey, label: "通用对话", icon: Sparkles },
  { key: "continuation" as PromptKey, label: "续写", icon: PenTool },
  { key: "polish" as PromptKey, label: "润色", icon: BookOpen },
  { key: "consistency" as PromptKey, label: "检查一致性", icon: Search },
];

export function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<PromptKey>("writer");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const checkConnection = async () => {
    const connected = await ollama.checkConnection();
    setIsConnected(connected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const systemPrompt = getSystemPrompt(currentPrompt);
      const chatMessages = [
        { role: "system" as const, content: systemPrompt },
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: userMessage.content },
      ];

      const response = await ollama.chat(chatMessages);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "抱歉，无法连接到 AI 模型。请确保 Ollama 服务已启动。",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (key: PromptKey) => {
    setCurrentPrompt(key);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--color-border)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI 助手</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">与 AI 助手对话，获取创作灵感</p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                isConnected === true
                  ? "bg-green-500"
                  : isConnected === false
                  ? "bg-red-500"
                  : "bg-yellow-500"
              }`}
            />
            <span className="text-sm text-[var(--color-text-secondary)]">
              {isConnected === true
                ? "Ollama 已连接"
                : isConnected === false
                ? "Ollama 未连接"
                : "检测中..."}
            </span>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {quickActions.map((action) => (
            <button
              key={action.key}
              onClick={() => handleQuickAction(action.key)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                currentPrompt === action.key
                  ? "bg-[var(--color-primary)] text-white"
                  : "border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
              }`}
            >
              <action.icon size={14} />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <Bot size={48} className="text-[var(--color-text-secondary)]" />
            <p className="text-[var(--color-text-secondary)]">开始与 AI 助手对话</p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              需要先启动 Ollama 服务并下载模型
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                    <Bot size={16} />
                  </div>
                )}
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    message.role === "user"
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[var(--color-bg-secondary)] text-[var(--color-text)]"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
                {message.role === "user" && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
                    <User size={16} />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                  <Bot size={16} />
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-[var(--color-bg-secondary)] px-4 py-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span>思考中...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-[var(--color-border)] p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`当前模式：${quickActions.find((a) => a.key === currentPrompt)?.label || "通用对话"}`}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}
