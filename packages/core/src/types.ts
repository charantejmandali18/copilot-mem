export interface Session {
  id: string;
  project_path: string;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
}

export interface Observation {
  id: string;
  session_id: string;
  type: ObservationType;
  content: string;
  compressed_content: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type ObservationType = 'chat_message' | 'file_edit' | 'tool_use' | 'manual';

export interface Summary {
  id: string;
  session_id: string;
  content: string;
  created_at: string;
}

export interface SearchResult {
  id: string;
  type: ObservationType;
  snippet: string;
  score: number;
  created_at: string;
}

export interface TimelineEntry {
  id: string;
  session_id: string;
  type: ObservationType;
  content: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export interface CreateObservationInput {
  session_id: string;
  type: ObservationType;
  content: string;
  compressed_content?: string;
  metadata?: Record<string, unknown>;
}

export interface CompressionConfig {
  /** API endpoint URL (e.g., https://api.openai.com/v1/chat/completions) */
  endpoint: string;
  /** API key for authentication */
  apiKey: string;
  /** Model name (e.g., gpt-4o-mini) */
  model: string;
  /** Max tokens for compression output */
  maxTokens?: number;
  /** Request timeout in ms */
  timeoutMs?: number;
}

export interface ChromaConfig {
  /** Chroma server URL (default: http://localhost:8000) */
  host?: string;
  /** Collection name (default: copilot-mem) */
  collectionName?: string;
}

export interface CopilotMemConfig {
  port: number;
  dataDir: string;
  autoCapture: boolean;
  compressionModel: string | null;
  compression: CompressionConfig | null;
  chroma: ChromaConfig | null;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  contextInjection: boolean;
  maxContextTokens: number;
}
