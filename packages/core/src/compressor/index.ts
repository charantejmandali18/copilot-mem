export interface Compressor {
  /** Compress observation content. Returns compressed text or original if compression unavailable. */
  compress(content: string, type: string): Promise<string>;
  /** Whether this compressor is operational (e.g., has API key configured). */
  isAvailable(): boolean;
}

export { NoopCompressor } from './noop-compressor.js';
export { AiCompressor } from './ai-compressor.js';
export { SessionSummarizer } from './session-summarizer.js';
