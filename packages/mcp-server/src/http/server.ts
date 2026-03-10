import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Core } from '@copilot-mem/core';
import type { Logger } from '../logger.js';
import type { CreateObservationInput } from '@copilot-mem/core';

const ALLOWED_ORIGINS = new Set(['http://localhost:37888', 'http://127.0.0.1:37888']);

const VALID_TYPES = new Set(['chat_message', 'file_edit', 'tool_use', 'manual']);

const MAX_BODY_BYTES = 1024 * 1024; // 1MB
const MAX_EVENTS_PER_BATCH = 1000;
const MAX_QUERY_LIMIT = 500;

function corsHeaders(req: http.IncomingMessage): Record<string, string> {
  const origin = req.headers.origin ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : '',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  data: unknown,
  status = 200,
): void {
  res.writeHead(status, { 'Content-Type': 'application/json', ...corsHeaders(req) });
  res.end(JSON.stringify(data));
}

function readBody(req: http.IncomingMessage, maxBytes = MAX_BODY_BYTES): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    req.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        req.destroy();
        reject(new Error('Request body too large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

function clampLimit(raw: string | null, defaultVal: number): number {
  const parsed = parseInt(raw ?? String(defaultVal), 10);
  if (isNaN(parsed) || parsed < 1) return defaultVal;
  return Math.min(parsed, MAX_QUERY_LIMIT);
}

export function createHttpServer(core: Core, logger: Logger): http.Server {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost`);
    const pathname = url.pathname;

    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders(req));
      res.end();
      return;
    }

    try {
      // POST /capture — auto-capture endpoint
      if (req.method === 'POST' && pathname === '/capture') {
        const body = await readBody(req);
        let events: unknown;
        try {
          events = JSON.parse(body);
        } catch {
          jsonResponse(req, res, { error: 'Invalid JSON' }, 400);
          return;
        }

        if (!Array.isArray(events)) {
          jsonResponse(req, res, { error: 'Expected JSON array' }, 400);
          return;
        }

        if (events.length > MAX_EVENTS_PER_BATCH) {
          jsonResponse(req, res, { error: `Max ${MAX_EVENTS_PER_BATCH} events per batch` }, 400);
          return;
        }

        let sessionId: string | undefined;
        const results = [];

        for (const event of events) {
          if (
            typeof event !== 'object' ||
            event === null ||
            typeof (event as Record<string, unknown>).content !== 'string' ||
            !(event as Record<string, unknown>).content
          ) {
            jsonResponse(
              req,
              res,
              { error: 'Each event must have a non-empty content string' },
              400,
            );
            return;
          }

          const e = event as {
            type?: string;
            content: string;
            session_id?: string;
            metadata?: Record<string, unknown>;
          };

          const eventType = VALID_TYPES.has(e.type ?? '') ? e.type! : 'manual';

          // Create or reuse a session for the batch
          if (!sessionId && !e.session_id) {
            const session = core.startSession('auto-capture');
            sessionId = session.id;
          }

          const input: CreateObservationInput = {
            session_id: e.session_id ?? sessionId!,
            type: eventType as CreateObservationInput['type'],
            content: e.content,
            metadata: e.metadata,
          };
          const obs = core.addObservation(input);
          results.push({ id: obs.id });
        }

        logger.info(`Captured ${results.length} events`);
        jsonResponse(req, res, { captured: results.length, ids: results });
        return;
      }

      // GET /api/sessions
      if (req.method === 'GET' && pathname === '/api/sessions') {
        const projectPath = url.searchParams.get('project_path') ?? undefined;
        const limit = clampLimit(url.searchParams.get('limit'), 50);
        const sessions = core.getSessions({ projectPath, limit });
        jsonResponse(req, res, sessions);
        return;
      }

      // GET /api/observations
      if (req.method === 'GET' && pathname === '/api/observations') {
        const sessionId = url.searchParams.get('session_id') ?? undefined;
        const type = url.searchParams.get('type') ?? undefined;
        const limit = clampLimit(url.searchParams.get('limit'), 50);
        const observations = core.getObservations({ sessionId, type, limit });
        jsonResponse(req, res, observations);
        return;
      }

      // GET /api/search
      if (req.method === 'GET' && pathname === '/api/search') {
        const q = url.searchParams.get('q') ?? '';
        const projectPath = url.searchParams.get('project_path') ?? undefined;
        const limit = clampLimit(url.searchParams.get('limit'), 10);
        if (!q) {
          jsonResponse(req, res, { error: 'Missing query parameter "q"' }, 400);
          return;
        }
        const results = core.searchMemories(q, { limit, projectPath });
        jsonResponse(req, res, results);
        return;
      }

      // DELETE /api/observations/:id
      if (req.method === 'DELETE' && pathname.startsWith('/api/observations/')) {
        const id = pathname.slice('/api/observations/'.length);
        if (!id || id.length > 36) {
          jsonResponse(req, res, { error: 'Invalid observation ID' }, 400);
          return;
        }
        core.deleteObservation(id);
        jsonResponse(req, res, { deleted: id });
        return;
      }

      // GET /ui — serve web viewer
      if (pathname === '/ui' || pathname.startsWith('/ui/')) {
        const uiPath = path.join(__dirname, 'ui', 'index.html');
        if (fs.existsSync(uiPath)) {
          res.writeHead(200, { 'Content-Type': 'text/html', ...corsHeaders(req) });
          res.end(fs.readFileSync(uiPath, 'utf-8'));
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html', ...corsHeaders(req) });
          res.end('<html><body><h1>Copilot Mem</h1><p>Web viewer coming soon.</p></body></html>');
        }
        return;
      }

      // 404
      jsonResponse(req, res, { error: 'Not found' }, 404);
    } catch (err) {
      logger.error(`HTTP error: ${err instanceof Error ? err.message : String(err)}`);
      jsonResponse(req, res, { error: 'Internal server error' }, 500);
    }
  });

  return server;
}
