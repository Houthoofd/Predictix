import { computeLeagueAverages } from './predictionAverages.js';
import { enrichMatchPredictions } from './predictionEngine.js';

/**
 * Fetch and enrich predictions using optimized in-memory historical match maps.
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
  
  // Fetch finished matches to index home, away, and H2H matches in memory
  const allFinished = await dbQueryFn(`
    SELECT first_half_corners_home, first_half_corners_away, home_team, away_team, home_logo, away_logo, score, date, time, tournament, statistics_json, sport
    FROM scraped_predictions 
    WHERE is_finished = 1
    ORDER BY date DESC
  `);

  const homeMatchesMap = new Map();
  const awayMatchesMap = new Map();
  const h2hMatchesMap = new Map();

  for (const m of allFinished) {
    const home = m.home_team;
    const away = m.away_team;

    // Home history (limit 10)
    if (!homeMatchesMap.has(home)) {
      homeMatchesMap.set(home, []);
    }
    const homeArr = homeMatchesMap.get(home);
    if (homeArr.length < 10) {
      homeArr.push(m);
    }

    // Away history (limit 10)
    if (!awayMatchesMap.has(away)) {
      awayMatchesMap.set(away, []);
    }
    const awayArr = awayMatchesMap.get(away);
    if (awayArr.length < 10) {
      awayArr.push(m);
    }

    // H2H history (limit 15)
    const teams = [home, away].sort();
    const h2hKey = `${teams[0]} vs ${teams[1]}`;
    if (!h2hMatchesMap.has(h2hKey)) {
      h2hMatchesMap.set(h2hKey, []);
    }
    const h2hArr = h2hMatchesMap.get(h2hKey);
    if (h2hArr.length < 15) {
      h2hArr.push(m);
    }
  }

  const allHistoricalMatches = await dbQueryFn(`
    SELECT tournament, home_team, away_team, first_half_corners_home, first_half_corners_away 
    FROM scraped_predictions 
    WHERE is_historical = 1 AND first_half_corners_home IS NOT NULL
  `);

  const leagueAverages = computeLeagueAverages(allHistoricalMatches);
  const enrichedRows = [];

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
    const teams = [row.home_team, row.away_team].sort();
    const h2hKey = `${teams[0]} vs ${teams[1]}`;

    const rawH2H = h2hMatchesMap.get(h2hKey) || [];
    const rawHome = homeMatchesMap.get(row.home_team) || [];
    const rawAway = awayMatchesMap.get(row.away_team) || [];
    
    const normalizeMatchRow = (m) => {
      let date = m.date || '';
      let time = m.time || '';
      if (date.includes(':')) {
        time = date;
        date = row.date || new Date().toISOString().substring(0, 10);
      }
      return { ...m, date, time };
    };

    const normalizedH2H = rawH2H.map(normalizeMatchRow);
    const normalizedHome = rawHome.map(normalizeMatchRow);
    const normalizedAway = rawAway.map(normalizeMatchRow);
    
    const enriched = enrichMatchPredictions(row, leagueAverages, normalizedH2H, normalizedHome, normalizedAway, activeCrawlHistoryMatches, customLogosMap);
    enrichedRows.push(enriched);
  }

  return enrichedRows;
}
