import {
  modelBasket1MT,
  modelBasket1QT,
  basketballLeagueAveragesCache,
  getEdgeModel,
  predictWithEdgeModel
} from './gbdtTrainer.js';

/**
 * Normalizes tournament strings into clean league keys for baseline matching
 */
export function normalizeBasketballLeagueKey(tournament) {
  if (!tournament) return '';
  return tournament.toLowerCase()
    .replace(/match en direct/g, '')
    .replace(/\(live score en direct\)/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Resolves baseline Pace (FGA) and Efficiency (EFF) for a given tournament
 */
export function resolveBasketballLeagueBaselines(tournament, basketballLeagueAverages = {}) {
  let leagueFGA = 70;
  let leagueEFF = 1.15;

  const primaryKey = normalizeBasketballLeagueKey(tournament);
  const baselines = (basketballLeagueAverages && Object.keys(basketballLeagueAverages).length > 0)
    ? basketballLeagueAverages
    : basketballLeagueAveragesCache;

  if (primaryKey && baselines) {
    const matchedKey = Object.keys(baselines).find(k => k.includes(primaryKey) || primaryKey.includes(k));
    if (matchedKey) {
      leagueFGA = baselines[matchedKey].avgFGA || 70;
      leagueEFF = baselines[matchedKey].avgEFF || 1.15;
    }
  }

  return { leagueFGA, leagueEFF };
}

/**
 * Parses field goals attempted stats from match json or defaults to league baseline
 */
export function parseBasketballStats(m, leagueFGA) {
  let homeFGA = leagueFGA;
  let awayFGA = leagueFGA;
  if (m && m.statistics_json) {
    try {
      const stats = typeof m.statistics_json === 'string' ? JSON.parse(m.statistics_json) : m.statistics_json;
      if (stats && stats.field_goals_attempted) {
        if (stats.field_goals_attempted.home !== undefined) homeFGA = parseFloat(stats.field_goals_attempted.home) || leagueFGA;
        if (stats.field_goals_attempted.away !== undefined) awayFGA = parseFloat(stats.field_goals_attempted.away) || leagueFGA;
      }
    } catch (e) {}
  }
  return { homeFGA, awayFGA };
}

/**
 * Extracts scores from match string e.g. "110 - 100"
 */
export function getBasketballMatchScores(m) {
  let homeScore = 0;
  let awayScore = 0;
  if (m && m.score) {
    const match = m.score.match(/(\d+)\s*-\s*(\d+)/);
    if (match) {
      homeScore = parseFloat(match[1]) || 0;
      awayScore = parseFloat(match[2]) || 0;
    }
  }
  return { homeScore, awayScore };
}

/**
 * Calculates rest days between current match and previous match
 */
export function getRestDays(curr, prev) {
  if (!prev || !prev.date || !curr.date) return 7;
  const diff = Math.abs(new Date(curr.date) - new Date(prev.date));
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return Math.min(14, days);
}

/**
 * Computes opponent baseline pace and ratings with regressed Bayesian shrinkage (K = 8)
 */
export function getOpponentBaselines(oppName, leagueFGA, leagueEFF, allTeamMatchesMap) {
  const oppMatches = (allTeamMatchesMap && allTeamMatchesMap.get(oppName)) || [];
  const recentMatches = oppMatches.slice(0, 10);
  let fgaSum = 0;
  let offPointsSum = 0;
  let defPointsSum = 0;
  let oppFgaSum = 0;
  let sumWeights = 0;
  let validMatches = 0;

  recentMatches.forEach((m, index) => {
    const { homeFGA, awayFGA } = parseBasketballStats(m, leagueFGA);
    const { homeScore, awayScore } = getBasketballMatchScores(m);
    if (homeScore === 0 && awayScore === 0) return;

    validMatches++;
    const weight = Math.pow(0.9, index);

    if (m.home_team === oppName) {
      fgaSum += homeFGA * weight;
      offPointsSum += homeScore * weight;
      defPointsSum += awayScore * weight;
      oppFgaSum += awayFGA * weight;
    } else {
      fgaSum += awayFGA * weight;
      offPointsSum += awayScore * weight;
      defPointsSum += homeScore * weight;
      oppFgaSum += homeFGA * weight;
    }
    sumWeights += weight;
  });

  const rawPace = validMatches > 0 ? (fgaSum / sumWeights) : leagueFGA;
  const rawOffEff = fgaSum > 0 ? (offPointsSum / fgaSum) : leagueEFF;
  const rawDefEff = oppFgaSum > 0 ? (defPointsSum / oppFgaSum) : leagueEFF;

  const K = 8;
  const weight = validMatches / (validMatches + K);
  const pace = weight * rawPace + (1 - weight) * leagueFGA;
  const offEff = weight * rawOffEff + (1 - weight) * leagueEFF;
  const defEff = weight * rawDefEff + (1 - weight) * leagueEFF;

  return { pace, offEff, defEff };
}

/**
 * Calculates team pace and offensive/defensive ratings over recent matches with exponential decay
 */
export function getBasketballTeamStats(matches, teamName, leagueFGA, leagueEFF, allTeamMatchesMap) {
  let fgaSum = 0;
  let offPointsSum = 0;
  let defPointsSum = 0;
  let oppFgaSum = 0;
  let sumWeights = 0;
  let validMatches = 0;

  matches.forEach((m, index) => {
    const { homeFGA, awayFGA } = parseBasketballStats(m, leagueFGA);
    const { homeScore, awayScore } = getBasketballMatchScores(m);
    if (homeScore === 0 && awayScore === 0) return;

    validMatches++;
    // Exponential time decay weight (most recent match weight = 1.0, then 0.9, 0.81, ...)
    const weight = Math.pow(0.9, index);

    const oppName = m.home_team === teamName ? m.away_team : m.home_team;
    const oppBaselines = getOpponentBaselines(oppName, leagueFGA, leagueEFF, allTeamMatchesMap);

    if (m.home_team === teamName) {
      fgaSum += homeFGA * weight;
      oppFgaSum += awayFGA * weight;

      const offScale = Math.max(0.5, Math.min(2.0, oppBaselines.defEff / leagueEFF));
      const defScale = Math.max(0.5, Math.min(2.0, oppBaselines.offEff / leagueEFF));

      offPointsSum += (homeScore / offScale) * weight;
      defPointsSum += (awayScore / defScale) * weight;
    } else {
      fgaSum += awayFGA * weight;
      oppFgaSum += homeFGA * weight;

      const offScale = Math.max(0.5, Math.min(2.0, oppBaselines.defEff / leagueEFF));
      const defScale = Math.max(0.5, Math.min(2.0, oppBaselines.offEff / leagueEFF));

      offPointsSum += (awayScore / offScale) * weight;
      defPointsSum += (homeScore / defScale) * weight;
    }
    sumWeights += weight;
  });

  const rawFGA = validMatches > 0 ? (fgaSum / sumWeights) : leagueFGA;
  const rawOffEff = fgaSum > 0 ? (offPointsSum / fgaSum) : leagueEFF;
  const rawDefEff = oppFgaSum > 0 ? (defPointsSum / oppFgaSum) : leagueEFF;

  const K = 8;
  const weight = validMatches / (validMatches + K);
  const avgFGA = weight * rawFGA + (1 - weight) * leagueFGA;
  const avgOffEff = weight * rawOffEff + (1 - weight) * leagueEFF;
  const avgDefEff = weight * rawDefEff + (1 - weight) * leagueEFF;

  return { avgFGA, avgOffEff, avgDefEff };
}

/**
 * Computes average first half points across H2H matches
 */
export function computeBasketballH2HFirstHalfPoints(h2hMatches, fallbackTotal) {
  let h2hSum = 0;
  let h2hCount = 0;
  for (const m of h2hMatches) {
    let firstHalfTotal = null;
    try {
      if (m.statistics_json) {
        const stats = typeof m.statistics_json === 'string' ? JSON.parse(m.statistics_json) : m.statistics_json;
        if (stats && stats.first_half_points && stats.first_half_points.home !== undefined && stats.first_half_points.away !== undefined) {
          firstHalfTotal = parseFloat(stats.first_half_points.home) + parseFloat(stats.first_half_points.away);
        }
      }
    } catch (e) {}
    if (firstHalfTotal === null && m.score) {
      const match = m.score.match(/(\d+)\s*-\s*(\d+)/);
      if (match) {
        firstHalfTotal = (parseFloat(match[1]) + parseFloat(match[2])) * 0.5;
      }
    }
    if (firstHalfTotal !== null) {
      h2hSum += firstHalfTotal;
      h2hCount++;
    }
  }
  return h2hCount > 0 ? (h2hSum / h2hCount) : fallbackTotal;
}

/**
 * Parses total points for a match (using first half stats or 49% of final score)
 */
export function parseBasketballTotalScore(m) {
  if (m && m.statistics_json) {
    try {
      const stats = typeof m.statistics_json === 'string' ? JSON.parse(m.statistics_json) : m.statistics_json;
      if (stats && stats.first_half_points && stats.first_half_points.home !== undefined && stats.first_half_points.away !== undefined) {
        return parseFloat(stats.first_half_points.home) + parseFloat(stats.first_half_points.away);
      }
    } catch (e) {}
  }
  if (!m || !m.score) return null;
  const match = m.score.match(/(\d+)\s*-\s*(\d+)/);
  if (match) {
    return (parseFloat(match[1]) + parseFloat(match[2])) * 0.49; // approx. 49% of final score
  }
  return null;
}

/**
 * Computes pace, efficiency, and expected quarter/half points using team stats and GBDT/Edge models.
 */
export function computeBasketballPaceAndTotals({
  row,
  homeMatches = [],
  awayMatches = [],
  basketballLeagueAverages = {},
  useGbdtModels = true,
  allTeamMatchesMap = null
}) {
  const { leagueFGA, leagueEFF } = resolveBasketballLeagueBaselines(row.tournament, basketballLeagueAverages);

  const homeStats = getBasketballTeamStats(homeMatches, row.home_team, leagueFGA, leagueEFF, allTeamMatchesMap);
  const awayStats = getBasketballTeamStats(awayMatches, row.away_team, leagueFGA, leagueEFF, allTeamMatchesMap);

  // Apply Home Court Advantage (HCA):
  // Home team plays 0.5% faster at home, away team plays 0.5% slower on road.
  const expectedPaceFull = ((homeStats.avgFGA * 1.005) + (awayStats.avgFGA * 0.995)) / 2;
  const expectedPace1stHalf = expectedPaceFull * 0.502;

  // Home team's offensive rating is +1% at home, away team's is -1% on road.
  // Home team's defensive rating is -1% (better defense), away team's is +1% (weaker defense).
  const expectedEffHome = (homeStats.avgOffEff * 1.01) * ((awayStats.avgDefEff * 1.01) / leagueEFF);
  const expectedEffAway = (awayStats.avgOffEff * 0.99) * ((homeStats.avgDefEff * 0.99) / leagueEFF);

  const lastHomeMatch = homeMatches[0];
  const lastAwayMatch = awayMatches[0];

  const homeRestDays = getRestDays(row, lastHomeMatch);
  const awayRestDays = getRestDays(row, lastAwayMatch);
  const restDifference = homeRestDays - awayRestDays;

  let home_proj_1mt = expectedPace1stHalf * expectedEffHome;
  let away_proj_1mt = expectedPace1stHalf * expectedEffAway;
  let home_avg_first_half_points = home_proj_1mt;
  let away_avg_first_half_points = away_proj_1mt;

  if (useGbdtModels) {
    try {
      let basket1MTExpected = null;
      if (typeof getEdgeModel === 'function' && getEdgeModel('basketball_points_1mt') && typeof predictWithEdgeModel === 'function') {
        const pred = predictWithEdgeModel('basketball_points_1mt', row);
        if (typeof pred === 'number' && !isNaN(pred) && pred > 0) basket1MTExpected = pred;
      } else if (modelBasket1MT && typeof modelBasket1MT.predictRow === 'function') {
        const X1MT = {
          home_projected: home_proj_1mt,
          away_projected: away_proj_1mt,
          sum_projected: home_proj_1mt + away_proj_1mt,
          home_rest_days: homeRestDays,
          away_rest_days: awayRestDays,
          rest_difference: restDifference
        };
        basket1MTExpected = modelBasket1MT.predictRow(X1MT);
      }

      if (basket1MTExpected !== null && !isNaN(basket1MTExpected) && basket1MTExpected > 0) {
        const splitRatio = home_proj_1mt / (home_proj_1mt + away_proj_1mt || 1);
        home_avg_first_half_points = basket1MTExpected * splitRatio;
        away_avg_first_half_points = basket1MTExpected * (1 - splitRatio);
      }
    } catch (e) {
      home_avg_first_half_points = home_proj_1mt;
      away_avg_first_half_points = away_proj_1mt;
    }
  }

  const expectedPace1stQuarter = expectedPaceFull * 0.254;
  let home_proj_1qt = expectedPace1stQuarter * expectedEffHome;
  let away_proj_1qt = expectedPace1stQuarter * expectedEffAway;
  let home_avg_first_quarter_points = home_proj_1qt;
  let away_avg_first_quarter_points = away_proj_1qt;

  if (useGbdtModels) {
    try {
      let basket1QTExpected = null;
      if (typeof getEdgeModel === 'function' && getEdgeModel('basketball_points_1qt') && typeof predictWithEdgeModel === 'function') {
        const pred = predictWithEdgeModel('basketball_points_1qt', row);
        if (typeof pred === 'number' && !isNaN(pred) && pred > 0) basket1QTExpected = pred;
      } else if (modelBasket1QT && typeof modelBasket1QT.predictRow === 'function') {
        const X1QT = {
          home_projected: home_proj_1qt,
          away_projected: away_proj_1qt,
          sum_projected: home_proj_1qt + away_proj_1qt,
          home_rest_days: homeRestDays,
          away_rest_days: awayRestDays,
          rest_difference: restDifference
        };
        basket1QTExpected = modelBasket1QT.predictRow(X1QT);
      }

      if (basket1QTExpected !== null && !isNaN(basket1QTExpected) && basket1QTExpected > 0) {
        const splitRatioQT = home_proj_1qt / (home_proj_1qt + away_proj_1qt || 1);
        home_avg_first_quarter_points = basket1QTExpected * splitRatioQT;
        away_avg_first_quarter_points = basket1QTExpected * (1 - splitRatioQT);
      }
    } catch (e) {}
  }

  return {
    home_avg_first_half_points,
    away_avg_first_half_points,
    home_avg_first_quarter_points,
    away_avg_first_quarter_points,
    expectedPaceFull,
    expectedPace1stHalf,
    expectedPace1stQuarter,
    leagueFGA,
    leagueEFF
  };
}
