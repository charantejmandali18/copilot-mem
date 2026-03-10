import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Database } from '../src/storage/database.js';
import { SessionRepository } from '../src/storage/sessions.js';
import { ObservationRepository } from '../src/storage/observations.js';
import { SummaryRepository } from '../src/storage/summaries.js';

let tmpDir: string;
let database: Database;
let sessions: SessionRepository;
let observations: ObservationRepository;
let summaries: SummaryRepository;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-mem-test-'));
  database = new Database(tmpDir);
  const db = database.getDb();
  sessions = new SessionRepository(db);
  observations = new ObservationRepository(db);
  summaries = new SummaryRepository(db);
});

afterEach(() => {
  database.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('SessionRepository', () => {
  it('creates and retrieves a session', () => {
    const session = sessions.create('/test/project');
    expect(session.id).toBeTruthy();
    expect(session.project_path).toBe('/test/project');
    expect(session.ended_at).toBeNull();

    const fetched = sessions.get(session.id);
    expect(fetched).toEqual(session);
  });

  it('ends a session with summary', () => {
    const session = sessions.create('/test/project');
    sessions.end(session.id, 'Fixed a bug');

    const fetched = sessions.get(session.id)!;
    expect(fetched.ended_at).toBeTruthy();
    expect(fetched.summary).toBe('Fixed a bug');
  });

  it('lists sessions by project path', () => {
    sessions.create('/project/a');
    sessions.create('/project/b');
    sessions.create('/project/a');

    const listA = sessions.list({ projectPath: '/project/a' });
    expect(listA).toHaveLength(2);

    const listAll = sessions.list();
    expect(listAll).toHaveLength(3);
  });

  it('deletes a session', () => {
    const session = sessions.create('/test/project');
    sessions.delete(session.id);
    expect(sessions.get(session.id)).toBeNull();
  });
});

describe('ObservationRepository', () => {
  it('creates and retrieves an observation', () => {
    const session = sessions.create('/test/project');
    const obs = observations.create({
      session_id: session.id,
      type: 'chat_message',
      content: 'Hello world',
      metadata: { file: 'test.ts' },
    });

    expect(obs.id).toBeTruthy();
    expect(obs.content).toBe('Hello world');
    expect(obs.metadata).toEqual({ file: 'test.ts' });

    const fetched = observations.get(obs.id);
    expect(fetched).toEqual(obs);
  });

  it('retrieves multiple observations by IDs', () => {
    const session = sessions.create('/test/project');
    const obs1 = observations.create({
      session_id: session.id,
      type: 'chat_message',
      content: 'First',
    });
    const obs2 = observations.create({
      session_id: session.id,
      type: 'file_edit',
      content: 'Second',
    });

    const fetched = observations.getByIds([obs1.id, obs2.id]);
    expect(fetched).toHaveLength(2);
  });

  it('lists observations with filters', () => {
    const session = sessions.create('/test/project');
    observations.create({ session_id: session.id, type: 'chat_message', content: 'Chat 1' });
    observations.create({ session_id: session.id, type: 'file_edit', content: 'Edit 1' });
    observations.create({ session_id: session.id, type: 'chat_message', content: 'Chat 2' });

    const chatOnly = observations.list({ type: 'chat_message' });
    expect(chatOnly).toHaveLength(2);

    const all = observations.list({ sessionId: session.id });
    expect(all).toHaveLength(3);
  });

  it('deletes an observation', () => {
    const session = sessions.create('/test/project');
    const obs = observations.create({
      session_id: session.id,
      type: 'manual',
      content: 'To delete',
    });
    observations.delete(obs.id);
    expect(observations.get(obs.id)).toBeNull();
  });
});

describe('SummaryRepository', () => {
  it('creates and retrieves summaries for a session', () => {
    const session = sessions.create('/test/project');
    summaries.create(session.id, 'Summary of session');

    const list = summaries.getForSession(session.id);
    expect(list).toHaveLength(1);
    expect(list[0].content).toBe('Summary of session');
  });
});
