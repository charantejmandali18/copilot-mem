import { describe, it, expect } from 'vitest';
import { ChromaSearchEngine } from '../src/search/chroma.js';
import { HybridSearchEngine } from '../src/search/hybrid.js';
import { FtsSearchEngine } from '../src/search/fts.js';
import { Core } from '../src/core.js';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';

describe('ChromaSearchEngine', () => {
  it('initializes without Chroma server gracefully', async () => {
    const engine = new ChromaSearchEngine({ host: 'http://localhost:1' });
    const available = await engine.initialize();
    expect(available).toBe(false);
    expect(engine.isAvailable()).toBe(false);
  });

  it('returns empty results when not available', async () => {
    const engine = new ChromaSearchEngine({ host: 'http://localhost:1' });
    await engine.initialize();
    const results = engine.search('test query');
    expect(results).toEqual([]);
  });

  it('returns empty async results when not available', async () => {
    const engine = new ChromaSearchEngine({ host: 'http://localhost:1' });
    await engine.initialize();
    const results = await engine.searchAsync('test query');
    expect(results).toEqual([]);
  });

  it('returns empty timeline (always handled by FTS)', () => {
    const engine = new ChromaSearchEngine();
    expect(engine.timeline([])).toEqual([]);
  });
});

describe('HybridSearchEngine', () => {
  it('falls back to FTS5 when Chroma unavailable', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-mem-test-'));
    const core = new Core({ dataDir: tmpDir });

    const session = core.startSession('test');
    core.addObservation({
      session_id: session.id,
      type: 'manual',
      content: 'Authentication bug fix in login module',
    });

    const chroma = new ChromaSearchEngine({ host: 'http://localhost:1' });
    const hybrid = new HybridSearchEngine(core.search, chroma);

    // Sync search uses FTS5 only
    const results = hybrid.search('authentication');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].snippet).toContain('Authentication');

    core.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('async search falls back to FTS5 when Chroma unavailable', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-mem-test-'));
    const core = new Core({ dataDir: tmpDir });

    const session = core.startSession('test');
    core.addObservation({
      session_id: session.id,
      type: 'manual',
      content: 'Database migration script for user tables',
    });

    const chroma = new ChromaSearchEngine({ host: 'http://localhost:1' });
    await chroma.initialize();
    const hybrid = new HybridSearchEngine(core.search, chroma);

    const results = await hybrid.searchAsync('database migration');
    expect(results.length).toBeGreaterThan(0);

    core.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('timeline delegates to FTS5', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-mem-test-'));
    const core = new Core({ dataDir: tmpDir });

    const chroma = new ChromaSearchEngine();
    const hybrid = new HybridSearchEngine(core.search, chroma);

    const timeline = hybrid.timeline([]);
    expect(timeline).toEqual([]);

    core.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('Core with Chroma config', () => {
  it('works without Chroma config (default)', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-mem-test-'));
    const core = new Core({ dataDir: tmpDir });

    const session = core.startSession('test');
    const obs = core.addObservation({
      session_id: session.id,
      type: 'manual',
      content: 'Test without Chroma',
    });
    expect(obs.content).toBe('Test without Chroma');

    const results = core.searchMemories('Chroma');
    expect(results.length).toBeGreaterThan(0);

    core.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('searchMemoriesAsync falls back to FTS5 without Chroma', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-mem-test-'));
    const core = new Core({ dataDir: tmpDir });

    const session = core.startSession('test');
    core.addObservation({
      session_id: session.id,
      type: 'manual',
      content: 'Async search fallback test',
    });

    const results = await core.searchMemoriesAsync('async search');
    expect(results.length).toBeGreaterThan(0);

    core.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
