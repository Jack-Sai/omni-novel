import type { ChatMessage, GenerateOptions } from "./ollama";
import { OllamaService } from "./ollama";
import { OpenAICompatService } from "./openaiCompat";

export type BackendType = "ollama" | "llamacpp" | "vllm" | "lmstudio" | "openai-compat";

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

/** 后端类型映射到实际服务实现 */
const backendServiceMap: Record<BackendType, "ollama" | "openai-compat"> = {
  ollama: "ollama",
  llamacpp: "openai-compat",
  vllm: "openai-compat",
  lmstudio: "openai-compat",
  "openai-compat": "openai-compat",
};

/**
 * 根据配置创建 AI 服务实例
 */
export function createAIService(config: AIServiceConfig): AIService {
  const serviceType = backendServiceMap[config.backend] ?? "openai-compat";
  if (serviceType === "ollama") {
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
  llamacpp: {
    label: "llama.cpp",
    defaultUrl: "http://localhost:8080",
    defaultModel: "default",
    description: "llama.cpp 服务（启动时加 --chat 参数）",
  },
  vllm: {
    label: "vLLM",
    defaultUrl: "http://localhost:8000",
    defaultModel: "default",
    description: "vLLM 推理服务（默认端口 8000）",
  },
  lmstudio: {
    label: "LM Studio",
    defaultUrl: "http://localhost:1234",
    defaultModel: "default",
    description: "LM Studio 本地服务（默认端口 1234）",
  },
  "openai-compat": {
    label: "其他",
    defaultUrl: "http://localhost:8080",
    defaultModel: "default",
    description: "LocalAI、Text Generation WebUI 等",
  },
};
