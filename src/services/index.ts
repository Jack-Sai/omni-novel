export { OllamaService, ollama } from "./ollama";
export type { OllamaConfig, ChatMessage, GenerateOptions } from "./ollama";

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
  titleToFilename,
} from "./fileStorage";
export type { ProjectMetadata } from "./fileStorage";
