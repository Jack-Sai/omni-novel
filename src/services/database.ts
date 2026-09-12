import Database from "@tauri-apps/plugin-sql";

const DB_NAME = "omni-novel.db";

let dbInstance: Database | null = null;

export const getDatabase = async (): Promise<Database> => {
  if (!dbInstance) {
    dbInstance = await Database.load(`sqlite:${DB_NAME}`);
    await initializeTables(dbInstance);
  }
  return dbInstance;
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

  console.log("Database tables initialized successfully");
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
    return { id, username, phone: phone || null, displayName: displayName || username };
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
