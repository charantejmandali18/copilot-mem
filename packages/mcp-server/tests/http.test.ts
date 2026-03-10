import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { Core } from '@copilot-mem/core';
import { createHttpServer } from '../src/http/server.js';
import { Logger } from '../src/logger.js';
import * as path from 'node:path';

let tmpDir: string;
let core: Core;
let logger: Logger;
let server: http.Server;
let port: number;

function request(
  method: string,
  urlPath: string,
  body?: string,
): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: 'localhost', port, path: urlPath, method, headers: body ? { 'Content-Type': 'application/json' } : {} },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () =>
          resolve({ status: res.statusCode!, data: Buffer.concat(chunks).toString() }),
        );
      },
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(os.tmpdir() + '/copilot-mem-http-test-');
  core = new Core({ dataDir: tmpDir });
  logger = new Logger(path.join(tmpDir, 'logs'), 'error');
  server = createHttpServer(core, logger);
  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      port = (server.address() as { port: number }).port;
      resolve();
    });
  });
});

afterAll(() => {
  server.close();
  core.close();
  logger.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('HTTP API', () => {
  it('GET /api/sessions returns empty array', async () => {
    const { status, data } = await request('GET', '/api/sessions');
    expect(status).toBe(200);
    expect(JSON.parse(data)).toEqual([]);
  });

  it('POST /capture stores observations', async () => {
    const body = JSON.stringify([
      { type: 'manual', content: 'Test memory about authentication' },
      { type: 'chat_message', content: 'How to fix the login bug?' },
    ]);
    const { status, data } = await request('POST', '/capture', body);
    expect(status).toBe(200);
    const parsed = JSON.parse(data);
    expect(parsed.captured).toBe(2);
    expect(parsed.ids).toHaveLength(2);
  });

  it('GET /api/observations returns stored observations', async () => {
    const { status, data } = await request('GET', '/api/observations');
    expect(status).toBe(200);
    const observations = JSON.parse(data);
    expect(observations.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /api/search finds observations by keyword', async () => {
    const { status, data } = await request('GET', '/api/search?q=authentication');
    expect(status).toBe(200);
    const results = JSON.parse(data);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/search returns 400 without query', async () => {
    const { status } = await request('GET', '/api/search');
    expect(status).toBe(400);
  });

  it('DELETE /api/observations/:id deletes an observation', async () => {
    const { data } = await request('GET', '/api/observations?limit=1');
    const obs = JSON.parse(data);
    const id = obs[0].id;

    const { status } = await request('DELETE', `/api/observations/${id}`);
    expect(status).toBe(200);
  });

  it('GET /ui returns HTML', async () => {
    const { status, data } = await request('GET', '/ui');
    expect(status).toBe(200);
    expect(data).toContain('Copilot Mem');
  });

  it('returns 404 for unknown routes', async () => {
    const { status } = await request('GET', '/unknown');
    expect(status).toBe(404);
  });
});
