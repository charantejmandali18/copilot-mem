export { Core } from './core.js';
export { loadConfig, getConfigDir, getConfigPath, ensureDir } from './config.js';
export type { SearchEngine } from './search/index.js';
export { FtsSearchEngine } from './search/fts.js';
export { Database } from './storage/database.js';
export type {
  Session,
  Observation,
  ObservationType,
  Summary,
  SearchResult,
  TimelineEntry,
  CreateObservationInput,
  CopilotMemConfig,
} from './types.js';
