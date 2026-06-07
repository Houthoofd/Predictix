import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('predictix.db');

const dbQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function test() {
  try {
    // 1. Get an active basketball match (is_historical = 0)
    const matches = await dbQuery("SELECT * FROM scraped_predictions WHERE sport = 'basketball' AND is_historical = 0 LIMIT 5");
    console.log(`Found ${matches.length} active basketball matches.`);
    
    for (const m of matches) {
      console.log(`\nActive match: ${m.home_team} vs ${m.away_team} (ID: ${m.match_id})`);
      
      // Get home team matches (is_finished = 1, home_team = m.home_team)
      const homeMatches = await dbQuery(`
        SELECT home_team, away_team, score, is_finished, sport 
        FROM scraped_predictions 
        WHERE is_finished = 1 AND home_team = ?
      `, [m.home_team]);
      
      console.log(`  Finished home matches for ${m.home_team}: ${homeMatches.length}`);
      homeMatches.forEach(hm => {
        console.log(`    - ${hm.home_team} vs ${hm.away_team} | Score: ${hm.score} | Finished: ${hm.is_finished}`);
      });

      // Get away team matches (is_finished = 1, away_team = m.away_team)
      const awayMatches = await dbQuery(`
        SELECT home_team, away_team, score, is_finished, sport 
        FROM scraped_predictions 
        WHERE is_finished = 1 AND away_team = ?
      `, [m.away_team]);
      
      console.log(`  Finished away matches for ${m.away_team}: ${awayMatches.length}`);
      awayMatches.forEach(am => {
        console.log(`    - ${am.home_team} vs ${am.away_team} | Score: ${am.score} | Finished: ${am.is_finished}`);
      });
    }
  } catch (e) {
    console.error(e);
  } finally {
    db.close();
  }
}

test();
