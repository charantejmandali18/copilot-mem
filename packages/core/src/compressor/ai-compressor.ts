import * as http from 'node:http';
import * as https from 'node:https';
import type { Compressor } from './index.js';

const PROMPT_TEMPLATES: Record<string, string> = {
  chat_message:
    'Compress this chat message into a concise summary preserving key decisions, questions, and answers. Remove filler words and redundancy:\n\n',
  file_edit: 'Summarize this file edit concisely, noting what changed and why (if apparent):\n\n',
  tool_use:
    'Compress this tool usage record into a brief summary of what tool was used and what it produced:\n\n',
  manual: 'Compress this note into a concise summary preserving all key information:\n\n',
};

export interface AiCompressorConfig {
  /** API endpoint URL (e.g., https://api.openai.com/v1/chat/completions) */
  endpoint: string;
  /** API key for authentication */
  apiKey: string;
  /** Model name (e.g., gpt-4o-mini, claude-3-haiku-20240307) */
  model: string;
  /** Max tokens for compression output */
  maxTokens?: number;
  /** Request timeout in ms */
  timeoutMs?: number;
}

export class AiCompressor implements Compressor {
  private endpoint: URL;
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private timeoutMs: number;

  constructor(config: AiCompressorConfig) {
    this.endpoint = new URL(config.endpoint);
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.maxTokens = config.maxTokens ?? 256;
    this.timeoutMs = config.timeoutMs ?? 15000;
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.endpoint);
  }

  async compress(content: string, type: string): Promise<string> {
    if (!this.isAvailable()) return content;

    // Skip very short content — not worth compressing
    if (content.length < 100) return content;

    const prompt = (PROMPT_TEMPLATES[type] ?? PROMPT_TEMPLATES.manual) + content;

    try {
      const result = await this.callApi(prompt);
      return result || content;
    } catch {
      // Graceful fallback — return original content on any API error
      return content;
    }
  }

  private callApi(prompt: string): Promise<string> {
    const body = JSON.stringify({
      model: this.model,
      messages: [
        {
          role: 'system',
          content:
            'You are a compression assistant. Output ONLY the compressed version. No preamble, no explanation.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: this.maxTokens,
      temperature: 0,
    });

    const isHttps = this.endpoint.protocol === 'https:';
    const transport = isHttps ? https : http;

    return new Promise((resolve, reject) => {
      const req = transport.request(
        {
          hostname: this.endpoint.hostname,
          port: this.endpoint.port || (isHttps ? 443 : 80),
          path: this.endpoint.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Length': Buffer.byteLength(body),
          },
          timeout: this.timeoutMs,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            if (res.statusCode !== 200) {
              reject(new Error(`API returned ${res.statusCode}`));
              return;
            }
            try {
              const data = JSON.parse(Buffer.concat(chunks).toString()) as {
                choices?: { message?: { content?: string } }[];
              };
              const text = data.choices?.[0]?.message?.content?.trim() ?? '';
              resolve(text);
            } catch (err) {
              reject(err);
            }
          });
        },
      );
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('API request timed out'));
      });
      req.write(body);
      req.end();
    });
  }
}
