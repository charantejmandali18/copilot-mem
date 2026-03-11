import type { Compressor } from './index.js';

/** Pass-through compressor that returns content unchanged. Used when no AI model is configured. */
export class NoopCompressor implements Compressor {
  async compress(content: string): Promise<string> {
    return content;
  }

  isAvailable(): boolean {
    return true;
  }
}
