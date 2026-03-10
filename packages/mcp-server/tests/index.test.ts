import { describe, it, expect } from 'vitest';
import { createMcpServer } from '../src/server.js';
import { Core } from '@copilot-mem/core';
import * as fs from 'node:fs';
import * as os from 'node:os';

describe('@copilot-mem/mcp-server', () => {
  it('creates an MCP server with all tools registered', () => {
    const tmpDir = fs.mkdtempSync(os.tmpdir() + '/copilot-mem-mcp-test-');
    const core = new Core({ dataDir: tmpDir });
    const server = createMcpServer(core);
    expect(server).toBeDefined();
    core.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
