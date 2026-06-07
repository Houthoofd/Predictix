import sqlite3 from 'sqlite3';

const dbPath = 'e:\\Developpement\\Predictix\\predictix.db';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open database:', err);
    process.exit(1);
  }
});

db.all(`
  SELECT match_id, home_team, away_team, historical_links, is_historical, score, time 
  FROM scraped_predictions 
  WHERE is_historical = 0
`, [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log(`Found ${rows.length} non-historical predictions:`);
    rows.forEach(r => {
      let linksList = [];
      try {
        linksList = JSON.parse(r.historical_links || '[]');
      } catch (e) {}
      if (linksList.length > 0) {
        console.log(`[${r.match_id}] ${r.home_team} vs ${r.away_team} -> Score: ${r.score}, Time: ${r.time}`);
        console.log(`  Links count: ${linksList.length}`);
        console.log(`  Links: ${JSON.stringify(linksList.slice(0, 3))}`);
      }
    });
  }
  db.close();
});
