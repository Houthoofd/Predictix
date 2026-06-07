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
    const rows = await dbQuery("SELECT match_id, home_team, away_team, statistics_json, sport FROM scraped_predictions WHERE statistics_json IS NOT NULL LIMIT 5");
    console.log("Found matches with statistics:");
    for (const r of rows) {
      console.log(`\nMatch: ${r.home_team} vs ${r.away_team} (${r.sport})`);
      try {
        const stats = JSON.parse(r.statistics_json);
        console.log("Keys:", Object.keys(stats));
        console.log("Sample statistics:");
        // Print first 5 key-value pairs
        const keys = Object.keys(stats).slice(0, 5);
        for (const k of keys) {
          console.log(` - ${k}:`, stats[k]);
        }
      } catch (e) {
        console.error("JSON parse error:", e.message);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    db.close();
  }
}

diagnose();
