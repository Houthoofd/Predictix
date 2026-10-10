import { poissonOver, poissonUnder } from './poisson.js';
import { projectFirstHalfOdds } from './oddsProjector.js';

/**
 * Calculates Over/Under Poisson probabilities with Bayesian calibration delta applied.
 *
 * @param {number} lambda Expected event rate
 * @param {number} targetLine Line to evaluate (e.g., 4.5)
 * @param {number} [calibrationDelta=0] Calibration delta to apply to the dominant probability
 * @returns {{ overProb: number, underProb: number }}
 */
export function calculateCalibratedPoisson(lambda, targetLine, calibrationDelta = 0) {
  let overProb = poissonOver(lambda, targetLine);
  let underProb = poissonUnder(lambda, targetLine);

  // Apply calibration delta to the preferred side of the line
  if (overProb >= underProb) {
    overProb = Math.min(0.99, Math.max(0.01, overProb + calibrationDelta));
    underProb = 1 - overProb;
  } else {
    underProb = Math.min(0.99, Math.max(0.01, underProb + calibrationDelta));
    overProb = 1 - underProb;
  }

  return { overProb, underProb };
}

/**
 * Derives the dynamic recommendation tip, target line, and formatted probability string.
 *
 * @param {number} overProb
 * @param {number} underProb
 * @param {number} line
 * @returns {{ dynamicBestTip: string, dynamicCardLine: string, dynamicProbability: string, isOverTip: boolean }}
 */
export function deriveDynamicTip(overProb, underProb, line) {
  const isOver = overProb >= underProb;
  const dynamicBestTip = isOver ? "Plus de" : "Moins de";
  const dynamicCardLine = String(line);
  const dominantProb = isOver ? overProb : underProb;
  const dynamicProbability = `${Math.round(dominantProb * 100)}%`;

  return {
    dynamicBestTip,
    dynamicCardLine,
    dynamicProbability,
    isOverTip: isOver
  };
}

/**
 * Computes historical win rate across past matches for the given tip and target line.
 *
 * @param {Array<object>} recentMatches Combined home and away recent matches
 * @param {number} targetLineVal Target line value
 * @param {boolean} isOverTip Whether tip is 'Plus de'
 * @param {string} [fallbackWinRate="50%"] Fallback string if no matches available
 * @returns {string} Formatted win rate percentage
 */
export function calculateHistoricalWinRate(recentMatches, targetLineVal, isOverTip, fallbackWinRate = "50%") {
  let successMatches = 0;
  let totalMatchesWithCorners = 0;

  for (const m of recentMatches) {
    if (m.first_half_corners_home !== null && m.first_half_corners_away !== null &&
        m.first_half_corners_home !== undefined && m.first_half_corners_away !== undefined) {
      totalMatchesWithCorners++;
      const sum = m.first_half_corners_home + m.first_half_corners_away;
      const isSuccess = isOverTip ? sum > targetLineVal : sum < targetLineVal;
      if (isSuccess) {
        successMatches++;
      }
    }
  }

  return totalMatchesWithCorners > 0 
    ? `${Math.round((successMatches / totalMatchesWithCorners) * 100)}%` 
    : fallbackWinRate;
}

/**
 * Converts odds lines (including estimating first half if missing), applies calibration,
 * and detects value bets / fair odds.
 *
 * @param {Array<object>|string} rawOddsCorners
 * @param {number} lambda1MT 1st half expected corners rate
 * @param {number} [calibrationDelta=0]
 * @param {number} [valueBetMinEdge=5] Minimum value bet edge percentage
 * @returns {Array<object>} Enriched odds entries
 */
export function enrichOddsCorners(rawOddsCorners, lambda1MT, calibrationDelta = 0, valueBetMinEdge = 5) {
  let oddsCorners = [];
  try {
    if (typeof rawOddsCorners === 'string') {
      oddsCorners = JSON.parse(rawOddsCorners);
    } else if (Array.isArray(rawOddsCorners)) {
      oddsCorners = rawOddsCorners;
    }
  } catch (e) {
    oddsCorners = [];
  }

  // Project first half odds if missing
  oddsCorners = projectFirstHalfOdds(oddsCorners, lambda1MT);

  return oddsCorners.map(o => {
    const is1stHalf = o.market_type === '1st_half';
    const lambda = is1stHalf ? lambda1MT : lambda1MT * 2.2;
    
    let overProb = poissonOver(lambda, o.line);
    let underProb = poissonUnder(lambda, o.line);
    
    // Apply calibration delta to the preferred side of this line
    if (overProb >= underProb) {
      overProb = Math.min(0.99, Math.max(0.01, overProb + calibrationDelta));
      underProb = 1 - overProb;
    } else {
      underProb = Math.min(0.99, Math.max(0.01, underProb + calibrationDelta));
      overProb = 1 - underProb;
    }
    
    const overValue = o.over_decimal ? overProb * o.over_decimal : 0;
    const underValue = o.under_decimal ? underProb * o.under_decimal : 0;
    
    const edgeThreshold = 1 + (valueBetMinEdge / 100);
    const overValueBet = overValue > edgeThreshold;
    const underValueBet = underValue > edgeThreshold;
    
    return {
      ...o,
      over_value_bet: overValueBet,
      over_value_edge: overValueBet ? Math.round((overValue - 1) * 100) : 0,
      over_fair_odds: overProb > 0 ? parseFloat((1 / overProb).toFixed(2)) : null,
      over_probability: Math.round(overProb * 100) + '%',
      
      under_value_bet: underValueBet,
      under_value_edge: underValueBet ? Math.round((underValue - 1) * 100) : 0,
      under_fair_odds: underProb > 0 ? parseFloat((1 / underProb).toFixed(2)) : null,
      under_probability: Math.round(underProb * 100) + '%'
    };
  });
}

/**
 * Resolves final over/under odds strings based on active card line and enriched odds.
 *
 * @param {Array<object>} enrichedOdds
 * @param {string} dynamicCardLine
 * @param {string} initialOverOdds
 * @param {string} initialUnderOdds
 * @returns {{ finalOverOdds: string, finalUnderOdds: string }}
 */
export function resolveActiveOdds(enrichedOdds, dynamicCardLine, initialOverOdds, initialUnderOdds) {
  const activeLineNum = parseFloat(dynamicCardLine);
  const activeOddsRow = enrichedOdds.find(o => o.market_type === '1st_half' && parseFloat(o.line) === activeLineNum);

  let finalOverOdds = initialOverOdds;
  let finalUnderOdds = initialUnderOdds;

  if (activeOddsRow && activeOddsRow.is_estimated) {
    finalOverOdds = String(activeOddsRow.over_decimal);
    finalUnderOdds = String(activeOddsRow.under_decimal);
  }

  return { finalOverOdds, finalUnderOdds };
}
