import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Core } from '@copilot-mem/core';
import { registerSearchTool } from './tools/search.js';
import { registerTimelineTool } from './tools/timeline.js';
import { registerGetMemoriesTool } from './tools/get-memories.js';
import { registerSaveMemoryTool } from './tools/save-memory.js';
import { registerSmartSearchTool } from './tools/smart-search.js';

export function createMcpServer(core: Core): McpServer {
  const server = new McpServer({
    name: 'copilot-mem',
    version: '0.1.0',
  });

  registerSearchTool(server, core);
  registerTimelineTool(server, core);
  registerGetMemoriesTool(server, core);
  registerSaveMemoryTool(server, core);
  registerSmartSearchTool(server, core);

  return server;
}
