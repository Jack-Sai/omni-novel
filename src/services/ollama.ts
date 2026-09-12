import type { AIService, AIServiceConfig } from "./aiService";

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
  /** 关闭模型内部思考/推理，节省上下文并加快响应速度 */
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
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      const data = await response.json();
      return data.models?.map((m: { name: string }) => m.name) || [];
    } catch {
      return [];
    }
  }

  async chat(
    messages: ChatMessage[],
    options?: GenerateOptions
  ): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        stream: false,
        think: options?.think ?? false,
        options: {
          temperature: options?.temperature ?? 0.7,
          top_p: options?.topP ?? 0.9,
          top_k: options?.topK ?? 40,
          repeat_penalty: options?.repeatPenalty ?? 1.1,
          num_predict: options?.numPredict ?? 2048,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.message?.content || "";
  }

  async chatStream(
    messages: ChatMessage[],
    options?: GenerateOptions,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        stream: true,
        think: options?.think ?? false,
        options: {
          temperature: options?.temperature ?? 0.7,
          top_p: options?.topP ?? 0.9,
          top_k: options?.topK ?? 40,
          repeat_penalty: options?.repeatPenalty ?? 1.1,
          num_predict: options?.numPredict ?? 2048,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    let fullContent = "";
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split("\n").filter(Boolean);

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.message?.content) {
            fullContent += data.message.content;
            onChunk?.(data.message.content);
          }
        } catch {
          // Skip invalid JSON lines
        }
      }
    }

    return fullContent;
  }

  updateConfig(config: Partial<AIServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): AIServiceConfig {
    return { ...this.config };
  }
}

export const ollama = new OllamaService();
