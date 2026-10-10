import { parseFrenchDate } from './dateParser.js';
import { fuzzyMatch, teamSimilarity } from './textMatcher.js';

/**
 * Computes Levenshtein edit distance between two strings
 * @param {string} s1
 * @param {string} s2
 * @returns {number}
 */
export function levenshteinDistance(s1, s2) {
  if (s1 === s2) return 0;
  if (!s1) return s2 ? s2.length : 0;
  if (!s2) return s1.length;

  const len1 = s1.length;
  const len2 = s2.length;
  const d = [];

  for (let i = 0; i <= len1; i++) {
    d[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    d[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }

  return d[len1][len2];
}

/**
 * Computes normalized Levenshtein similarity between two strings in range [0.0, 1.0]
 * @param {string} s1
 * @param {string} s2
 * @returns {number}
 */
export function levenshteinSimilarity(s1, s2) {
  if (!s1 && !s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  if (s1 === s2) return 1.0;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;

  const dist = levenshteinDistance(s1, s2);
  return Math.max(0, 1.0 - dist / maxLen);
}

/**
 * Evaluates fuzzy matching and similarity score for a team pair, considering orientation
 * @param {string} homeTeam
 * @param {string} awayTeam
 * @param {string} sHome
 * @param {string} sAway
 * @param {boolean} directCatCompat
 * @param {boolean} revCatCompat
 * @returns {{ isReversed: boolean, teamSim: number }|null}
 */
export function scoreTeamSimilarity(homeTeam, awayTeam, sHome, sAway, directCatCompat, revCatCompat) {
  const directFuzzy = directCatCompat && fuzzyMatch(homeTeam, sHome) && fuzzyMatch(awayTeam, sAway);
  const revFuzzy = revCatCompat && fuzzyMatch(homeTeam, sAway) && fuzzyMatch(awayTeam, sHome);

  if (!directFuzzy && !revFuzzy) return null;

  const simDirectHome = teamSimilarity(homeTeam, sHome);
  const simDirectAway = teamSimilarity(awayTeam, sAway);
  const directSim = (simDirectHome + simDirectAway) / 2;

  const simRevHome = teamSimilarity(homeTeam, sAway);
  const simRevAway = teamSimilarity(awayTeam, sHome);
  const revSim = (simRevHome + simRevAway) / 2;

  let isReversed = false;
  let teamSim = 0;

  if (directFuzzy && (!revFuzzy || directSim >= revSim)) {
    isReversed = false;
    teamSim = directSim;
  } else if (revFuzzy) {
    isReversed = true;
    teamSim = revSim;
  } else {
    return null;
  }

  return { isReversed, teamSim };
}

/**
 * Computes date proximity score and validates timestamps
 * @param {object} e Candidate event
 * @param {number|null} targetMidday
 * @param {object} context
 * @returns {number|null} Date score or null if rejected
 */
export function scoreDateProximity(e, targetMidday, context) {
  const {
    homeNorm,
    awayNorm,
    sHomeNorm,
    sAwayNorm,
    isReversed,
    teamSim,
    targetDate,
    homeTeam,
    awayTeam,
    sHome,
    sAway
  } = context;

  if (targetMidday !== null) {
    if (e.startTimestamp && typeof e.startTimestamp === 'number' && e.startTimestamp > 0) {
      const eventTimeMs = e.startTimestamp * 1000;
      const diffHours = Math.abs(eventTimeMs - targetMidday) / (1000 * 60 * 60);
      if (diffHours > 24) return null;
      return Math.max(0.70, 1.0 - (diffHours / 24) * 0.20);
    } else {
      // Missing timestamp: do not bypass date validation
      const isExactDirect = (homeNorm === sHomeNorm && awayNorm === sAwayNorm);
      const isExactRev = (homeNorm === sAwayNorm && awayNorm === sHomeNorm);
      const isExactMatch = (!isReversed && isExactDirect) || (isReversed && isExactRev);

      if (!isExactMatch || teamSim < 0.95) {
        console.warn('[SofaScoreResolver] Rejet candidat ambigu/incertain: horodatage manquant avec date cible et similarité non-exacte (< 0.95)', {
          targetDate,
          homeTeam,
          awayTeam,
          sofaHome: sHome,
          sofaAway: sAway,
          teamSim
        });
        return null;
      }
      return 0.55;
    }
  }

  return (e.startTimestamp && e.startTimestamp > 0) ? 0.90 : 0.70;
}

/**
 * Computes competition and category compatibility score
 * @param {object} e Candidate event
 * @param {string} homeTeam
 * @param {string} awayTeam
 * @param {object} homeCat
 * @returns {number}
 */
export function scoreCompetitionCompatibility(e, homeTeam, awayTeam, homeCat) {
  let compScore = 1.0;
  if (e.tournament?.name) {
    const tourName = e.tournament.name.toLowerCase();
    if ((tourName.includes('friendly') || tourName.includes('amical') || tourName.includes('club friendly')) &&
        !homeTeam.toLowerCase().includes('friendly') && !awayTeam.toLowerCase().includes('friendly')) {
      compScore = 0.80;
    }
    if ((tourName.includes('reserve') || tourName.includes('u23') || tourName.includes('youth')) &&
        !homeCat.hasReserveTag && !homeCat.ageClass) {
      compScore = 0.75;
    }
  }
  return compScore;
}

/**
 * Evaluates candidate event with fuzzy matching, date scoring, and competition compatibility
 * @param {object} e Candidate event
 * @param {object} params Context and criteria
 * @returns {object|null}
 */
export function evaluateSofaCandidate(e, params) {
  const {
    homeTeam,
    awayTeam,
    homeCat,
    awayCat,
    homeNorm,
    awayNorm,
    targetMidday,
    targetDate,
    areCategoriesCompatible
  } = params;

  const sHome = e.homeTeam?.name;
  const sAway = e.awayTeam?.name;
  if (!sHome || !sAway) return null;

  const { extractTeamCategory } = params;
  const sofaHomeCat = extractTeamCategory(sHome);
  const sofaAwayCat = extractTeamCategory(sAway);

  const directCatCompat = areCategoriesCompatible(homeCat, sofaHomeCat) && areCategoriesCompatible(awayCat, sofaAwayCat);
  const revCatCompat = areCategoriesCompatible(homeCat, sofaAwayCat) && areCategoriesCompatible(awayCat, sofaHomeCat);

  if (!directCatCompat && !revCatCompat) return null;

  const teamScore = scoreTeamSimilarity(homeTeam, awayTeam, sHome, sAway, directCatCompat, revCatCompat);
  if (!teamScore) return null;

  const { isReversed, teamSim } = teamScore;
  const sHomeNorm = sHome.toLowerCase().replace(/[^a-z0-9]/g, '');
  const sAwayNorm = sAway.toLowerCase().replace(/[^a-z0-9]/g, '');

  const dateScore = scoreDateProximity(e, targetMidday, {
    homeNorm,
    awayNorm,
    sHomeNorm,
    sAwayNorm,
    isReversed,
    teamSim,
    targetDate,
    homeTeam,
    awayTeam,
    sHome,
    sAway
  });
  if (dateScore === null) return null;

  const compScore = scoreCompetitionCompatibility(e, homeTeam, awayTeam, homeCat);
  const confidence = (teamSim * 0.50) + (dateScore * 0.35) + (compScore * 0.15);

  return {
    eventId: e.id,
    id: e.id,
    isReversed,
    confidence,
    teamSim,
    dateScore,
    compScore
  };
}

/**
 * Normalizes variable search parameters for findSofaEventId
 */
export function normalizeEventSearchParams(targetDateOrHome, homeOrAway, maybeAway) {
  if (maybeAway !== undefined) {
    return { targetDate: targetDateOrHome, homeTeam: homeOrAway, awayTeam: maybeAway };
  }
  return { targetDate: null, homeTeam: targetDateOrHome, awayTeam: homeOrAway };
}

/**
 * Parses UTC midday timestamp for date comparison
 */
export function parseTargetMidday(targetDate) {
  if (!targetDate) return null;
  const parsed = parseFrenchDate(targetDate) || targetDate;
  if (typeof parsed === 'string') {
    const m = parsed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      return Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 12, 0, 0);
    }
  }
  return null;
}

/**
 * Ranks candidates, checks confidence thresholds and ambiguity margin
 */
export function selectBestSofaCandidate(candidates) {
  if (!candidates || candidates.length === 0) return null;

  candidates.sort((a, b) => b.confidence - a.confidence);
  const top = candidates[0];

  if (top.confidence < 0.70) {
    console.warn('[SofaScoreResolver] Rejet: score de confiance trop faible (confidence too low)', {
      eventId: top.eventId,
      confidence: top.confidence,
      minRequired: 0.70
    });
    return null;
  }

  if (candidates.length === 1) {
    return {
      eventId: top.eventId,
      id: top.id,
      isReversed: top.isReversed,
      confidence: top.confidence
    };
  }

  const second = candidates[1];
  const scoreDiff = Math.abs(top.confidence - second.confidence);

  if (scoreDiff < 0.10) {
    console.warn('[SofaScoreResolver] Rejet ambiguïté: plusieurs candidats proches trouvés', {
      topCandidate: { id: top.eventId, confidence: top.confidence },
      secondCandidate: { id: second.eventId, confidence: second.confidence },
      scoreDiff
    });
    return null;
  }

  return {
    eventId: top.eventId,
    id: top.id,
    isReversed: top.isReversed,
    confidence: top.confidence
  };
}
