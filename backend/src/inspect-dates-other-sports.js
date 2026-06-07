import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../predictix.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open database:', err);
    process.exit(1);
  }
});

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function run() {
  try {
    console.log("=== Non-Football Matches by Date ===");
    const rows = await query(`
      SELECT sport, date, is_finished, is_historical, COUNT(*) as count 
      FROM scraped_predictions 
      WHERE sport != 'football' AND is_historical = 0
      GROUP BY sport, date, is_finished
      ORDER BY date DESC
    `);
    console.log(rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    db.close();
  }
}

run();
