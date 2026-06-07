import { dbQuery, dbGet } from './src/db/database.js';

async function main() {
  try {
    const row = await dbGet("SELECT * FROM scraped_predictions WHERE match_id = '4965738'");
    if (!row) {
      console.log('Match 4965738 not found!');
      return;
    }
    
    console.log(`\nEvaluating match: ${row.home_team} vs ${row.away_team}`);
    
    // 1. Direct H2H matches
    const h2hMatches = await dbQuery(`
      SELECT * FROM scraped_predictions 
      WHERE is_finished = 1 
        AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))
      ORDER BY date DESC LIMIT 10
    `, [row.home_team, row.away_team, row.away_team, row.home_team]);
    
    console.log(`\n--- DIRECT H2H MATCHES (Found: ${h2hMatches.length}) ---`);
    h2hMatches.forEach(m => {
      console.log(`[${m.match_id}] ${m.home_team} ${m.score} ${m.away_team} (Date: ${m.date})`);
    });

    // 2. Home team recent matches
    const homeMatches = await dbQuery(`
      SELECT * FROM scraped_predictions 
      WHERE is_finished = 1 
        AND home_team = ?
      ORDER BY date DESC LIMIT 10
    `, [row.home_team]);
    
    console.log(`\n--- HOME TEAM RECENT MATCHES (Found: ${homeMatches.length}) ---`);
    homeMatches.forEach(m => {
      console.log(`[${m.match_id}] ${m.home_team} ${m.score} ${m.away_team} (Date: ${m.date})`);
    });

    // 3. Away team recent matches
    const awayMatches = await dbQuery(`
      SELECT * FROM scraped_predictions 
      WHERE is_finished = 1 
        AND away_team = ?
      ORDER BY date DESC LIMIT 10
    `, [row.away_team]);
    
    console.log(`\n--- AWAY TEAM RECENT MATCHES (Found: ${awayMatches.length}) ---`);
    awayMatches.forEach(m => {
      console.log(`[${m.match_id}] ${m.home_team} ${m.score} ${m.away_team} (Date: ${m.date})`);
    });

  } catch (err) {
    console.error(err);
  }
}

main();
