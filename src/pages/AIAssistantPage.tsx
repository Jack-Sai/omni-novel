import { useState, useRef, useEffect } from "react";
import {
  Bot,
  BookOpen,
  Loader2,
  PenTool,
  Search,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { ollama, getSystemPrompt, PromptKey } from "../services";
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Page,
  PageHeader,
  SegmentedControl,
  type BadgeVariant,
  type SegmentedItem,
} from "../components/ui";
import { cn } from "../lib/cn";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const quickActions: SegmentedItem<PromptKey>[] = [
  { value: "writer", label: "通用对话", icon: Sparkles },
  { value: "continuation", label: "续写", icon: PenTool },
  { value: "polish", label: "润色", icon: BookOpen },
  { value: "consistency", label: "检查一致性", icon: Search },
];

const connectionState: Record<
  "connected" | "disconnected" | "checking",
  { label: string; tone: BadgeVariant }
> = {
  connected: { label: "Ollama 已连接", tone: "success" },
  disconnected: { label: "Ollama 未连接", tone: "danger" },
  checking: { label: "检测中", tone: "warning" },
};

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

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: response },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "抱歉，无法连接到 AI 模型。请确保 Ollama 服务已启动。",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const status =
    isConnected === true
      ? connectionState.connected
      : isConnected === false
        ? connectionState.disconnected
        : connectionState.checking;

  const activeLabel = quickActions.find((a) => a.value === currentPrompt)?.label ?? "通用对话";

  return (
    <Page>
      <PageHeader
        title="AI 助手"
        description="本地模型驱动，稿件不出本机"
        actions={
          <Badge variant={status.tone}>
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                status.tone === "success"
                  ? "bg-success"
                  : status.tone === "danger"
                    ? "bg-danger"
                    : "bg-warning",
              )}
            />
            {status.label}
          </Badge>
        }
      />

      <div className="flex shrink-0 items-center gap-3 border-b border-line bg-surface px-10 py-3.5">
        <SegmentedControl
          items={quickActions}
          value={currentPrompt}
          onChange={setCurrentPrompt}
          variant="segment"
        />
        <span className="ml-auto hidden text-[13px] text-ink-3 sm:block">
          当前模式：{activeLabel}
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center px-10 py-8">
          {messages.length === 0 && !isLoading ? (
            <EmptyState
              icon={Bot}
              title="开始与 AI 助手对话"
              description="需要先启动 Ollama 服务并拉取模型。选定上方模式后，直接描述你的需求即可。"
            />
          ) : (
            <div className="space-y-5 py-4">
              {messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <div
                    key={message.id}
                    className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
                  >
                    {!isUser && (
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                        <Bot size={14} aria-hidden />
                      </div>
                    )}

                    <div
                      className={cn(
                        "max-w-[76%] rounded-xl px-4 py-3 text-sm leading-relaxed",
                        isUser
                          ? "rounded-tr-sm bg-primary text-on-primary"
                          : "rounded-tl-sm border border-line bg-surface text-ink shadow-xs",
                      )}
                    >
                      <div className="whitespace-pre-wrap break-words">{message.content}</div>
                    </div>

                    {isUser && (
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-3">
                        <User size={14} aria-hidden />
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <Bot size={14} aria-hidden />
                  </div>
                  <div className="flex items-center gap-2 rounded-xl rounded-tl-sm border border-line bg-surface px-4 py-3 text-sm text-ink-2 shadow-xs">
                    <Loader2 size={14} className="animate-spin" />
                    思考中…
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-line bg-surface px-10 py-4">
        <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-3xl items-center gap-2.5">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`以「${activeLabel}」模式提问…`}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            variant="primary"
            size="icon"
            aria-label="发送"
            disabled={!input.trim()}
            loading={isLoading}
          >
            {!isLoading && <Send size={16} />}
          </Button>
        </form>
      </div>
    </Page>
  );
}
