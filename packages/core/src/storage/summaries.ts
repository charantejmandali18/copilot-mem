import type BetterSqlite3 from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { Summary } from '../types.js';

export class SummaryRepository {
  constructor(private db: BetterSqlite3.Database) {}

  create(sessionId: string, content: string): Summary {
    const id = uuidv4();
    this.db
      .prepare('INSERT INTO summaries (id, session_id, content) VALUES (?, ?, ?)')
      .run(id, sessionId, content);
    return this.get(id)!;
  }

  get(id: string): Summary | null {
    return (this.db.prepare('SELECT * FROM summaries WHERE id = ?').get(id) as Summary) ?? null;
  }

  getForSession(sessionId: string): Summary[] {
    return this.db
      .prepare('SELECT * FROM summaries WHERE session_id = ? ORDER BY created_at ASC')
      .all(sessionId) as Summary[];
  }
}
