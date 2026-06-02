import { poissonOver, poissonUnder, findPoissonMean } from './poisson.js';
import { GradientBoostingRegressor, bivariatePoissonOver, bivariatePoissonUnder } from './gradientBoosting.js';

// Cache for trained GBDT models and covariances
let model1MT = null;
let model2MT = null;
let modelFT = null;
let teamAverages = null;
let covariance1MT = 0.15; // default fallback
let covariance2MT = 0.20; // default fallback
let covarianceFT = 0.35; // default fallback
let leagueAveragesCache = null;
let lastTrainTime = 0;
const TRAIN_COOLDOWN = 120000; // 2 minutes cooldown


/**
 * Normalizes tournament strings into clean league keys
 */
export function getLeagueKey(t) {
  if (!t) return '';
  return t.toLowerCase()
          .replace(/match en direct/g, '')
          .replace(/\(live score en direct\)/g, '')
          .replace(/[^a-z0-9]/g, '');
}

/**
 * Dynamically learns league baselines from finished historical matches
 */
export function computeLeagueAverages(allHistoricalMatches) {
  const leagueGroups = {};
  for (const m of allHistoricalMatches) {
    let rawTour = m.tournament || '';
    // Slice off team names if present using home_team to group matches by exact league
    if (m.home_team && rawTour.includes(m.home_team)) {
      const idx = rawTour.indexOf(m.home_team);
      rawTour = rawTour.substring(0, idx);
    }
    const key = getLeagueKey(rawTour);
    if (!key) continue;
    if (!leagueGroups[key]) {
      leagueGroups[key] = { homeSum: 0, homeCount: 0, awaySum: 0, awayCount: 0 };
    }
    if (m.first_half_corners_home !== null && m.first_half_corners_home !== undefined) {
      leagueGroups[key].homeSum += m.first_half_corners_home;
      leagueGroups[key].homeCount++;
    }
    if (m.first_half_corners_away !== null && m.first_half_corners_away !== undefined) {
      leagueGroups[key].awaySum += m.first_half_corners_away;
      leagueGroups[key].awayCount++;
    }
  }

  const leagueAverages = {};
  for (const key in leagueGroups) {
    const g = leagueGroups[key];
    // Require at least 5 matches to establish a robust specific league baseline
    if (g.homeCount >= 5 && g.awayCount >= 5) {
      leagueAverages[key] = {
        home: parseFloat((g.homeSum / g.homeCount).toFixed(2)),
        away: parseFloat((g.awaySum / g.awayCount).toFixed(2))
      };
    }
  }
  return leagueAverages;
}

/**
 * Performs statistical shrinkage estimation (Mean Reversion) to regress home/away averages against league baselines
 */
export function calculateRegressedAverages(row, leagueAverages, homeAvg, awayAvg) {
  let defaultHome = 2.2;
  let defaultAway = 2.0;
  
  const primaryKey = getLeagueKey(row.tournament);
  if (primaryKey) {
    const matchedKey = Object.keys(leagueAverages).find(k => k.includes(primaryKey) || primaryKey.includes(k));
    if (matchedKey) {
      defaultHome = leagueAverages[matchedKey].home;
      defaultAway = leagueAverages[matchedKey].away;
    }
  }
  
  const teamWeight = 0.6;
  const homeRegressed = homeAvg !== null ? parseFloat((teamWeight * homeAvg + (1 - teamWeight) * defaultHome).toFixed(2)) : defaultHome;
  const awayRegressed = awayAvg !== null ? parseFloat((teamWeight * awayAvg + (1 - teamWeight) * defaultAway).toFixed(2)) : defaultAway;
  
  return { homeRegressed, awayRegressed };
}

/**
 * Enriches a single match predictions with regressed averages, Poisson calculations, and Value Bets edges
 */
export function enrichMatchPredictions(row, leagueAverages, h2hMatches, homeMatches, awayMatches, activeCrawlHistoryMatches = new Set(), customLogosMap = {}) {
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

  // Calculate Data Integrity Diagnostics
  const isHomeLogoMissing = !homeLogo || homeLogo.trim() === '' || homeLogo.toLowerCase().includes('placeholder') || homeLogo.toLowerCase().includes('logo_default') || homeLogo.toLowerCase().includes('logo-default');
  const isAwayLogoMissing = !awayLogo || awayLogo.trim() === '' || awayLogo.toLowerCase().includes('placeholder') || awayLogo.toLowerCase().includes('logo_default') || awayLogo.toLowerCase().includes('logo-default');
  
  // Calculate integrity score (out of 100)
  let diagnosticScore = 100;
  if (homeMatches.length === 0) diagnosticScore -= 25;
  else if (homeMatches.length < 5) diagnosticScore -= 10;
  
  if (awayMatches.length === 0) diagnosticScore -= 25;
  else if (awayMatches.length < 5) diagnosticScore -= 10;
  
  if (h2hMatches.length === 0) diagnosticScore -= 30;
  
  if (isHomeLogoMissing) diagnosticScore -= 10;
  if (isAwayLogoMissing) diagnosticScore -= 10;
  
  diagnosticScore = Math.max(0, diagnosticScore);

  const diagnostic = {
    missing_home_history: homeMatches.length === 0,
    missing_away_history: awayMatches.length === 0,
    missing_h2h: h2hMatches.length === 0,
    missing_home_logo: isHomeLogoMissing,
    missing_away_logo: isAwayLogoMissing,
    home_matches_count: homeMatches.length,
    away_matches_count: awayMatches.length,
    h2h_matches_count: h2hMatches.length,
    score: diagnosticScore,
    is_complete: homeMatches.length >= 5 && awayMatches.length >= 5 && h2hMatches.length >= 1 && !isHomeLogoMissing && !isAwayLogoMissing
  };

  // Calculate H2H corners average (Total match corners in H2H)
  let h2hSum = 0;
  let h2hCount = 0;
  for (const m of h2hMatches) {
    if (m.first_half_corners_home !== null && m.first_half_corners_away !== null) {
      h2hSum += (m.first_half_corners_home + m.first_half_corners_away);
      h2hCount++;
    }
  }
  const h2hAvg = h2hCount > 0 ? parseFloat((h2hSum / h2hCount).toFixed(1)) : null;
  
  // Calculate Team A recent corners average (Corners obtained by Team A)
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
  
  // Calculate Team B recent corners average (Corners obtained by Team B)
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
  
  // Calculate regressed averages (Mean Reversion)
  const { homeRegressed, awayRegressed } = calculateRegressedAverages(row, leagueAverages, homeAvg, awayAvg);
  const lambda1MT = homeRegressed + awayRegressed;
  
  // Dynamic Poisson prediction
  let dynamicBestTip = row.best_tip;
  let dynamicCardLine = row.card_line;
  let dynamicProbability = row.probability;

  const targetLine = 4.5;
  const overProb = poissonOver(lambda1MT, targetLine);
  const underProb = poissonUnder(lambda1MT, targetLine);

  if (overProb >= underProb) {
    dynamicBestTip = "Plus de";
    dynamicCardLine = "4.5";
    dynamicProbability = `${Math.round(overProb * 100)}%`;
  } else {
    dynamicBestTip = "Moins de";
    dynamicCardLine = "4.5";
    dynamicProbability = `${Math.round(underProb * 100)}%`;
  }

  // Calculate win rate in recent history for the dynamic line tip
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
  
  const dynamicWinRate = totalMatchesWithCorners > 0 
    ? `${Math.round((successMatches / totalMatchesWithCorners) * 100)}%` 
    : (row.win_rate || "50%");

  // Parse cached Oddschecker odds
  let oddsCorners = [];
  try {
    if (row.odds_corners) {
      oddsCorners = JSON.parse(row.odds_corners);
    }
  } catch (e) {}

  // Project Full-Time corners odds to First-Half corners odds if First-Half is missing
  const has1stHalf = oddsCorners.some(o => o.market_type === '1st_half');
  const hasFullTime = oddsCorners.some(o => o.market_type === 'full_time');

  if (!has1stHalf && hasFullTime) {
    const ftLine = oddsCorners.find(o => o.market_type === 'full_time' && o.over_decimal && o.under_decimal);
    if (ftLine) {
      const pOver = 1 / ftLine.over_decimal;
      const pUnder = 1 / ftLine.under_decimal;
      const totalP = pOver + pUnder;
      
      if (totalP > 0) {
        const pUnderNorm = pUnder / totalP;
        const k = Math.floor(ftLine.line);
        const derivedLambdaFT = findPoissonMean(k, pUnderNorm);
        
        // Expected 1st half corners is 46% of Full Time corners
        const derivedLambda1MT = 0.46 * derivedLambdaFT;
        const originalPayout = 1 / totalP;
        
        // Generate projected 1st half odds for lines 3.5, 4.5, 5.5
        const projectedLines = [3.5, 4.5, 5.5];
        for (const line of projectedLines) {
          const uProb = poissonUnder(derivedLambda1MT, line);
          const oProb = 1 - uProb;
          
          if (uProb > 0.02 && oProb > 0.02) {
            const overDec = parseFloat((originalPayout / oProb).toFixed(2));
            const underDec = parseFloat((originalPayout / uProb).toFixed(2));
            
            oddsCorners.push({
              line: line,
              over_decimal: overDec,
              under_decimal: underDec,
              market_type: '1st_half',
              is_estimated: true
            });
          }
        }
      }
    }
  } else if (!has1stHalf && !hasFullTime) {
    const projectedLines = [3.5, 4.5, 5.5];
    const payout = 0.93;
    for (const line of projectedLines) {
      const uProb = poissonUnder(lambda1MT, line);
      const oProb = 1 - uProb;
      
      if (uProb > 0.02 && oProb > 0.02) {
        const overDec = parseFloat((payout / oProb).toFixed(2));
        const underDec = parseFloat((payout / uProb).toFixed(2));
        
        oddsCorners.push({
          line: line,
          over_decimal: overDec,
          under_decimal: underDec,
          market_type: '1st_half',
          is_estimated: true
        });
      }
    }
  }
  
  // Calculate Value Bet indicators
  const enrichedOdds = oddsCorners.map(o => {
    const is1stHalf = o.market_type === '1st_half';
    const lambda = is1stHalf ? lambda1MT : lambda1MT * 2.2; // FT corners is ~2.2x of 1st half
    
    const overProb = poissonOver(lambda, o.line);
    const underProb = poissonUnder(lambda, o.line);
    
    const overValue = o.over_decimal ? overProb * o.over_decimal : 0;
    const underValue = o.under_decimal ? underProb * o.under_decimal : 0;
    
    const overValueBet = overValue > 1.05;
    const underValueBet = underValue > 1.05;
    
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
  
  // Override general card O/U odds with Poisson estimations if real ones are missing
  const activeLineNum = parseFloat(dynamicCardLine);
  const activeOddsRow = enrichedOdds.find(o => o.market_type === '1st_half' && parseFloat(o.line) === activeLineNum);
  
  let finalOverOdds = row.over_odds;
  let finalUnderOdds = row.under_odds;
  
  if (activeOddsRow && activeOddsRow.is_estimated) {
    finalOverOdds = String(activeOddsRow.over_decimal);
    finalUnderOdds = String(activeOddsRow.under_decimal);
  }
  
  // Default expected counts (lambda values)
  let gbdt1MTExpected = lambda1MT;
  let gbdt2MTExpected = lambda1MT * 1.15;
  let gbdtFTExpected = lambda1MT * 2.15;

  if (model1MT && teamAverages) {
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

  // Parameterize Bivariate Poisson models using GBDT lambdas
  const splitRatio = homeRegressed / (homeRegressed + awayRegressed || 1);
  const gbdt1MTExpectedHome = gbdt1MTExpected * splitRatio;
  const gbdt1MTExpectedAway = gbdt1MTExpected * (1 - splitRatio);

  const gbdtFTExpectedHome = gbdtFTExpected * splitRatio;
  const gbdtFTExpectedAway = gbdtFTExpected * (1 - splitRatio);

  const gbdt2MTExpectedHome = gbdt2MTExpected * splitRatio;
  const gbdt2MTExpectedAway = gbdt2MTExpected * (1 - splitRatio);

  // Compute over/under probabilities using Bivariate Poisson
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
 * Smart-Scraping filter evaluation to avoid crawling matchups that don't match conditions
 */
export function evaluateSmartScrapingFilter(match, h2hExisting, targetStrategy) {
  if (!targetStrategy) return true;
  if (!h2hExisting || h2hExisting.length < 2) return true;
  
  try {
    const conds = JSON.parse(targetStrategy.conditions_json);
    const threshold = parseFloat(conds.threshold);
    const metric = targetStrategy.metric;
    const operator = conds.operator || '>=';
    
    const values = [];
    for (const h of h2hExisting) {
      if (h.statistics_json) {
        const stats = JSON.parse(h.statistics_json);
        if (metric === 'possession') {
          if (stats.possession && stats.possession.home !== undefined) {
            const val = (h.home_team === match.home_team) 
              ? parseFloat(stats.possession.home) 
              : parseFloat(stats.possession.away);
            values.push(val);
          }
        } else if (stats[metric]) {
          values.push(parseFloat(stats[metric].home) + parseFloat(stats[metric].away));
        }
      }
    }

    if (values.length >= 2) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const margin = metric === 'possession' ? 5.0 : 2.5; // Tolerance buffer
      
      if (operator === '>=' && avg < (threshold - margin)) {
        return false;
      } else if (operator === '<=' && avg > (threshold + margin)) {
        return false;
      }
    }
  } catch (e) {
    console.error("Smart-Scraping filter evaluation failed:", e);
  }
  return true;
}

export async function trainGBDTModels(dbQueryFn) {
  const now = Date.now();
  if (model1MT && now - lastTrainTime < TRAIN_COOLDOWN) {
    return;
  }
  lastTrainTime = now;

  try {
    // 1. Get all matches with 1st half corners
    const matches = await dbQueryFn(`
      SELECT home_team, away_team, tournament, first_half_corners_home, first_half_corners_away, statistics_json
      FROM scraped_predictions
      WHERE first_half_corners_home IS NOT NULL AND first_half_corners_away IS NOT NULL
    `);

    if (matches.length < 10) {
      console.log("[GBDT Train] Not enough data to train models");
      return;
    }

    // 2. Pre-calculate global team averages
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

    // 3. Compute league averages
    leagueAveragesCache = computeLeagueAverages(matches);

    // 4. Compute covariance for Bivariate Poisson
    let covSum1MT = 0;
    let covSumFT = 0;
    let covSum2MT = 0;
    let count1MT = 0;
    let countFT = 0;

    const homeVals1MT = [];
    const awayVals1MT = [];
    const homeValsFT = [];
    const awayValsFT = [];
    const homeVals2MT = [];
    const awayVals2MT = [];

    const X1MT = [];
    const y1MT = [];
    const X2MT = [];
    const y2MT = [];
    const XFT = [];
    const yFT = [];

    for (const m of matches) {
      const home = m.home_team;
      const away = m.away_team;
      
      const homeAvg1MT = teamAverages[home]?.count1MT > 0 ? (teamAverages[home].sum1MT / teamAverages[home].count1MT) : 2.2;
      const awayAvg1MT = teamAverages[away]?.count1MT > 0 ? (teamAverages[away].sum1MT / teamAverages[away].count1MT) : 2.0;

      const homeAvgFT = teamAverages[home]?.countFT > 0 ? (teamAverages[home].sumFT / teamAverages[home].countFT) : 4.8;
      const awayAvgFT = teamAverages[away]?.countFT > 0 ? (teamAverages[away].sumFT / teamAverages[away].countFT) : 4.4;

      const leagueKey = getLeagueKey(m.tournament);
      const league1MTHome = leagueAveragesCache[leagueKey]?.home || 2.2;
      const league1MTAway = leagueAveragesCache[leagueKey]?.away || 2.0;

      const features1MT = {
        home_avg: homeAvg1MT,
        away_avg: awayAvg1MT,
        league_home: league1MTHome,
        league_away: league1MTAway,
        sum_avg: homeAvg1MT + awayAvg1MT
      };

      X1MT.push(features1MT);
      const sum1MT = m.first_half_corners_home + m.first_half_corners_away;
      y1MT.push(sum1MT);

      homeVals1MT.push(m.first_half_corners_home);
      awayVals1MT.push(m.first_half_corners_away);
      count1MT++;

      // If FT corners are available
      try {
        if (m.statistics_json) {
          const stats = JSON.parse(m.statistics_json);
          if (stats && stats.corners) {
            const ftHome = parseFloat(stats.corners.home || 0);
            const ftAway = parseFloat(stats.corners.away || 0);
            const ftTotal = ftHome + ftAway;
            const shHome = Math.max(0, ftHome - m.first_half_corners_home);
            const shAway = Math.max(0, ftAway - m.first_half_corners_away);
            const shTotal = shHome + shAway;

            const featuresFT = {
              home_avg_1mt: homeAvg1MT,
              away_avg_1mt: awayAvg1MT,
              home_avg_ft: homeAvgFT,
              away_avg_ft: awayAvgFT,
              league_home: league1MTHome,
              league_away: league1MTAway,
              sum_avg: homeAvgFT + awayAvgFT
            };

            XFT.push(featuresFT);
            yFT.push(ftTotal);
            homeValsFT.push(ftHome);
            awayValsFT.push(ftAway);

            X2MT.push(featuresFT);
            y2MT.push(shTotal);
            homeVals2MT.push(shHome);
            awayVals2MT.push(shAway);

            countFT++;
          }
        }
      } catch (e) {}
    }

    // GBDT Training
    model1MT = new GradientBoostingRegressor({ nEstimators: 15, maxDepth: 3, learningRate: 0.1 });
    model1MT.fit(X1MT, y1MT);

    if (XFT.length > 10) {
      modelFT = new GradientBoostingRegressor({ nEstimators: 15, maxDepth: 3, learningRate: 0.1 });
      modelFT.fit(XFT, yFT);

      model2MT = new GradientBoostingRegressor({ nEstimators: 15, maxDepth: 3, learningRate: 0.1 });
      model2MT.fit(X2MT, y2MT);
    }

    // Calculate Covariances
    const calcCov = (homeArr, awayArr) => {
      const n = homeArr.length;
      if (n === 0) return 0.15;
      const mHome = homeArr.reduce((a, b) => a + b, 0) / n;
      const mAway = awayArr.reduce((a, b) => a + b, 0) / n;
      let prodSum = 0;
      for (let i = 0; i < n; i++) {
        prodSum += homeArr[i] * awayArr[i];
      }
      return Math.max(0.01, (prodSum / n) - (mHome * mAway));
    };

    covariance1MT = calcCov(homeVals1MT, awayVals1MT);
    if (countFT > 0) {
      covarianceFT = calcCov(homeValsFT, awayValsFT);
      covariance2MT = calcCov(homeVals2MT, awayVals2MT);
    }

    console.log(`[GBDT & Bivariate Poisson] Models trained successfully. 1MT cov: ${covariance1MT.toFixed(3)}, FT cov: ${covarianceFT.toFixed(3)}`);
  } catch (error) {
    console.error("[GBDT Train] Error training GBDT models:", error);
  }
}

/**
 * Fetch and enrich predictions based on date query parameters
 */
export async function getEnrichedPredictions(query, dbQueryFn, activeCrawlHistoryMatches = new Set()) {
  try {
    await trainGBDTModels(dbQueryFn);
  } catch (err) {
    console.error("[Prediction Engine] Failed to auto-train GBDT models:", err);
  }

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

  // Load custom logo overrides
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
    
    const normalizedHome = homeMatches.map(normalizeMatchRow);
    
    const awayMatches = await dbQueryFn(`
      SELECT first_half_corners_home, first_half_corners_away, home_team, away_team, home_logo, away_logo, score, date, time, tournament, statistics_json
      FROM scraped_predictions 
      WHERE is_finished = 1 
        AND away_team = ?
      ORDER BY date DESC LIMIT 10
    `, [row.away_team]);

    const normalizedAway = awayMatches.map(normalizeMatchRow);
    
    const enriched = enrichMatchPredictions(row, leagueAverages, normalizedH2H, normalizedHome, normalizedAway, activeCrawlHistoryMatches, customLogosMap);
    enrichedRows.push(enriched);
  }

  return enrichedRows;
}


