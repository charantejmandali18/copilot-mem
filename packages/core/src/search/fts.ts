import type BetterSqlite3 from 'better-sqlite3';
import type { SearchResult, TimelineEntry, ObservationType } from '../types.js';
import type { SearchEngine } from './index.js';

interface FtsRow {
  id: string;
  type: string;
  content: string;
  created_at: string;
  rank: number;
}

interface TimelineRow {
  id: string;
  session_id: string;
  type: string;
  content: string;
  created_at: string;
  metadata: string | null;
}

export class FtsSearchEngine implements SearchEngine {
  constructor(private db: BetterSqlite3.Database) {}

  search(query: string, opts: { limit?: number; projectPath?: string } = {}): SearchResult[] {
    const { limit = 10, projectPath } = opts;

    // Escape FTS5 special chars and append * for prefix matching
    const ftsQuery = query
      .replace(/['"]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .map((term) => `"${term}"*`)
      .join(' ');

    if (!ftsQuery) return [];

    let sql: string;
    const params: unknown[] = [];

    if (projectPath) {
      sql = `
        SELECT o.id, o.type, o.content, o.created_at, rank
        FROM observations_fts
        JOIN observations o ON observations_fts.rowid = o.rowid
        JOIN sessions s ON o.session_id = s.id
        WHERE observations_fts MATCH ?
        AND s.project_path = ?
        ORDER BY rank
        LIMIT ?
      `;
      params.push(ftsQuery, projectPath, limit);
    } else {
      sql = `
        SELECT o.id, o.type, o.content, o.created_at, rank
        FROM observations_fts
        JOIN observations o ON observations_fts.rowid = o.rowid
        WHERE observations_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `;
      params.push(ftsQuery, limit);
    }

    const rows = this.db.prepare(sql).all(...params) as FtsRow[];

    return rows.map((row) => ({
      id: row.id,
      type: row.type as ObservationType,
      snippet: row.content.slice(0, 150),
      score: -row.rank, // FTS5 rank is negative (lower = better), flip for intuitive scoring
      created_at: row.created_at,
    }));
  }

  timeline(observationIds: string[], windowMinutes = 30): TimelineEntry[] {
    if (observationIds.length === 0) return [];

    // Get the time bounds of the target observations
    const placeholders = observationIds.map(() => '?').join(', ');
    const bounds = this.db
      .prepare(
        `SELECT MIN(created_at) as min_time, MAX(created_at) as max_time, session_id
         FROM observations WHERE id IN (${placeholders})
         GROUP BY session_id`,
      )
      .all(...observationIds) as { min_time: string; max_time: string; session_id: string }[];

    if (bounds.length === 0) return [];

    // For each session, get observations in the time window
    const results: TimelineEntry[] = [];
    for (const bound of bounds) {
      const rows = this.db
        .prepare(
          `SELECT id, session_id, type, content, created_at, metadata
           FROM observations
           WHERE session_id = ?
           AND created_at >= datetime(?, '-${windowMinutes} minutes')
           AND created_at <= datetime(?, '+${windowMinutes} minutes')
           ORDER BY created_at ASC`,
        )
        .all(bound.session_id, bound.min_time, bound.max_time) as TimelineRow[];

      for (const row of rows) {
        results.push({
          id: row.id,
          session_id: row.session_id,
          type: row.type as ObservationType,
          content: row.content,
          created_at: row.created_at,
          metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : null,
        });
      }
    }

    return results.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
}
