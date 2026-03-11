# 🧠 Copilot-Mem

**Persistent memory for GitHub Copilot — never lose context across chat sessions again.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-0.2.0-blue.svg)](https://github.com/charantejmandali18/copilot-mem/releases)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

---

Inspired by [claude-mem](https://github.com/thedotmack/claude-mem), copilot-mem brings persistent memory to the GitHub Copilot ecosystem. It automatically captures, compresses, and retrieves context across coding sessions — so Copilot remembers your past decisions, debugging insights, and project conventions.

## Features

- **Persistent Memory** — Seamlessly preserves context across Copilot Chat sessions
- **Auto-Capture** — Automatically records chat messages, file edits, and tool usage
- **Full-Text Search** — SQLite FTS5-powered search with BM25 ranking
- **MCP Integration** — 5 MCP tools that Copilot can call directly for memory retrieval
- **Progressive Disclosure** — Token-efficient retrieval: search → timeline → full details (~10x savings)
- **Privacy First** — All data local, `.copilot-mem-ignore` support, `<private>` tag stripping
- **Web Viewer** — Browse, search, and manage memories at `localhost:37888/ui`
- **VS Code Extension** — One-click install with auto-capture and context injection

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   VS Code Extension                  │
│              (copilot-mem)                           │
│                                                      │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ Auto-Capture  │  │ Auto-Config │  │  Commands  │ │
│  │ (chat events, │  │ (MCP server │  │  (save,    │ │
│  │  file edits)  │  │  registration│  │  viewer)   │ │
│  └──────┬───────┘  └─────────────┘  └────────────┘ │
└─────────┼───────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────┐
│              MCP Server + HTTP API                   │
│         (@copilot-mem/mcp-server)                    │
│                                                      │
│  MCP Tools:              HTTP API (port 37888):     │
│  • search                • POST /capture            │
│  • timeline              • GET  /api/sessions       │
│  • get_memories          • GET  /api/observations   │
│  • save_memory           • GET  /api/search         │
│  • smart_search          • GET  /ui                 │
└─────────┬───────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────┐
│                   Core Library                       │
│             (@copilot-mem/core)                      │
│                                                      │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────┐ │
│  │ Storage   │  │ Config    │  │ Search Engine    │ │
│  │ (SQLite   │  │ (~/.      │  │ (FTS5 + BM25    │ │
│  │  + WAL)   │  │ copilot-  │  │  ranking)        │ │
│  │           │  │ mem/)     │  │                  │ │
│  └──────────┘  └───────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Installation

### Via npm (MCP server only)

```bash
npm install -g @copilot-mem/mcp-server
```

Then add to your VS Code `settings.json`:

```json
{
  "github.copilot.chat.mcpServers": {
    "copilot-mem": {
      "type": "stdio",
      "command": "npx",
      "args": ["copilot-mem-server"]
    }
  }
}
```

### Via VS Code Extension (recommended)

> Coming soon to VS Code Marketplace

Install the extension, and it will:
1. Auto-start the MCP server
2. Register itself with Copilot
3. Begin capturing chat events automatically

## MCP Tools

| Tool | Description | Token Cost |
|------|-------------|------------|
| `search` | Query memories by keywords, returns compact index with IDs | ~50-100/result |
| `timeline` | Chronological context around specific observations | ~200/result |
| `get_memories` | Fetch full details by observation ID(s) | ~500-1000/result |
| `save_memory` | Manually save something important | — |
| `smart_search` | Natural language query with auto-expansion | varies |

### Progressive Disclosure Pattern

```
1. search("auth bug")           → 10 results, ~500 tokens
2. timeline(["id1", "id2"])     → surrounding context, ~400 tokens
3. get_memories(["id1"])        → full details, ~800 tokens

vs. fetching everything upfront → ~8000+ tokens
```

## Configuration

Settings stored in `~/.copilot-mem/settings.json`:

```json
{
  "port": 37888,
  "dataDir": "~/.copilot-mem/data/",
  "autoCapture": true,
  "compressionModel": null,
  "logLevel": "info",
  "contextInjection": true,
  "maxContextTokens": 2000
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `port` | `37888` | HTTP server port |
| `dataDir` | `~/.copilot-mem/data/` | SQLite database location |
| `autoCapture` | `true` | Auto-capture chat events and file edits |
| `logLevel` | `"info"` | Log level: debug, info, warn, error |
| `contextInjection` | `true` | Inject relevant memories into new sessions |
| `maxContextTokens` | `2000` | Max tokens for injected context |

## Privacy

- **All data stays local** — stored in `~/.copilot-mem/`
- **`.copilot-mem-ignore`** — gitignore-style file to exclude paths from capture
- **`<private>` tags** — wrap sensitive content to exclude it from storage
- **No telemetry** — zero data sent anywhere

## Web Viewer

Open `http://localhost:37888/ui` to browse your memories:

- View all sessions and observations
- Search with full-text search
- Delete individual memories
- View storage statistics

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
git clone https://github.com/charantejmandali18/copilot-mem.git
cd copilot-mem
npm install
npm run build
npm test
```

### Project Structure

```
copilot-mem/
├── packages/
│   ├── core/           # @copilot-mem/core — storage, search, config
│   ├── mcp-server/     # @copilot-mem/mcp-server — MCP tools + HTTP API
│   └── vscode/         # copilot-mem — VS Code extension
├── docs/
│   ├── specs/          # Design specifications
│   └── conversation-context.md
├── turbo.json          # Turborepo config
└── tsconfig.base.json  # Shared TypeScript config
```

### Scripts

```bash
npm run build          # Build all packages
npm test               # Run all tests
npm run dev            # Watch mode
npm run format         # Format code with Prettier
npm run format:check   # Check formatting
```

### Running Locally

```bash
# Start the MCP server with HTTP API
node packages/mcp-server/dist/index.js

# Test the HTTP API
curl http://localhost:37888/api/sessions

# Save a memory
curl -X POST http://localhost:37888/capture \
  -H "Content-Type: application/json" \
  -d '[{"type":"manual","content":"Fixed auth bug in login.ts"}]'

# Search memories
curl "http://localhost:37888/api/search?q=auth+bug"

# Open web viewer
open http://localhost:37888/ui
```

## Roadmap

- [x] Core storage layer (SQLite + FTS5)
- [x] MCP server with 5 tools
- [x] HTTP API + Web viewer
- [x] VS Code extension (auto-capture, context injection)
- [x] AI-based compression (reduce storage, improve search)
- [x] Chroma vector search (semantic search)
- [x] npm package publishing
- [ ] VS Code Marketplace publishing

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [claude-mem](https://github.com/thedotmack/claude-mem) by Alex Newman — the inspiration for this project
- [Model Context Protocol](https://modelcontextprotocol.io/) — the protocol that makes this possible
- [GitHub Copilot](https://github.com/features/copilot) — the AI assistant we're enhancing
