# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
