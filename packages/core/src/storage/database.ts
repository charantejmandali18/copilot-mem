import BetterSqlite3 from 'better-sqlite3';
import * as path from 'node:path';
import { ensureDir } from '../config.js';
import { runMigrations } from './migrations.js';

export class Database {
  private db: BetterSqlite3.Database;

  constructor(dataDir: string) {
    ensureDir(dataDir);
    const dbPath = path.join(dataDir, 'copilot-mem.db');
    this.db = new BetterSqlite3(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    runMigrations(this.db);
  }

  getDb(): BetterSqlite3.Database {
    return this.db;
  }

  close(): void {
    this.db.close();
  }
}
