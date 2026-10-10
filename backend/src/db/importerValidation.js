import { isMatchEligibleForImport } from '../utils/statusNormalizer.js';
import { validateMatchStats, checkScoreSanity } from '../utils/integrityLinter.js';
import { parseFrenchDate } from '../utils/scraperHelpers.js';

/**
 * Validates document envelope containing scraped match records.
 * Supports raw Array format as well as wrapped envelope objects { matches: [...], ... }.
 * @param {Array|object} input
 * @returns {{ isValid: boolean, reason: string|null, matches: Array, metadata?: object }}
 */
export function validateMatchesEnvelope(input) {
  if (!input) {
    return {
      isValid: false,
      reason: 'Empty or null document payload',
      matches: []
    };
  }

  // Direct array of match objects
  if (Array.isArray(input)) {
    return {
      isValid: true,
      reason: null,
      matches: input
    };
  }

  // Wrapped document envelope format
  if (typeof input === 'object') {
    if (input.quality_status === 'failed' || input.status === 'failed' || input.status === 'error') {
      return {
        isValid: false,
        reason: `Document envelope rejected due to failure status (${input.quality_status || input.status})`,
        matches: []
      };
    }

    if (Array.isArray(input.matches)) {
      return {
        isValid: true,
        reason: null,
        matches: input.matches,
        metadata: input
      };
    }

    return {
      isValid: false,
      reason: 'Document object is missing a valid "matches" array',
      matches: []
    };
  }

  return {
    isValid: false,
    reason: 'Document payload is neither an array nor an envelope object',
    matches: []
  };
}

/**
 * Verifies quality status admissibility for an item or document.
 * @param {object} item
 * @returns {boolean}
 */
export function isQualityStatusAcceptable(item) {
  if (!item || typeof item !== 'object') return false;
  return item.quality_status !== 'failed' && item.status !== 'failed' && item.status !== 'error';
}

/**
 * Evaluates whether a match is admissible for import.
 * Wrapper and unified interface over isMatchEligibleForImport.
 * @param {object} match
 * @returns {{ eligible: boolean, reason?: string }}
 */
export function validateMatchAdmission(match) {
  return isMatchEligibleForImport(match);
}

/**
 * Resolves standard authentic match date from string.
 * @param {string} rawDate
 * @returns {string|null}
 */
export function resolveMatchDate(rawDate) {
  if (!rawDate) return null;
  const str = String(rawDate).trim();
  const parsed = parseFrenchDate(str);
  if (parsed) return parsed;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return null;
}

/**
 * Resolves historical date and time respecting time in date string.
 * @param {string} date
 * @param {string} [time]
 * @returns {{ histDate: string|null, histTime: string }}
 */
export function resolveHistoricalDateAndTime(date, time) {
  let parsedDate = parseFrenchDate(date);
  let rawDate = date ? String(date).trim() : null;
  let histDate = parsedDate || (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null);
  let histTime = time || 'Finished';
  if (rawDate && rawDate.includes(':')) {
    histTime = rawDate;
    histDate = null;
  }
  return { histDate, histTime };
}

/**
 * Resolves canonical or fallback match ID.
 * @param {string} rawMatchId
 * @param {{ source: string, sport: string, homeClean: string, awayClean: string, matchDate: string|null }} context
 * @returns {string}
 */
export function resolveMatchId(rawMatchId, { source, sport, homeClean, awayClean, matchDate }) {
  let matchId = rawMatchId;
  if (typeof matchId === 'string') {
    const flashscoreMatch = matchId.match(/\/match\/([a-zA-Z0-9]+)/);
    if (flashscoreMatch) {
      matchId = flashscoreMatch[1];
    } else if (matchId.startsWith('/match/')) {
      const parts = matchId.split('/');
      if (parts[2]) {
        matchId = parts[2];
      }
    }
  }
  if (!matchId) {
    matchId = matchDate 
      ? `${source}_${sport}_${homeClean}_${awayClean}_${matchDate}`
      : `${source}_${sport}_${homeClean}_${awayClean}`;
  }
  return matchId;
}

/**
 * Computes default odds, probabilities, card lines and tip predictions based on team name hash and sport.
 * @param {string} sport
 * @param {string} homeClean
 * @param {string} awayClean
 * @param {object} [overrides]
 * @returns {object}
 */
export function computeMatchOddsAndLines(sport, homeClean, awayClean, overrides = {}) {
  const hashSeed = homeClean + awayClean;
  let charSum = 0;
  for (let i = 0; i < hashSeed.length; i++) {
    charSum += hashSeed.charCodeAt(i);
  }

  const stableProb = 55 + (charSum % 25);

  let defaultLine = charSum % 2 === 0 ? '4.5' : '5.5';
  if (sport !== 'football') {
    if (sport === 'basketball') defaultLine = '165.5';
    else if (sport === 'tennis') defaultLine = '2.5';
    else if (sport.includes('rugby')) defaultLine = '42.5';
    else if (sport === 'handball') defaultLine = '52.5';
    else if (sport === 'volleyball') defaultLine = '3.5';
    else if (sport === 'hockey' || sport === 'ice-hockey' || sport === 'futsal') defaultLine = '5.5';
    else if (sport === 'baseball') defaultLine = '8.5';
    else if (sport === 'american-football') defaultLine = '45.5';
    else if (sport === 'table-tennis' || sport === 'badminton') defaultLine = '2.5';
    else if (sport === 'snooker') defaultLine = '9.5';
    else defaultLine = '2.5';
  }

  const cardLine = overrides.card_line || defaultLine;
  const bestTip = overrides.best_tip || (stableProb >= 66 ? 'Plus de' : 'Moins de');
  const probability = overrides.probability || `${stableProb}%`;
  const overOdds = overrides.over_odds || (bestTip === 'Plus de' ? '1.85' : '2.05');
  const underOdds = overrides.under_odds || (bestTip === 'Moins de' ? '1.90' : '1.75');
  const winRate = overrides.win_rate || `${45 + (charSum % 35)}%`;

  return {
    charSum,
    stableProb,
    cardLine,
    bestTip,
    probability,
    overOdds,
    underOdds,
    winRate
  };
}

/**
 * Performs data integrity and score sanity checks on finished matches.
 * @param {object} match
 * @param {{ isFinished: number|boolean, status: string, sport: string, normalizedStats?: object }} context
 * @returns {{ isValid: boolean, isSane: boolean, missingStats?: Array<string>, sanityError?: string }}
 */
export function checkFinishedMatchIntegrity(match, { isFinished, status, sport, normalizedStats = null } = {}) {
  const dbMatchObj = {
    is_finished: Boolean(isFinished),
    status: status || match.status || 'Finished',
    sport: sport || match.sport || 'football',
    score: match.score || '',
    first_half_corners_home: match.first_half_corners_home !== undefined ? match.first_half_corners_home : null,
    first_half_corners_away: match.first_half_corners_away !== undefined ? match.first_half_corners_away : null,
    statistics_json: normalizedStats ? JSON.stringify(normalizedStats) : (match.statistics_json || null)
  };

  const statsVal = validateMatchStats(dbMatchObj);
  const sanityVal = checkScoreSanity(dbMatchObj);

  return {
    isValid: statsVal.isValid,
    isSane: sanityVal.isSane,
    missingStats: statsVal.missing,
    sanityError: sanityVal.reason
  };
}

export {
  isMatchEligibleForImport,
  validateMatchStats,
  checkScoreSanity
};
