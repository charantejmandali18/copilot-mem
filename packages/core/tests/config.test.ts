import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as os from 'node:os';
import { loadConfig, getConfigDir } from '../src/config.js';

describe('config', () => {
  it('returns defaults when no config file exists', () => {
    const config = loadConfig();
    expect(config.port).toBe(37888);
    expect(config.dataDir).toBe(path.join(os.homedir(), '.copilot-mem', 'data'));
    expect(config.autoCapture).toBe(true);
    expect(config.logLevel).toBe('info');
    expect(config.contextInjection).toBe(true);
    expect(config.maxContextTokens).toBe(2000);
  });

  it('applies overrides', () => {
    const config = loadConfig({ port: 9999, logLevel: 'debug' });
    expect(config.port).toBe(9999);
    expect(config.logLevel).toBe('debug');
    // Other defaults preserved
    expect(config.autoCapture).toBe(true);
  });

  it('returns config directory path', () => {
    expect(getConfigDir()).toBe(path.join(os.homedir(), '.copilot-mem'));
  });
});
