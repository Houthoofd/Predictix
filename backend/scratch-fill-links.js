import fs from 'fs';
import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('predictix.db', (err) => {
  if (err) {
    console.error('Failed to open database:', err);
    process.exit(1);
  }
});

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
};

async function run() {
  const jsonPath = 'E:\\Developpement\\scrapper-v3\\data\\matchendirect\\matchendirect_20260530_2312.json';
  if (!fs.existsSync(jsonPath)) {
    console.error('JSON file not found:', jsonPath);
    db.close();
    process.exit(1);
  }

  console.log('Reading JSON from:', jsonPath);
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const parsed = JSON.parse(rawData);
  const matches = parsed.all_matches || parsed.matches || [];

  console.log(`Found ${matches.length} matches in JSON file. Syncing links...`);
  
  let updatedCount = 0;
  for (const m of matches) {
    if (m.historical_links && m.historical_links.length > 0) {
      const matchId = m.match_id || `${m.home_team}_${m.away_team}_${m.date}`;
      const linksJson = JSON.stringify(m.historical_links);
      
      const changes = await dbRun(
        'UPDATE scraped_predictions SET historical_links = ? WHERE match_id = ? OR (home_team = ? AND away_team = ?)', 
        [linksJson, matchId, m.home_team.replace(/[▲▼]/g, '').trim(), m.away_team.replace(/[▲▼]/g, '').trim()]
      );
      if (changes > 0) {
        updatedCount++;
      }
    }
  }

  console.log(`Successfully updated historical links for ${updatedCount} matches in SQLite!`);
  db.close();
}

run().catch(e => {
  console.error('Error:', e);
  db.close();
});
