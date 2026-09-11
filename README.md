# Omni Novel

AI 驱动的小说创作桌面应用，基于 Tauri v2 + React + TypeScript 构建。

## 功能特性

- **全流程创作**：灵感 → 设定 → 大纲 → 章节 → 正文 → 修订 → 导出
- **本地 AI 模型**：支持 Ollama / llama.cpp / LM Studio / OpenAI 兼容接口
- **长期记忆**：AI 记住你的故事设定、人物和情节
- **作者主导**：所有 AI 生成内容可审阅、可回滚、可对比
- **隐私优先**：100% 本地运行，无云服务，无遥测
- **可扩展**：插件系统、自定义提示词、自定义工作流

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri v2 |
| 前端 | React 19 + TypeScript |
| 构建工具 | Vite |
| 状态管理 | Zustand |
| 路由 | React Router v7 |
| 编辑器 | TipTap (ProseMirror) |
| UI 组件 | Radix UI + Tailwind CSS v4 |
| 图标 | Lucide React |
| 数据库 | SQLite (tauri-plugin-sql) |
| 向量索引 | sqlite-vec |
| Embedding | 本地模型（Ollama） |

## 开发环境

### 前置要求

- [Rust](https://rustup.rs/)
- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)
- [Tauri 环境配置](https://v2.tauri.app/start/prerequisites/)

### 安装与运行

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm tauri dev

# 构建生产版本
pnpm tauri build
```

## 项目结构

```
omni-novel/
├── src/                  # 前端代码（React + TypeScript）
├── src-tauri/            # 后端代码（Rust + Tauri）
├── public/               # 静态资源
├── logo.png              # 应用图标
├── Omni Novel.md         # 产品需求文档
└── package.json
```

## 许可证

MIT
