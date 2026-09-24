import { invoke } from "@tauri-apps/api/core";
import { Channel } from "@tauri-apps/api/core";
import type { AIService, AIServiceConfig } from "./aiService";
import { proxyCheckConnection, proxyListModels } from "./aiProxy";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerateOptions {
  temperature?: number;
  topP?: number;
  topK?: number;
  repeatPenalty?: number;
  numPredict?: number;
  think?: boolean;
}

const DEFAULT_CONFIG: AIServiceConfig = {
  backend: "ollama",
  baseUrl: "http://localhost:11434",
  model: "qwen2.5:7b",
};

export class OllamaService implements AIService {
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
        topK: options?.topK ?? 40,
        repeatPenalty: options?.repeatPenalty ?? 1.1,
        maxTokens: options?.numPredict ?? 2048,
        think: options?.think ?? false,
      },
      llama: this.config.llama ?? null,
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
        topK: options?.topK ?? 40,
        repeatPenalty: options?.repeatPenalty ?? 1.1,
        maxTokens: options?.numPredict ?? 2048,
        think: options?.think ?? false,
      },
      llama: this.config.llama ?? null,
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

export const ollama = new OllamaService();
