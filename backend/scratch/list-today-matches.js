import { dbQuery } from '../src/db/database.js';

async function listToday() {
  const targetDate = '2026-06-07';
  console.log(`Checking matches in DB for date: ${targetDate}`);
  try {
    const results = await dbQuery(`
      SELECT match_id, home_team, away_team, date, time, tournament, sport, is_historical, is_finished, score
      FROM scraped_predictions
      WHERE date = ? OR scraped_at LIKE '%2026-06-07%'
      ORDER BY sport, time ASC
    `, [targetDate]);
    
    console.log(`Found ${results.length} matches:`);
    for (const r of results) {
      console.log(`- [${r.sport}] ${r.date} ${r.time} | ${r.tournament} | ${r.home_team} vs ${r.away_team} | ID: ${r.match_id} | Hist: ${r.is_historical}`);
    }
  } catch (err) {
    console.error("Error querying:", err);
  }
  process.exit(0);
}

setTimeout(listToday, 1000);
