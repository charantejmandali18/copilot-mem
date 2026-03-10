import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Database } from '../src/storage/database.js';
import { SessionRepository } from '../src/storage/sessions.js';
import { ObservationRepository } from '../src/storage/observations.js';
import { FtsSearchEngine } from '../src/search/fts.js';

let tmpDir: string;
let database: Database;
let sessions: SessionRepository;
let observations: ObservationRepository;
let searchEngine: FtsSearchEngine;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-mem-search-test-'));
  database = new Database(tmpDir);
  const db = database.getDb();
  sessions = new SessionRepository(db);
  observations = new ObservationRepository(db);
  searchEngine = new FtsSearchEngine(db);
});

afterEach(() => {
  database.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('FtsSearchEngine', () => {
  it('finds observations by keyword', () => {
    const session = sessions.create('/test/project');
    observations.create({
      session_id: session.id,
      type: 'chat_message',
      content: 'Fixed the authentication bug in login module',
    });
    observations.create({
      session_id: session.id,
      type: 'file_edit',
      content: 'Updated the database migration script',
    });

    const results = searchEngine.search('authentication');
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('chat_message');
    expect(results[0].snippet).toContain('authentication');
  });

  it('returns empty results for no matches', () => {
    const session = sessions.create('/test/project');
    observations.create({
      session_id: session.id,
      type: 'manual',
      content: 'Some unrelated content',
    });

    const results = searchEngine.search('nonexistent');
    expect(results).toHaveLength(0);
  });

  it('respects limit parameter', () => {
    const session = sessions.create('/test/project');
    for (let i = 0; i < 5; i++) {
      observations.create({
        session_id: session.id,
        type: 'chat_message',
        content: `Bug fix number ${i} for authentication`,
      });
    }

    const results = searchEngine.search('authentication', { limit: 3 });
    expect(results).toHaveLength(3);
  });

  it('filters by project path', () => {
    const sessionA = sessions.create('/project/a');
    const sessionB = sessions.create('/project/b');

    observations.create({
      session_id: sessionA.id,
      type: 'chat_message',
      content: 'Authentication fix for project A',
    });
    observations.create({
      session_id: sessionB.id,
      type: 'chat_message',
      content: 'Authentication fix for project B',
    });

    const results = searchEngine.search('authentication', { projectPath: '/project/a' });
    expect(results).toHaveLength(1);
  });

  it('returns timeline around observations', () => {
    const session = sessions.create('/test/project');
    const obs1 = observations.create({
      session_id: session.id,
      type: 'chat_message',
      content: 'Started working on auth',
    });
    observations.create({
      session_id: session.id,
      type: 'file_edit',
      content: 'Modified auth.ts',
    });
    observations.create({
      session_id: session.id,
      type: 'chat_message',
      content: 'Finished auth work',
    });

    const timeline = searchEngine.timeline([obs1.id]);
    expect(timeline.length).toBeGreaterThanOrEqual(1);
    // Should include the target observation and nearby ones
    expect(timeline.some((e) => e.id === obs1.id)).toBe(true);
  });
});
