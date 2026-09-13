import { invoke } from "@tauri-apps/api/core";
import { Channel } from "@tauri-apps/api/core";
import type { AIService, AIServiceConfig } from "./aiService";
import type { ChatMessage, GenerateOptions } from "./ollama";

const DEFAULT_CONFIG: AIServiceConfig = {
  backend: "openai-compat",
  baseUrl: "http://localhost:8080",
  model: "default",
};

export class OpenAICompatService implements AIService {
  private config: AIServiceConfig;

  constructor(config?: Partial<AIServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/models`);
      if (response.ok) return true;

      const testResponse = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [{ role: "user", content: "hi" }],
          max_tokens: 1,
        }),
      });
      return testResponse.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/models`, {
        headers: {
          ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
        },
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.data?.map((m: { id: string }) => m.id) || [];
    } catch {
      return [];
    }
  }

  async chat(
    messages: ChatMessage[],
    options?: GenerateOptions,
  ): Promise<string> {
    return invoke<string>("ai_chat", {
      backend: this.config.backend,
      baseUrl: this.config.baseUrl,
      model: this.config.model,
      apiKey: this.config.apiKey || null,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      options: {
        temperature: options?.temperature ?? 0.7,
        topP: options?.topP ?? 0.9,
        repeatPenalty: options?.repeatPenalty ?? 1.1,
        maxTokens: options?.numPredict ?? 2048,
      },
    });
  }

  async chatStream(
    messages: ChatMessage[],
    options?: GenerateOptions,
    onChunk?: (chunk: string) => void,
  ): Promise<string> {
    const channel = new Channel<{ content: string; done: boolean }>();

    channel.onmessage = (chunk) => {
      if (chunk.content) {
        onChunk?.(chunk.content);
      }
    };

    await invoke("ai_chat_stream", {
      backend: this.config.backend,
      baseUrl: this.config.baseUrl,
      model: this.config.model,
      apiKey: this.config.apiKey || null,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      options: {
        temperature: options?.temperature ?? 0.7,
        topP: options?.topP ?? 0.9,
        repeatPenalty: options?.repeatPenalty ?? 1.1,
        maxTokens: options?.numPredict ?? 2048,
      },
      channel,
    });

    return "";
  }

  updateConfig(config: Partial<AIServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): AIServiceConfig {
    return { ...this.config };
  }
}
