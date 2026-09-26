import Database from "@tauri-apps/plugin-sql";

const DB_NAME = "omni-novel.db";

let dbInstance: Database | null = null;
let dbInitializing: Promise<Database> | null = null;

export const getDatabase = async (): Promise<Database> => {
  if (dbInstance) return dbInstance;
  if (dbInitializing) return dbInitializing;

  dbInitializing = (async () => {
    const db = await Database.load(`sqlite:${DB_NAME}`);
    await db.execute("PRAGMA foreign_keys = ON");
    await initializeTables(db);
    dbInstance = db;
    dbInitializing = null;
    return db;
  })();

  return dbInitializing;
};

export const closeDatabase = async (): Promise<void> => {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
};

async function initializeTables(db: Database) {
  // 创建用户表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      phone TEXT,
      password TEXT NOT NULL,
      display_name TEXT,
      avatar TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 创建项目表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      author TEXT DEFAULT '',
      genre TEXT DEFAULT '',
      synopsis TEXT DEFAULT '',
      content TEXT DEFAULT '',
      cover_image TEXT,
      word_count INTEGER DEFAULT 0,
      target_words INTEGER DEFAULT 100000,
      status TEXT DEFAULT 'draft',
      storage_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 创建章节表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      volume_id TEXT,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      word_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft',
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // 创建人物表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      aliases TEXT DEFAULT '[]',
      gender TEXT DEFAULT '',
      age TEXT DEFAULT '',
      appearance TEXT DEFAULT '',
      personality TEXT DEFAULT '',
      background TEXT DEFAULT '',
      goals TEXT DEFAULT '',
      conflicts TEXT DEFAULT '',
      relationships TEXT DEFAULT '',
      abilities TEXT DEFAULT '',
      weaknesses TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      avatar TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // 创建世界观表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS worldview_items (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT DEFAULT '',
      details TEXT DEFAULT '',
      relationships TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      image TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // 创建大纲卷表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS outline_volumes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // 创建大纲章表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS outline_chapters (
      id TEXT PRIMARY KEY,
      volume_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'draft',
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (volume_id) REFERENCES outline_volumes(id) ON DELETE CASCADE
    )
  `);

  // 创建大纲场景表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS outline_scenes (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (chapter_id) REFERENCES outline_chapters(id) ON DELETE CASCADE
    )
  `);

  // 创建伏笔表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS foreshadowing_items (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'planted',
      importance TEXT DEFAULT 'medium',
      planted_chapter TEXT DEFAULT '',
      reveal_chapter TEXT DEFAULT '',
      planted_content TEXT DEFAULT '',
      reveal_content TEXT DEFAULT '',
      related_characters TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // 创建设置表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      user_id TEXT,
      theme TEXT DEFAULT 'system',
      ai_base_url TEXT DEFAULT 'http://localhost:11434',
      ai_model TEXT DEFAULT 'llama2',
      ai_temperature REAL DEFAULT 0.7,
      ai_top_p REAL DEFAULT 0.9,
      ai_top_k INTEGER DEFAULT 40,
      ai_repeat_penalty REAL DEFAULT 1.1,
      ai_max_tokens INTEGER DEFAULT 2048,
      auto_save_interval INTEGER DEFAULT 30,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 创建 AI 会话表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ai_sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // 创建 AI 消息表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ai_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      action TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES ai_sessions(id) ON DELETE CASCADE
    )
  `);

  // 创建自定义提示词表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS custom_prompts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 创建记忆条目表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS memory_items (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'note',
      scope TEXT NOT NULL DEFAULT 'global',
      ref_id TEXT,
      title TEXT DEFAULT '',
      content TEXT NOT NULL,
      source TEXT DEFAULT 'manual',
      importance INTEGER DEFAULT 5,
      tags TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // 创建章节版本快照表（版本对比）
  await db.execute(`
    CREATE TABLE IF NOT EXISTS chapter_versions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      chapter_id TEXT NOT NULL,
      title TEXT DEFAULT '',
      content TEXT NOT NULL,
      word_count INTEGER DEFAULT 0,
      source TEXT DEFAULT 'auto',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // 创建文风卡片表（文风系统）
  await db.execute(`
    CREATE TABLE IF NOT EXISTS style_profiles (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      content TEXT NOT NULL,
      sample TEXT DEFAULT '',
      source TEXT DEFAULT 'manual',
      is_active INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  console.log("Database tables initialized successfully");

  // Schema migration: 确保 users 表有 phone 和 password 列
  try {
    const columns = await db.select<{ name: string }[]>("PRAGMA table_info(users)");
    const columnNames = columns.map((c) => c.name);
    if (!columnNames.includes("phone")) {
      await db.execute("ALTER TABLE users ADD COLUMN phone TEXT");
    }
    if (!columnNames.includes("password")) {
      await db.execute("ALTER TABLE users ADD COLUMN password TEXT DEFAULT ''");
    }
  } catch (e) {
    console.warn("Schema migration warning:", e);
  }

  // Schema migration: 章节摘要列
  try {
    const chapterColumns = await db.select<{ name: string }[]>("PRAGMA table_info(chapters)");
    if (!chapterColumns.some((c) => c.name === "summary")) {
      await db.execute("ALTER TABLE chapters ADD COLUMN summary TEXT DEFAULT ''");
    }
  } catch (e) {
    console.warn("Schema migration (chapters.summary) warning:", e);
  }
}

// 用户相关操作
export const userDb = {
  async create(username: string, password: string, phone?: string, displayName?: string) {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    await db.execute(
      "INSERT INTO users (id, username, phone, password, display_name) VALUES (?, ?, ?, ?, ?)",
      [id, username, phone || null, password, displayName || username]
    );
    return { id, username, phone: phone || null, display_name: displayName || username };
  },

  async getByUsername(username: string) {
    const db = await getDatabase();
    const results = await db.select<any[]>("SELECT * FROM users WHERE username = ?", [username]);
    return results[0] || null;
  },

  async getByPhone(phone: string) {
    const db = await getDatabase();
    const results = await db.select<any[]>("SELECT * FROM users WHERE phone = ?", [phone]);
    return results[0] || null;
  },

  async getById(id: string) {
    const db = await getDatabase();
    const results = await db.select<any[]>("SELECT * FROM users WHERE id = ?", [id]);
    return results[0] || null;
  },

  async verifyPassword(username: string, password: string) {
    const db = await getDatabase();
    const results = await db.select<any[]>(
      "SELECT * FROM users WHERE username = ? AND password = ?",
      [username, password]
    );
    return results[0] || null;
  },

  async update(id: string, updates: { display_name?: string; avatar?: string; phone?: string; password?: string }) {
    const db = await getDatabase();
    const fields = [];
    const values = [];
    
    if (updates.display_name !== undefined) {
      fields.push("display_name = ?");
      values.push(updates.display_name);
    }
    if (updates.avatar !== undefined) {
      fields.push("avatar = ?");
      values.push(updates.avatar);
    }
    if (updates.phone !== undefined) {
      fields.push("phone = ?");
      values.push(updates.phone);
    }
    if (updates.password !== undefined) {
      fields.push("password = ?");
      values.push(updates.password);
    }
    
    fields.push("updated_at = datetime('now')");
    values.push(id);
    
    await db.execute(
      `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    return this.getById(id);
  }
};

// 项目相关操作
export const projectDb = {
  async create(project: {
    user_id: string;
    title: string;
    author?: string;
    genre?: string;
    synopsis?: string;
    storage_path?: string;
  }) {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO projects (id, user_id, title, author, genre, synopsis, storage_path)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, project.user_id, project.title, project.author || "", project.genre || "", project.synopsis || "", project.storage_path || ""]
    );
    return this.getById(id);
  },

  async getById(id: string) {
    const db = await getDatabase();
    const results = await db.select<any[]>("SELECT * FROM projects WHERE id = ?", [id]);
    return results[0] || null;
  },

  async getByUserId(userId: string) {
    const db = await getDatabase();
    return await db.select<any[]>(
      "SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC",
      [userId]
    );
  },

  async update(id: string, updates: Partial<{
    title: string;
    author: string;
    genre: string;
    synopsis: string;
    content: string;
    cover_image: string;
    word_count: number;
    target_words: number;
    status: string;
    storage_path: string;
  }>) {
    const db = await getDatabase();
    const fields = [];
    const values = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    fields.push("updated_at = datetime('now')");
    values.push(id);
    
    await db.execute(
      `UPDATE projects SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    return this.getById(id);
  },

  async delete(id: string) {
    const db = await getDatabase();
    await db.execute("DELETE FROM projects WHERE id = ?", [id]);
  }
};

// 章节相关操作
export const chapterDb = {
  async create(chapter: {
    project_id: string;
    title: string;
    volume_id?: string;
    order_index?: number;
  }) {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO chapters (id, project_id, title, volume_id, order_index)
       VALUES (?, ?, ?, ?, ?)`,
      [id, chapter.project_id, chapter.title, chapter.volume_id || null, chapter.order_index || 0]
    );
    return this.getById(id);
  },

  async getById(id: string) {
    const db = await getDatabase();
    const results = await db.select<any[]>("SELECT * FROM chapters WHERE id = ?", [id]);
    return results[0] || null;
  },

  async getByProjectId(projectId: string) {
    const db = await getDatabase();
    return await db.select<any[]>(
      "SELECT * FROM chapters WHERE project_id = ? ORDER BY order_index",
      [projectId]
    );
  },

  async update(id: string, updates: Partial<{
    title: string;
    content: string;
    summary: string;
    volume_id: string;
    status: string;
    order_index: number;
  }>) {
    const db = await getDatabase();
    const fields = [];
    const values = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    fields.push("updated_at = datetime('now')");
    values.push(id);
    
    await db.execute(
      `UPDATE chapters SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    return this.getById(id);
  },

  async delete(id: string) {
    const db = await getDatabase();
    await db.execute("DELETE FROM chapters WHERE id = ?", [id]);
  }
};

// 人物相关操作
export const characterDb = {
  async create(character: {
    project_id: string;
    name: string;
    gender?: string;
    age?: string;
  }) {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO characters (id, project_id, name, gender, age)
       VALUES (?, ?, ?, ?, ?)`,
      [id, character.project_id, character.name, character.gender || "", character.age || ""]
    );
    return this.getById(id);
  },

  async getById(id: string) {
    const db = await getDatabase();
    const results = await db.select<any[]>("SELECT * FROM characters WHERE id = ?", [id]);
    return results[0] || null;
  },

  async getByProjectId(projectId: string) {
    const db = await getDatabase();
    return await db.select<any[]>(
      "SELECT * FROM characters WHERE project_id = ? ORDER BY created_at DESC",
      [projectId]
    );
  },

  async update(id: string, updates: Partial<{
    name: string;
    aliases: string;
    gender: string;
    age: string;
    appearance: string;
    personality: string;
    background: string;
    goals: string;
    conflicts: string;
    relationships: string;
    abilities: string;
    weaknesses: string;
    notes: string;
    tags: string;
    avatar: string;
  }>) {
    const db = await getDatabase();
    const fields = [];
    const values = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    fields.push("updated_at = datetime('now')");
    values.push(id);
    
    await db.execute(
      `UPDATE characters SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    return this.getById(id);
  },

  async delete(id: string) {
    const db = await getDatabase();
    await db.execute("DELETE FROM characters WHERE id = ?", [id]);
  }
};

// 世界观相关操作
export const worldviewDb = {
  async create(item: {
    project_id: string;
    name: string;
    type: string;
  }) {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO worldview_items (id, project_id, name, type)
       VALUES (?, ?, ?, ?)`,
      [id, item.project_id, item.name, item.type]
    );
    return this.getById(id);
  },

  async getById(id: string) {
    const db = await getDatabase();
    const results = await db.select<any[]>("SELECT * FROM worldview_items WHERE id = ?", [id]);
    return results[0] || null;
  },

  async getByProjectId(projectId: string) {
    const db = await getDatabase();
    return await db.select<any[]>(
      "SELECT * FROM worldview_items WHERE project_id = ? ORDER BY created_at DESC",
      [projectId]
    );
  },

  async update(id: string, updates: Partial<{
    name: string;
    type: string;
    description: string;
    details: string;
    relationships: string;
    notes: string;
    image: string;
  }>) {
    const db = await getDatabase();
    const fields = [];
    const values = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    fields.push("updated_at = datetime('now')");
    values.push(id);
    
    await db.execute(
      `UPDATE worldview_items SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    return this.getById(id);
  },

  async delete(id: string) {
    const db = await getDatabase();
    await db.execute("DELETE FROM worldview_items WHERE id = ?", [id]);
  }
};

// 伏笔相关操作
export const foreshadowingDb = {
  async create(item: {
    project_id: string;
    name: string;
    importance?: string;
  }) {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO foreshadowing_items (id, project_id, name, importance)
       VALUES (?, ?, ?, ?)`,
      [id, item.project_id, item.name, item.importance || "medium"]
    );
    return this.getById(id);
  },

  async getById(id: string) {
    const db = await getDatabase();
    const results = await db.select<any[]>("SELECT * FROM foreshadowing_items WHERE id = ?", [id]);
    return results[0] || null;
  },

  async getByProjectId(projectId: string) {
    const db = await getDatabase();
    return await db.select<any[]>(
      "SELECT * FROM foreshadowing_items WHERE project_id = ? ORDER BY created_at DESC",
      [projectId]
    );
  },

  async update(id: string, updates: Partial<{
    name: string;
    description: string;
    status: string;
    importance: string;
    planted_chapter: string;
    reveal_chapter: string;
    planted_content: string;
    reveal_content: string;
    related_characters: string;
    notes: string;
  }>) {
    const db = await getDatabase();
    const fields = [];
    const values = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    fields.push("updated_at = datetime('now')");
    values.push(id);
    
    await db.execute(
      `UPDATE foreshadowing_items SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    return this.getById(id);
  },

  async delete(id: string) {
    const db = await getDatabase();
    await db.execute("DELETE FROM foreshadowing_items WHERE id = ?", [id]);
  }
};

// 设置相关操作
export const settingsDb = {
  async get(userId?: string) {
    const db = await getDatabase();
    if (userId) {
      const results = await db.select<any[]>("SELECT * FROM settings WHERE user_id = ?", [userId]);
      return results[0] || null;
    }
    const results = await db.select<any[]>("SELECT * FROM settings WHERE id = 'default'");
    return results[0] || null;
  },

  async update(updates: Partial<{
    theme: string;
    ai_base_url: string;
    ai_model: string;
    ai_temperature: number;
    ai_top_p: number;
    ai_top_k: number;
    ai_repeat_penalty: number;
    ai_max_tokens: number;
    auto_save_interval: number;
  }>, userId?: string) {
    const db = await getDatabase();
    const fields = [];
    const values = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    fields.push("updated_at = datetime('now')");
    
    if (userId) {
      values.push(userId);
      await db.execute(
        `UPDATE settings SET ${fields.join(", ")} WHERE user_id = ?`,
        values
      );
    } else {
      values.push("default");
      await db.execute(
        `UPDATE settings SET ${fields.join(", ")} WHERE id = ?`,
        values
      );
    }
  }
};

// AI 会话与消息相关操作
export interface AiSessionRow {
  id: string;
  project_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AiMessageRow {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  action: string | null;
  created_at: string;
}

export const aiDb = {
  async listSessions(projectId: string): Promise<AiSessionRow[]> {
    const db = await getDatabase();
    return db.select<AiSessionRow[]>(
      "SELECT * FROM ai_sessions WHERE project_id = ? ORDER BY updated_at DESC",
      [projectId]
    );
  },

  async latestSession(projectId: string): Promise<AiSessionRow | null> {
    const db = await getDatabase();
    const rows = await db.select<AiSessionRow[]>(
      "SELECT * FROM ai_sessions WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1",
      [projectId]
    );
    return rows[0] || null;
  },

  async createSession(projectId: string, title: string): Promise<AiSessionRow> {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    await db.execute(
      "INSERT INTO ai_sessions (id, project_id, title) VALUES (?, ?, ?)",
      [id, projectId, title]
    );
    const row = await db.select<AiSessionRow[]>(
      "SELECT * FROM ai_sessions WHERE id = ?",
      [id]
    );
    return row[0];
  },

  async touchSession(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      "UPDATE ai_sessions SET updated_at = datetime('now') WHERE id = ?",
      [id]
    );
  },

  async renameSession(id: string, title: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      "UPDATE ai_sessions SET title = ?, updated_at = datetime('now') WHERE id = ?",
      [title, id]
    );
  },

  async deleteSession(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute("DELETE FROM ai_messages WHERE session_id = ?", [id]);
    await db.execute("DELETE FROM ai_sessions WHERE id = ?", [id]);
  },

  async listMessages(sessionId: string): Promise<AiMessageRow[]> {
    const db = await getDatabase();
    return db.select<AiMessageRow[]>(
      "SELECT * FROM ai_messages WHERE session_id = ? ORDER BY created_at ASC, rowid ASC",
      [sessionId]
    );
  },

  async addMessage(
    sessionId: string,
    message: { role: "user" | "assistant"; content: string; action?: string }
  ): Promise<AiMessageRow> {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    await db.execute(
      "INSERT INTO ai_messages (id, session_id, role, content, action) VALUES (?, ?, ?, ?, ?)",
      [id, sessionId, message.role, message.content, message.action || null]
    );
    await db.execute(
      "UPDATE ai_sessions SET updated_at = datetime('now') WHERE id = ?",
      [sessionId]
    );
    const row = await db.select<AiMessageRow[]>(
      "SELECT * FROM ai_messages WHERE id = ?",
      [id]
    );
    return row[0];
  },

  /** 删除单条消息（按行 id） */
  async deleteMessage(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute("DELETE FROM ai_messages WHERE id = ?", [id]);
  },

  /** 清空会话的全部消息 */
  async deleteMessagesBySession(sessionId: string): Promise<void> {
    const db = await getDatabase();
    await db.execute("DELETE FROM ai_messages WHERE session_id = ?", [sessionId]);
  },
};

// 自定义提示词相关操作
export interface CustomPromptRow {
  id: string;
  name: string;
  description: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export const promptDb = {
  async list(): Promise<CustomPromptRow[]> {
    const db = await getDatabase();
    return db.select<CustomPromptRow[]>(
      "SELECT * FROM custom_prompts ORDER BY updated_at DESC"
    );
  },

  async getById(id: string): Promise<CustomPromptRow | null> {
    const db = await getDatabase();
    const rows = await db.select<CustomPromptRow[]>(
      "SELECT * FROM custom_prompts WHERE id = ?",
      [id]
    );
    return rows[0] || null;
  },

  async create(prompt: {
    name: string;
    description?: string;
    content: string;
  }): Promise<CustomPromptRow> {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    await db.execute(
      "INSERT INTO custom_prompts (id, name, description, content) VALUES (?, ?, ?, ?)",
      [id, prompt.name, prompt.description || "", prompt.content]
    );
    return (await this.getById(id))!;
  },

  async update(
    id: string,
    prompt: { name: string; description?: string; content: string }
  ): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      "UPDATE custom_prompts SET name = ?, description = ?, content = ?, updated_at = datetime('now') WHERE id = ?",
      [prompt.name, prompt.description || "", prompt.content, id]
    );
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute("DELETE FROM custom_prompts WHERE id = ?", [id]);
  },
};

// ── 记忆条目（记忆系统 v1：结构化存储 + 关键词检索） ──────────────────────────

/** 记忆类型：summary=章节/卷摘要 event=事件 entity=实体引用 note=随笔 preference=用户偏好 */
export type MemoryType = "summary" | "event" | "entity" | "note" | "preference";
/** 记忆范围：chapter=绑定章节 volume=绑定卷 global=全书 */
export type MemoryScope = "chapter" | "volume" | "global";

export interface MemoryItemRow {
  id: string;
  project_id: string;
  type: string;
  scope: string;
  ref_id: string | null;
  title: string;
  content: string;
  source: string;
  importance: number;
  tags: string;
  created_at: string;
  updated_at: string;
}

export interface MemoryItemInput {
  type: MemoryType;
  scope?: MemoryScope;
  refId?: string | null;
  title?: string;
  content: string;
  source?: "manual" | "ai" | "import";
  importance?: number;
  tags?: string[];
}

export const memoryDb = {
  async create(projectId: string, item: MemoryItemInput): Promise<MemoryItemRow> {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO memory_items (id, project_id, type, scope, ref_id, title, content, source, importance, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        projectId,
        item.type,
        item.scope || "global",
        item.refId ?? null,
        item.title || "",
        item.content,
        item.source || "manual",
        item.importance ?? 5,
        JSON.stringify(item.tags || []),
      ]
    );
    const rows = await db.select<MemoryItemRow[]>(
      "SELECT * FROM memory_items WHERE id = ?",
      [id]
    );
    return rows[0];
  },

  async getById(id: string): Promise<MemoryItemRow | null> {
    const db = await getDatabase();
    const rows = await db.select<MemoryItemRow[]>(
      "SELECT * FROM memory_items WHERE id = ?",
      [id]
    );
    return rows[0] || null;
  },

  async update(
    id: string,
    updates: Partial<Omit<MemoryItemInput, "tags">> & { tags?: string[] }
  ): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = [];
    const values: unknown[] = [];
    const columnMap: Record<string, string> = {
      type: "type",
      scope: "scope",
      refId: "ref_id",
      title: "title",
      content: "content",
      source: "source",
      importance: "importance",
    };
    Object.entries(columnMap).forEach(([key, column]) => {
      const value = (updates as Record<string, unknown>)[key];
      if (value !== undefined) {
        fields.push(`${column} = ?`);
        values.push(value);
      }
    });
    if (updates.tags !== undefined) {
      fields.push("tags = ?");
      values.push(JSON.stringify(updates.tags));
    }
    if (fields.length === 0) return;
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await db.execute(
      `UPDATE memory_items SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute("DELETE FROM memory_items WHERE id = ?", [id]);
  },

  async list(
    projectId: string,
    opts?: { type?: MemoryType; scope?: MemoryScope; refId?: string }
  ): Promise<MemoryItemRow[]> {
    const db = await getDatabase();
    let sql = "SELECT * FROM memory_items WHERE project_id = ?";
    const params: unknown[] = [projectId];
    if (opts?.type) {
      sql += " AND type = ?";
      params.push(opts.type);
    }
    if (opts?.scope) {
      sql += " AND scope = ?";
      params.push(opts.scope);
    }
    if (opts?.refId) {
      sql += " AND ref_id = ?";
      params.push(opts.refId);
    }
    sql += " ORDER BY importance DESC, updated_at DESC";
    return db.select<MemoryItemRow[]>(sql, params);
  },

  /**
   * 关键词检索：查询按空白/逗号分词，命中 title/content/tags 即入选，
   * 按命中词数与 importance 综合排序（中文子串匹配，无需分词器）。
   */
  async search(
    projectId: string,
    query: string,
    opts?: { limit?: number; type?: MemoryType; excludeIds?: string[] }
  ): Promise<MemoryItemRow[]> {
    const limit = opts?.limit ?? 8;
    const rows = await this.list(projectId, opts?.type ? { type: opts.type } : undefined);
    const exclude = new Set(opts?.excludeIds || []);
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const terms = q.split(/[\s,，、;；]+/).filter((t) => t.length > 0);

    const scored: { row: MemoryItemRow; score: number }[] = [];
    for (const row of rows) {
      if (exclude.has(row.id)) continue;
      const hay = `${row.title}\n${row.content}\n${row.tags}`.toLowerCase();
      let hits = 0;
      for (const t of terms) {
        if (hay.includes(t)) hits++;
      }
      if (hits === 0 && !hay.includes(q)) continue;
      // 命中词数优先，其次重要度
      scored.push({ row, score: hits * 10 + (row.importance || 5) });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.row);
  },
};

// ── 章节版本快照（版本对比） ──

export interface ChapterVersionRow {
  id: string;
  project_id: string;
  chapter_id: string;
  title: string;
  content: string;
  word_count: number;
  source: "auto" | "manual" | "restore";
  created_at: string;
}

export interface ChapterVersionInput {
  title?: string;
  content: string;
  source?: "auto" | "manual" | "restore";
}

/** 每章最多保留的版本数 */
const VERSION_KEEP = 20;

export const versionDb = {
  /**
   * 新建版本快照；内容与该章最新快照相同则跳过（返回 null）。
   * 创建后自动裁剪到最近 VERSION_KEEP 条。
   */
  async create(
    projectId: string,
    chapterId: string,
    input: ChapterVersionInput
  ): Promise<ChapterVersionRow | null> {
    const db = await getDatabase();
    const latest = await db.select<ChapterVersionRow[]>(
      "SELECT * FROM chapter_versions WHERE project_id = ? AND chapter_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1",
      [projectId, chapterId]
    );
    if (latest[0] && latest[0].content === input.content) return null;

    const id = crypto.randomUUID();
    const wordCount = input.content.replace(/<[^>]*>/g, "").replace(/\s/g, "").length;
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO chapter_versions (id, project_id, chapter_id, title, content, word_count, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        projectId,
        chapterId,
        input.title || "",
        input.content,
        wordCount,
        input.source || "auto",
        now,
      ]
    );
    // 裁剪旧版本：每章仅保留最近 N 条
    await db.execute(
      `DELETE FROM chapter_versions
       WHERE project_id = ? AND chapter_id = ? AND id NOT IN (
         SELECT id FROM chapter_versions WHERE project_id = ? AND chapter_id = ?
         ORDER BY created_at DESC, rowid DESC LIMIT ?
       )`,
      [projectId, chapterId, projectId, chapterId, VERSION_KEEP]
    );
    const rows = await db.select<ChapterVersionRow[]>(
      "SELECT * FROM chapter_versions WHERE id = ?",
      [id]
    );
    return rows[0] || null;
  },

  /** 按章节列出版（新→旧） */
  async list(
    projectId: string,
    chapterId: string
  ): Promise<ChapterVersionRow[]> {
    const db = await getDatabase();
    return db.select<ChapterVersionRow[]>(
      "SELECT * FROM chapter_versions WHERE project_id = ? AND chapter_id = ? ORDER BY created_at DESC, rowid DESC",
      [projectId, chapterId]
    );
  },

  async getById(id: string): Promise<ChapterVersionRow | null> {
    const db = await getDatabase();
    const rows = await db.select<ChapterVersionRow[]>(
      "SELECT * FROM chapter_versions WHERE id = ?",
      [id]
    );
    return rows[0] || null;
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute("DELETE FROM chapter_versions WHERE id = ?", [id]);
  },

  /** 删除章节的全部版本 */
  async deleteByChapter(projectId: string, chapterId: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      "DELETE FROM chapter_versions WHERE project_id = ? AND chapter_id = ?",
      [projectId, chapterId]
    );
  },
};

// ── 文风卡片（文风系统） ──

export interface StyleProfileRow {
  id: string;
  project_id: string;
  name: string;
  description: string;
  /** 文风画像正文（注入 AI 上下文用） */
  content: string;
  /** 训练样本（生成画像的原始文本，可空） */
  sample: string;
  source: "manual" | "ai";
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface StyleProfileInput {
  name: string;
  description?: string;
  content: string;
  sample?: string;
  source?: "manual" | "ai";
  isActive?: boolean;
}

export const styleDb = {
  async list(projectId: string): Promise<StyleProfileRow[]> {
    const db = await getDatabase();
    return db.select<StyleProfileRow[]>(
      "SELECT * FROM style_profiles WHERE project_id = ? ORDER BY is_active DESC, updated_at DESC",
      [projectId]
    );
  },

  async getById(id: string): Promise<StyleProfileRow | null> {
    const db = await getDatabase();
    const rows = await db.select<StyleProfileRow[]>(
      "SELECT * FROM style_profiles WHERE id = ?",
      [id]
    );
    return rows[0] || null;
  },

  /** 当前启用的文风（无则 null） */
  async getActive(projectId: string): Promise<StyleProfileRow | null> {
    const db = await getDatabase();
    const rows = await db.select<StyleProfileRow[]>(
      "SELECT * FROM style_profiles WHERE project_id = ? AND is_active = 1 LIMIT 1",
      [projectId]
    );
    return rows[0] || null;
  },

  async create(projectId: string, input: StyleProfileInput): Promise<StyleProfileRow> {
    const db = await getDatabase();
    if (input.isActive) {
      await db.execute(
        "UPDATE style_profiles SET is_active = 0, updated_at = datetime('now') WHERE project_id = ?",
        [projectId]
      );
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO style_profiles (id, project_id, name, description, content, sample, source, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        projectId,
        input.name,
        input.description || "",
        input.content,
        input.sample || "",
        input.source || "manual",
        input.isActive ? 1 : 0,
        now,
        now,
      ]
    );
    return (await this.getById(id))!;
  },

  async update(
    id: string,
    updates: Partial<StyleProfileInput>
  ): Promise<void> {
    const db = await getDatabase();
    const row = await this.getById(id);
    if (!row) return;
    if (updates.isActive !== undefined) {
      if (updates.isActive) {
        await db.execute(
          "UPDATE style_profiles SET is_active = 0, updated_at = datetime('now') WHERE project_id = ? AND id != ?",
          [row.project_id, id]
        );
      }
      await db.execute(
        "UPDATE style_profiles SET is_active = ?, updated_at = datetime('now') WHERE id = ?",
        [updates.isActive ? 1 : 0, id]
      );
    }
    const fields: string[] = [];
    const values: unknown[] = [];
    const map: Record<string, string> = {
      name: "name",
      description: "description",
      content: "content",
      sample: "sample",
      source: "source",
    };
    Object.entries(map).forEach(([key, column]) => {
      const value = (updates as Record<string, unknown>)[key];
      if (value !== undefined) {
        fields.push(`${column} = ?`);
        values.push(value);
      }
    });
    if (fields.length === 0) return;
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await db.execute(`UPDATE style_profiles SET ${fields.join(", ")} WHERE id = ?`, values);
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute("DELETE FROM style_profiles WHERE id = ?", [id]);
  },
};
