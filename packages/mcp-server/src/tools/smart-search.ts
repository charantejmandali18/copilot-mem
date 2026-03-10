import { z } from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Core } from '@copilot-mem/core';

export function registerSmartSearchTool(server: McpServer, core: Core): void {
  server.registerTool(
    'smart_search',
    {
      title: 'Smart Search',
      description:
        'Natural language search that automatically expands the top results with full details. Combines search + get_memories in one call.',
      inputSchema: {
        query: z.string().describe('Natural language search query'),
        project_path: z.string().optional().describe('Filter by project path'),
        max_results: z.number().optional().default(5).describe('Max results to expand (default 5)'),
      },
    },
    async ({ query, project_path, max_results }) => {
      const limit = max_results ?? 5;
      const results = core.searchMemories(query, {
        limit,
        projectPath: project_path,
      });

      if (results.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No memories found.' }] };
      }

      // Auto-expand top results
      const ids = results.map((r) => r.id);
      const observations = core.getMemories(ids);

      const parts: string[] = [`Found ${results.length} result(s) for "${query}":\n`];

      for (const obs of observations) {
        const matchingResult = results.find((r) => r.id === obs.id);
        const score = matchingResult ? ` (score: ${matchingResult.score.toFixed(2)})` : '';
        const meta = obs.metadata ? `\n  Metadata: ${JSON.stringify(obs.metadata)}` : '';
        parts.push(
          `--- ${obs.type} | ${obs.created_at}${score} ---\n${obs.content}${meta}\n`,
        );
      }

      return { content: [{ type: 'text' as const, text: parts.join('\n') }] };
    },
  );
}
