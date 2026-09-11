import { useState } from "react";
import { Send, Bot, User } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };

    setMessages([...messages, userMessage]);
    setInput("");

    // 模拟 AI 回复
    setTimeout(() => {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "这是一个模拟的 AI 回复。请配置本地模型（如 Ollama）以启用真实 AI 功能。",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 500);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--color-border)] px-6 py-4">
        <h1 className="text-2xl font-bold">AI 助手</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">与 AI 助手对话，获取创作灵感</p>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <Bot size={48} className="text-[var(--color-text-secondary)]" />
            <p className="text-[var(--color-text-secondary)]">开始与 AI 助手对话</p>
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
                  {message.content}
                </div>
                {message.role === "user" && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
                    <User size={16} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-[var(--color-border)] p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入你的问题..."
            className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 outline-none focus:border-[var(--color-primary)]"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
