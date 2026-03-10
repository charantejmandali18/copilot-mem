#!/usr/bin/env node

import { Core, loadConfig, getConfigDir } from '@copilot-mem/core';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './server.js';
import { createHttpServer } from './http/server.js';
import { Logger } from './logger.js';
import * as path from 'node:path';

async function main(): Promise<void> {
  const config = loadConfig();
  const logDir = path.join(getConfigDir(), 'logs');
  const logger = new Logger(logDir, config.logLevel);

  logger.info('Starting copilot-mem server...');

  // Initialize core
  const core = new Core();
  logger.info(`Data directory: ${config.dataDir}`);

  // Start HTTP server
  const httpServer = createHttpServer(core, logger);
  httpServer.listen(config.port, () => {
    logger.info(`HTTP server listening on port ${config.port}`);
  });

  // Connect MCP via stdio
  const mcpServer = createMcpServer(core);
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  logger.info('MCP server connected via stdio');

  // Graceful shutdown
  const shutdown = () => {
    logger.info('Shutting down...');
    httpServer.close();
    core.close();
    logger.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  // Last resort error — write to stderr since MCP may not be connected yet
  process.stderr.write(`Fatal error: ${err}\n`);
  process.exit(1);
});
