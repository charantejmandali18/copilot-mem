import { z } from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Core } from '@copilot-mem/core';

export function registerTimelineTool(server: McpServer, core: Core): void {
  server.registerTool(
    'timeline',
    {
      title: 'Memory Timeline',
      description:
        'Get chronological context around specific observations. Provide observation IDs from a search result to see surrounding events.',
      inputSchema: {
        observation_ids: z.array(z.string()).describe('Observation IDs to get timeline for'),
        window_minutes: z
          .number()
          .optional()
          .default(30)
          .describe('Time window in minutes (default 30)'),
      },
    },
    async ({ observation_ids, window_minutes }) => {
      const entries = core.getTimeline(observation_ids, window_minutes ?? 30);

      if (entries.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No timeline entries found.' }] };
      }

      const lines = entries.map((e) => {
        const meta = e.metadata ? ` | ${JSON.stringify(e.metadata)}` : '';
        return `[${e.created_at}] ${e.type} (${e.id}): ${e.content.slice(0, 300)}${meta}`;
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Timeline (${entries.length} entries):\n\n${lines.join('\n\n')}`,
          },
        ],
      };
    },
  );
}
