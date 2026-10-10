import { getLeagueKey } from './predictionAverages.js';

/**
 * Extracts and computes basketball league averages (avgFGA, avgEFF) from historical matches.
 *
 * @param {Array<object>} basketHistorical
 * @returns {Record<string, { avgFGA: number, avgEFF: number }>}
 */
export function computeBasketballLeagueAverages(basketHistorical) {
  const basketballLeagueAverages = {};
  if (!Array.isArray(basketHistorical)) return basketballLeagueAverages;

  const groups = {};
  for (const m of basketHistorical) {
    let rawTour = m.tournament || '';
    if (m.home_team && rawTour.includes(m.home_team)) {
      const idx = rawTour.indexOf(m.home_team);
      rawTour = rawTour.substring(0, idx);
    }
    const key = getLeagueKey(rawTour);
    if (!key) continue;

    let stats = null;
    try {
      stats = typeof m.statistics_json === 'string' ? JSON.parse(m.statistics_json) : m.statistics_json;
    } catch (e) {}

    if (stats && stats.field_goals_attempted && stats.field_goals_attempted.home !== undefined && stats.field_goals_attempted.away !== undefined) {
      const homeFGA = parseFloat(stats.field_goals_attempted.home) || 0;
      const awayFGA = parseFloat(stats.field_goals_attempted.away) || 0;
      if (homeFGA > 0 && awayFGA > 0) {
        if (!groups[key]) {
          groups[key] = { fgaSum: 0, pointsSum: 0, count: 0 };
        }
        let homeScore = 0;
        let awayScore = 0;
        if (m.score) {
          const match = m.score.match(/(\d+)\s*[-:]\s*(\d+)/);
          if (match) {
            homeScore = parseFloat(match[1]) || 0;
            awayScore = parseFloat(match[2]) || 0;
          }
        }
        groups[key].fgaSum += (homeFGA + awayFGA);
        groups[key].pointsSum += (homeScore + awayScore);
        groups[key].count += 2;
      }
    }
  }

  for (const key in groups) {
    const g = groups[key];
    if (g.count >= 6) {
      basketballLeagueAverages[key] = {
        avgFGA: parseFloat((g.fgaSum / g.count).toFixed(2)),
        avgEFF: parseFloat((g.pointsSum / g.fgaSum).toFixed(4))
      };
    }
  }

  return basketballLeagueAverages;
}

/**
 * Extracts quarter points and half points from a basketball match's statistics or score string.
 *
 * @param {object} match
 * @returns {{ firstQuarter: { home: number|null, away: number|null }, firstHalf: { home: number|null, away: number|null }, fullTime: { home: number|null, away: number|null } }}
 */
export function extractBasketballQuarterAndHalvesStats(match) {
  const result = {
    firstQuarter: { home: null, away: null },
    firstHalf: { home: null, away: null },
    fullTime: { home: null, away: null }
  };

  if (!match) return result;

  if (match.statistics_json) {
    try {
      const stats = typeof match.statistics_json === 'string' ? JSON.parse(match.statistics_json) : match.statistics_json;
      if (stats) {
        if (stats.first_quarter_points) {
          result.firstQuarter.home = stats.first_quarter_points.home !== undefined ? parseFloat(stats.first_quarter_points.home) : null;
          result.firstQuarter.away = stats.first_quarter_points.away !== undefined ? parseFloat(stats.first_quarter_points.away) : null;
        }
        if (stats.first_half_points) {
          result.firstHalf.home = stats.first_half_points.home !== undefined ? parseFloat(stats.first_half_points.home) : null;
          result.firstHalf.away = stats.first_half_points.away !== undefined ? parseFloat(stats.first_half_points.away) : null;
        }
      }
    } catch (e) {}
  }

  if (match.score && typeof match.score === 'string') {
    const scoreMatch = match.score.match(/(\d+)\s*[-:]\s*(\d+)/);
    if (scoreMatch) {
      const hScore = parseFloat(scoreMatch[1]) || 0;
      const aScore = parseFloat(scoreMatch[2]) || 0;
      result.fullTime.home = hScore;
      result.fullTime.away = aScore;
      if (result.firstHalf.home === null && result.firstHalf.away === null) {
        result.firstHalf.home = parseFloat((hScore * 0.49).toFixed(1));
        result.firstHalf.away = parseFloat((aScore * 0.49).toFixed(1));
      }
    }
  }

  return result;
}

/**
 * Computes rolling points and pace for a basketball team across recent matches.
 *
 * @param {Array<object>} matches
 * @param {string} teamName
 * @param {number} [limit=10]
 * @returns {{ matchCount: number, pointsScoredAvg: number|null, pointsConcededAvg: number|null, firstHalfPointsAvg: number|null }}
 */
export function computeBasketballRollingPoints(matches, teamName, limit = 10) {
  if (!Array.isArray(matches) || matches.length === 0 || !teamName) {
    return { matchCount: 0, pointsScoredAvg: null, pointsConcededAvg: null, firstHalfPointsAvg: null };
  }

  const recent = matches.slice(0, limit);
  let scoredSum = 0;
  let concededSum = 0;
  let firstHalfSum = 0;
  let validCount = 0;

  for (const m of recent) {
    const isHome = m.home_team === teamName;
    const stats = extractBasketballQuarterAndHalvesStats(m);

    if (stats.fullTime.home !== null && stats.fullTime.away !== null) {
      scoredSum += isHome ? stats.fullTime.home : stats.fullTime.away;
      concededSum += isHome ? stats.fullTime.away : stats.fullTime.home;
      if (stats.firstHalf.home !== null && stats.firstHalf.away !== null) {
        firstHalfSum += isHome ? stats.firstHalf.home : stats.firstHalf.away;
      }
      validCount++;
    }
  }

  return {
    matchCount: validCount,
    pointsScoredAvg: validCount > 0 ? parseFloat((scoredSum / validCount).toFixed(1)) : null,
    pointsConcededAvg: validCount > 0 ? parseFloat((concededSum / validCount).toFixed(1)) : null,
    firstHalfPointsAvg: validCount > 0 ? parseFloat((firstHalfSum / validCount).toFixed(1)) : null
  };
}
