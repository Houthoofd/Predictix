/**
 * Predictix Importer Queries Facade
 *
 * Re-exports all database query functions and SQL statements from their respective domain repositories:
 * - matchRepository: match inserting, updating, searching same-day match.
 * - historyRepository: historical matches and H2H retrieval.
 * - metadataRepository: teams, competitions, settings.
 * - dbResolver: execution resolution and mock injection.
 */

export { resolveDb } from './dbResolver.js';

export {
  normalizeStatistics,
  getMatchSource,
  SQL_UPSERT_SCRAPED_MATCH,
  upsertScrapedMatch,
  SQL_UPDATE_PRIMARY_MATCH_ENRICHMENT,
  updatePrimaryMatchEnrichment,
  findExistingMatchSameDay
} from './matchRepository.js';

export {
  SQL_UPSERT_HISTORICAL_MATCH,
  upsertHistoricalMatch,
  SQL_RECORD_SKIPPED_MATCH,
  recordSkippedMatch,
  countHistoricalMatches
} from './historyRepository.js';

export {
  normalizeTournamentName,
  isTournamentCompatible,
  getImportSetting,
  deletePlayerStatsByTeam,
  insertPlayerStat
} from './metadataRepository.js';
