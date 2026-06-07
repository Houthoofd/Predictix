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

async function check() {
  try {
    const matches = await dbQuery("SELECT match_id, home_team, away_team, date FROM scraped_predictions WHERE date LIKE '%05 juin 2026%' AND is_historical = 0");
    console.log(`Checking ${matches.length} matches for June 5th 2026...`);

    let foundAnyWithH2HStats = 0;
    for (const m of matches) {
      const h2h = await dbQuery(`
        SELECT match_id, home_team, away_team, date, is_finished, statistics_json
        FROM scraped_predictions
        WHERE is_finished = 1
          AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))
      `, [m.home_team, m.away_team, m.away_team, m.home_team]);
      
      const withStats = h2h.filter(h => h.statistics_json && h.statistics_json !== 'null' && h.statistics_json !== '');
      
      if (withStats.length > 0) {
        console.log(`- ${m.home_team} vs ${m.away_team}: Found ${h2h.length} H2Hs, ${withStats.length} with stats.`);
        foundAnyWithH2HStats++;
      }
    }
    
    if (foundAnyWithH2HStats === 0) {
      console.log("No matches for June 5th have any H2H matches with stats in the database!");
    }
  } catch (error) {
    console.error(error);
  } finally {
    db.close();
  }
}

check();
