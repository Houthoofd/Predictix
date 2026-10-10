/**
 * Sports Feature Extractor Coordinator
 *
 * Coordinates football and basketball domain feature extractions and Bayesian calibration deltas.
 */

import {
  calculateCornerAverages,
  computeFootballRollingStats,
  computeFootballGoalTotals,
  computeGbdtCornerPredictions
} from './footballFeatureExtractor.js';

import {
  computeBasketballLeagueAverages,
  extractBasketballQuarterAndHalvesStats,
  computeBasketballRollingPoints
} from './basketballFeatureExtractor.js';

// Re-export football feature computation utilities
export {
  calculateCornerAverages,
  computeFootballRollingStats,
  computeFootballGoalTotals,
  computeGbdtCornerPredictions
};

// Re-export basketball feature computation utilities
export {
  computeBasketballLeagueAverages,
  extractBasketballQuarterAndHalvesStats,
  computeBasketballRollingPoints
};

/**
 * Calculates Bayesian sports calibration deltas across finished matches.
 *
 * @param {function} dbQueryFn Database query executor
 * @returns {Promise<{ football: number, basketball: number, other: number }>}
 */
export async function getSportsCalibrationDeltas(dbQueryFn) {
  const deltas = {
    football: 0,
    basketball: 0,
    other: 0
  };
  try {
    const rows = await dbQueryFn(`
      SELECT sport, best_tip, card_line, probability, score, first_half_corners_home, first_half_corners_away, statistics_json, scraped_at
      FROM scraped_predictions 
      WHERE is_finished = 1 
        AND best_tip IS NOT NULL 
        AND card_line IS NOT NULL 
        AND probability IS NOT NULL
    `);
    
    const stats = {
      football: { total: 0, won: 0, sumProb: 0 },
      basketball: { total: 0, won: 0, sumProb: 0 },
      other: { total: 0, won: 0, sumProb: 0 }
    };

    for (const m of rows) {
      const sport = (m.sport || 'football').toLowerCase().trim();
      
      // Filter out old basketball matches that used the empirical frequency model
      if (sport === 'basketball' && m.scraped_at && m.scraped_at < '2026-06-14 14:15:00') {
        continue;
      }

      const groupKey = sport === 'football' ? 'football' : (sport === 'basketball' ? 'basketball' : 'other');

      const lineMatch = m.card_line.match(/^(\d+(?:\.\d+)?)/);
      if (!lineMatch) continue;
      const lineVal = parseFloat(lineMatch[1]);

      let actualTotal = null;

      if (sport === 'football') {
        if (m.first_half_corners_home !== null && m.first_half_corners_away !== null) {
          actualTotal = m.first_half_corners_home + m.first_half_corners_away;
        }
      } else if (sport === 'basketball') {
        if (lineVal < 120) {
          try {
            const s = typeof m.statistics_json === 'string' ? JSON.parse(m.statistics_json) : m.statistics_json;
            if (s && s.first_half_points && s.first_half_points.home !== undefined) {
              actualTotal = parseFloat(s.first_half_points.home) + parseFloat(s.first_half_points.away);
            }
          } catch (e) {}
          if (actualTotal === null && m.score) {
            const match = m.score.match(/(\d+)\s*[-:]\s*(\d+)/);
            if (match) {
              actualTotal = (parseFloat(match[1]) + parseFloat(match[2])) * 0.49;
            }
          }
        } else {
          if (m.score) {
            const match = m.score.match(/(\d+)\s*[-:]\s*(\d+)/);
            if (match) {
              actualTotal = parseFloat(match[1]) + parseFloat(match[2]);
            }
          }
        }
      } else {
        if (m.score) {
          const match = m.score.match(/(\d+)\s*[-:]\s*(\d+)/);
          if (match) {
            actualTotal = parseFloat(match[1]) + parseFloat(match[2]);
          }
        }
      }

      if (actualTotal === null) continue;

      const cleanTip = m.best_tip.toLowerCase().trim();
      const isOver = cleanTip.includes('plus') || cleanTip.includes('over');
      let won = false;

      if (isOver) {
        won = actualTotal > lineVal;
      } else {
        won = actualTotal < lineVal;
      }

      const probVal = parseFloat(m.probability.replace('%', '')) / 100;

      stats[groupKey].total++;
      stats[groupKey].sumProb += probVal;
      if (won) {
        stats[groupKey].won++;
      }
    }

    const k = 20; // Bayesian smoothing constant
    for (const key of ['football', 'basketball', 'other']) {
      const s = stats[key];
      if (s.total > 0) {
        deltas[key] = (s.won - s.sumProb) / (s.total + k);
      }
    }
  } catch (err) {
    console.warn("[Calibration Engine] Error calculating sports calibration deltas:", err.message);
  }
  return deltas;
}
