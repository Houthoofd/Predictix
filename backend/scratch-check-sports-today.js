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
    const rows = await dbQuery(`
      SELECT sport, COUNT(*) as count, SUM(CASE WHEN statistics_json IS NOT NULL THEN 1 ELSE 0 END) as with_stats
      FROM scraped_predictions
      WHERE date = '2026-06-06'
      GROUP BY sport
    `);
    console.log("Today's matches in DB grouped by sport:");
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    db.close();
  }
}

diagnose();
