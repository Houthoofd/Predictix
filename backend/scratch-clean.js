import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('predictix.db', (err) => {
  if (err) {
    console.error('Failed to open database:', err);
    process.exit(1);
  }
});

db.serialize(() => {
  // Clean home_team and away_team names in scraped_predictions
  db.run(`
    UPDATE scraped_predictions 
    SET home_team = TRIM(REPLACE(REPLACE(home_team, '▲', ''), '▼', '')),
        away_team = TRIM(REPLACE(REPLACE(away_team, '▲', ''), '▼', ''))
  `, function(err) {
    if (err) {
      console.error('Error cleaning team names in scraped_predictions:', err.message);
    } else {
      console.log(`Cleaned up team names in scraped_predictions! Rows updated: ${this.changes}`);
    }
  });

  // Verify predictions
  db.all('SELECT match_id, home_team, away_team FROM scraped_predictions LIMIT 10', [], (err, rows) => {
    if (err) {
      console.error('Error verifying rows:', err.message);
    } else {
      console.log('\nSample Cleaned Predictions:');
      rows.forEach(r => {
        console.log(`- [${r.match_id}] ${r.home_team} vs ${r.away_team}`);
      });
    }
    db.close();
  });
});
