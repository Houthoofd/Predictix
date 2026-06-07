import { dbQuery } from '../src/db/database.js';

async function search() {
  console.log("Searching for 'Toronto', 'Chicago', 'Sky', or 'Tempo' in the database...");
  try {
    const results = await dbQuery(`
      SELECT match_id, home_team, away_team, date, time, tournament, sport, is_historical, is_finished, score
      FROM scraped_predictions
      WHERE home_team LIKE '%Toronto%' OR away_team LIKE '%Toronto%'
         OR home_team LIKE '%Chicago%' OR away_team LIKE '%Chicago%'
         OR home_team LIKE '%Sky%' OR away_team LIKE '%Sky%'
         OR home_team LIKE '%Tempo%' OR away_team LIKE '%Tempo%'
    `);
    
    console.log(`Found ${results.length} matches:`);
    for (const r of results) {
      console.log(`- [${r.sport}] ${r.date} ${r.time} | ${r.tournament} | ${r.home_team} vs ${r.away_team} | ID: ${r.match_id} | Hist: ${r.is_historical} | Fin: ${r.is_finished}`);
    }
  } catch (err) {
    console.error("Error searching:", err);
  }
  process.exit(0);
}

setTimeout(search, 1000);
