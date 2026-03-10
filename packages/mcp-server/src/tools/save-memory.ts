import { z } from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Core } from '@copilot-mem/core';

export function registerSaveMemoryTool(server: McpServer, core: Core): void {
  server.registerTool(
    'save_memory',
    {
      title: 'Save Memory',
      description: 'Manually save something important to memory for future reference.',
      inputSchema: {
        content: z.string().describe('The content to save'),
        type: z
          .enum(['chat_message', 'file_edit', 'tool_use', 'manual'])
          .optional()
          .default('manual')
          .describe('Observation type (default: manual)'),
        project_path: z.string().optional().describe('Associated project path'),
        metadata: z.record(z.string(), z.unknown()).optional().describe('Additional metadata'),
      },
    },
    async ({ content, type, project_path, metadata }) => {
      const obs = core.saveMemory(content, {
        type: type ?? 'manual',
        metadata: {
          ...metadata,
          ...(project_path ? { project_path } : {}),
        },
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Memory saved with ID: ${obs.id}`,
          },
        ],
      };
    },
  );
}
