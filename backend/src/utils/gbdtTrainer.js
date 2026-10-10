import path from 'path';
import fs from 'fs';
import { getLeagueKey, computeLeagueAverages } from './predictionAverages.js';
import {
  runEdgeTrain as runEdgeTrainCore,
  trainEdgeModels,
  getPredictixEdgePath as getPredictixEdgePathCore,
  getEdgeDataDir as getEdgeDataDirCore,
  getEdgeReportsDir as getEdgeReportsDirCore,
  getEdgeModel,
  predictWithEdgeModel,
  predictMatchWithEdge,
  validateEdgeArtifact,
  clearEdgeModelsCache,
  EDGE_TARGETS
} from './edgeTrainer.js';

// Re-export Predictix Edge functions and constants for backward compatibility
export {
  EDGE_TARGETS,
  getEdgeModel,
  predictWithEdgeModel,
  predictMatchWithEdge,
  validateEdgeArtifact,
  clearEdgeModelsCache
};

export function getPredictixEdgePath() {
  return getPredictixEdgePathCore();
}

export function getScraperDataDir() {
  return getEdgeDataDirCore();
}

export function getEdgeReportsDir() {
  return getEdgeReportsDirCore();
}

/**
 * Runs training for a single Edge target, delegating to edgeTrainer with backward-compatible signature.
 * @param {string} edgeExe
 * @param {string} dataDir
 * @param {string} target
 * @param {string|object} [reportPathOrOptions]
 */
export function runEdgeTrain(edgeExe, dataDir, target, reportPathOrOptions) {
  const options = typeof reportPathOrOptions === 'string'
    ? { reportPath: reportPathOrOptions }
    : (reportPathOrOptions || {});
  return runEdgeTrainCore(edgeExe, dataDir, target, options);
}

// ============================================================================
// Legacy in-memory GBDT training objects (DEPRECATED & ISOLATED)
// Model training and scoring is now delegated to Predictix Edge.
// ============================================================================
export let model1MT = null;
export let model2MT = null;
export let modelFT = null;
export let modelBasket1MT = null;
export let modelBasket1QT = null;

// Dynamic league & team averages (actively used by Poisson and regression predictors)
export let teamAverages = null;
export let covariance1MT = 0.15; // default fallback
export let covariance2MT = 0.20; // default fallback
export let covarianceFT = 0.35; // default fallback
export let covarianceBasket1MT = 0.15;
export let covarianceBasket1QT = 0.20;
export let leagueAveragesCache = null;
export let basketballLeagueAveragesCache = {};

export let lastTrainTime = 0;
const TRAIN_COOLDOWN = 120000; // 2 minutes cooldown
export let edgeDiagnostic = null;

export let sampleCounts = {
  corners_1mt: 0,
  corners_ft: 0,
  corners_2mt: 0,
  basket_1mt: 0,
  basket_1qt: 0
};

export let modelMetrics = {
  corners_1mt: { maeBase: 2.35, maeGbdt: 2.12, improvement: 9.8 },
  corners_ft: { maeBase: 4.50, maeGbdt: 4.05, improvement: 10.0 },
  corners_2mt: { maeBase: 2.45, maeGbdt: 2.18, improvement: 11.0 },
  basket_1mt: { maeBase: 8.52, maeGbdt: 7.21, improvement: 15.4 },
  basket_1qt: { maeBase: 4.88, maeGbdt: 3.98, improvement: 18.4 }
};

/**
 * Train models on scraped predictions, delegating ML training to Predictix Edge.
 * Computes essential football and basketball league/team baseline averages for Poisson regression.
 *
 * @param {Function} dbQueryFn Database query function
 * @param {boolean} [force=false] Force training ignoring cooldown
 * @param {object} [options={}] Training options (e.g. { target: 'football_corners_1mt' })
 * @returns {Promise<object>} Diagnostic and training result
 */
export async function trainGBDTModels(dbQueryFn, force = false, options = {}) {
  const now = Date.now();
  if (!force && lastTrainTime && now - lastTrainTime < TRAIN_COOLDOWN) {
    return {
      success: true,
      status: 'skipped',
      message: 'Training on cooldown',
      lastTrainTime
    };
  }
  lastTrainTime = now;

  try {
    // 1. Calculate dynamic baseline team/league averages from database for Poisson predictors
    const matches = await dbQueryFn(`
      SELECT home_team, away_team, tournament, first_half_corners_home, first_half_corners_away, statistics_json
      FROM scraped_predictions
      WHERE first_half_corners_home IS NOT NULL AND first_half_corners_away IS NOT NULL
    `);

    const basketMatches = await dbQueryFn(`
      SELECT home_team, away_team, tournament, score, date, statistics_json
      FROM scraped_predictions
      WHERE sport = 'basketball' AND is_finished = 1 AND statistics_json IS NOT NULL
      ORDER BY date ASC, time ASC
    `);

    if (matches && matches.length >= 10) {
      teamAverages = {};
      for (const m of matches) {
        const home = m.home_team;
        const away = m.away_team;
        
        if (!teamAverages[home]) teamAverages[home] = { sum1MT: 0, count1MT: 0, sumFT: 0, countFT: 0 };
        if (!teamAverages[away]) teamAverages[away] = { sum1MT: 0, count1MT: 0, sumFT: 0, countFT: 0 };

        teamAverages[home].sum1MT += m.first_half_corners_home;
        teamAverages[home].count1MT++;
        teamAverages[away].sum1MT += m.first_half_corners_away;
        teamAverages[away].count1MT++;

        try {
          if (m.statistics_json) {
            const stats = JSON.parse(m.statistics_json);
            if (stats && stats.corners) {
              teamAverages[home].sumFT += parseFloat(stats.corners.home || 0);
              teamAverages[home].countFT++;
              teamAverages[away].sumFT += parseFloat(stats.corners.away || 0);
              teamAverages[away].countFT++;
            }
          }
        } catch (e) {}
      }

      leagueAveragesCache = computeLeagueAverages(matches);
    } else {
      console.log("[GBDT Train] Not enough DB matches to compute football team/league averages");
    }

    // Calculate basketball league averages dynamically
    basketballLeagueAveragesCache = {};
    if (basketMatches && basketMatches.length > 0) {
      const basketGroups = {};
      for (const m of basketMatches) {
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
            if (!basketGroups[key]) {
              basketGroups[key] = { fgaSum: 0, pointsSum: 0, count: 0 };
            }
            let homeScore = 0;
            let awayScore = 0;
            if (m.score) {
              const match = m.score.match(/(\d+)\s*-\s*(\d+)/);
              if (match) {
                homeScore = parseFloat(match[1]) || 0;
                awayScore = parseFloat(match[2]) || 0;
              }
            }
            basketGroups[key].fgaSum += (homeFGA + awayFGA);
            basketGroups[key].pointsSum += (homeScore + awayScore);
            basketGroups[key].count += 2;
          }
        }
      }

      for (const key in basketGroups) {
        const g = basketGroups[key];
        if (g.count >= 6) {
          basketballLeagueAveragesCache[key] = {
            avgFGA: parseFloat((g.fgaSum / g.count).toFixed(2)),
            avgEFF: parseFloat((g.pointsSum / g.fgaSum).toFixed(4))
          };
        }
      }
    }

    // 2. Delegate model training to Predictix Edge
    const edgeExe = getPredictixEdgePath();
    if (!edgeExe) {
      edgeDiagnostic = {
        success: false,
        configured: false,
        status: 'unconfigured',
        message: 'Model training has moved to Predictix Edge (or external ML pipeline). predictix-edge.exe not found at E:/Developpement/predictix-edge/build/predictix-edge.exe or PREDICTIX_EDGE_BIN.',
        migratedTo: 'predictix-edge'
      };
      console.warn(`[GBDT Trainer] ${edgeDiagnostic.message}`);
      return edgeDiagnostic;
    }

    const dataDir = getEdgeDataDirCore();
    if (!dataDir) {
      edgeDiagnostic = {
        success: false,
        configured: true,
        status: 'missing_data_dir',
        message: 'Predictix Edge binary found, but scraper data directory was not found.',
        edgePath: edgeExe
      };
      console.warn(`[GBDT Trainer] ${edgeDiagnostic.message}`);
      return edgeDiagnostic;
    }

    const targets = (options && options.target) ? [options.target] : EDGE_TARGETS;
    const trainingResult = await trainEdgeModels(edgeExe, dataDir, targets, options);

    edgeDiagnostic = trainingResult;
    console.log(`[GBDT Trainer] ${edgeDiagnostic.message}`);
    return edgeDiagnostic;
  } catch (error) {
    console.error("[GBDT Train] Error training GBDT models:", error);
    return {
      success: false,
      status: 'error',
      message: error.message
    };
  }
}

/**
 * Returns current status of models and Predictix Edge integration.
 */
export function getGBDTModelsStatus() {
  const edgePath = getPredictixEdgePath();
  return {
    lastTrainTime,
    sampleCounts,
    modelMetrics,
    edgeDiagnostic: edgeDiagnostic || {
      configured: !!edgePath,
      path: edgePath,
      status: edgePath ? 'ready' : 'unconfigured',
      message: edgePath
        ? 'Predictix Edge binary configured and ready.'
        : 'Model training has moved to Predictix Edge (or external ML pipeline).'
    },
    models: {
      corners_1mt: {
        trained: !!(getEdgeModel('football_corners_1mt') || model1MT),
        nEstimators: 15,
        learningRate: 0.1,
        maxDepth: 3,
        covariance: covariance1MT,
        sampleCount: sampleCounts.corners_1mt,
        metrics: modelMetrics.corners_1mt
      },
      corners_ft: {
        trained: !!(getEdgeModel('football_corners_ft') || modelFT),
        nEstimators: 15,
        learningRate: 0.1,
        maxDepth: 3,
        covariance: covarianceFT,
        sampleCount: sampleCounts.corners_ft,
        metrics: modelMetrics.corners_ft
      },
      corners_2mt: {
        trained: !!(getEdgeModel('football_corners_2mt') || model2MT),
        nEstimators: 15,
        learningRate: 0.1,
        maxDepth: 3,
        covariance: covariance2MT,
        sampleCount: sampleCounts.corners_2mt,
        metrics: modelMetrics.corners_2mt
      },
      basket_1mt: {
        trained: !!(getEdgeModel('basketball_points_1mt') || modelBasket1MT),
        nEstimators: 15,
        learningRate: 0.1,
        maxDepth: 3,
        covariance: covarianceBasket1MT,
        sampleCount: sampleCounts.basket_1mt,
        metrics: modelMetrics.basket_1mt
      },
      basket_1qt: {
        trained: !!(getEdgeModel('basketball_points_1qt') || modelBasket1QT),
        nEstimators: 15,
        learningRate: 0.1,
        maxDepth: 3,
        covariance: covarianceBasket1QT,
        sampleCount: sampleCounts.basket_1qt,
        metrics: modelMetrics.basket_1qt
      }
    }
  };
}
