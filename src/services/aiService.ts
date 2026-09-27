import type { ChatMessage, GenerateOptions } from "./ollama";
import { OllamaService } from "./ollama";
import { OpenAICompatService } from "./openaiCompat";
import { log } from "./logger";

export type BackendType = "ollama" | "llamacpp" | "vllm" | "lmstudio" | "openai-compat";

/** llama-server 托管配置（字段名与 Rust LlamaConfig 对齐） */
export interface LlamaConfig {
  llama_server_path: string;
  llama_model_path: string;
  llama_extra_args: string;
  base_url: string;
  idle_unload_minutes: number;
}

export interface AIServiceConfig {
  backend: BackendType;
  baseUrl: string;
  model: string;
  apiKey?: string;
  /** 仅 llamacpp 后端使用：存在时 AI 请求前自动拉起 llama-server */
  llama?: LlamaConfig;
}

/** 从设置构建 Rust LlamaConfig（字段名为 snake_case，与 serde 对齐） */
export function toLlamaConfig(ai: {
  baseUrl: string;
  llamaServerPath: string;
  llamaModelPath: string;
  llamaExtraArgs: string;
  idleUnloadMinutes: number;
}): LlamaConfig {
  return {
    llama_server_path: ai.llamaServerPath,
    llama_model_path: ai.llamaModelPath,
    llama_extra_args: ai.llamaExtraArgs,
    base_url: ai.baseUrl,
    idle_unload_minutes: ai.idleUnloadMinutes,
  };
}

export interface AIService {
  checkConnection(): Promise<boolean>;
  listModels(): Promise<string[]>;
  chat(messages: ChatMessage[], options?: GenerateOptions): Promise<string>;
  chatStream(
    messages: ChatMessage[],
    options?: GenerateOptions,
    onChunk?: (chunk: string, meta?: { reasoning?: boolean }) => void,
    requestId?: string,
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
 * 根据配置创建 AI 服务实例。
 * 返回实例经日志包装：chat / chatStream 记 AI、模型与性能日志，失败记 error。
 */
export function createAIService(config: AIServiceConfig): AIService {
  const serviceType = backendServiceMap[config.backend] ?? "openai-compat";
  const base: AIService =
    serviceType === "ollama" ? new OllamaService(config) : new OpenAICompatService(config);
  return wrapWithLogging(base, config);
}

function wrapWithLogging(service: AIService, config: AIServiceConfig): AIService {
  const label = `${config.backend}:${config.model}`;

  const timed = async <T>(kind: string, fn: () => Promise<T>): Promise<T> => {
    const started = performance.now();
    try {
      const result = await fn();
      const ms = Math.round(performance.now() - started);
      if (kind === "chat") {
        log("ai", "info", `AI 请求完成（${label}）`, { ms, backend: config.backend });
        if (ms > 3000) {
          log("performance", "info", `AI 响应耗时 ${ms}ms（${label}）`, { kind });
        }
      }
      return result;
    } catch (e) {
      const ms = Math.round(performance.now() - started);
      const msg = e instanceof Error ? e.message : String(e);
      log("ai", "error", `AI 请求失败（${label}）：${msg}`, { ms, kind });
      log("error", "error", `AI 请求失败：${msg}`, { backend: config.backend, kind });
      throw e;
    }
  };

  return {
    checkConnection: async () => {
      try {
        const ok = await service.checkConnection();
        log("model", ok ? "info" : "warn", `连接检测 ${label}：${ok ? "正常" : "无法连接"}`);
        return ok;
      } catch (e) {
        log("model", "error", `连接检测异常 ${label}：${String(e)}`);
        throw e;
      }
    },
    listModels: () => service.listModels(),
    chat: (messages, options) =>
      timed("chat", () => service.chat(messages, options)),
    chatStream: async (messages, options, onChunk, requestId) => {
      const started = performance.now();
      try {
        const result = await service.chatStream(messages, options, onChunk, requestId);
        const ms = Math.round(performance.now() - started);
        log("ai", "info", `AI 流式请求完成（${label}）`, { ms, requestId });
        if (ms > 3000) log("performance", "info", `AI 流式响应耗时 ${ms}ms（${label}）`);
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        log("ai", "error", `AI 流式请求失败（${label}）：${msg}`);
        log("error", "error", `AI 流式请求失败：${msg}`);
        throw e;
      }
    },
    updateConfig: (partial) => {
      service.updateConfig(partial);
      log("model", "info", "AI 配置已更新", partial);
    },
    getConfig: () => service.getConfig(),
  };
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
    description: "llama.cpp 本地服务（支持自动托管拉起）",
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
