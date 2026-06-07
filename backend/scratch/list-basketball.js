import { dbQuery } from '../src/db/database.js';

async function listBasketball() {
  try {
    const results = await dbQuery(`
      SELECT match_id, home_team, away_team, date, time, tournament, sport, is_historical, is_finished, score
      FROM scraped_predictions
      WHERE sport = 'basketball' AND (date LIKE '%2026-06-07%' OR date LIKE '%2026-06-08%')
    `);
    
    console.log(`Found ${results.length} basketball matches:`);
    for (const r of results) {
      console.log(`- ${r.date} ${r.time} | ${r.tournament} | ${r.home_team} vs ${r.away_team} | ID: ${r.match_id} | Hist: ${r.is_historical}`);
    }
  } catch (err) {
    console.error("Error querying:", err);
  }
  process.exit(0);
}

setTimeout(listBasketball, 1000);
