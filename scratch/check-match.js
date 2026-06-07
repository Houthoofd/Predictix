import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Database is at e:\Developpement\Predictix\predictix.db
const dbPath = path.resolve(__dirname, '../../predictix.db');

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
    console.log("=== Querying for Toronto/Chicago matches ===");
    const matches = await query(`
      SELECT * 
      FROM scraped_predictions 
      WHERE home_team LIKE '%Toronto%' OR away_team LIKE '%Toronto%'
         OR home_team LIKE '%Chicago%' OR away_team LIKE '%Chicago%'
    `);
    console.log(`Found ${matches.length} matches:`);
    matches.forEach(m => {
      console.log(`ID: ${m.match_id} | Sport: ${m.sport} | Home: ${m.home_team} | Away: ${m.away_team} | Date: ${m.date} | Historical: ${m.is_historical} | Finished: ${m.is_finished}`);
    });
  } catch (err) {
    console.error("Error:", err);
  } finally {
    db.close();
  }
}

run();
