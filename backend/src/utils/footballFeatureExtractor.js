import { bivariatePoissonOver } from './gradientBoosting.js';
import { 
  model1MT, 
  model2MT, 
  modelFT, 
  teamAverages, 
  covariance1MT, 
  covariance2MT, 
  covarianceFT, 
  leagueAveragesCache 
} from './gbdtTrainer.js';
import { 
  getEdgeModel, 
  predictWithEdgeModel 
} from './edgeTrainer.js';
import { getLeagueKey } from './predictionAverages.js';

/**
 * Computes historical corner averages for H2H, home, and away confrontations.
 *
 * @param {Array<object>} h2hMatches
 * @param {Array<object>} homeMatches
 * @param {Array<object>} awayMatches
 * @param {object} row Current match row
 * @returns {{ h2hAvg: number|null, homeAvg: number|null, awayAvg: number|null }}
 */
export function calculateCornerAverages(h2hMatches, homeMatches, awayMatches, row) {
  let h2hSum = 0;
  let h2hCount = 0;
  for (const m of h2hMatches) {
    if (m.first_half_corners_home !== null && m.first_half_corners_away !== null &&
        m.first_half_corners_home !== undefined && m.first_half_corners_away !== undefined) {
      h2hSum += (m.first_half_corners_home + m.first_half_corners_away);
      h2hCount++;
    }
  }
  const h2hAvg = h2hCount > 0 ? parseFloat((h2hSum / h2hCount).toFixed(1)) : null;

  let homeSum = 0;
  let homeCount = 0;
  for (const m of homeMatches) {
    const corners = m.home_team === row.home_team ? m.first_half_corners_home : m.first_half_corners_away;
    if (corners !== null && corners !== undefined) {
      homeSum += corners;
      homeCount++;
    }
  }
  const homeAvg = homeCount > 0 ? parseFloat((homeSum / homeCount).toFixed(1)) : null;

  let awaySum = 0;
  let awayCount = 0;
  for (const m of awayMatches) {
    const corners = m.home_team === row.away_team ? m.first_half_corners_home : m.first_half_corners_away;
    if (corners !== null && corners !== undefined) {
      awaySum += corners;
      awayCount++;
    }
  }
  const awayAvg = awayCount > 0 ? parseFloat((awaySum / awayCount).toFixed(1)) : null;

  return { h2hAvg, homeAvg, awayAvg };
}

/**
 * Computes rolling corner and goal metrics for a specific football team across recent matches.
 *
 * @param {Array<object>} matches
 * @param {string} teamName
 * @param {number} [limit=10]
 * @returns {{ matchCount: number, cornersScoredAvg: number|null, cornersConcededAvg: number|null, goalsAvg: number|null }}
 */
export function computeFootballRollingStats(matches, teamName, limit = 10) {
  if (!Array.isArray(matches) || matches.length === 0 || !teamName) {
    return { matchCount: 0, cornersScoredAvg: null, cornersConcededAvg: null, goalsAvg: null };
  }

  const recent = matches.slice(0, limit);
  let cornersScoredSum = 0;
  let cornersConcededSum = 0;
  let cornerMatchesCount = 0;
  let goalsSum = 0;
  let goalMatchesCount = 0;

  for (const m of recent) {
    const isHome = m.home_team === teamName;
    const cHome = m.first_half_corners_home;
    const cAway = m.first_half_corners_away;

    if (cHome !== null && cHome !== undefined && cAway !== null && cAway !== undefined) {
      cornersScoredSum += isHome ? cHome : cAway;
      cornersConcededSum += isHome ? cAway : cHome;
      cornerMatchesCount++;
    }

    if (m.score && typeof m.score === 'string') {
      const match = m.score.match(/(\d+)\s*[-:]\s*(\d+)/);
      if (match) {
        const homeGoals = parseFloat(match[1]) || 0;
        const awayGoals = parseFloat(match[2]) || 0;
        goalsSum += isHome ? homeGoals : awayGoals;
        goalMatchesCount++;
      }
    }
  }

  return {
    matchCount: recent.length,
    cornersScoredAvg: cornerMatchesCount > 0 ? parseFloat((cornersScoredSum / cornerMatchesCount).toFixed(2)) : null,
    cornersConcededAvg: cornerMatchesCount > 0 ? parseFloat((cornersConcededSum / cornerMatchesCount).toFixed(2)) : null,
    goalsAvg: goalMatchesCount > 0 ? parseFloat((goalsSum / goalMatchesCount).toFixed(2)) : null
  };
}

/**
 * Computes goal totals and distribution over historical football matches.
 *
 * @param {Array<object>} matches
 * @returns {{ totalMatches: number, over25Count: number, over25Rate: number, avgTotalGoals: number|null }}
 */
export function computeFootballGoalTotals(matches) {
  if (!Array.isArray(matches) || matches.length === 0) {
    return { totalMatches: 0, over25Count: 0, over25Rate: 0, avgTotalGoals: null };
  }

  let totalGoalsSum = 0;
  let validMatches = 0;
  let over25Count = 0;

  for (const m of matches) {
    if (m && m.score && typeof m.score === 'string') {
      const match = m.score.match(/(\d+)\s*[-:]\s*(\d+)/);
      if (match) {
        const hg = parseFloat(match[1]) || 0;
        const ag = parseFloat(match[2]) || 0;
        const sum = hg + ag;
        totalGoalsSum += sum;
        if (sum > 2.5) over25Count++;
        validMatches++;
      }
    }
  }

  return {
    totalMatches: validMatches,
    over25Count,
    over25Rate: validMatches > 0 ? parseFloat((over25Count / validMatches).toFixed(3)) : 0,
    avgTotalGoals: validMatches > 0 ? parseFloat((totalGoalsSum / validMatches).toFixed(2)) : null
  };
}

/**
 * Computes GBDT predictions using Predictix Edge models or legacy models,
 * then derives bivariate Poisson metrics for 1st half, 2nd half, and full time.
 *
 * @param {object} row Match row
 * @param {number} lambda1MT Poisson baseline lambda
 * @param {number} homeRegressed Home regressed corner average
 * @param {number} awayRegressed Away regressed corner average
 * @param {boolean} [useGbdtModels=true]
 * @returns {object} Formatted gbdt_predictions payload
 */
export function computeGbdtCornerPredictions(row, lambda1MT, homeRegressed, awayRegressed, useGbdtModels = true) {
  let gbdt1MTExpected = lambda1MT;
  let gbdt2MTExpected = lambda1MT * 1.15;
  let gbdtFTExpected = lambda1MT * 2.15;
  let modelUsed = false;

  if (useGbdtModels) {
    try {
      // 1. Prioritize Predictix Edge candidate models (linear ridge weights / edge artifacts)
      const edgeTargets = [
        { target: 'football_corners_1mt', setExp: (v) => { gbdt1MTExpected = v; } },
        { target: 'football_corners_ft', setExp: (v) => { gbdtFTExpected = v; } },
        { target: 'football_corners_2mt', setExp: (v) => { gbdt2MTExpected = v; } }
      ];

      for (const { target, setExp } of edgeTargets) {
        const edgeModel = typeof getEdgeModel === 'function' ? getEdgeModel(target) : null;
        if (edgeModel && typeof predictWithEdgeModel === 'function') {
          try {
            const pred = predictWithEdgeModel(target, row);
            if (typeof pred === 'number' && Number.isFinite(pred) && pred > 0) {
              setExp(pred);
              modelUsed = true;
            }
          } catch (edgeErr) {
            console.warn(`[PredictionEngine] Edge prediction rejected for ${target}: ${edgeErr.message}. Falling back to Poisson regression.`);
          }
        }
      }

      // 2. Fallback to legacy in-memory GBDT models if Edge model was not used
      if (!modelUsed && model1MT && teamAverages) {
        const home = row.home_team;
        const away = row.away_team;
        const homeAvg1MT = teamAverages[home]?.count1MT > 0 ? (teamAverages[home].sum1MT / teamAverages[home].count1MT) : 2.2;
        const awayAvg1MT = teamAverages[away]?.count1MT > 0 ? (teamAverages[away].sum1MT / teamAverages[away].count1MT) : 2.0;

        const leagueKey = getLeagueKey(row.tournament);
        const league1MTHome = leagueAveragesCache?.[leagueKey]?.home || 2.2;
        const league1MTAway = leagueAveragesCache?.[leagueKey]?.away || 2.0;

        const feats1MT = {
          home_avg: homeAvg1MT,
          away_avg: awayAvg1MT,
          league_home: league1MTHome,
          league_away: league1MTAway,
          sum_avg: homeAvg1MT + awayAvg1MT
        };
        if (typeof model1MT.predictRow === 'function') {
          gbdt1MTExpected = model1MT.predictRow(feats1MT);
          modelUsed = true;
        }

        if (modelFT && model2MT && typeof modelFT.predictRow === 'function' && typeof model2MT.predictRow === 'function') {
          const homeAvgFT = teamAverages[home]?.countFT > 0 ? (teamAverages[home].sumFT / teamAverages[home].countFT) : 4.8;
          const awayAvgFT = teamAverages[away]?.countFT > 0 ? (teamAverages[away].sumFT / teamAverages[away].countFT) : 4.4;
          const featsFT = {
            home_avg_1mt: homeAvg1MT,
            away_avg_1mt: awayAvg1MT,
            home_avg_ft: homeAvgFT,
            away_avg_ft: awayAvgFT,
            league_home: league1MTHome,
            league_away: league1MTAway,
            sum_avg: homeAvgFT + awayAvgFT
          };
          gbdtFTExpected = modelFT.predictRow(featsFT);
          gbdt2MTExpected = model2MT.predictRow(featsFT);
        }
      }
    } catch (err) {
      console.warn('[Prediction Engine] GBDT prediction failed, using Poisson regression fallback:', err.message);
      gbdt1MTExpected = lambda1MT;
      gbdt2MTExpected = lambda1MT * 1.15;
      gbdtFTExpected = lambda1MT * 2.15;
      modelUsed = false;
    }
  }

  const splitRatio = homeRegressed / (homeRegressed + awayRegressed || 1);
  const gbdt1MTExpectedHome = gbdt1MTExpected * splitRatio;
  const gbdt1MTExpectedAway = gbdt1MTExpected * (1 - splitRatio);

  const gbdtFTExpectedHome = gbdtFTExpected * splitRatio;
  const gbdtFTExpectedAway = gbdtFTExpected * (1 - splitRatio);

  const gbdt2MTExpectedHome = gbdt2MTExpected * splitRatio;
  const gbdt2MTExpectedAway = gbdt2MTExpected * (1 - splitRatio);

  const safeCov1MT = covariance1MT !== undefined && covariance1MT !== null ? covariance1MT : 0.15;
  const safeCov2MT = covariance2MT !== undefined && covariance2MT !== null ? covariance2MT : 0.20;
  const safeCovFT = covarianceFT !== undefined && covarianceFT !== null ? covarianceFT : 0.35;

  const bp1MTOver4_5 = Math.round(bivariatePoissonOver(gbdt1MTExpectedHome, gbdt1MTExpectedAway, safeCov1MT, 4.5) * 100);
  const bp2MTOver4_5 = Math.round(bivariatePoissonOver(gbdt2MTExpectedHome, gbdt2MTExpectedAway, safeCov2MT, 4.5) * 100);
  const bpFTOver9_5 = Math.round(bivariatePoissonOver(gbdtFTExpectedHome, gbdtFTExpectedAway, safeCovFT, 9.5) * 100);

  return {
    is_trained: modelUsed || !!(model1MT || modelFT || model2MT),
    first_half: {
      expected: parseFloat(gbdt1MTExpected.toFixed(2)),
      home_expected: parseFloat(gbdt1MTExpectedHome.toFixed(2)),
      away_expected: parseFloat(gbdt1MTExpectedAway.toFixed(2)),
      covariance: parseFloat(safeCov1MT.toFixed(4)),
      over_4_5_prob: bp1MTOver4_5
    },
    second_half: {
      expected: parseFloat(gbdt2MTExpected.toFixed(2)),
      home_expected: parseFloat(gbdt2MTExpectedHome.toFixed(2)),
      away_expected: parseFloat(gbdt2MTExpectedAway.toFixed(2)),
      covariance: parseFloat(safeCov2MT.toFixed(4)),
      over_4_5_prob: bp2MTOver4_5
    },
    full_time: {
      expected: parseFloat(gbdtFTExpected.toFixed(2)),
      home_expected: parseFloat(gbdtFTExpectedHome.toFixed(2)),
      away_expected: parseFloat(gbdtFTExpectedAway.toFixed(2)),
      covariance: parseFloat(safeCovFT.toFixed(4)),
      over_9_5_prob: bpFTOver9_5
    }
  };
}
