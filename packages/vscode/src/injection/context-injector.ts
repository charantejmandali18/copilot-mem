import * as http from 'node:http';
import type * as vscode from 'vscode';

interface SearchResult {
  id: string;
  type: string;
  snippet: string;
  score: number;
  created_at: string;
}

export class ContextInjector {
  constructor(
    private port: number,
    private outputChannel: vscode.OutputChannel,
  ) {}

  async getRelevantContext(projectPath: string, maxResults = 5): Promise<string | null> {
    try {
      const results = await this.fetchSearch(projectPath, maxResults);
      if (results.length === 0) return null;

      const lines = results.map((r) => `- [${r.type}] ${r.created_at}: ${r.snippet}`);
      return `## Previous Context (from copilot-mem)\n${lines.join('\n')}`;
    } catch {
      this.outputChannel.appendLine('Failed to fetch context for injection');
      return null;
    }
  }

  private fetchSearch(projectPath: string, limit: number): Promise<SearchResult[]> {
    const query = encodeURIComponent(projectPath);
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: 'localhost',
          port: this.port,
          path: `/api/search?q=${query}&limit=${limit}`,
          method: 'GET',
          timeout: 3000,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            try {
              const data = JSON.parse(Buffer.concat(chunks).toString()) as SearchResult[];
              resolve(data);
            } catch {
              resolve([]);
            }
          });
        },
      );
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
      req.end();
    });
  }
}
