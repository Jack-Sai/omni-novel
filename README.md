<div align="center">

<img src="https://raw.githubusercontent.com/Jack-Sai/omni-novel/main/logo.png" alt="Omni Novel Logo" width="120" />

# Omni Novel

AI 驱动的小说创作桌面应用 —— 从灵感、设定、大纲到成稿、修订、导出的全流程本地写作工作台。

[![GitHub Stars](https://img.shields.io/github/stars/Jack-Sai/omni-novel?style=flat&logo=github)](https://github.com/Jack-Sai/omni-novel/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/Jack-Sai/omni-novel?style=flat&logo=github)](https://github.com/Jack-Sai/omni-novel/network/members)
[![GitHub Issues](https://img.shields.io/github/issues/Jack-Sai/omni-novel?style=flat&logo=github)](https://github.com/Jack-Sai/omni-novel/issues)
[![GitHub License](https://img.shields.io/github/license/Jack-Sai/omni-novel?style=flat&logo=github)](https://github.com/Jack-Sai/omni-novel/blob/main/LICENSE)

[![Tauri](https://img.shields.io/badge/Tauri-v2-blue?style=flat&logo=tauri)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![Zustand](https://img.shields.io/badge/state-Zustand-4d8b64?style=flat&logo=zustand)](https://github.com/pmndrs/zustand)
[![License: MIT](https://img.shields.io/badge/license-MIT-green?style=flat)](https://github.com/Jack-Sai/omni-novel/blob/main/LICENSE)

</div>

---

## 功能特性

### 📖 创作与编辑

- **全流程创作**：灵感 → 设定 → 大纲 → 章节 → 正文 → 修订 → 导出
- **富文本编辑器**：TipTap 内核，工具栏排版、选区操作、实时字数统计
- **章节管理**：多卷多章结构、章节列表、一键 **AI 生成章节摘要**
- **大纲视图**：卷 / 章 / 场景三级大纲，状态跟踪
- **世界构建**：人物档案、世界观设定、伏笔埋设与回收追踪
- **写作体验**：
  - 专注模式（隐藏一切干扰，`Esc` 退出）
  - 打字机滚动（光标始终保持在视口中部）
  - 章节目标字数进度条
  - 自动保存 + `Ctrl+S` 手动保存
  - 选中文字浮层：一键复制 /「问 AI」

### 🤖 AI 助手

- **多后端接入**：Ollama、llama.cpp、vLLM、LM Studio、任意 OpenAI 兼容接口
- **本地模型托管**（llama.cpp 专属）：
  - 未启动时自动拉起 `llama-server`，就绪后提示
  - 空闲自动卸载释放显存，退出应用清理进程
  - 模型档案：保存路径与启动参数，多模型一键切换（切换自动重启加载）
- **流式生成**：实时输出、思考模型 `reasoning` 展示、随时取消、Markdown 渲染
- **快捷创作**：续写、润色、扩写、缩写（选区直出，可应用回正文）
- **提示词库**：11 个内置提示词 + 自定义提示词管理，AI 面板「更多」菜单一键调用
- **会话管理**：对话持久化，历史会话切换 / 删除，上下文条数可配置

### 🧠 记忆系统（v1）

- **章节摘要**：每章可一键生成结构化摘要，同步写入项目记忆
- **混合检索**：记忆条目 + 章节摘要 + 人物 + 世界观 + 伏笔，关键词命中综合排序
- **上下文注入**：对话发送前自动检索 Top-6 相关记忆拼入提示词，气泡上可展开查看注入明细（可开关）
- **记忆管理页**：搜索、类型/范围筛选、新增、编辑、删除

### 🎨 文风系统

- 粘贴文本样本 → **AI 提炼文风画像**（词汇、句式、节奏、视角、对白、修辞等维度）
- 文风卡片管理：启用 / 停用 / 编辑 / 删除
- 启用的文风自动注入 AI 对话上下文，续写、润色全部生效

### 🕰️ 版本与数据

- **版本快照**：保存时自动快照（内容去重）、手动快照，每章保留最近 20 版
- **差异对比**：行级红绿 diff（jsdiff），一眼看清两版改动
- **安全恢复**：恢复历史版本前自动备份当前内容
- **多格式导出**：TXT / Markdown / HTML / DOCX / EPUB，支持单章与整本
- **备份恢复**：全量数据导出导入、按项目导出

### 🔒 隐私优先

- 100% 本地运行：无云服务、无遥测、AI 推理全在本机
- 数据全部落在本地文件与 SQLite 数据库

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri v2（Rust 后端） |
| 前端 | React 19 + TypeScript 6 |
| 构建工具 | Vite 8 |
| 状态管理 | Zustand 5 |
| 路由 | React Router v7 |
| 编辑器 | TipTap 3 (ProseMirror) |
| UI 组件 | Radix UI + Tailwind CSS v4 |
| 图标 | Lucide React |
| 数据库 | SQLite（tauri-plugin-sql） |
| AI 接入 | 自研 Rust 代理（SSE 流式 / 进程托管 / 取消生成） |
| 差异对比 | jsdiff |
| Markdown 渲染 | react-markdown + remark-gfm |
| 导出 | docx、jszip（EPUB） |

## 快速开始

### 前置要求

- [Rust](https://rustup.rs/)
- [Node.js](https://nodejs.org/)（v18+）
- [pnpm](https://pnpm.io/)
- [Tauri 2 环境配置](https://v2.tauri.app/start/prerequisites/)

### 安装与运行

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm tauri dev

# 类型检查 + 构建生产版本
pnpm build
pnpm tauri build
```

### 接入本地 AI（可选）

应用内 **设置 → AI 模型** 即可配置，无需命令行：

1. 后端选择 `llama.cpp`，填入 `llama-server` 可执行文件与 GGUF 模型路径，保存后由应用托管启停；
2. 或后端选择 `Ollama` / `OpenAI 兼容`，填写对应 `Base URL` 与模型名；
3. 支持保存「模型档案」，多套模型参数随时切换。

## 项目结构

```
omni-novel/
├── src/                        # 前端（React + TypeScript）
│   ├── pages/                  # 页面：书架 / 编辑器 / 大纲 / 人物 / 世界观 / 伏笔 / 记忆 / 设置
│   ├── components/
│   │   ├── ui/                 # 基础组件：Button / Dialog / Menu / Page / Skeleton …
│   │   ├── editor/             # TipTap 编辑器与工具栏
│   │   ├── ai/                 # AI 面板（对话、快捷操作、注入明细）
│   │   ├── chapter/            # 章节列表
│   │   ├── dialog/             # 对话框（新建项目 / 版本历史 / 快捷键帮助）
│   │   ├── layout/             # 侧栏与页面外壳
│   │   └── search/             # 全局搜索（Ctrl+K）
│   ├── stores/                 # Zustand：项目 / 章节 / 人物 / 设置 / 主题 …
│   ├── services/               # 数据层与能力层
│   │   ├── database.ts         # SQLite：用户 / 会话 / 提示词 / 记忆 / 版本 / 文风
│   │   ├── fileStorage.ts      # 项目目录与章节正文文件
│   │   ├── aiService.ts        # AI 后端抽象与模型档案
│   │   ├── memoryService.ts    # 混合记忆检索
│   │   ├── prompts.ts          # 内置提示词
│   │   ├── export.ts           # TXT/MD/HTML/DOCX/EPUB 导出
│   │   └── backup.ts           # 数据备份恢复
│   ├── hooks/ / contexts/ / lib/
│   └── index.css               # 设计令牌（明暗双主题）
├── src-tauri/                  # 后端（Rust + Tauri）
│   └── src/
│       ├── lib.rs              # AI 对话 / 流式代理 / 模型托管命令
│       └── llama_process.rs    # llama-server 进程托管与空闲看门狗
├── public/                     # 静态资源
├── Omni Novel.md               # 产品需求文档（PRD）
└── package.json
```

## 数据存储

| 数据 | 位置 |
|------|------|
| 设置（AI、编辑器、模型档案） | 应用数据目录 `~/.omni-novel/data/settings.json` |
| 用户 / 项目索引 / AI 会话 / 提示词 / 记忆 / 版本 / 文风 | SQLite `omni-novel.db`（系统应用数据目录） |
| 章节与设定数据 | 项目目录 `.novel/data/*.json`（chapters / characters / worldview / outline / foreshadowing） |
| 章节正文 | 项目目录下按文件保存（Markdown 兼容，可直接用其他编辑器打开） |

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+K` | 全局搜索 |
| `Ctrl+S` | 保存当前章节 |
| `Ctrl+1` ~ `Ctrl+7` | 编辑器 / 大纲 / 人物 / 世界观 / 伏笔 / 设置 / 记忆 |
| `Esc` | 退出专注模式 |
| `?` | 快捷键帮助 |
| `Ctrl+Enter` | 记忆新增时提交 |

## 路线图

**已完成**：llama.cpp 本地托管 · AI 会话与流式 · 思考模型适配 · 提示词库 · EPUB 导出 · 记忆系统 v1 · 版本对比 · 文风系统 · 写作与视觉体验打磨

**规划中**：

- 向量记忆（sqlite-vec + 本地 Embedding，待依赖环境就绪）
- 作品一致性检查（人物 / 设定 / 伏笔交叉校验）
- 可视化工作流（续写 / 润色 / 检查流水线）
- 多模型对比生成与评分
- DOCX 导出增强、全局搜索扩展

## 许可证

[![MIT License](https://img.shields.io/badge/License-MIT-green?style=flat)](https://github.com/Jack-Sai/omni-novel/blob/main/LICENSE)

MIT
