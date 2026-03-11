# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-03-11

### Added

- **AI Compression** (Phase 5)
  - Compressor interface with pluggable implementations
  - `AiCompressor` — LLM-based content compression via any OpenAI-compatible API
  - `NoopCompressor` — pass-through fallback when no API key is configured
  - `SessionSummarizer` — auto-generates session summaries from observations
  - Per-type prompt templates (chat_message, file_edit, tool_use, manual)
  - `Core.addObservationWithCompression()` — async observation with AI compression
  - `Core.endSessionWithSummary()` — auto-summarize session on close
  - Graceful fallback: returns original content on any API error or timeout
- **Chroma Vector Search** (Phase 6)
  - `ChromaSearchEngine` — semantic search via ChromaDB embeddings
  - `HybridSearchEngine` — combines FTS5 + Chroma with Reciprocal Rank Fusion (RRF)
  - `Core.searchMemoriesAsync()` — hybrid search when Chroma is available
  - Auto-indexes observations in Chroma on creation, removes on deletion
  - Optional dependency: works without chromadb installed, falls back to FTS5
  - Configurable via `~/.copilot-mem/settings.json` `chroma` field
- Package README files for npm (`@copilot-mem/core`, `@copilot-mem/mcp-server`)
- 18 new tests (compressor: 9, chroma/hybrid: 9) — 45 total tests
- `CompressionConfig` and `ChromaConfig` type exports

### Changed

- `CopilotMemConfig` now includes `compression` and `chroma` fields
- Core constructor initializes compressor and optional Chroma engine from config

## [0.1.0] - 2026-03-10

### Added

- **@copilot-mem/core** — SQLite storage with WAL mode, FTS5 full-text search with BM25 ranking
  - Session, observation, and summary CRUD operations
  - Configuration loader (`~/.copilot-mem/settings.json`)
  - SearchEngine interface (pluggable for future Chroma support)
- **@copilot-mem/mcp-server** — MCP server with 5 tools + HTTP API
  - MCP tools: `search`, `timeline`, `get_memories`, `save_memory`, `smart_search`
  - HTTP API: capture endpoint, REST API for sessions/observations/search
  - Web viewer at `/ui` with dark theme
  - File-based logger (safe for MCP stdio coexistence)
- **copilot-mem VS Code extension** — auto-capture and context injection
  - Server lifecycle management (spawn, health check, auto-restart)
  - Chat and file edit auto-capture with 5s batching
  - Context injection on workspace open
  - MCP server auto-configuration in VS Code settings
  - Privacy: `.copilot-mem-ignore` and `<private>` tag support
- Turborepo monorepo with npm workspaces
- 27 tests across core and mcp-server packages
- Design specification and documentation
