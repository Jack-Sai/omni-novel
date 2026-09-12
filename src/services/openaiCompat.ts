import type {
  AIService,
  AIServiceConfig,
} from "./aiService";
import type { ChatMessage, GenerateOptions } from "./ollama";

interface OpenAIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIChatRequest {
  model: string;
  messages: OpenAIChatMessage[];
  stream: boolean;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

interface OpenAIChatResponse {
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
}

interface OpenAIStreamChunk {
  choices: {
    delta: {
      content?: string;
    };
    finish_reason: string | null;
  }[];
}

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

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }
    return headers;
  }

  async checkConnection(): Promise<boolean> {
    try {
      // 尝试 /v1/models 端点
      const response = await fetch(`${this.config.baseUrl}/v1/models`, {
        headers: this.getHeaders(),
      });
      if (response.ok) return true;

      // 某些实现可能没有 /v1/models，尝试 /v1/chat/completions 端点
      const testResponse = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: this.getHeaders(),
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
        headers: this.getHeaders(),
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
    const request: OpenAIChatRequest = {
      model: this.config.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
      temperature: options?.temperature,
      top_p: options?.topP,
      max_tokens: options?.numPredict,
      frequency_penalty: options?.repeatPenalty
        ? (options.repeatPenalty - 1) * 2
        : undefined,
    };

    const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data: OpenAIChatResponse = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }

  async chatStream(
    messages: ChatMessage[],
    options?: GenerateOptions,
    onChunk?: (chunk: string) => void,
  ): Promise<string> {
    const request: OpenAIChatRequest = {
      model: this.config.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      temperature: options?.temperature,
      top_p: options?.topP,
      max_tokens: options?.numPredict,
      frequency_penalty: options?.repeatPenalty
        ? (options.repeatPenalty - 1) * 2
        : undefined,
    };

    const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    let fullContent = "";
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6);
        if (data === "[DONE]") break;

        try {
          const parsed: OpenAIStreamChunk = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            onChunk?.(content);
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
