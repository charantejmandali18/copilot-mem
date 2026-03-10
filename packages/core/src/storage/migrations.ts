import type Database from 'better-sqlite3';

interface Migration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    description: 'Create sessions, observations, summaries tables with FTS5',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          project_path TEXT NOT NULL,
          started_at TEXT NOT NULL DEFAULT (datetime('now')),
          ended_at TEXT,
          summary TEXT
        );

        CREATE TABLE IF NOT EXISTS observations (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
          type TEXT NOT NULL CHECK(type IN ('chat_message', 'file_edit', 'tool_use', 'manual')),
          content TEXT NOT NULL,
          compressed_content TEXT,
          metadata TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS summaries (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_observations_session_id ON observations(session_id);
        CREATE INDEX IF NOT EXISTS idx_observations_created_at ON observations(created_at);
        CREATE INDEX IF NOT EXISTS idx_observations_type ON observations(type);
        CREATE INDEX IF NOT EXISTS idx_sessions_project_path ON sessions(project_path);

        CREATE VIRTUAL TABLE IF NOT EXISTS observations_fts USING fts5(
          content,
          compressed_content,
          content='observations',
          content_rowid='rowid'
        );

        CREATE TRIGGER IF NOT EXISTS observations_ai AFTER INSERT ON observations BEGIN
          INSERT INTO observations_fts(rowid, content, compressed_content)
          VALUES (NEW.rowid, NEW.content, NEW.compressed_content);
        END;

        CREATE TRIGGER IF NOT EXISTS observations_ad AFTER DELETE ON observations BEGIN
          INSERT INTO observations_fts(observations_fts, rowid, content, compressed_content)
          VALUES ('delete', OLD.rowid, OLD.content, OLD.compressed_content);
        END;

        CREATE TRIGGER IF NOT EXISTS observations_au AFTER UPDATE ON observations BEGIN
          INSERT INTO observations_fts(observations_fts, rowid, content, compressed_content)
          VALUES ('delete', OLD.rowid, OLD.content, OLD.compressed_content);
          INSERT INTO observations_fts(rowid, content, compressed_content)
          VALUES (NEW.rowid, NEW.content, NEW.compressed_content);
        END;
      `);
    },
  },
];

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = new Set(
    db
      .prepare('SELECT version FROM _migrations')
      .all()
      .map((row) => (row as { version: number }).version),
  );

  for (const migration of migrations) {
    if (!applied.has(migration.version)) {
      db.transaction(() => {
        migration.up(db);
        db.prepare('INSERT INTO _migrations (version, description) VALUES (?, ?)').run(
          migration.version,
          migration.description,
        );
      })();
    }
  }
}
