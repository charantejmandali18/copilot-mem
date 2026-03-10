import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { CopilotMemConfig } from './types.js';

const DEFAULT_CONFIG: CopilotMemConfig = {
  port: 37888,
  dataDir: path.join(os.homedir(), '.copilot-mem', 'data'),
  autoCapture: true,
  compressionModel: null,
  logLevel: 'info',
  contextInjection: true,
  maxContextTokens: 2000,
};

export function getConfigDir(): string {
  return path.join(os.homedir(), '.copilot-mem');
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), 'settings.json');
}

export function loadConfig(overrides?: Partial<CopilotMemConfig>): CopilotMemConfig {
  let fileConfig: Partial<CopilotMemConfig> = {};

  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf-8');
    fileConfig = JSON.parse(raw) as Partial<CopilotMemConfig>;
  }

  return { ...DEFAULT_CONFIG, ...fileConfig, ...overrides };
}

export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
