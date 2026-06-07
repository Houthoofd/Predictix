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
    const rows = await dbQuery("SELECT * FROM scraped_predictions WHERE (home_team LIKE '%Spurs%' OR away_team LIKE '%Spurs%')");
    console.log(`Found ${rows.length} total Spurs matches:`);
    rows.forEach(r => {
      console.log(`- ID: ${r.match_id} | ${r.home_team} vs ${r.away_team} | Sport: ${r.sport} | Is Historical: ${r.is_historical} | Is Finished: ${r.is_finished} | Score: ${r.score}`);
    });
  } catch (e) {
    console.error(e);
  } finally {
    db.close();
  }
}

test();
