import { dbQuery } from './src/db/database.js';

async function main() {
  try {
    const rows = await dbQuery(`
      SELECT * FROM scraped_predictions 
      WHERE (home_team LIKE '%Bruges%' OR away_team LIKE '%Bruges%')
        AND (home_team LIKE '%Gent%' OR away_team LIKE '%Gent%')
    `);
    console.log('\n--- BRUGES vs GENT MATCHES IN DB ---');
    rows.forEach(r => {
      console.log(`[${r.match_id}] ${r.home_team} vs ${r.away_team}`);
      console.log(`  Date: ${r.date}, Score: ${r.score}, Status: ${r.status}`);
      console.log(`  Is Historical: ${r.is_historical}, Is Finished: ${r.is_finished}`);
      console.log(`  Statistics JSON: ${r.statistics_json}`);
      console.log(`  Fouls: Home: ${r.fouls_home}, Away: ${r.fouls_away}`);
      console.log('-----------------------------');
    });
  } catch (e) {
    console.error(e);
  }
}

main();
