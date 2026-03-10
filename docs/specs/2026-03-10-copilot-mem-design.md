# Copilot-Mem: Persistent Memory for GitHub Copilot

**Date:** 2026-03-10
**Status:** Approved
**Inspired by:** [claude-mem](https://github.com/thedotmack/claude-mem)

## Problem

GitHub Copilot has no persistent memory across chat sessions. Every new conversation starts from scratch — Copilot forgets past decisions, debugging insights, architectural context, and project conventions. Developers repeatedly re-explain the same things.

## Solution

Copilot-mem is a persistent memory system for GitHub Copilot that automatically captures, compresses, and retrieves context across coding sessions. It maintains continuity of knowledge about projects through intelligent storage and search.

## Target Platform

- **Primary:** VS Code Copilot Chat (agent mode) with MCP server support
- **Future:** Copilot CLI (`gh copilot`)

## Architecture

Monorepo with 3 packages, clear dependency flow: `vscode → mcp-server → core`

```
┌─────────────────────────────────────────────────────┐
│                   VS Code Extension                  │
│              (@copilot-mem/vscode)                   │
│                                                      │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ Auto-Capture  │  │ Auto-Config │  │  Web View  │ │
│  │ (chat events, │  │ (MCP server │  │  (memory   │ │
│  │  file edits)  │  │  registration│  │  browser)  │ │
│  └──────┬───────┘  └─────────────┘  └────────────┘ │
└─────────┼───────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────┐
│              MCP Server                              │
│         (@copilot-mem/mcp-server)                    │
│                                                      │
│  Tools exposed to Copilot:                          │
│  • search        → compact index of memories        │
│  • timeline      → chronological context            │
│  • get_memories  → full details by ID               │
│  • save_memory   → manual save                      │
│  • smart_search  → NL query, auto-expands           │
│                                                      │
│  HTTP API (port 37888):                             │
│  • POST /capture  → auto-capture endpoint           │
│  • GET  /ui       → web viewer                      │
└─────────┬───────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────┐
│                   Core Library                       │
│             (@copilot-mem/core)                      │
│                                                      │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────┐ │
│  │ Storage   │  │ Compressor│  │ Search Engine    │ │
│  │ (SQLite)  │  │ (AI-based │  │ (FTS5 + Chroma  │ │
│  │           │  │  summary)  │  │  vector search) │ │
│  └──────────┘  └───────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Data Model

### Sessions
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (UUID) | Primary key |
| project_path | TEXT | Workspace folder path |
| started_at | DATETIME | Session start |
| ended_at | DATETIME | Session end |
| summary | TEXT | AI-generated session summary |

### Observations
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (UUID) | Primary key |
| session_id | TEXT | FK to sessions |
| type | TEXT | chat_message, file_edit, tool_use, manual |
| content | TEXT | Raw captured content |
| compressed_content | TEXT | AI-compressed version |
| metadata | JSON | Additional context (file paths, etc.) |
| created_at | DATETIME | Capture timestamp |

### Summaries
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (UUID) | Primary key |
| session_id | TEXT | FK to sessions |
| content | TEXT | AI-compressed session summary |
| created_at | DATETIME | Creation timestamp |

### Chroma Collection
- Collection name: `copilot_mem_observations`
- Vectors keyed by observation ID
- Metadata includes: session_id, type, project_path, created_at

## MCP Tools

| Tool | Purpose | Token Cost |
|------|---------|------------|
| `search` | Query memories, returns compact index with IDs | ~50-100 per result |
| `timeline` | Chronological context around specific observations | ~200 per result |
| `get_memories` | Fetch full details by ID(s) | ~500-1000 per result |
| `save_memory` | Manually save something important | — |
| `smart_search` | Natural language query, auto-expands relevant results | varies |

### Progressive Disclosure Pattern
1. User/Copilot calls `search` → gets compact list of relevant memory IDs
2. Calls `timeline` to see chronological context around interesting results
3. Calls `get_memories` to fetch full details for specific IDs
4. This achieves ~10x token savings vs. fetching everything upfront

## Auto-Capture (VS Code Extension)

### Events Captured
- **Copilot Chat messages** — user prompts and Copilot responses via VS Code Chat API
- **File changes** — saves on files modified during/after chat interactions
- **Terminal output** — optionally, commands run during a session

### Capture Flow
1. Extension listens to VS Code Chat API events
2. Events batched every 5 seconds
3. Sent to MCP server HTTP endpoint (`POST /capture`)
4. Core compresses with AI and stores in SQLite + Chroma

### Privacy
- `.copilot-mem-ignore` file (gitignore syntax) to exclude files/patterns
- `<private>` tags in chat messages to exclude specific content
- All data stored locally in `~/.copilot-mem/`

## Context Injection

When a new Copilot Chat session starts:
1. Extension detects the current workspace folder
2. Queries MCP server for relevant recent memories for this project
3. Injects context via VS Code Chat API participant system message
4. Copilot immediately has awareness of past work

## Web Viewer

Served at `localhost:37888/ui`:
- Browse sessions and observations
- Search memories with filters
- Delete/edit entries
- View storage stats
- Built with vanilla HTML/JS (no framework dependency)

## Project Structure

```
copilot-mem/
├── package.json              # workspace root
├── turbo.json                # turborepo config
├── packages/
│   ├── core/                 # @copilot-mem/core
│   │   ├── src/
│   │   │   ├── storage/      # SQLite + migrations
│   │   │   ├── search/       # FTS5 + Chroma integration
│   │   │   ├── compressor/   # AI-based compression
│   │   │   └── index.ts
│   │   ├── tests/
│   │   └── package.json
│   ├── mcp-server/           # @copilot-mem/mcp-server
│   │   ├── src/
│   │   │   ├── tools/        # MCP tool definitions
│   │   │   ├── http/         # HTTP API + web UI
│   │   │   └── index.ts
│   │   ├── tests/
│   │   └── package.json
│   └── vscode/               # copilot-mem VS Code extension
│       ├── src/
│       │   ├── capture/      # auto-capture listeners
│       │   ├── injection/    # context injection
│       │   └── extension.ts
│       ├── package.json
│       └── tsconfig.json
└── docs/
```

## Tech Stack

- **Runtime:** Node.js 18+
- **Language:** TypeScript
- **Database:** SQLite via `better-sqlite3` with FTS5
- **Vector DB:** Chroma (requires Python + `uv`)
- **MCP SDK:** `@modelcontextprotocol/sdk`
- **Monorepo:** Turborepo
- **Extension:** VS Code Extension API + `vsce`
- **Web UI:** Vanilla HTML/JS/CSS

## Installation

### Via VS Code Extension (recommended)
1. Install "Copilot Mem" from VS Code Marketplace
2. Extension auto-downloads and starts the MCP server
3. Extension registers itself as an MCP server in Copilot's settings
4. Memories start being captured automatically

### Via npm (advanced)
1. `npm install -g @copilot-mem/mcp-server`
2. Add MCP server config to VS Code settings manually
3. Optionally install the extension for auto-capture

## Configuration

Settings stored in `~/.copilot-mem/settings.json`:
- `port`: HTTP server port (default: 37888)
- `dataDir`: Storage directory (default: `~/.copilot-mem/data/`)
- `autoCapture`: Enable/disable auto-capture (default: true)
- `compressionModel`: AI model for compression (configurable)
- `logLevel`: debug, info, warn, error (default: info)
- `contextInjection`: Enable/disable auto-injection (default: true)
- `maxContextTokens`: Max tokens for injected context (default: 2000)
