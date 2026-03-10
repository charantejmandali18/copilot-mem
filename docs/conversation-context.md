# Copilot-Mem: Conversation Context

**Date:** 2026-03-10
**Purpose:** Full context dump so this conversation can be continued in another session.

---

## What We're Building

**copilot-mem** — A persistent memory system for GitHub Copilot, inspired by [claude-mem](https://github.com/thedotmack/claude-mem). Claude-mem gives Claude Code persistent memory across sessions. We're building the equivalent for GitHub Copilot so everyone in the Copilot ecosystem can benefit.

## Decisions Made

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| **Target platform** | VS Code Copilot Chat (agent mode) with MCP support | Richest integration path; CLI support later |
| **Capture approach** | Semi-automatic + fully automatic where feasible | MCP tools for manual save/search + VS Code extension for auto-capture of chat events, file edits |
| **Storage & search** | SQLite + Chroma vector DB | Feature parity with claude-mem; semantic search via Chroma |
| **Runtime** | Node.js | Broadest reach for community project (claude-mem uses Bun) |
| **Distribution** | Both npm package + VS Code Extension | npm for CLI-savvy users, extension for one-click install + auto-capture |

## Architecture

Monorepo with 3 packages: `vscode → mcp-server → core`

- **@copilot-mem/core** — SQLite storage, FTS5 full-text search, Chroma vector search, AI-based compression
- **@copilot-mem/mcp-server** — MCP tools (search, timeline, get_memories, save_memory, smart_search) + HTTP API (POST /capture, GET /ui)
- **@copilot-mem/vscode** — VS Code extension for auto-capture (chat events, file edits, terminal output), context injection, auto-config of MCP server

## Data Model

**Sessions:** id, project_path, started_at, ended_at, summary
**Observations:** id, session_id, type (chat_message/file_edit/tool_use/manual), content, compressed_content, metadata (JSON), created_at
**Summaries:** id, session_id, content, created_at
**Chroma collection:** `copilot_mem_observations` — vectors keyed by observation ID with metadata

## MCP Tools

| Tool | Purpose |
|------|---------|
| `search` | Query memories, returns compact index with IDs (~50-100 tokens/result) |
| `timeline` | Chronological context around specific observations (~200 tokens/result) |
| `get_memories` | Fetch full details by ID(s) (~500-1000 tokens/result) |
| `save_memory` | Manually save something important |
| `smart_search` | Natural language query, auto-expands relevant results |

Uses **progressive disclosure pattern**: search → timeline → get_memories for ~10x token savings.

## Auto-Capture Flow

1. VS Code extension listens to Chat API events
2. Events batched every 5 seconds
3. Sent to MCP server HTTP endpoint (POST /capture)
4. Core compresses with AI and stores in SQLite + Chroma

## Context Injection

On new Copilot Chat session start:
1. Extension detects current workspace
2. Queries MCP server for relevant recent memories
3. Injects context via Chat API participant system message

## Privacy

- `.copilot-mem-ignore` file (gitignore syntax)
- `<private>` tags to exclude specific messages
- All data local in `~/.copilot-mem/`

## Web Viewer

`localhost:37888/ui` — browse sessions, search, delete/edit, view stats. Vanilla HTML/JS.

## Tech Stack

- Node.js 18+, TypeScript
- `better-sqlite3` with FTS5
- `chromadb` (requires Python + `uv` for Chroma server)
- `@modelcontextprotocol/sdk`
- Turborepo monorepo
- VS Code Extension API + `vsce`

## Configuration

`~/.copilot-mem/settings.json`:
- port: 37888
- dataDir: ~/.copilot-mem/data/
- autoCapture: true
- compressionModel: configurable
- logLevel: info
- contextInjection: true
- maxContextTokens: 2000

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

## What's Done

- [x] Requirements gathering (all decisions above)
- [x] Design spec written and committed → `docs/specs/2026-03-10-copilot-mem-design.md`
- [x] Git repo initialized at `/Users/charantej/charan_personal_projects/copilot-mem/`
- [x] First commit: design spec

## What's Next

- [ ] **Write implementation plan** — Was in progress using the `superpowers:writing-plans` skill. The plan should go to `docs/superpowers/plans/2026-03-10-copilot-mem.md`. Directory already created.
- [ ] **Scaffold monorepo** — package.json, turbo.json, tsconfigs, all package dirs
- [ ] **Implement @copilot-mem/core** — storage layer (SQLite + migrations), search (FTS5 + Chroma), compressor
- [ ] **Implement @copilot-mem/mcp-server** — MCP tool definitions, HTTP API, web viewer
- [ ] **Implement @copilot-mem/vscode** — extension with auto-capture, context injection, auto-config
- [ ] **Testing** — unit tests for core, integration tests for MCP server
- [ ] **Packaging** — npm publish config, vsce packaging
- [ ] **README & docs**

## Key Files

| Path | Description |
|------|-------------|
| `docs/specs/2026-03-10-copilot-mem-design.md` | Full design specification |
| `docs/conversation-context.md` | This file — conversation context |
| `docs/superpowers/plans/` | Directory created, implementation plan goes here |

## Git Log

```
937dd9d Add copilot-mem design specification
```
