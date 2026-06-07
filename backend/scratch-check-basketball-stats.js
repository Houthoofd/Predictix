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

async function diagnose() {
  try {
    const rows = await dbQuery("SELECT match_id, home_team, away_team, statistics_json, sport FROM scraped_predictions WHERE sport = 'basketball' AND statistics_json IS NOT NULL LIMIT 2");
    console.log(`Found ${rows.length} basketball matches with stats.`);
    for (const r of rows) {
      console.log(`\nMatch: ${r.home_team} vs ${r.away_team}`);
      const stats = JSON.parse(r.statistics_json);
      console.log("Keys:", Object.keys(stats));
      console.log("Stats values:");
      console.log(stats);
    }
  } catch (err) {
    console.error(err);
  } finally {
    db.close();
  }
}

diagnose();
