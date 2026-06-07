import sqlite3 from 'sqlite3';

const dbPath = 'predictix.db';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open database:', err);
    process.exit(1);
  }
});

db.all('SELECT match_id, home_team, away_team, date, tournament FROM scraped_predictions WHERE is_finished = 0', [], (err, rows) => {
  if (err) {
    console.error('Error querying upcoming:', err);
  } else {
    console.log(`\nFound ${rows.length} upcoming matches scheduled for today:`);
    rows.forEach((r, idx) => {
      console.log(`[${idx+1}] ID: ${r.match_id}`);
      console.log(`    Fixture: ${r.home_team} vs ${r.away_team}`);
      console.log(`    Tournament: ${r.tournament}`);
      console.log(`    Time/Date: ${r.date}`);
      console.log('---------------------------------------------');
    });
  }
  db.close();
});
