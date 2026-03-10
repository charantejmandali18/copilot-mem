import { z } from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Core } from '@copilot-mem/core';

export function registerSearchTool(server: McpServer, core: Core): void {
  server.registerTool(
    'search',
    {
      title: 'Search Memories',
      description:
        'Search memories by keywords. Returns a compact index with IDs, types, snippets, and scores. Use get_memories to fetch full details for specific IDs.',
      inputSchema: {
        query: z.string().describe('Search query keywords'),
        project_path: z.string().optional().describe('Filter by project path'),
        limit: z.number().optional().default(10).describe('Max results (default 10)'),
      },
    },
    async ({ query, project_path, limit }) => {
      const results = core.searchMemories(query, {
        limit: limit ?? 10,
        projectPath: project_path,
      });

      if (results.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No memories found.' }] };
      }

      const lines = results.map(
        (r) =>
          `#${r.id} | ${r.type} | ${r.created_at} | score:${r.score.toFixed(2)} | ${r.snippet}`,
      );
      const header = `Found ${results.length} result(s):\n`;
      return { content: [{ type: 'text' as const, text: header + lines.join('\n') }] };
    },
  );
}
