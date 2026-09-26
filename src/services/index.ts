export { OllamaService, ollama } from "./ollama";
export type { ChatMessage, GenerateOptions } from "./ollama";

export { createAIService, backendPresets, toLlamaConfig } from "./aiService";
export type { AIService, AIServiceConfig, BackendType, LlamaConfig } from "./aiService";

export { proxyCheckConnection, proxyListModels } from "./aiProxy";

export { OpenAICompatService } from "./openaiCompat";

export { ExportService } from "./export";
export type { ExportOptions } from "./export";

export { BackupService } from "./backup";
export type { BackupData } from "./backup";

export { systemPrompts, getSystemPrompt, builtinPromptList } from "./prompts";
export type { PromptKey, PromptMeta } from "./prompts";

export { retrieveMemories } from "./memoryService";
export type { RetrievedMemory, RetrievedKind } from "./memoryService";

export { generateCharacter, generateWorldviewItem, generateForeshadowing } from "./aiGenerate";
export type { GenerateKind, GenerateStructuredInput } from "./aiGenerate";
export type { NewCharacter, NewWorldviewItem, NewForeshadowing } from "./aiGenerate";

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
  aiDb,
  promptDb,
  memoryDb,
  versionDb,
  styleDb,
} from "./database";
export type {
  AiSessionRow,
  AiMessageRow,
  CustomPromptRow,
  MemoryItemRow,
  MemoryItemInput,
  MemoryType,
  MemoryScope,
  ChapterVersionRow,
  ChapterVersionInput,
  StyleProfileRow,
  StyleProfileInput,
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

export { initGlobalStores, loadProjectStores } from "./storeInit";

export { saveGlobalConfig, loadGlobalConfig, saveProjectJson, loadProjectJson } from "./storage";
