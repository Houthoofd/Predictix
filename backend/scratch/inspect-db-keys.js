import { dbQuery } from '../src/db/database.js';

async function main() {
  try {
    const rows = await dbQuery(`
      SELECT match_id, home_team, away_team, date, statistics_json 
      FROM scraped_predictions 
      WHERE is_finished = 1 AND statistics_json IS NOT NULL AND length(statistics_json) > 4
      LIMIT 10
    `);
    
    console.log(`Found ${rows.length} finished matches with statistics:`);
    for (const r of rows) {
      console.log(`\nMatch: [${r.match_id}] ${r.home_team} vs ${r.away_team} (Date: ${r.date})`);
      try {
        const stats = JSON.parse(r.statistics_json);
        console.log('Stats Keys:', Object.keys(stats));
      } catch (e) {
        console.log('Error parsing stats JSON:', e.message);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

main();
