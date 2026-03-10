import type BetterSqlite3 from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { Session } from '../types.js';

export class SessionRepository {
  constructor(private db: BetterSqlite3.Database) {}

  create(projectPath: string): Session {
    const id = uuidv4();
    this.db.prepare('INSERT INTO sessions (id, project_path) VALUES (?, ?)').run(id, projectPath);
    return this.get(id)!;
  }

  end(id: string, summary?: string): void {
    this.db
      .prepare("UPDATE sessions SET ended_at = datetime('now'), summary = ? WHERE id = ?")
      .run(summary ?? null, id);
  }

  get(id: string): Session | null {
    return (this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Session) ?? null;
  }

  list(opts: { projectPath?: string; limit?: number; offset?: number } = {}): Session[] {
    const { projectPath, limit = 50, offset = 0 } = opts;
    if (projectPath) {
      return this.db
        .prepare(
          'SELECT * FROM sessions WHERE project_path = ? ORDER BY started_at DESC LIMIT ? OFFSET ?',
        )
        .all(projectPath, limit, offset) as Session[];
    }
    return this.db
      .prepare('SELECT * FROM sessions ORDER BY started_at DESC LIMIT ? OFFSET ?')
      .all(limit, offset) as Session[];
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  }
}
