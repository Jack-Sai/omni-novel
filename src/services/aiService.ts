import type { ChatMessage, GenerateOptions } from "./ollama";
import { OllamaService } from "./ollama";
import { OpenAICompatService } from "./openaiCompat";

export type BackendType = "ollama" | "openai-compat";

export interface AIServiceConfig {
  backend: BackendType;
  baseUrl: string;
  model: string;
  apiKey?: string;
}

export interface AIService {
  checkConnection(): Promise<boolean>;
  listModels(): Promise<string[]>;
  chat(messages: ChatMessage[], options?: GenerateOptions): Promise<string>;
  chatStream(
    messages: ChatMessage[],
    options?: GenerateOptions,
    onChunk?: (chunk: string) => void,
  ): Promise<string>;
  updateConfig(config: Partial<AIServiceConfig>): void;
  getConfig(): AIServiceConfig;
}

/**
 * 根据配置创建 AI 服务实例
 */
export function createAIService(config: AIServiceConfig): AIService {
  if (config.backend === "ollama") {
    return new OllamaService(config);
  }
  return new OpenAICompatService(config);
}

/**
 * 后端预设配置
 */
export const backendPresets: Record<
  BackendType,
  { label: string; defaultUrl: string; defaultModel: string; description: string }
> = {
  ollama: {
    label: "Ollama",
    defaultUrl: "http://localhost:11434",
    defaultModel: "qwen2.5:7b",
    description: "Ollama 本地模型服务",
  },
  "openai-compat": {
    label: "OpenAI 兼容",
    defaultUrl: "http://localhost:8080",
    defaultModel: "default",
    description: "llama.cpp / vLLM / LM Studio 等",
  },
};
