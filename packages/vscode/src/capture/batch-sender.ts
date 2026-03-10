import * as http from 'node:http';
import { IgnoreMatcher } from '../privacy/ignore-matcher.js';

interface CaptureEvent {
  type: string;
  content: string;
  session_id?: string;
  metadata?: Record<string, unknown>;
}

export class BatchSender {
  private queue: CaptureEvent[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private port: number;
  private batchIntervalMs: number;

  constructor(port: number, batchIntervalMs = 5000) {
    this.port = port;
    this.batchIntervalMs = batchIntervalMs;
  }

  enqueue(event: CaptureEvent): void {
    // Strip <private> tags before queueing
    event.content = IgnoreMatcher.stripPrivateTags(event.content);
    this.queue.push(event);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.flush();
      this.timer = null;
    }, this.batchIntervalMs);
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      await this.send(events);
    } catch {
      // Re-queue on failure (up to a limit)
      if (this.queue.length < 100) {
        this.queue.unshift(...events);
      }
    }
  }

  private send(events: CaptureEvent[]): Promise<void> {
    const body = JSON.stringify(events);
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: 'localhost',
          port: this.port,
          path: '/capture',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
          timeout: 5000,
        },
        (res) => {
          res.resume();
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        },
      );
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
      req.write(body);
      req.end();
    });
  }

  dispose(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    // Attempt final flush synchronously is not possible with HTTP,
    // so we just drop remaining events
    this.queue = [];
  }
}
