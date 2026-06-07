import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../predictix.db');
const db = new sqlite3.Database(dbPath);

db.all(`
  SELECT match_id, home_team, away_team, score, date, is_finished, statistics_json 
  FROM scraped_predictions 
  WHERE (home_team LIKE '%Spurs%' OR away_team LIKE '%Spurs%') AND is_finished = 1
`, [], (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log(`Found ${rows.length} finished Spurs matches:`);
    rows.forEach(r => {
      console.log(`- ${r.home_team} vs ${r.away_team} (${r.date}) -> ID: ${r.match_id}, Score: ${r.score}`);
      console.log(`  statistics_json:`, r.statistics_json);
    });
  }
  db.close();
});
