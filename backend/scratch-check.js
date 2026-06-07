import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('predictix.db', (err) => {
  if (err) {
    console.error('Failed to open database:', err);
    process.exit(1);
  }
});

db.all(`
  SELECT match_id, date, time, sport, tournament, home_team, away_team, scraped_at
  FROM scraped_predictions 
  WHERE is_historical = 0
  ORDER BY scraped_at DESC 
  LIMIT 30
`, [], (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log('--- Latest Scheduled Predictions (is_historical = 0) ---');
    rows.forEach(r => {
      console.log(`ID: ${r.match_id} | Date: ${r.date} | Sport: ${r.sport} | Match: ${r.home_team} vs ${r.away_team} | ScrapedAt: ${r.scraped_at}`);
    });
  }
  db.close();
});
