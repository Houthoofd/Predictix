import {
  levenshteinDistance,
  levenshteinSimilarity,
  scoreTeamSimilarity,
  scoreDateProximity,
  scoreCompetitionCompatibility,
  evaluateSofaCandidate,
  normalizeEventSearchParams,
  parseTargetMidday,
  selectBestSofaCandidate
} from './sofaScoreFuzzy.js';

export {
  levenshteinDistance,
  levenshteinSimilarity,
  scoreTeamSimilarity,
  scoreDateProximity,
  scoreCompetitionCompatibility,
  evaluateSofaCandidate,
  normalizeEventSearchParams,
  parseTargetMidday,
  selectBestSofaCandidate
};

/**
 * Team classification metadata extraction (women, youth/age bracket, reserve squad)
 * @param {string} name
 * @returns {{ hasWomenTag: boolean, hasReserveTag: boolean, ageClass: string }}
 */
export function extractTeamCategory(name) {
  if (!name || typeof name !== 'string') {
    return { hasWomenTag: false, hasReserveTag: false, ageClass: '' };
  }
  const clean = name.trim();
  const womenRegex = /\b(women|ladies|femmes|feminines|feminine|feminin|féminines|féminine|féminin|femenino|femenil|frauen|wfc)\b|\(\s*[wW]\s*\)|\b[wW]\b$/i;
  const ageClassRegex = /\b(?:u|under|sub)[ -]?(\d{2})\b/i;
  const reserveWordsRegex = /\b(reserves?|res\.)\b|\bii\b/i;

  const hasWomenTag = womenRegex.test(clean);
  const ageMatch = clean.match(ageClassRegex);
  const ageClass = ageMatch ? `u${ageMatch[1]}` : '';

  let hasReserveTag = reserveWordsRegex.test(clean);
  if (!hasReserveTag) {
    const norm = clean.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ' ').trim();
    const words = norm.split(/\s+/);
    hasReserveTag = words.slice(1).some(w => w === 'b');
  }

  return { hasWomenTag, hasReserveTag, ageClass };
}

/**
 * Checks if two team categories are mutually compatible.
 * Senior teams NEVER match youth, women, or reserve squads.
 * @param {object} cat1
 * @param {object} cat2
 * @returns {boolean}
 */
export function areCategoriesCompatible(cat1, cat2) {
  if (cat1.hasWomenTag !== cat2.hasWomenTag) return false;
  if (cat1.hasReserveTag !== cat2.hasReserveTag) return false;
  if (cat1.ageClass !== cat2.ageClass) return false;
  return true;
}

/**
 * Helper to parse numerical stat values without manufacturing 0 from null or unparseable strings
 * @param {*} val
 * @returns {number|null}
 */
export function parseSofaValue(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    return isNaN(val) ? null : val;
  }
  const clean = String(val).replace('%', '').trim();
  if (clean === '') return null;
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Match a specific game inside SofaScore event list using home/away names, date and category protection.
 * Returns { eventId, isReversed, confidence } or null.
 * @param {Array<object>} events
 * @param {string} targetDateOrHome
 * @param {string} homeOrAway
 * @param {string} [maybeAway]
 * @returns {object|null}
 */
export function findSofaEventId(events, targetDateOrHome, homeOrAway, maybeAway) {
  if (!events || !Array.isArray(events)) return null;

  const { targetDate, homeTeam, awayTeam } = normalizeEventSearchParams(targetDateOrHome, homeOrAway, maybeAway);
  if (!homeTeam || !awayTeam) return null;

  const targetMidday = parseTargetMidday(targetDate);
  const candidateParams = {
    homeTeam,
    awayTeam,
    homeCat: extractTeamCategory(homeTeam),
    awayCat: extractTeamCategory(awayTeam),
    homeNorm: homeTeam.toLowerCase().replace(/[^a-z0-9]/g, ''),
    awayNorm: awayTeam.toLowerCase().replace(/[^a-z0-9]/g, ''),
    targetMidday,
    targetDate,
    extractTeamCategory,
    areCategoriesCompatible
  };

  const candidates = events
    .map(e => evaluateSofaCandidate(e, candidateParams))
    .filter(Boolean);

  return selectBestSofaCandidate(candidates);
}

/**
 * Translate SofaScore raw statistics items into Predictix format.
 * If isReversed === true, inverts home and away for all statistics.
 * Never manufactures 0 from null or unparseable values.
 * @param {Array<object>} sofaStats
 * @param {boolean} [isReversed=false]
 * @returns {object|null}
 */
export function mapSofaStatsToPredictix(sofaStats, isReversed = false) {
  if (!sofaStats || !Array.isArray(sofaStats)) return null;

  const fullTime = sofaStats.find(s => s.period === 'ALL');
  const firstHalf = sofaStats.find(s => s.period === '1ST');

  const result = {
    possession: null, corners: null, shots: null, shots_on_target: null,
    fouls: null, yellow_cards: null, red_cards: null, offsides: null,
    first_half_corners: { home: null, away: null }
  };

  const findItem = (periodData, name) => periodData?.groups?.flatMap(g => g.statisticsItems || [])
    .find(i => i.name?.toLowerCase() === name.toLowerCase()) || null;

  const statItems = [
    ['possession', 'Ball possession'],
    ['corners', 'Corner kicks'],
    ['shots', 'Total shots'],
    ['shots_on_target', 'Shots on target'],
    ['fouls', 'Fouls'],
    ['yellow_cards', 'Yellow cards'],
    ['red_cards', 'Red cards'],
    ['offsides', 'Offsides']
  ];

  if (fullTime) {
    for (const [key, itemName] of statItems) {
      const item = findItem(fullTime, itemName);
      if (item) {
        const hVal = parseSofaValue(item.home);
        const aVal = parseSofaValue(item.away);
        if (hVal !== null && aVal !== null) result[key] = { home: hVal, away: aVal };
      }
    }
  }

  if (firstHalf) {
    const item1H = findItem(firstHalf, 'Corner kicks');
    if (item1H) {
      const hVal = parseSofaValue(item1H.home);
      const aVal = parseSofaValue(item1H.away);
      result.first_half_corners = { home: hVal, away: aVal };
    }
  }

  if (isReversed === true) {
    for (const [k] of statItems) {
      if (result[k]) result[k] = { home: result[k].away, away: result[k].home };
    }
    if (result.first_half_corners) {
      result.first_half_corners = {
        home: result.first_half_corners.away,
        away: result.first_half_corners.home
      };
    }
  }

  return result;
}
