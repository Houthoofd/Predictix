import { poissonOver, poissonUnder, findPoissonMean } from './poisson.js';

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
export function enrichMatchPredictions(row, leagueAverages, h2hMatches, homeMatches, awayMatches, activeCrawlHistoryMatches = new Set()) {
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
  
  return {
    ...row,
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
    recent_home_matches: homeMatches,
    recent_away_matches: awayMatches,
    recent_h2h_matches: h2hMatches,
    isCrawling: activeCrawlHistoryMatches.has(row.match_id)
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

