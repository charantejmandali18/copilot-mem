import { Database } from './storage/database.js';
import { SessionRepository } from './storage/sessions.js';
import { ObservationRepository } from './storage/observations.js';
import { SummaryRepository } from './storage/summaries.js';
import { FtsSearchEngine } from './search/fts.js';
import { ChromaSearchEngine } from './search/chroma.js';
import { HybridSearchEngine } from './search/hybrid.js';
import { loadConfig, ensureDir } from './config.js';
import { NoopCompressor } from './compressor/noop-compressor.js';
import { AiCompressor } from './compressor/ai-compressor.js';
import { SessionSummarizer } from './compressor/session-summarizer.js';
import type { Compressor } from './compressor/index.js';
import type {
  CopilotMemConfig,
  Session,
  Observation,
  CreateObservationInput,
  SearchResult,
  TimelineEntry,
  Summary,
} from './types.js';
import type { SearchEngine } from './search/index.js';

export class Core {
  readonly config: CopilotMemConfig;
  private database: Database;
  readonly sessions: SessionRepository;
  readonly observations: ObservationRepository;
  readonly summaries: SummaryRepository;
  readonly search: SearchEngine;
  readonly compressor: Compressor;
  readonly sessionSummarizer: SessionSummarizer;
  private chromaEngine: ChromaSearchEngine | null = null;
  private hybridEngine: HybridSearchEngine | null = null;

  constructor(configOverrides?: Partial<CopilotMemConfig>) {
    this.config = loadConfig(configOverrides);
    ensureDir(this.config.dataDir);
    this.database = new Database(this.config.dataDir);

    const db = this.database.getDb();
    this.sessions = new SessionRepository(db);
    this.observations = new ObservationRepository(db);
    this.summaries = new SummaryRepository(db);
    this.search = new FtsSearchEngine(db);

    // Initialize compressor based on config
    if (this.config.compression) {
      this.compressor = new AiCompressor(this.config.compression);
    } else {
      this.compressor = new NoopCompressor();
    }

    this.sessionSummarizer = new SessionSummarizer(
      this.compressor,
      this.observations,
      this.summaries,
      this.sessions,
    );

    // Initialize Chroma if configured
    if (this.config.chroma) {
      this.chromaEngine = new ChromaSearchEngine(this.config.chroma);
      this.hybridEngine = new HybridSearchEngine(this.search, this.chromaEngine);
    }
  }

  /** Initialize async components (Chroma). Call after construction. */
  async initialize(): Promise<void> {
    if (this.chromaEngine) {
      await this.chromaEngine.initialize();
    }
  }

  startSession(projectPath: string): Session {
    return this.sessions.create(projectPath);
  }

  endSession(id: string, summary?: string): void {
    this.sessions.end(id, summary);
  }

  /** End a session and auto-generate a summary using the compressor. */
  async endSessionWithSummary(id: string): Promise<Summary | null> {
    return this.sessionSummarizer.summarize(id);
  }

  addObservation(input: CreateObservationInput): Observation {
    const obs = this.observations.create(input);
    // Index in Chroma asynchronously (fire and forget)
    if (this.chromaEngine?.isAvailable()) {
      this.chromaEngine.index(obs.id, obs.content, {
        type: obs.type,
        created_at: obs.created_at,
        session_id: obs.session_id,
      });
    }
    return obs;
  }

  /** Add an observation with async AI compression of content. */
  async addObservationWithCompression(input: CreateObservationInput): Promise<Observation> {
    const compressed = await this.compressor.compress(input.content, input.type);
    return this.observations.create({
      ...input,
      compressed_content: compressed !== input.content ? compressed : undefined,
    });
  }

  searchMemories(query: string, opts?: { limit?: number; projectPath?: string }): SearchResult[] {
    return this.search.search(query, opts);
  }

  /** Async search using hybrid FTS5 + Chroma when available, otherwise FTS5 only. */
  async searchMemoriesAsync(
    query: string,
    opts?: { limit?: number; projectPath?: string },
  ): Promise<SearchResult[]> {
    if (this.hybridEngine && this.chromaEngine?.isAvailable()) {
      return this.hybridEngine.searchAsync(query, opts);
    }
    return this.search.search(query, opts);
  }

  getTimeline(observationIds: string[], windowMinutes?: number): TimelineEntry[] {
    return this.search.timeline(observationIds, windowMinutes);
  }

  getMemories(ids: string[]): Observation[] {
    return this.observations.getByIds(ids);
  }

  saveMemory(
    content: string,
    opts?: { sessionId?: string; type?: Observation['type']; metadata?: Record<string, unknown> },
  ): Observation {
    let sessionId = opts?.sessionId;
    if (!sessionId) {
      const session = this.sessions.create('manual');
      sessionId = session.id;
    }
    return this.observations.create({
      session_id: sessionId,
      type: opts?.type ?? 'manual',
      content,
      metadata: opts?.metadata,
    });
  }

  getSessions(opts?: { projectPath?: string; limit?: number }): Session[] {
    return this.sessions.list(opts);
  }

  getObservations(opts?: { sessionId?: string; type?: string; limit?: number }): Observation[] {
    return this.observations.list(opts);
  }

  getSummaries(sessionId: string): Summary[] {
    return this.summaries.getForSession(sessionId);
  }

  deleteObservation(id: string): void {
    this.observations.delete(id);
    // Remove from Chroma too
    if (this.chromaEngine?.isAvailable()) {
      this.chromaEngine.remove(id);
    }
  }

  close(): void {
    this.database.close();
  }
}
