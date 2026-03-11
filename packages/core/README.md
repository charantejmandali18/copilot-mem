# @copilot-mem/core

Core storage and search engine for [copilot-mem](https://github.com/charantejmandali18/copilot-mem) — persistent memory for GitHub Copilot.

## Features

- **SQLite + WAL mode** — Fast, reliable local storage via better-sqlite3
- **FTS5 full-text search** — BM25-ranked search with prefix matching
- **Chroma vector search** — Optional semantic search via ChromaDB (Reciprocal Rank Fusion)
- **AI compression** — Configurable LLM-based content compression with graceful fallback
- **Session management** — Track coding sessions with observations and summaries
- **Privacy first** — All data stays local in `~/.copilot-mem/`

## Installation

```bash
npm install @copilot-mem/core
```

## Quick Start

```typescript
import { Core } from '@copilot-mem/core';

const core = new Core();

// Start a session
const session = core.startSession('/path/to/project');

// Add observations
core.addObservation({
  session_id: session.id,
  type: 'chat_message',
  content: 'Discussed authentication flow improvements',
});

// Search memories
const results = core.searchMemories('authentication');

// Save a manual memory
core.saveMemory('Always use parameterized SQL queries');

// End session
core.endSession(session.id);
core.close();
```

## Configuration

Settings are loaded from `~/.copilot-mem/settings.json`:

```json
{
  "port": 37888,
  "dataDir": "~/.copilot-mem/data/",
  "autoCapture": true,
  "compression": null,
  "chroma": null,
  "logLevel": "info"
}
```

### AI Compression

```json
{
  "compression": {
    "endpoint": "https://api.openai.com/v1/chat/completions",
    "apiKey": "sk-...",
    "model": "gpt-4o-mini",
    "maxTokens": 256
  }
}
```

### Chroma Vector Search

Requires a running [ChromaDB](https://www.trychroma.com/) server and `npm install chromadb`:

```json
{
  "chroma": {
    "host": "http://localhost:8000",
    "collectionName": "copilot-mem"
  }
}
```

## API

| Method | Description |
|--------|-------------|
| `startSession(projectPath)` | Start a new coding session |
| `endSession(id, summary?)` | End a session |
| `endSessionWithSummary(id)` | End session with AI-generated summary |
| `addObservation(input)` | Record an observation |
| `addObservationWithCompression(input)` | Record with AI compression |
| `searchMemories(query, opts?)` | FTS5 keyword search |
| `searchMemoriesAsync(query, opts?)` | Hybrid FTS5 + Chroma search |
| `getTimeline(ids, windowMinutes?)` | Get chronological context |
| `getMemories(ids)` | Fetch full observations by ID |
| `saveMemory(content, opts?)` | Manually save a memory |
| `deleteObservation(id)` | Delete an observation |

## License

MIT — see [LICENSE](https://github.com/charantejmandali18/copilot-mem/blob/main/LICENSE)
