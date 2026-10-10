import {
  covarianceBasket1MT,
  covarianceBasket1QT
} from './gbdtTrainer.js';
import { bivariatePoissonOver } from './gradientBoosting.js';
import {
  normalizeBasketballLeagueKey,
  resolveBasketballLeagueBaselines,
  parseBasketballStats,
  getBasketballMatchScores,
  getRestDays,
  getOpponentBaselines,
  getBasketballTeamStats,
  computeBasketballH2HFirstHalfPoints,
  parseBasketballTotalScore,
  computeBasketballPaceAndTotals
} from './basketballTotalsModel.js';

// Re-export model calculation utilities for full backwards compatibility
export {
  normalizeBasketballLeagueKey,
  resolveBasketballLeagueBaselines,
  parseBasketballStats,
  getBasketballMatchScores,
  getRestDays,
  getOpponentBaselines,
  getBasketballTeamStats,
  computeBasketballH2HFirstHalfPoints,
  parseBasketballTotalScore,
  computeBasketballPaceAndTotals
};

/**
 * Predicts basketball specific metrics: 1QT, 1MT, totals, handicap line and Bivariate Poisson distribution.
 * Acts as the predictor facade coordinating totals model calculations, empirical rates and probability outputs.
 *
 * @param {object} params Prediction input parameters
 * @returns {object} Final basketball prediction card
 */
export function predictBasketballMatch({
  row,
  h2hMatches = [],
  homeMatches = [],
  awayMatches = [],
  calibrationDelta = 0,
  basketballLeagueAverages = {},
  useGbdtModels = true,
  allTeamMatchesMap = null
}) {
  const {
    home_avg_first_half_points,
    away_avg_first_half_points,
    home_avg_first_quarter_points,
    away_avg_first_quarter_points
  } = computeBasketballPaceAndTotals({
    row,
    homeMatches,
    awayMatches,
    basketballLeagueAverages,
    useGbdtModels,
    allTeamMatchesMap
  });

  const h2h_avg_first_half_points = computeBasketballH2HFirstHalfPoints(
    h2hMatches,
    home_avg_first_half_points + away_avg_first_half_points
  );

  const totals = [];
  for (const m of [...h2hMatches, ...homeMatches, ...awayMatches]) {
    const tot = parseBasketballTotalScore(m);
    if (tot !== null) totals.push(tot);
  }

  const avgTotal = home_avg_first_half_points + away_avg_first_half_points;
  const calculatedLine = Math.floor(avgTotal) + 0.5;

  let overCount = 0;
  let validCount = 0;
  for (const tot of totals) {
    validCount++;
    if (tot > calculatedLine) {
      overCount++;
    }
  }

  let probVal = 50;
  let bestTip = "Plus de";
  let rawEmpiricalRate = 50;

  const bpOver = bivariatePoissonOver(
    home_avg_first_half_points,
    away_avg_first_half_points,
    covarianceBasket1MT || 0,
    calculatedLine
  );
  const bpUnder = 1 - bpOver;

  if (bpOver >= bpUnder) {
    probVal = Math.round(bpOver * 100);
    bestTip = "Plus de";
  } else {
    probVal = Math.round(bpUnder * 100);
    bestTip = "Moins de";
  }

  if (validCount > 0) {
    const pctOver = (overCount / validCount) * 100;
    rawEmpiricalRate = Math.round(bestTip === "Plus de" ? pctOver : 100 - pctOver);
  } else {
    rawEmpiricalRate = probVal - 5;
  }

  // Ensure probability is in a realistic range (e.g. 50% - 85%) before calibration
  probVal = Math.max(50, Math.min(85, probVal));

  // Apply calibration delta
  const calibratedProb = probVal + (calibrationDelta * 100);
  probVal = Math.max(50, Math.min(95, Math.round(calibratedProb)));

  return {
    home_avg_first_half_points,
    away_avg_first_half_points,
    h2h_avg_first_half_points,
    home_avg_first_quarter_points,
    away_avg_first_quarter_points,
    covariance_basket_1mt: covarianceBasket1MT,
    covariance_basket_1qt: covarianceBasket1QT,
    calculatedLine,
    card_line: `${calculatedLine} Points 1ère MT`,
    best_tip: bestTip,
    probability: `${probVal}%`,
    win_rate: `${rawEmpiricalRate}%`
  };
}
