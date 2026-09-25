import { invoke } from "@tauri-apps/api/core";
import { Channel } from "@tauri-apps/api/core";
import type { AIService, AIServiceConfig } from "./aiService";
import type { ChatMessage, GenerateOptions } from "./ollama";
import { proxyCheckConnection, proxyListModels } from "./aiProxy";

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
    return proxyCheckConnection(this.config.backend, this.config.baseUrl);
  }

  async listModels(): Promise<string[]> {
    return proxyListModels(this.config.backend, this.config.baseUrl, this.config.apiKey);
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
      llama: this.config.llama ?? null,
    });
  }

  async chatStream(
    messages: ChatMessage[],
    options?: GenerateOptions,
    onChunk?: (chunk: string, meta?: { reasoning?: boolean }) => void,
    requestId?: string,
  ): Promise<string> {
    const channel = new Channel<{ content: string; done: boolean; reasoning?: boolean }>();

    channel.onmessage = (chunk) => {
      if (chunk.content) {
        onChunk?.(chunk.content, chunk.reasoning ? { reasoning: true } : undefined);
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
        topK: options?.topK ?? 40,
        repeatPenalty: options?.repeatPenalty ?? 1.1,
        maxTokens: options?.numPredict ?? 2048,
        think: options?.think ?? false,
      },
      llama: this.config.llama ?? null,
      requestId: requestId ?? null,
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
