import type BetterSqlite3 from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { Observation, CreateObservationInput } from '../types.js';

interface ObservationRow {
  id: string;
  session_id: string;
  type: string;
  content: string;
  compressed_content: string | null;
  metadata: string | null;
  created_at: string;
}

function rowToObservation(row: ObservationRow): Observation {
  return {
    ...row,
    type: row.type as Observation['type'],
    metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : null,
  };
}

export class ObservationRepository {
  constructor(private db: BetterSqlite3.Database) {}

  create(input: CreateObservationInput): Observation {
    const id = uuidv4();
    this.db
      .prepare(
        'INSERT INTO observations (id, session_id, type, content, compressed_content, metadata) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(
        id,
        input.session_id,
        input.type,
        input.content,
        input.compressed_content ?? null,
        input.metadata ? JSON.stringify(input.metadata) : null,
      );
    return this.get(id)!;
  }

  get(id: string): Observation | null {
    const row = this.db.prepare('SELECT * FROM observations WHERE id = ?').get(id) as
      | ObservationRow
      | undefined;
    return row ? rowToObservation(row) : null;
  }

  getByIds(ids: string[]): Observation[] {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(', ');
    const rows = this.db
      .prepare(`SELECT * FROM observations WHERE id IN (${placeholders}) ORDER BY created_at ASC`)
      .all(...ids) as ObservationRow[];
    return rows.map(rowToObservation);
  }

  list(
    opts: { sessionId?: string; type?: string; limit?: number; offset?: number } = {},
  ): Observation[] {
    const { sessionId, type, limit = 50, offset = 0 } = opts;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (sessionId) {
      conditions.push('session_id = ?');
      params.push(sessionId);
    }
    if (type) {
      conditions.push('type = ?');
      params.push(type);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const rows = this.db
      .prepare(`SELECT * FROM observations ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params) as ObservationRow[];
    return rows.map(rowToObservation);
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM observations WHERE id = ?').run(id);
  }
}
