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
    const rows = await dbQuery("SELECT match_id, home_team, away_team, score, tournament FROM scraped_predictions WHERE sport = 'basketball' AND is_finished = 1 LIMIT 30");
    console.log(`Found ${rows.length} finished basketball matches:`);
    for (const r of rows) {
      console.log(`- [${r.tournament}] ${r.home_team} vs ${r.away_team} | Score: ${r.score}`);
    }
  } catch (e) {
    console.error(e);
  } finally {
    db.close();
  }
}

check();
