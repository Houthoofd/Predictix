import { resolveDb } from './dbResolver.js';
import {
  SQL_UPSERT_SCRAPED_MATCH,
  SQL_UPDATE_PRIMARY_MATCH_ENRICHMENT,
  SQL_FIND_EXISTING_MATCH_SAME_DAY,
  isAuthenticMatchDate,
  queryExistingMatchesSameDay,
  buildMatchUpsertParams,
  buildMatchEnrichmentParams,
  filterAndScoreMatchCandidates
} from './matchQueries.js';

export {
  SQL_UPSERT_SCRAPED_MATCH,
  SQL_UPDATE_PRIMARY_MATCH_ENRICHMENT,
  SQL_FIND_EXISTING_MATCH_SAME_DAY,
  isAuthenticMatchDate,
  queryExistingMatchesSameDay,
  buildMatchUpsertParams,
  buildMatchEnrichmentParams,
  filterAndScoreMatchCandidates
};

/**
 * Normalizes statistics object, ensuring consistent property names.
 * @param {object} stats
 * @returns {object|null}
 */
export function normalizeStatistics(stats) {
  if (!stats) return null;
  const normalized = { ...stats };
  // Conservé pour compatibilité ascendante avec les anciennes données JSON scrapées (contenant la coquille 'cartons_janues')
  if (normalized.cartons_janues !== undefined) {
    normalized.yellow_cards = normalized.cartons_janues;
    delete normalized.cartons_janues;
  }
  return normalized;
}

/**
 * Detects the source platform/domain for a given match.
 * @param {object|null} match
 * @param {string} [fallbackUrl='']
 * @returns {string} Source name ('flashscore', 'matchendirect', 'sofascore', etc.)
 */
export function getMatchSource(match, fallbackUrl = '') {
  if (!match && !fallbackUrl) return 'unknown';
  if (match && match.source) return String(match.source).toLowerCase().trim();
  const url = (match && (match.match_url || match.link || match.href || match.url)) || fallbackUrl || '';
  const urlStr = typeof url === 'string' ? url.toLowerCase() : '';
  if (urlStr.includes('flashscore') || urlStr.startsWith('/match/')) return 'flashscore';
  if (urlStr.includes('matchendirect')) return 'matchendirect';
  if (urlStr.includes('sofascore')) return 'sofascore';
  if (urlStr.includes('1xbet')) return '1xbet';
  if (urlStr.includes('arbworld')) return 'arbworld';

  const matchId = (match && match.match_id ? String(match.match_id) : '');
  if (matchId.startsWith('/match/') || matchId.startsWith('fs_') || matchId.startsWith('flashscore_')) return 'flashscore';
  if (matchId.startsWith('med_') || matchId.startsWith('matchendirect_')) return 'matchendirect';

  return 'unknown';
}

/**
 * Upserts a freshly scraped match into scraped_predictions.
 * @param {object|null} db Database context
 * @param {object} match Match data
 * @param {object} [options={}] Overrides and calculated parameters
 * @returns {Promise<object>} Run result
 */
export async function upsertScrapedMatch(db, match, options = {}) {
  const runner = resolveDb(db);
  const params = buildMatchUpsertParams(match, options, normalizeStatistics, getMatchSource);
  return runner.run(SQL_UPSERT_SCRAPED_MATCH, params);
}

/**
 * Updates primary match with on-demand enrichment details.
 * @param {object|null} db Database context
 * @param {string} matchId
 * @param {object} data
 * @returns {Promise<object>} Run result
 */
export async function updatePrimaryMatchEnrichment(db, matchId, data) {
  const runner = resolveDb(db);
  const params = buildMatchEnrichmentParams(matchId, data);
  return runner.run(SQL_UPDATE_PRIMARY_MATCH_ENRICHMENT, params);
}

/**
 * Searches for an existing match between two teams on a given date, strictly scoped by sport and source.
 * Strict matching:
 * - Requires same sport AND same source.
 * - If competition/tournament is known on both, requires tournament compatibility.
 * - If teams are reversed, verifies whether sport/data actually allows reversal (e.g. neutral sport or explicit flag).
 * - If multiple matches match same day with equal confidence, rejects as ambiguous.
 *
 * @param {object|null} db Database context
 * @param {string} homeClean
 * @param {string} awayClean
 * @param {string} date
 * @param {string|object} [sportArg='football']
 * @param {string} [sourceArg='']
 * @param {string|object} [optionsOrTournament]
 * @returns {Promise<Array>} List containing the single unambiguous match row, or empty array if none/ambiguous
 */
export async function findExistingMatchSameDay(db, homeClean, awayClean, date, sportArg, sourceArg, optionsOrTournament) {
  if (!isAuthenticMatchDate(date)) {
    return [];
  }

  let sport = 'football';
  let source = '';
  let tournament = null;
  let allowReversed = false;

  if (typeof sportArg === 'object' && sportArg !== null) {
    source = sportArg.source || source;
    sport = sportArg.sport || sport;
    tournament = sportArg.tournament || sportArg.competition || tournament;
    if (sportArg.allowReversed !== undefined) allowReversed = !!sportArg.allowReversed;
  } else {
    sport = sportArg || sport;
    source = sourceArg || source;
  }

  if (typeof optionsOrTournament === 'object' && optionsOrTournament !== null) {
    tournament = optionsOrTournament.tournament || optionsOrTournament.competition || tournament;
    if (optionsOrTournament.allowReversed !== undefined) allowReversed = !!optionsOrTournament.allowReversed;
  } else if (typeof optionsOrTournament === 'string' && optionsOrTournament.trim()) {
    tournament = optionsOrTournament.trim();
  }

  const cleanSport = (sport || 'football').toLowerCase().trim();
  const cleanSource = (source || '').toLowerCase().trim();

  // Strict matching requires both sport and known source
  if (!cleanSource || cleanSource === 'unknown') {
    return [];
  }

  const runner = resolveDb(db);
  const rows = await queryExistingMatchesSameDay(runner, { homeClean, awayClean, date, cleanSport, cleanSource });
  if (!rows || rows.length === 0) {
    return [];
  }

  const candidates = filterAndScoreMatchCandidates(rows, { homeClean, awayClean, cleanSport, allowReversed, tournament });
  if (candidates.length === 0) {
    return [];
  }

  if (candidates.length === 1) {
    return [candidates[0].row];
  }

  // Sort descending by confidence
  candidates.sort((a, b) => b.confidence - a.confidence);

  // If multiple matches match same day with equal confidence, do NOT randomly pick the first: reject as ambiguous
  if (Math.abs(candidates[0].confidence - candidates[1].confidence) < 0.001) {
    console.warn(`[Importer] Rejet ambiguïté: plusieurs matchs équivalents trouvés le même jour pour ${homeClean} vs ${awayClean} (${date.trim()} / ${cleanSport} / ${cleanSource})`);
    return [];
  }

  return [candidates[0].row];
}
