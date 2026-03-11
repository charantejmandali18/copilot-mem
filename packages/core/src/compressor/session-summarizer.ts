import type { Compressor } from './index.js';
import type { ObservationRepository } from '../storage/observations.js';
import type { SummaryRepository } from '../storage/summaries.js';
import type { SessionRepository } from '../storage/sessions.js';
import type { Summary } from '../types.js';

export class SessionSummarizer {
  constructor(
    private compressor: Compressor,
    private observations: ObservationRepository,
    private summaries: SummaryRepository,
    private sessions: SessionRepository,
  ) {}

  /** Summarize all observations in a session and store as a Summary. */
  async summarize(sessionId: string): Promise<Summary | null> {
    const observations = this.observations.list({ sessionId, limit: 500 });
    if (observations.length === 0) return null;

    // Build a combined text of all observations
    const combined = observations.map((o) => `[${o.type}] ${o.content}`).join('\n\n---\n\n');

    const summaryContent = await this.compressor.compress(combined, 'manual');

    // Store the summary
    const summary = this.summaries.create(sessionId, summaryContent);

    // Also update the session's summary field
    this.sessions.end(sessionId, summaryContent.slice(0, 500));

    return summary;
  }
}
