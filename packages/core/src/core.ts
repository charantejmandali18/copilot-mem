import { Database } from './storage/database.js';
import { SessionRepository } from './storage/sessions.js';
import { ObservationRepository } from './storage/observations.js';
import { SummaryRepository } from './storage/summaries.js';
import { FtsSearchEngine } from './search/fts.js';
import { loadConfig, ensureDir } from './config.js';
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

  constructor(configOverrides?: Partial<CopilotMemConfig>) {
    this.config = loadConfig(configOverrides);
    ensureDir(this.config.dataDir);
    this.database = new Database(this.config.dataDir);

    const db = this.database.getDb();
    this.sessions = new SessionRepository(db);
    this.observations = new ObservationRepository(db);
    this.summaries = new SummaryRepository(db);
    this.search = new FtsSearchEngine(db);
  }

  startSession(projectPath: string): Session {
    return this.sessions.create(projectPath);
  }

  endSession(id: string, summary?: string): void {
    this.sessions.end(id, summary);
  }

  addObservation(input: CreateObservationInput): Observation {
    return this.observations.create(input);
  }

  searchMemories(query: string, opts?: { limit?: number; projectPath?: string }): SearchResult[] {
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
    // If no session provided, create/reuse a "manual" session
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
  }

  close(): void {
    this.database.close();
  }
}
