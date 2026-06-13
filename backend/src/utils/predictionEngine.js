import { poissonOver, poissonUnder } from './poisson.js';
import { bivariatePoissonOver, bivariatePoissonUnder } from './gradientBoosting.js';
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
  getLeagueKey, 
  computeLeagueAverages, 
  calculateRegressedAverages 
} from './predictionAverages.js';
import { enrichNonFootballMatch } from './nonFootballPredictor.js';
import { projectFirstHalfOdds } from './oddsProjector.js';
import { validateMatchStats, checkScoreSanity } from './integrityLinter.js';

// Re-export smart scraping filter for consumers of predictionEngine
export { evaluateSmartScrapingFilter } from './smartScraperFilter.js';

/**
 * Enriches a single match predictions with regressed averages, Poisson calculations, and Value Bets edges
 */
export function enrichMatchPredictions(row, leagueAverages, h2hMatches, homeMatches, awayMatches, activeCrawlHistoryMatches = new Set(), customLogosMap = {}, valueBetMinEdge = 5, footballCornerLine = 4.5, calibrationDelta = 0, basketballLeagueAverages = {}, useGbdtModels = true, allTeamMatchesMap = null) {
  const cleanHomeTeamKey = (row.home_team || '').toLowerCase().trim();
  const cleanAwayTeamKey = (row.away_team || '').toLowerCase().trim();
  const homeLogo = customLogosMap[cleanHomeTeamKey] || row.home_logo;
  const awayLogo = customLogosMap[cleanAwayTeamKey] || row.away_logo;

  const overlayLogos = (matchList) => {
    return matchList.map(m => {
      const hKey = (m.home_team || '').toLowerCase().trim();
      const aKey = (m.away_team || '').toLowerCase().trim();
      return {
        ...m,
        home_logo: customLogosMap[hKey] || m.home_logo,
        away_logo: customLogosMap[aKey] || m.away_logo
      };
    });
  };

  const enrichedHomeMatches = overlayLogos(homeMatches);
  const enrichedAwayMatches = overlayLogos(awayMatches);
  const enrichedH2HMatches = overlayLogos(h2hMatches);

  const isHomeLogoMissing = !homeLogo || homeLogo.trim() === '' || homeLogo.toLowerCase().includes('placeholder') || homeLogo.toLowerCase().includes('logo_default') || homeLogo.toLowerCase().includes('logo-default');
  const isAwayLogoMissing = !awayLogo || awayLogo.trim() === '' || awayLogo.toLowerCase().includes('placeholder') || awayLogo.toLowerCase().includes('logo_default') || awayLogo.toLowerCase().includes('logo-default');
  
  const statsValidation = validateMatchStats(row);
  const sanityCheck = checkScoreSanity(row);

  let diagnosticScore = 100;
  if (homeMatches.length === 0) diagnosticScore -= 25;
  else if (homeMatches.length < 5) diagnosticScore -= 10;
  
  if (awayMatches.length === 0) diagnosticScore -= 25;
  else if (awayMatches.length < 5) diagnosticScore -= 10;
  
  if (h2hMatches.length === 0) diagnosticScore -= 30;
  
  if (isHomeLogoMissing) diagnosticScore -= 10;
  if (isAwayLogoMissing) diagnosticScore -= 10;
  
  if (!statsValidation.isValid) {
    diagnosticScore -= 20;
  }
  if (!sanityCheck.isSane) {
    diagnosticScore -= 30;
  }
  
  diagnosticScore = Math.max(0, diagnosticScore);

  const diagnostic = {
    missing_home_history: homeMatches.length === 0,
    missing_away_history: awayMatches.length === 0,
    missing_h2h: h2hMatches.length === 0,
    missing_home_logo: isHomeLogoMissing,
    missing_away_logo: isAwayLogoMissing,
    missing_match_stats: !statsValidation.isValid,
    score_sanity_mismatch: !sanityCheck.isSane,
    sanity_error_message: sanityCheck.reason,
    home_matches_count: homeMatches.length,
    away_matches_count: awayMatches.length,
    h2h_matches_count: h2hMatches.length,
    score: diagnosticScore,
    is_complete: homeMatches.length >= 5 && 
                 awayMatches.length >= 5 && 
                 h2hMatches.length >= 1 && 
                 !isHomeLogoMissing && 
                 !isAwayLogoMissing && 
                 statsValidation.isValid && 
                 sanityCheck.isSane
  };

  const sport = (row.sport || 'football').toLowerCase().trim();
  
  if (sport !== 'football') {
    return enrichNonFootballMatch(
      row, h2hMatches, homeMatches, awayMatches, homeLogo, awayLogo, diagnostic, 
      enrichedHomeMatches, enrichedAwayMatches, enrichedH2HMatches, calibrationDelta,
      basketballLeagueAverages, useGbdtModels, allTeamMatchesMap
    );
  }

  let h2hSum = 0;
  let h2hCount = 0;
  for (const m of h2hMatches) {
    if (m.first_half_corners_home !== null && m.first_half_corners_away !== null) {
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

  // Football Poisson corner prediction (standard flow)
  const { homeRegressed, awayRegressed } = calculateRegressedAverages(row, leagueAverages, homeAvg, awayAvg);
  const lambda1MT = homeRegressed + awayRegressed;

  const targetLine = footballCornerLine;
  let overProb = poissonOver(lambda1MT, targetLine);
  let underProb = poissonUnder(lambda1MT, targetLine);

  // Apply calibration delta to the preferred side of the main tip
  if (overProb >= underProb) {
    overProb = Math.min(0.99, Math.max(0.01, overProb + calibrationDelta));
    underProb = 1 - overProb;
  } else {
    underProb = Math.min(0.99, Math.max(0.01, underProb + calibrationDelta));
    overProb = 1 - underProb;
  }

  let dynamicBestTip = row.best_tip;
  let dynamicCardLine = row.card_line;
  let dynamicProbability = row.probability;
  let dynamicWinRate = row.win_rate || "50%";

  if (overProb >= underProb) {
    dynamicBestTip = "Plus de";
    dynamicCardLine = String(footballCornerLine);
    dynamicProbability = `${Math.round(overProb * 100)}%`;
  } else {
    dynamicBestTip = "Moins de";
    dynamicCardLine = String(footballCornerLine);
    dynamicProbability = `${Math.round(underProb * 100)}%`;
  }

  const targetLineVal = parseFloat(dynamicCardLine);
  const isOverTip = dynamicBestTip === "Plus de";
  
  let successMatches = 0;
  let totalMatchesWithCorners = 0;
  
  const allRecent = [...homeMatches, ...awayMatches];
  for (const m of allRecent) {
    if (m.first_half_corners_home !== null && m.first_half_corners_away !== null) {
      totalMatchesWithCorners++;
      const sum = m.first_half_corners_home + m.first_half_corners_away;
      const isSuccess = isOverTip ? sum > targetLineVal : sum < targetLineVal;
      if (isSuccess) {
        successMatches++;
      }
    }
  }
  
  dynamicWinRate = totalMatchesWithCorners > 0 
    ? `${Math.round((successMatches / totalMatchesWithCorners) * 100)}%` 
    : (row.win_rate || "50%");

  let oddsCorners = [];
  try {
    if (row.odds_corners) {
      oddsCorners = JSON.parse(row.odds_corners);
    }
  } catch (e) {}

  // Project first half odds if missing
  oddsCorners = projectFirstHalfOdds(oddsCorners, lambda1MT);
  
  const enrichedOdds = oddsCorners.map(o => {
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
  
  const activeLineNum = parseFloat(dynamicCardLine);
  const activeOddsRow = enrichedOdds.find(o => o.market_type === '1st_half' && parseFloat(o.line) === activeLineNum);
  
  let finalOverOdds = row.over_odds;
  let finalUnderOdds = row.under_odds;
  
  if (activeOddsRow && activeOddsRow.is_estimated) {
    finalOverOdds = String(activeOddsRow.over_decimal);
    finalUnderOdds = String(activeOddsRow.under_decimal);
  }
  
  let gbdt1MTExpected = lambda1MT;
  let gbdt2MTExpected = lambda1MT * 1.15;
  let gbdtFTExpected = lambda1MT * 2.15;

  if (useGbdtModels && model1MT && teamAverages) {
    const home = row.home_team;
    const away = row.away_team;
    const homeAvg1MT = teamAverages[home]?.count1MT > 0 ? (teamAverages[home].sum1MT / teamAverages[home].count1MT) : 2.2;
    const awayAvg1MT = teamAverages[away]?.count1MT > 0 ? (teamAverages[away].sum1MT / teamAverages[away].count1MT) : 2.0;

    const leagueKey = getLeagueKey(row.tournament);
    const league1MTHome = leagueAveragesCache[leagueKey]?.home || 2.2;
    const league1MTAway = leagueAveragesCache[leagueKey]?.away || 2.0;

    const feats1MT = {
      home_avg: homeAvg1MT,
      away_avg: awayAvg1MT,
      league_home: league1MTHome,
      league_away: league1MTAway,
      sum_avg: homeAvg1MT + awayAvg1MT
    };
    gbdt1MTExpected = model1MT.predictRow(feats1MT);

    if (modelFT && model2MT) {
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

  const splitRatio = homeRegressed / (homeRegressed + awayRegressed || 1);
  const gbdt1MTExpectedHome = gbdt1MTExpected * splitRatio;
  const gbdt1MTExpectedAway = gbdt1MTExpected * (1 - splitRatio);

  const gbdtFTExpectedHome = gbdtFTExpected * splitRatio;
  const gbdtFTExpectedAway = gbdtFTExpected * (1 - splitRatio);

  const gbdt2MTExpectedHome = gbdt2MTExpected * splitRatio;
  const gbdt2MTExpectedAway = gbdt2MTExpected * (1 - splitRatio);

  const bp1MTOver4_5 = Math.round(bivariatePoissonOver(gbdt1MTExpectedHome, gbdt1MTExpectedAway, covariance1MT, 4.5) * 100);
  const bp2MTOver4_5 = Math.round(bivariatePoissonOver(gbdt2MTExpectedHome, gbdt2MTExpectedAway, covariance2MT, 4.5) * 100);
  const bpFTOver9_5 = Math.round(bivariatePoissonOver(gbdtFTExpectedHome, gbdtFTExpectedAway, covarianceFT, 9.5) * 100);

  return {
    ...row,
    home_logo: homeLogo,
    away_logo: awayLogo,
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
    gbdt_predictions: {
      first_half: {
        expected: parseFloat(gbdt1MTExpected.toFixed(2)),
        home_expected: parseFloat(gbdt1MTExpectedHome.toFixed(2)),
        away_expected: parseFloat(gbdt1MTExpectedAway.toFixed(2)),
        covariance: parseFloat(covariance1MT.toFixed(4)),
        over_4_5_prob: bp1MTOver4_5
      },
      second_half: {
        expected: parseFloat(gbdt2MTExpected.toFixed(2)),
        home_expected: parseFloat(gbdt2MTExpectedHome.toFixed(2)),
        away_expected: parseFloat(gbdt2MTExpectedAway.toFixed(2)),
        covariance: parseFloat(covariance2MT.toFixed(4)),
        over_4_5_prob: bp2MTOver4_5
      },
      full_time: {
        expected: parseFloat(gbdtFTExpected.toFixed(2)),
        home_expected: parseFloat(gbdtFTExpectedHome.toFixed(2)),
        away_expected: parseFloat(gbdtFTExpectedAway.toFixed(2)),
        covariance: parseFloat(covarianceFT.toFixed(4)),
        over_9_5_prob: bpFTOver9_5
      }
    }
  };
}

/**
 * Fetch and enrich predictions based on date query parameters
 */
export async function getEnrichedPredictions(query, dbQueryFn, activeCrawlHistoryMatches = new Set()) {

  let sql = 'SELECT * FROM scraped_predictions WHERE is_historical = 0';
  const params = [];
  
  const { startDate, endDate, dateRange } = query;
  
  if (startDate && endDate) {
    sql += ' AND date >= ? AND date <= ?';
    params.push(startDate, endDate);
  } else if (dateRange && dateRange !== 'all') {
    const today = new Date();
    const todayStr = today.toISOString().substring(0, 10);
    
    if (dateRange === 'today') {
      sql += ' AND date = ?';
      params.push(todayStr);
    } else if (dateRange === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().substring(0, 10);
      sql += ' AND date = ?';
      params.push(yesterdayStr);
    } else if (dateRange === 'week') {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - 7);
      const startOfWeekStr = startOfWeek.toISOString().substring(0, 10);
      sql += ' AND date >= ? AND date <= ?';
      params.push(startOfWeekStr, todayStr);
    } else if (dateRange === 'month') {
      const startOfMonth = new Date();
      startOfMonth.setDate(startOfMonth.getDate() - 30);
      const startOfMonthStr = startOfMonth.toISOString().substring(0, 10);
      sql += ' AND date >= ? AND date <= ?';
      params.push(startOfMonthStr, todayStr);
    } else if (dateRange === 'year') {
      const startOfYear = new Date();
      startOfYear.setDate(startOfYear.getDate() - 365);
      const startOfYearStr = startOfYear.toISOString().substring(0, 10);
      sql += ' AND date >= ? AND date <= ?';
      params.push(startOfYearStr, todayStr);
    }
  }
  
  sql += ' ORDER BY scraped_at DESC, time ASC';
  const rows = await dbQueryFn(sql, params);
  
  const allHistoricalMatches = await dbQueryFn(`
    SELECT tournament, home_team, away_team, first_half_corners_home, first_half_corners_away 
    FROM scraped_predictions 
    WHERE is_historical = 1 AND first_half_corners_home IS NOT NULL
  `);

  const leagueAverages = computeLeagueAverages(allHistoricalMatches);
  const enrichedRows = [];

  // Calculate basketball league averages dynamically
  const basketballLeagueAverages = {};
  try {
    const basketHistorical = await dbQueryFn(`
      SELECT tournament, score, statistics_json 
      FROM scraped_predictions 
      WHERE sport = 'basketball' AND is_finished = 1 AND statistics_json IS NOT NULL
    `);
    
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
            const match = m.score.match(/(\d+)\s*-\s*(\d+)/);
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
    console.warn("[Prediction Engine] Settings table might not exist or failed to query:", err.message);
  }

  let customLogosMap = {};
  try {
    const customLogosRows = await dbQueryFn("SELECT * FROM custom_team_logos");
    if (customLogosRows && Array.isArray(customLogosRows)) {
      for (const cl of customLogosRows) {
        customLogosMap[cl.team_name.toLowerCase().trim()] = cl.logo_url;
      }
    }
  } catch (err) {
    console.warn("[Prediction Engine] Custom logos table might not exist yet or failed to query:", err.message);
  }
  
  for (const row of rows) {
    const h2hMatches = await dbQueryFn(`
      SELECT first_half_corners_home, first_half_corners_away, home_team, away_team, home_logo, away_logo, score, date, time, tournament, statistics_json
      FROM scraped_predictions 
      WHERE is_finished = 1 
        AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))
      ORDER BY date DESC LIMIT 10
    `, [row.home_team, row.away_team, row.away_team, row.home_team]);
    
    const normalizeMatchRow = (m) => {
      let date = m.date || '';
      let time = m.time || '';
      if (date.includes(':')) {
        time = date;
        date = row.date || new Date().toISOString().substring(0, 10);
      }
      return { ...m, date, time };
    };

    const normalizedH2H = h2hMatches.map(normalizeMatchRow);
    
    const homeMatches = await dbQueryFn(`
      SELECT first_half_corners_home, first_half_corners_away, home_team, away_team, home_logo, away_logo, score, date, time, tournament, statistics_json
      FROM scraped_predictions 
      WHERE is_finished = 1 
        AND home_team = ?
      ORDER BY date DESC LIMIT 10
    `, [row.home_team]);
    
    const normalizeHome = homeMatches.map(normalizeMatchRow);
    
    const awayMatches = await dbQueryFn(`
      SELECT first_half_corners_home, first_half_corners_away, home_team, away_team, home_logo, away_logo, score, date, time, tournament, statistics_json
      FROM scraped_predictions 
      WHERE is_finished = 1 
        AND away_team = ?
      ORDER BY date DESC LIMIT 10
    `, [row.away_team]);

    const normalizeAway = awayMatches.map(normalizeMatchRow);
    
    const sport = (row.sport || 'football').toLowerCase().trim();
    const currentCalibrationDelta = sport === 'football' 
      ? deltas.football 
      : (sport === 'basketball' ? deltas.basketball : deltas.other);

    const enriched = enrichMatchPredictions(
      row, 
      leagueAverages, 
      normalizedH2H, 
      normalizeHome, 
      normalizeAway, 
      activeCrawlHistoryMatches, 
      customLogosMap, 
      valueBetMinEdge, 
      footballCornerLine, 
      currentCalibrationDelta, 
      basketballLeagueAverages, 
      useGbdtModels
    );
    enrichedRows.push(enriched);
  }

  return enrichedRows;
}

export async function getSportsCalibrationDeltas(dbQueryFn) {
  const deltas = {
    football: 0,
    basketball: 0,
    other: 0
  };
  try {
    const rows = await dbQueryFn(`
      SELECT sport, best_tip, card_line, probability, score, first_half_corners_home, first_half_corners_away, statistics_json
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
            const match = m.score.match(/(\d+)\s*-\s*(\d+)/);
            if (match) {
              actualTotal = (parseFloat(match[1]) + parseFloat(match[2])) * 0.49;
            }
          }
        } else {
          if (m.score) {
            const match = m.score.match(/(\d+)\s*-\s*(\d+)/);
            if (match) {
              actualTotal = parseFloat(match[1]) + parseFloat(match[2]);
            }
          }
        }
      } else {
        if (m.score) {
          const match = m.score.match(/(\d+)\s*-\s*(\d+)/);
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
