import type { SearchResult, TimelineEntry } from '../types.js';
import type { SearchEngine } from './index.js';
import type { ChromaSearchEngine } from './chroma.js';

/**
 * Hybrid search combining FTS5 (keyword) and Chroma (semantic) results
 * using Reciprocal Rank Fusion (RRF).
 *
 * RRF formula: score(d) = Σ 1 / (k + rank_i(d))
 * where k is a constant (default 60) and rank_i is the rank in result set i.
 */
export class HybridSearchEngine implements SearchEngine {
  constructor(
    private fts: SearchEngine,
    private chroma: ChromaSearchEngine,
    private k: number = 60,
  ) {}

  search(query: string, opts: { limit?: number; projectPath?: string } = {}): SearchResult[] {
    // Synchronous path — only FTS5 results
    return this.fts.search(query, opts);
  }

  /** Async hybrid search combining FTS5 + Chroma with RRF. */
  async searchAsync(
    query: string,
    opts: { limit?: number; projectPath?: string } = {},
  ): Promise<SearchResult[]> {
    const { limit = 10 } = opts;

    // Fetch more results from each engine for better fusion
    const fetchLimit = limit * 3;

    const [ftsResults, chromaResults] = await Promise.all([
      Promise.resolve(this.fts.search(query, { ...opts, limit: fetchLimit })),
      this.chroma.searchAsync(query, { ...opts, limit: fetchLimit }),
    ]);

    return this.fuse(ftsResults, chromaResults, limit);
  }

  private fuse(
    ftsResults: SearchResult[],
    chromaResults: SearchResult[],
    limit: number,
  ): SearchResult[] {
    const scores = new Map<string, { score: number; result: SearchResult }>();

    // RRF for FTS5 results
    ftsResults.forEach((result, rank) => {
      const rrfScore = 1 / (this.k + rank + 1);
      const existing = scores.get(result.id);
      if (existing) {
        existing.score += rrfScore;
      } else {
        scores.set(result.id, { score: rrfScore, result });
      }
    });

    // RRF for Chroma results
    chromaResults.forEach((result, rank) => {
      const rrfScore = 1 / (this.k + rank + 1);
      const existing = scores.get(result.id);
      if (existing) {
        existing.score += rrfScore;
      } else {
        scores.set(result.id, { score: rrfScore, result });
      }
    });

    // Sort by combined RRF score (higher = better)
    return Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => ({
        ...entry.result,
        score: entry.score,
      }));
  }

  timeline(observationIds: string[], windowMinutes?: number): TimelineEntry[] {
    // Timeline always uses FTS5 (requires SQL)
    return this.fts.timeline(observationIds, windowMinutes);
  }
}
