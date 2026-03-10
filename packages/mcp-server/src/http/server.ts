import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Core } from '@copilot-mem/core';
import type { Logger } from '../logger.js';
import type { CreateObservationInput } from '@copilot-mem/core';

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(res: http.ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'application/json', ...corsHeaders() });
  res.end(JSON.stringify(data));
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

export function createHttpServer(core: Core, logger: Logger): http.Server {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost`);
    const pathname = url.pathname;

    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders());
      res.end();
      return;
    }

    try {
      // POST /capture — auto-capture endpoint
      if (req.method === 'POST' && pathname === '/capture') {
        const body = await readBody(req);
        const events = JSON.parse(body) as Array<{
          type?: string;
          content: string;
          session_id?: string;
          metadata?: Record<string, unknown>;
        }>;

        let sessionId: string | undefined;
        const results = [];

        for (const event of events) {
          // Create or reuse a session for the batch
          if (!sessionId && !event.session_id) {
            const session = core.startSession('auto-capture');
            sessionId = session.id;
          }

          const input: CreateObservationInput = {
            session_id: event.session_id ?? sessionId!,
            type: (event.type as CreateObservationInput['type']) ?? 'manual',
            content: event.content,
            metadata: event.metadata,
          };
          const obs = core.addObservation(input);
          results.push({ id: obs.id });
        }

        logger.info(`Captured ${results.length} events`);
        jsonResponse(res, { captured: results.length, ids: results });
        return;
      }

      // GET /api/sessions
      if (req.method === 'GET' && pathname === '/api/sessions') {
        const projectPath = url.searchParams.get('project_path') ?? undefined;
        const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
        const sessions = core.getSessions({ projectPath, limit });
        jsonResponse(res, sessions);
        return;
      }

      // GET /api/observations
      if (req.method === 'GET' && pathname === '/api/observations') {
        const sessionId = url.searchParams.get('session_id') ?? undefined;
        const type = url.searchParams.get('type') ?? undefined;
        const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
        const observations = core.getObservations({ sessionId, type, limit });
        jsonResponse(res, observations);
        return;
      }

      // GET /api/search
      if (req.method === 'GET' && pathname === '/api/search') {
        const q = url.searchParams.get('q') ?? '';
        const projectPath = url.searchParams.get('project_path') ?? undefined;
        const limit = parseInt(url.searchParams.get('limit') ?? '10', 10);
        if (!q) {
          jsonResponse(res, { error: 'Missing query parameter "q"' }, 400);
          return;
        }
        const results = core.searchMemories(q, { limit, projectPath });
        jsonResponse(res, results);
        return;
      }

      // DELETE /api/observations/:id
      if (req.method === 'DELETE' && pathname.startsWith('/api/observations/')) {
        const id = pathname.slice('/api/observations/'.length);
        core.deleteObservation(id);
        jsonResponse(res, { deleted: id });
        return;
      }

      // GET /ui — serve web viewer
      if (pathname === '/ui' || pathname.startsWith('/ui/')) {
        const uiPath = path.join(__dirname, 'ui', 'index.html');
        if (fs.existsSync(uiPath)) {
          res.writeHead(200, { 'Content-Type': 'text/html', ...corsHeaders() });
          res.end(fs.readFileSync(uiPath, 'utf-8'));
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html', ...corsHeaders() });
          res.end('<html><body><h1>Copilot Mem</h1><p>Web viewer coming soon.</p></body></html>');
        }
        return;
      }

      // 404
      jsonResponse(res, { error: 'Not found' }, 404);
    } catch (err) {
      logger.error(`HTTP error: ${err instanceof Error ? err.message : String(err)}`);
      jsonResponse(res, { error: 'Internal server error' }, 500);
    }
  });

  return server;
}
