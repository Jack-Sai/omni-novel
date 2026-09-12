export { OllamaService, ollama } from "./ollama";
export type { ChatMessage, GenerateOptions } from "./ollama";

export { createAIService, backendPresets } from "./aiService";
export type { AIService, AIServiceConfig, BackendType } from "./aiService";

export { OpenAICompatService } from "./openaiCompat";

export { ExportService } from "./export";
export type { ExportOptions } from "./export";

export { BackupService } from "./backup";
export type { BackupData } from "./backup";

export { systemPrompts, getSystemPrompt } from "./prompts";
export type { PromptKey } from "./prompts";

export {
  getDatabase,
  closeDatabase,
  userDb,
  projectDb,
  chapterDb,
  characterDb,
  worldviewDb,
  foreshadowingDb,
  settingsDb,
} from "./database";

export {
  createProjectDir,
  saveChapter,
  loadChapter,
  saveMetadata,
  loadMetadata,
  listChapters,
  listVolumes,
  titleToFilename,
  isNovelProject,
  saveDraft,
  saveExport,
} from "./fileStorage";
export type { ProjectMetadata } from "./fileStorage";
