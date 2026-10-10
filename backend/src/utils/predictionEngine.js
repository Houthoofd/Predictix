import { 
  computeLeagueAverages, 
  calculateRegressedAverages 
} from './predictionAverages.js';
import { enrichNonFootballMatch } from './nonFootballPredictor.js';
import { 
  buildPredictionContext, 
  computePredictionDiagnostic, 
  parseAndEnrichAbsences, 
  overlayTeamLogos, 
  findSquadPlayerStats 
} from './predictionContext.js';
import { 
  calculateCalibratedPoisson, 
  deriveDynamicTip, 
  calculateHistoricalWinRate, 
  enrichOddsCorners, 
  resolveActiveOdds 
} from './oddsEngine.js';
import { 
  calculateCornerAverages, 
  computeBasketballLeagueAverages, 
  computeGbdtCornerPredictions, 
  getSportsCalibrationDeltas 
} from './sportsFeatureExtractor.js';

// Re-export smart scraping filter for consumers of predictionEngine
export { evaluateSmartScrapingFilter } from './smartScraperFilter.js';

// Re-export calibration and context utilities for external callers/tests
export { 
  getSportsCalibrationDeltas,
  buildPredictionContext,
  computePredictionDiagnostic,
  parseAndEnrichAbsences,
  calculateCalibratedPoisson,
  deriveDynamicTip,
  enrichOddsCorners,
  calculateCornerAverages,
  computeBasketballLeagueAverages,
  computeGbdtCornerPredictions
};

/**
 * Enriches a single match predictions with regressed averages, Poisson calculations, and Value Bets edges
 */
export function enrichMatchPredictions(
  row, 
  leagueAverages, 
  h2hMatches, 
  homeMatches, 
  awayMatches, 
  activeCrawlHistoryMatches = new Set(), 
  customLogosMap = {}, 
  valueBetMinEdge = 5, 
  footballCornerLine = 4.5, 
  calibrationDelta = 0, 
  basketballLeagueAverages = {}, 
  useGbdtModels = true, 
  allTeamMatchesMap = null, 
  playerStatsMap = null
) {
  const {
    homeLogo,
    awayLogo,
    enrichedHomeMatches,
    enrichedAwayMatches,
    enrichedH2HMatches,
    diagnostic,
    absences
  } = buildPredictionContext(row, homeMatches, awayMatches, h2hMatches, customLogosMap, playerStatsMap);

  const sport = (row.sport || 'football').toLowerCase().trim();
  
  if (sport !== 'football') {
    const res = enrichNonFootballMatch(
      row, h2hMatches, homeMatches, awayMatches, homeLogo, awayLogo, diagnostic, 
      enrichedHomeMatches, enrichedAwayMatches, enrichedH2HMatches, calibrationDelta,
      basketballLeagueAverages, useGbdtModels, allTeamMatchesMap
    );
    return {
      ...res,
      absences
    };
  }

  // Football corner averages & Poisson regression
  const { h2hAvg, homeAvg, awayAvg } = calculateCornerAverages(h2hMatches, homeMatches, awayMatches, row);
  const { homeRegressed, awayRegressed } = calculateRegressedAverages(row, leagueAverages, homeAvg, awayAvg);
  const lambda1MT = homeRegressed + awayRegressed;

  // Poisson probabilities with Bayesian calibration
  const { overProb, underProb } = calculateCalibratedPoisson(lambda1MT, footballCornerLine, calibrationDelta);
  const { dynamicBestTip, dynamicCardLine, dynamicProbability, isOverTip } = deriveDynamicTip(overProb, underProb, footballCornerLine);

  // Dynamic win rate across recent matches
  const allRecent = [...homeMatches, ...awayMatches];
  const dynamicWinRate = calculateHistoricalWinRate(allRecent, parseFloat(dynamicCardLine), isOverTip, row.win_rate || "50%");

  // Market odds enrichment & value bets
  const enrichedOdds = enrichOddsCorners(row.odds_corners, lambda1MT, calibrationDelta, valueBetMinEdge);
  const { finalOverOdds, finalUnderOdds } = resolveActiveOdds(enrichedOdds, dynamicCardLine, row.over_odds, row.under_odds);

  // Predictix Edge / GBDT expectations
  const gbdtPredictions = computeGbdtCornerPredictions(row, lambda1MT, homeRegressed, awayRegressed, useGbdtModels);

  return {
    ...row,
    home_logo: homeLogo,
    away_logo: awayLogo,
    absences: absences,
    best_tip: dynamicBestTip,
    card_line: dynamicCardLine,
    probability: dynamicProbability,
    over_odds: finalOverOdds,
    under_odds: finalUnderOdds,
    win_rate: dynamicWinRate,
    home_avg_first_half_corners: homeRegressed,
    away_avg_first_half_corners: awayRegressed,
    h2h_avg_first_half_corners: h2hAvg,
    odds_corners: enrichedOdds,
    recent_home_matches: enrichedHomeMatches,
    recent_away_matches: enrichedAwayMatches,
    recent_h2h_matches: enrichedH2HMatches,
    isCrawling: activeCrawlHistoryMatches.has(row.match_id),
    diagnostic,
    gbdt_predictions: gbdtPredictions
  };
}

function buildDateFilter(query) {
  const { startDate, endDate, dateRange } = query;
  if (startDate && endDate) return { clause: ' AND date >= ? AND date <= ?', params: [startDate, endDate] };
  if (!dateRange || dateRange === 'all') return { clause: '', params: [] };

  const todayStr = new Date().toISOString().substring(0, 10);
  const daysMap = { today: 0, yesterday: 1, week: 7, month: 30, year: 365 };
  const days = daysMap[dateRange];
  if (days === 0) return { clause: ' AND date = ?', params: [todayStr] };

  const d = new Date();
  d.setDate(d.getDate() - days);
  const startStr = d.toISOString().substring(0, 10);
  return days === 1 
    ? { clause: ' AND date = ?', params: [startStr] } 
    : { clause: ' AND date >= ? AND date <= ?', params: [startStr, todayStr] };
}

function normalizeMatchRow(m, rowDate) {
  let date = m.date || '';
  let time = m.time || '';
  if (date.includes(':')) {
    time = date;
    date = rowDate || null;
  }
  return { ...m, date, time };
}

/**
 * Fetch and enrich predictions based on date query parameters
 */
export async function getEnrichedPredictions(query, dbQueryFn, activeCrawlHistoryMatches = new Set()) {
  const { clause, params } = buildDateFilter(query);
  const sql = `SELECT * FROM scraped_predictions WHERE is_historical = 0${clause} ORDER BY scraped_at DESC, time ASC`;
  const rows = await dbQueryFn(sql, params);
  
  const allHistoricalMatches = await dbQueryFn(`
    SELECT tournament, home_team, away_team, first_half_corners_home, first_half_corners_away 
    FROM scraped_predictions 
    WHERE is_historical = 1 AND first_half_corners_home IS NOT NULL
  `);

  const leagueAverages = computeLeagueAverages(allHistoricalMatches);
  const enrichedRows = [];

  let basketballLeagueAverages = {};
  try {
    const basketHistorical = await dbQueryFn(`
      SELECT tournament, score, statistics_json 
      FROM scraped_predictions 
      WHERE sport = 'basketball' AND is_finished = 1 AND statistics_json IS NOT NULL
    `);
    basketballLeagueAverages = computeBasketballLeagueAverages(basketHistorical);
  } catch (err) {
    console.warn("[Prediction Engine] Could not calculate basketball league averages:", err.message);
  }

  const deltas = await getSportsCalibrationDeltas(dbQueryFn);

  let valueBetMinEdge = 5;
  let footballCornerLine = 4.5;
  let useGbdtModels = true;
  try {
    const settingsRows = await dbQueryFn("SELECT * FROM settings WHERE key IN ('value_bet_min_edge', 'football_corner_line', 'use_gbdt_models')");
    if (settingsRows && Array.isArray(settingsRows)) {
      settingsRows.forEach(r => {
        if (r.key === 'value_bet_min_edge') valueBetMinEdge = parseFloat(r.value) || 5;
        if (r.key === 'football_corner_line') footballCornerLine = parseFloat(r.value) || 4.5;
        if (r.key === 'use_gbdt_models') useGbdtModels = r.value === 'true';
      });
    }
  } catch (err) {
    console.warn("[Prediction Engine] Settings table query fallback:", err.message);
  }

  const customLogosMap = {};
  try {
    const customLogosRows = await dbQueryFn("SELECT * FROM custom_team_logos");
    if (customLogosRows && Array.isArray(customLogosRows)) {
      for (const cl of customLogosRows) {
        customLogosMap[cl.team_name.toLowerCase().trim()] = cl.logo_url;
      }
    }
  } catch (err) {
    console.warn("[Prediction Engine] Custom logos table query fallback:", err.message);
  }
  
  const allFinishedMatches = await dbQueryFn(`
    SELECT first_half_corners_home, first_half_corners_away, home_team, away_team, home_logo, away_logo, score, date, time, tournament, statistics_json, sport
    FROM scraped_predictions 
    WHERE is_finished = 1
    ORDER BY date DESC
  `);
  const allTeamMatchesMap = new Map();
  for (const m of allFinishedMatches) {
    for (const team of [m.home_team, m.away_team]) {
      if (!allTeamMatchesMap.has(team)) allTeamMatchesMap.set(team, []);
      if (allTeamMatchesMap.get(team).length < 10) allTeamMatchesMap.get(team).push(m);
    }
  }

  const matchCols = `first_half_corners_home, first_half_corners_away, home_team, away_team, home_logo, away_logo, score, date, time, tournament, statistics_json`;

  for (const row of rows) {
    const isBasketball = (row.sport || '').toLowerCase().trim() === 'basketball';

    const h2hMatches = await dbQueryFn(`
      SELECT ${matchCols} FROM scraped_predictions 
      WHERE is_finished = 1 AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))
      ORDER BY date DESC LIMIT 10
    `, [row.home_team, row.away_team, row.away_team, row.home_team]);

    const homeFilter = isBasketball ? '(home_team = ? OR away_team = ?)' : 'home_team = ?';
    const homeParams = isBasketball ? [row.home_team, row.home_team] : [row.home_team];
    const homeMatches = await dbQueryFn(`
      SELECT ${matchCols} FROM scraped_predictions 
      WHERE is_finished = 1 AND ${homeFilter} ORDER BY date DESC LIMIT 10
    `, homeParams);

    const awayFilter = isBasketball ? '(home_team = ? OR away_team = ?)' : 'away_team = ?';
    const awayParams = isBasketball ? [row.away_team, row.away_team] : [row.away_team];
    const awayMatches = await dbQueryFn(`
      SELECT ${matchCols} FROM scraped_predictions 
      WHERE is_finished = 1 AND ${awayFilter} ORDER BY date DESC LIMIT 10
    `, awayParams);

    const sport = (row.sport || 'football').toLowerCase().trim();
    const currentCalibrationDelta = sport === 'football' 
      ? deltas.football 
      : (sport === 'basketball' ? deltas.basketball : deltas.other);

    const enriched = enrichMatchPredictions(
      row, 
      leagueAverages, 
      h2hMatches.map(m => normalizeMatchRow(m, row.date)), 
      homeMatches.map(m => normalizeMatchRow(m, row.date)), 
      awayMatches.map(m => normalizeMatchRow(m, row.date)), 
      activeCrawlHistoryMatches, 
      customLogosMap, 
      valueBetMinEdge, 
      footballCornerLine, 
      currentCalibrationDelta, 
      basketballLeagueAverages, 
      useGbdtModels,
      allTeamMatchesMap
    );
    enrichedRows.push(enriched);
  }

  return enrichedRows;
}
