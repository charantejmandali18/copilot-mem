import { z } from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Core } from '@copilot-mem/core';

export function registerGetMemoriesTool(server: McpServer, core: Core): void {
  server.registerTool(
    'get_memories',
    {
      title: 'Get Memory Details',
      description:
        'Fetch full details for specific memory observations by their IDs. Returns complete content, metadata, and timestamps.',
      inputSchema: {
        ids: z.array(z.string()).describe('Observation IDs to fetch'),
      },
    },
    async ({ ids }) => {
      const observations = core.getMemories(ids);

      if (observations.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No memories found for given IDs.' }] };
      }

      const blocks = observations.map((obs) => {
        const meta = obs.metadata ? `\nMetadata: ${JSON.stringify(obs.metadata)}` : '';
        return [
          `--- Memory ${obs.id} ---`,
          `Type: ${obs.type}`,
          `Session: ${obs.session_id}`,
          `Created: ${obs.created_at}`,
          `Content:\n${obs.content}`,
          obs.compressed_content ? `Compressed:\n${obs.compressed_content}` : '',
          meta,
        ]
          .filter(Boolean)
          .join('\n');
      });

      return { content: [{ type: 'text' as const, text: blocks.join('\n\n') }] };
    },
  );
}
