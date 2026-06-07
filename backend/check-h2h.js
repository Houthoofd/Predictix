import sqlite3 from 'sqlite3';

const dbPath = './predictix.db';
const db = new sqlite3.Database(dbPath);

db.all("SELECT match_id, tournament, home_team, away_team, date, time, is_historical FROM scraped_predictions WHERE is_historical = 0 LIMIT 10", [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('--- Primary Match Predictions ---');
    console.log(rows);
  }
  db.close();
});
