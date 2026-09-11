# Omni Novel

AI-powered novel writing desktop application, built with Tauri v2 + React + TypeScript.

## Features

- **Full Creative Workflow**: Inspiration → Settings → Outline → Chapters → Manuscript → Revision → Export
- **Local AI Models**: Powered by Ollama / llama.cpp / LM Studio / OpenAI-compatible endpoints
- **Long-term Memory**: AI remembers your story settings, characters, and plot across chapters
- **Author Control**: All AI-generated content is reviewable, revertible, and diffable
- **Privacy First**: 100% local operation, no cloud services, no telemetry
- **Extensible**: Plugin system, custom prompts, custom workflows

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop | Tauri v2 |
| Frontend | React 19 + TypeScript |
| Build | Vite |
| State | Zustand |
| Router | React Router v7 |
| Editor | TipTap (ProseMirror) |
| UI | Radix UI + Tailwind CSS v4 |
| Icons | Lucide React |
| Database | SQLite (tauri-plugin-sql) |
| Vector Index | sqlite-vec |
| Embedding | Local models via Ollama |

## Development

### Prerequisites

- [Rust](https://rustup.rs/)
- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)
- [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

### Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm tauri dev

# Build for production
pnpm tauri build
```

## Project Structure

```
omni-novel/
├── src/                  # Frontend (React + TypeScript)
├── src-tauri/            # Backend (Rust + Tauri)
├── public/               # Static assets
├── Omni Novel.md         # Product Requirements Document
└── package.json
```

## License

MIT
