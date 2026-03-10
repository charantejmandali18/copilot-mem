import type { SearchResult, TimelineEntry } from '../types.js';

export interface SearchEngine {
  search(query: string, opts?: { limit?: number; projectPath?: string }): SearchResult[];
  timeline(observationIds: string[], windowMinutes?: number): TimelineEntry[];
}
