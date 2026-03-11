import { describe, it, expect } from 'vitest';
import { NoopCompressor } from '../src/compressor/noop-compressor.js';
import { AiCompressor } from '../src/compressor/ai-compressor.js';
import { SessionSummarizer } from '../src/compressor/session-summarizer.js';
import { Core } from '../src/core.js';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';

describe('NoopCompressor', () => {
  it('returns content unchanged', async () => {
    const compressor = new NoopCompressor();
    const result = await compressor.compress('hello world', 'manual');
    expect(result).toBe('hello world');
  });

  it('reports as available', () => {
    const compressor = new NoopCompressor();
    expect(compressor.isAvailable()).toBe(true);
  });
});

describe('AiCompressor', () => {
  it('reports available when configured', () => {
    const compressor = new AiCompressor({
      endpoint: 'https://api.example.com/v1/chat/completions',
      apiKey: 'test-key',
      model: 'test-model',
    });
    expect(compressor.isAvailable()).toBe(true);
  });

  it('skips short content', async () => {
    const compressor = new AiCompressor({
      endpoint: 'https://api.example.com/v1/chat/completions',
      apiKey: 'test-key',
      model: 'test-model',
    });
    const short = 'short text';
    const result = await compressor.compress(short, 'manual');
    expect(result).toBe(short);
  });

  it('falls back to original on API error', async () => {
    const compressor = new AiCompressor({
      endpoint: 'http://localhost:1/nonexistent',
      apiKey: 'bad-key',
      model: 'test-model',
      timeoutMs: 500,
    });
    const longContent = 'a'.repeat(200);
    const result = await compressor.compress(longContent, 'manual');
    expect(result).toBe(longContent);
  });
});

describe('SessionSummarizer', () => {
  it('summarizes session observations', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-mem-test-'));
    const core = new Core({ dataDir: tmpDir });

    const session = core.startSession('test-project');
    core.addObservation({
      session_id: session.id,
      type: 'manual',
      content: 'Fixed authentication bug',
    });
    core.addObservation({
      session_id: session.id,
      type: 'chat_message',
      content: 'Discussed login flow improvements',
    });

    // With NoopCompressor, summary should be the concatenated content
    const summary = await core.endSessionWithSummary(session.id);
    expect(summary).not.toBeNull();
    expect(summary!.content).toContain('Fixed authentication bug');
    expect(summary!.content).toContain('Discussed login flow improvements');

    core.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns null for empty session', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-mem-test-'));
    const core = new Core({ dataDir: tmpDir });

    const session = core.startSession('test-project');
    const summary = await core.endSessionWithSummary(session.id);
    expect(summary).toBeNull();

    core.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('Core with compression', () => {
  it('uses NoopCompressor by default', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-mem-test-'));
    const core = new Core({ dataDir: tmpDir });
    expect(core.compressor.isAvailable()).toBe(true);
    core.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('addObservationWithCompression works with noop', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-mem-test-'));
    const core = new Core({ dataDir: tmpDir });

    const session = core.startSession('test');
    const obs = await core.addObservationWithCompression({
      session_id: session.id,
      type: 'manual',
      content: 'Test content for compression',
    });
    expect(obs.content).toBe('Test content for compression');
    expect(obs.compressed_content).toBeNull();

    core.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
