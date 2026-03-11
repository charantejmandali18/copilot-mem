# @copilot-mem/mcp-server

MCP server and HTTP API for [copilot-mem](https://github.com/charantejmandali18/copilot-mem) — persistent memory for GitHub Copilot.

## Features

- **5 MCP tools** — search, timeline, get_memories, save_memory, smart_search
- **HTTP API** — REST endpoints for capture, search, sessions, and observations
- **Web viewer** — Browse and manage memories at `localhost:37888/ui`
- **Progressive disclosure** — Token-efficient retrieval (~10x savings)
- **Security hardened** — Localhost-only, CORS restricted, input validation, XSS protection

## Installation

```bash
npm install -g @copilot-mem/mcp-server
```

## Setup with GitHub Copilot

Add to your VS Code `settings.json`:

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

## HTTP API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/capture` | POST | Batch capture events (JSON array) |
| `/api/sessions` | GET | List sessions |
| `/api/observations` | GET | List observations |
| `/api/search?q=...` | GET | Full-text search |
| `/api/observations/:id` | DELETE | Delete an observation |
| `/ui` | GET | Web viewer |

### Example: Capture a memory

```bash
curl -X POST http://localhost:37888/capture \
  -H "Content-Type: application/json" \
  -d '[{"type":"manual","content":"Fixed auth bug in login.ts"}]'
```

### Example: Search

```bash
curl "http://localhost:37888/api/search?q=auth+bug"
```

## Configuration

Settings in `~/.copilot-mem/settings.json`:

```json
{
  "port": 37888,
  "dataDir": "~/.copilot-mem/data/",
  "logLevel": "info"
}
```

## License

MIT — see [LICENSE](https://github.com/charantejmandali18/copilot-mem/blob/main/LICENSE)
