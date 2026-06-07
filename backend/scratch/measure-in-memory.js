import { dbQuery, dbGet } from '../src/db/database.js';
import { computeLeagueAverages, getLeagueKey, calculateRegressedAverages } from '../src/utils/predictionAverages.js';
import { enrichMatchPredictions } from '../src/utils/predictionEngine.js';

async function measureInMemory() {
  console.time('Total Execution');
  
  // 1. Fetch upcoming matches
  console.time('Fetch upcoming');
  const rows = await dbQuery('SELECT * FROM scraped_predictions WHERE is_historical = 0 ORDER BY scraped_at DESC, time ASC');
  console.timeEnd('Fetch upcoming');
  console.log(`Loaded ${rows.length} upcoming matches.`);

  // 2. Fetch all finished matches once
  console.time('Fetch all finished');
  const allFinished = await dbQuery(`
    SELECT first_half_corners_home, first_half_corners_away, home_team, away_team, home_logo, away_logo, score, date, time, tournament, statistics_json, sport
    FROM scraped_predictions 
    WHERE is_finished = 1
    ORDER BY date DESC
  `);
  console.timeEnd('Fetch all finished');
  console.log(`Loaded ${allFinished.length} finished matches.`);

  // 3. Build in-memory indexes
  console.time('Build in-memory indexes');
  const homeMatchesMap = new Map();
  const awayMatchesMap = new Map();
  const h2hMatchesMap = new Map();
  const allHistoricalMatches = [];

  for (const m of allFinished) {
    const home = m.home_team;
    const away = m.away_team;
    
    // For league averages (is_historical = 1 or finished with corners)
    // Wait, in predictionEngine, it fetches:
    // SELECT tournament, home_team, away_team, first_half_corners_home, first_half_corners_away FROM scraped_predictions WHERE is_historical = 1 AND first_half_corners_home IS NOT NULL
    // But finished matches can also be used, let's keep it separate or query it. Let's just do a quick query for that or index it too.
    
    // Index home matches
    if (!homeMatchesMap.has(home)) {
      homeMatchesMap.set(home, []);
    }
    const homeArr = homeMatchesMap.get(home);
    if (homeArr.length < 10) {
      homeArr.push(m);
    }

    // Index away matches
    if (!awayMatchesMap.has(away)) {
      awayMatchesMap.set(away, []);
    }
    const awayArr = awayMatchesMap.get(away);
    if (awayArr.length < 10) {
      awayArr.push(m);
    }

    // Index H2H matches (order-independent key)
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
  console.timeEnd('Build in-memory indexes');

  // 4. Fetch historical matches for league averages
  console.time('Fetch league averages data');
  const leagueAvgRows = await dbQuery(`
    SELECT tournament, home_team, away_team, first_half_corners_home, first_half_corners_away 
    FROM scraped_predictions 
    WHERE is_historical = 1 AND first_half_corners_home IS NOT NULL
  `);
  const leagueAverages = computeLeagueAverages(leagueAvgRows);
  console.timeEnd('Fetch league averages data');

  // 5. Fetch custom logos map
  console.time('Fetch custom logos');
  let customLogosMap = {};
  const customLogosRows = await dbQuery("SELECT * FROM custom_team_logos");
  for (const cl of customLogosRows) {
    customLogosMap[cl.team_name.toLowerCase().trim()] = cl.logo_url;
  }
  console.timeEnd('Fetch custom logos');

  // 6. Enrich all predictions in memory
  console.time('Enrich in-memory');
  const activeCrawlHistoryMatches = new Set();
  const enrichedRows = [];

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

    const enriched = enrichMatchPredictions(
      row, 
      leagueAverages, 
      normalizedH2H, 
      normalizedHome, 
      normalizedAway, 
      activeCrawlHistoryMatches, 
      customLogosMap
    );
    enrichedRows.push(enriched);
  }
  console.timeEnd('Enrich in-memory');
  console.timeEnd('Total Execution');
  
  console.log(`Enriched ${enrichedRows.length} predictions in total.`);
  process.exit(0);
}

setTimeout(measureInMemory, 1000);
