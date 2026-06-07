import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('predictix.db');

db.all("SELECT date, is_historical, is_finished, tournament, home_team, away_team, score, statistics_json IS NOT NULL as has_stats FROM scraped_predictions WHERE date LIKE '%juin 2026%' ORDER BY date DESC", (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log(`Found ${rows.length} matches for June 2026:`);
    console.log(rows.slice(0, 15));
  }
  db.close();
});
