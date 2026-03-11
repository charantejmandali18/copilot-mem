import type { SearchResult, TimelineEntry, ObservationType } from '../types.js';
import type { SearchEngine } from './index.js';

/** Chroma client types — kept minimal to avoid hard dependency on chromadb package. */
interface ChromaCollection {
  add(params: {
    ids: string[];
    documents: string[];
    metadatas?: Record<string, unknown>[];
  }): Promise<void>;
  query(params: {
    queryTexts: string[];
    nResults?: number;
    where?: Record<string, unknown>;
  }): Promise<{
    ids: string[][];
    distances: (number | null)[][];
    documents: (string | null)[][];
    metadatas: (Record<string, unknown> | null)[][];
  }>;
  delete(params: { ids: string[] }): Promise<void>;
}

interface ChromaClient {
  getOrCreateCollection(params: { name: string }): Promise<ChromaCollection>;
}

export interface ChromaConfig {
  /** Chroma server URL (default: http://localhost:8000) */
  host?: string;
  /** Collection name (default: copilot-mem) */
  collectionName?: string;
}

/**
 * Semantic search engine using ChromaDB for vector embeddings.
 * Requires a running Chroma server and the `chromadb` npm package.
 * Falls back gracefully if Chroma is unavailable.
 */
export class ChromaSearchEngine implements SearchEngine {
  private client: ChromaClient | null = null;
  private collection: ChromaCollection | null = null;
  private host: string;
  private collectionName: string;
  private initialized = false;
  private available = false;

  constructor(config: ChromaConfig = {}) {
    this.host = config.host ?? 'http://localhost:8000';
    this.collectionName = config.collectionName ?? 'copilot-mem';
  }

  /** Attempt to connect to Chroma. Returns true if successful. */
  async initialize(): Promise<boolean> {
    if (this.initialized) return this.available;
    this.initialized = true;

    try {
      // Dynamic require — chromadb is an optional peer dependency
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const chromadb = require('chromadb') as {
        ChromaClient: new (opts: { path: string }) => ChromaClient;
      };
      this.client = new chromadb.ChromaClient({ path: this.host });
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
      });
      this.available = true;
      return true;
    } catch {
      this.available = false;
      return false;
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  /** Index an observation into Chroma for semantic search. */
  async index(
    id: string,
    content: string,
    metadata: { type: string; created_at: string; session_id?: string; project_path?: string },
  ): Promise<void> {
    if (!this.collection) return;
    try {
      await this.collection.add({
        ids: [id],
        documents: [content],
        metadatas: [metadata],
      });
    } catch {
      // Silently fail — FTS5 is the primary search engine
    }
  }

  /** Remove an observation from Chroma. */
  async remove(id: string): Promise<void> {
    if (!this.collection) return;
    try {
      await this.collection.delete({ ids: [id] });
    } catch {
      // Silently fail
    }
  }

  search(query: string, opts: { limit?: number; projectPath?: string } = {}): SearchResult[] {
    // Chroma search is async, but SearchEngine interface is sync.
    // Use searchAsync instead for Chroma queries.
    return [];
  }

  /** Async semantic search via Chroma embeddings. */
  async searchAsync(
    query: string,
    opts: { limit?: number; projectPath?: string } = {},
  ): Promise<SearchResult[]> {
    if (!this.collection) return [];
    const { limit = 10, projectPath } = opts;

    try {
      const where = projectPath ? { project_path: projectPath } : undefined;
      const results = await this.collection.query({
        queryTexts: [query],
        nResults: limit,
        where,
      });

      const ids = results.ids[0] ?? [];
      const distances = results.distances[0] ?? [];
      const documents = results.documents[0] ?? [];
      const metadatas = results.metadatas[0] ?? [];

      return ids.map((id, i) => ({
        id,
        type: ((metadatas[i]?.type as string) ?? 'manual') as ObservationType,
        snippet: (documents[i] ?? '').slice(0, 150),
        score: 1 - (distances[i] ?? 1), // Convert distance to similarity score
        created_at: (metadatas[i]?.created_at as string) ?? '',
      }));
    } catch {
      return [];
    }
  }

  timeline(): TimelineEntry[] {
    // Timeline is always handled by FTS5 (requires SQL queries)
    return [];
  }
}
