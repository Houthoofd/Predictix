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
    const rows = await dbQuery("SELECT match_id, home_team, away_team, score, statistics_json FROM scraped_predictions WHERE sport = 'basketball' AND is_finished = 1");
    console.log(`Checking ${rows.length} finished basketball matches:`);
    for (const r of rows) {
      const hasScore = r.score && r.score.trim() !== '';
      const hasStats = r.statistics_json && r.statistics_json.trim() !== '' && r.statistics_json !== '{}';
      console.log(`- Match: ${r.home_team} vs ${r.away_team} | Has Score: ${hasScore} (${r.score}) | Has Stats: ${hasStats}`);
    }
  } catch (e) {
    console.error(e);
  } finally {
    db.close();
  }
}

test();
