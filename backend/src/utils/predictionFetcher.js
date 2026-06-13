import { computeLeagueAverages, getLeagueKey } from './predictionAverages.js';
import { enrichMatchPredictions, getSportsCalibrationDeltas } from './predictionEngine.js';

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
  
  const rawRows = await dbQueryFn(sql, params);

  const getMatchTimestamp = (dateStr, timeStr) => {
    if (!dateStr) return 0;
    const dateParts = dateStr.split('-');
    if (dateParts.length !== 3) return 0;
    
    let hh = 12;
    let mm = 0;
    if (timeStr && typeof timeStr === 'string') {
      const timeParts = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
      if (timeParts) {
        hh = parseInt(timeParts[1], 10);
        mm = parseInt(timeParts[2], 10);
      }
    }
    
    return Date.UTC(
      parseInt(dateParts[0], 10),
      parseInt(dateParts[1], 10) - 1,
      parseInt(dateParts[2], 10),
      hh,
      mm,
      0,
      0
    );
  };

  // Deduplicate predictions based on home_team, away_team, and date (within 30 hours) to avoid duplicates from multiple scraper sources
  const deduplicated = [];
  for (const row of rawRows) {
    if (!row.home_team || !row.away_team) continue;
    const homeClean = row.home_team.toLowerCase().trim();
    const awayClean = row.away_team.toLowerCase().trim();
    const rowTime = getMatchTimestamp(row.date, row.time);
    
    const duplicateIndex = deduplicated.findIndex(existing => {
      const extHome = existing.home_team.toLowerCase().trim();
      const extAway = existing.away_team.toLowerCase().trim();
      if (extHome !== homeClean || extAway !== awayClean) return false;
      
      const existingTime = getMatchTimestamp(existing.date, existing.time);
      return Math.abs(rowTime - existingTime) <= 30 * 60 * 60 * 1000; // 30 hours
    });
    
    if (duplicateIndex === -1) {
      deduplicated.push(row);
    } else {
      const existing = deduplicated[duplicateIndex];
      let replace = false;
      // 1. Prefer finished over non-finished
      if (row.is_finished > existing.is_finished) {
        replace = true;
      } else if (row.is_finished === existing.is_finished) {
        // 2. Prefer the one with detailed statistics
        const hasStatsRow = row.statistics_json && row.statistics_json !== 'null' && row.statistics_json !== '';
        const hasStatsExisting = existing.statistics_json && existing.statistics_json !== 'null' && existing.statistics_json !== '';
        if (hasStatsRow && !hasStatsExisting) {
          replace = true;
        } else if (hasStatsRow === hasStatsExisting) {
          // 3. Prefer a standard ID (numeric or link) over default ID (containing underscore)
          const isDefaultIdRow = row.match_id.includes('_');
          const isDefaultIdExisting = existing.match_id.includes('_');
          if (!isDefaultIdRow && isDefaultIdExisting) {
            replace = true;
          } else if (isDefaultIdRow === isDefaultIdExisting) {
            // 4. Prefer the most recently scraped
            if (new Date(row.scraped_at) > new Date(existing.scraped_at)) {
              replace = true;
            }
          }
        }
      }
      if (replace) {
        deduplicated[duplicateIndex] = row;
      }
    }
  }
  const rows = deduplicated;
  
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
  const allTeamMatchesMap = new Map();

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

    // All team history (limit 10 for SOS lookup)
    if (!allTeamMatchesMap.has(home)) {
      allTeamMatchesMap.set(home, []);
    }
    const allHomeArr = allTeamMatchesMap.get(home);
    if (allHomeArr.length < 10) {
      allHomeArr.push(m);
    }

    if (!allTeamMatchesMap.has(away)) {
      allTeamMatchesMap.set(away, []);
    }
    const allAwayArr = allTeamMatchesMap.get(away);
    if (allAwayArr.length < 10) {
      allAwayArr.push(m);
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

  const deltas = await getSportsCalibrationDeltas(dbQueryFn);

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
  
  // Fetch settings from settings table
  let valueBetMinEdge = 5;
  let footballCornerLine = 4.5;
  let useGbdtModels = true;
  try {
    const settingsRows = await dbQueryFn("SELECT * FROM settings WHERE key IN ('value_bet_min_edge', 'football_corner_line', 'use_gbdt_models')");
    if (settingsRows && Array.isArray(settingsRows)) {
      for (const r of settingsRows) {
        if (r.key === 'value_bet_min_edge') valueBetMinEdge = parseFloat(r.value) || 5;
        if (r.key === 'football_corner_line') footballCornerLine = parseFloat(r.value) || 4.5;
        if (r.key === 'use_gbdt_models') useGbdtModels = r.value === 'true';
      }
    }
  } catch (err) {
    console.warn("[Prediction Fetcher] Could not query settings:", err.message);
  }

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
    console.warn("[Prediction Fetcher] Could not calculate basketball league averages:", err.message);
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
    
    const sport = (row.sport || 'football').toLowerCase().trim();
    const currentCalibrationDelta = sport === 'football' 
      ? deltas.football 
      : (sport === 'basketball' ? deltas.basketball : deltas.other);

    const enriched = enrichMatchPredictions(
      row, 
      leagueAverages, 
      normalizedH2H, 
      normalizedHome, 
      normalizedAway, 
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
