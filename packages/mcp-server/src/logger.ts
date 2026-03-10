import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureDir } from '@copilot-mem/core';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

export class Logger {
  private fd: number | null = null;
  private logPath: string;
  private minLevel: number;

  constructor(logDir: string, level: LogLevel = 'info') {
    ensureDir(logDir);
    this.logPath = path.join(logDir, 'server.log');
    this.minLevel = LOG_LEVELS[level];
    this.fd = fs.openSync(this.logPath, 'a');
  }

  private write(level: LogLevel, message: string): void {
    if (LOG_LEVELS[level] < this.minLevel) return;
    if (this.fd === null) return;

    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

    try {
      const stat = fs.fstatSync(this.fd);
      if (stat.size > MAX_LOG_SIZE) {
        fs.closeSync(this.fd);
        fs.renameSync(this.logPath, this.logPath + '.old');
        this.fd = fs.openSync(this.logPath, 'a');
      }
      fs.writeSync(this.fd, line);
    } catch {
      // Silently fail — never write to stdout/stderr
    }
  }

  debug(message: string): void {
    this.write('debug', message);
  }

  info(message: string): void {
    this.write('info', message);
  }

  warn(message: string): void {
    this.write('warn', message);
  }

  error(message: string): void {
    this.write('error', message);
  }

  close(): void {
    if (this.fd !== null) {
      fs.closeSync(this.fd);
      this.fd = null;
    }
  }
}
