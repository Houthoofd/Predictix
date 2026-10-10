import { parseFrenchDate } from './dateParser.js';
import {
  NetworkMode,
  fetchSofaJSON,
  fetchSofaEventsForDate,
  fetchSofaStats,
  fetchSofaEvent,
  fetchSofaLineups
} from './sofaScoreClient.js';
import {
  extractTeamCategory,
  areCategoriesCompatible,
  parseSofaValue,
  findSofaEventId,
  mapSofaStatsToPredictix
} from './sofaScoreMatcher.js';

export {
  NetworkMode,
  fetchSofaJSON,
  fetchSofaEventsForDate,
  fetchSofaStats,
  fetchSofaEvent,
  fetchSofaLineups,
  extractTeamCategory,
  areCategoriesCompatible,
  parseSofaValue,
  findSofaEventId,
  mapSofaStatsToPredictix
};

// In-memory cache for resolved SofaScore events: "date_home_away" -> matchResult
const eventIdCache = new Map();

/**
 * Resolves a SofaScore event ID for given teams and date, with caching.
 * @param {string} dateStr
 * @param {string} homeTeam
 * @param {string} awayTeam
 * @param {object|string} [options]
 * @returns {Promise<{ eventId: number, id: number, isReversed: boolean, confidence: number }|null>}
 */
export async function resolveSofaScoreEvent(dateStr, homeTeam, awayTeam, options = {}) {
  const parsedDate = parseFrenchDate(dateStr) || (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : null);
  if (!parsedDate || !homeTeam || !awayTeam) return null;

  const cacheKey = `${parsedDate}_${homeTeam.toLowerCase().trim()}_${awayTeam.toLowerCase().trim()}`;
  if (eventIdCache.has(cacheKey)) {
    return eventIdCache.get(cacheKey);
  }

  const events = await fetchSofaEventsForDate(parsedDate, options);
  if (!events) return null;

  const matchResult = findSofaEventId(events, parsedDate, homeTeam, awayTeam);
  if (matchResult) {
    eventIdCache.set(cacheKey, matchResult);
  }

  return matchResult;
}

/**
 * Retrieves detailed match data (event metadata + statistics) for a specific SofaScore event ID.
 * @param {number|string} eventId
 * @param {object} [options]
 * @returns {Promise<{ event: object|null, statistics: Array<object>|null }>}
 */
export async function fetchSofaScoreMatchDetails(eventId, options = {}) {
  const [event, statistics] = await Promise.all([
    fetchSofaEvent(eventId, options),
    fetchSofaStats(eventId, options)
  ]);

  return { event, statistics };
}

/**
 * Retrieves missing players and squad absences for a specific SofaScore event ID.
 * @param {number|string} eventId
 * @param {object} [options]
 * @returns {Promise<{ home: Array, away: Array, confirmed: boolean }|null>}
 */
export async function fetchSofaScoreAbsences(eventId, options = {}) {
  const data = await fetchSofaLineups(eventId, options);
  if (!data) return null;

  return {
    home: data.home?.missingPlayers || [],
    away: data.away?.missingPlayers || [],
    confirmed: Boolean(data.confirmed)
  };
}

/**
 * Global SofaScore orchestrator fallback search with network policy options.
 * @param {string} dateStr
 * @param {string} homeTeam
 * @param {string} awayTeam
 * @param {object|string} [options]
 * @returns {Promise<object|null>}
 */
export async function tryResolveSofaStatsFallback(dateStr, homeTeam, awayTeam, options = {}) {
  let opts = {};
  if (typeof options === 'string') {
    opts = { networkMode: options };
  } else if (typeof options === 'object' && options !== null) {
    opts = { ...options };
  }

  const parsedDate = parseFrenchDate(dateStr);
  if (!parsedDate) return null;

  console.log(`[SofaScore Fallback] Searching for event on ${parsedDate}: ${homeTeam} vs ${awayTeam} (network-mode: ${opts.networkMode || 'default'})`);
  const matchResult = await resolveSofaScoreEvent(parsedDate, homeTeam, awayTeam, opts);
  if (!matchResult) {
    console.log(`[SofaScore Fallback] Event not found for ${homeTeam} vs ${awayTeam}`);
    return null;
  }

  const { eventId, isReversed } = matchResult;
  console.log(`[SofaScore Fallback] Event found! SofaScore Event ID: ${eventId} (isReversed: ${Boolean(isReversed)}). Fetching statistics...`);
  const stats = await fetchSofaStats(eventId, opts);
  if (!stats) {
    console.log(`[SofaScore Fallback] No statistics found for event ID ${eventId}`);
    return null;
  }

  const mapped = mapSofaStatsToPredictix(stats, isReversed);
  if (mapped) {
    const hasAnyStat = Object.keys(mapped).some(k => k !== 'first_half_corners' && mapped[k] !== null) ||
      (mapped.first_half_corners && mapped.first_half_corners.home !== null);
    if (hasAnyStat) {
      console.log(`[SofaScore Fallback] Successfully mapped statistics for event ID ${eventId}`);
      return {
        stats_source: 'sofascore',
        ...mapped
      };
    }
  }

  return null;
}
