import { dbQuery } from '../src/db/database.js';

async function checkFootball() {
  console.log("Checking upcoming football matches in DB...");
  try {
    const results = await dbQuery(`
      SELECT match_id, home_team, away_team, date, time, is_finished, statistics_json
      FROM scraped_predictions
      WHERE sport = 'football' AND is_finished = 0
      LIMIT 5
    `);
    
    console.log(`Found ${results.length} upcoming football matches:`);
    for (const r of results) {
      console.log(`- ${r.date} ${r.time} | ${r.home_team} vs ${r.away_team} | ID: ${r.match_id}`);
      console.log(`  Stats JSON: ${r.statistics_json}`);
    }
  } catch (err) {
    console.error("Error querying:", err);
  }
  process.exit(0);
}

setTimeout(checkFootball, 1000);
