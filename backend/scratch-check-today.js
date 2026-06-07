import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('predictix.db');

const dbQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function diagnose() {
  try {
    const activeStrategies = await dbQuery("SELECT * FROM custom_strategies WHERE status = 'ACTIVE'");
    console.log(`Active strategies: ${activeStrategies.length}`);
    activeStrategies.forEach(s => {
      console.log(` - ${s.name} (ID: ${s.id}, Metric: ${s.metric}, status: ${s.status})`);
    });

    const matches = await dbQuery("SELECT match_id, date, time, sport, tournament, home_team, away_team, is_historical FROM scraped_predictions WHERE is_historical = 0");
    console.log(`\nTotal scheduled matches (is_historical = 0): ${matches.length}`);

    // Print count of matches grouped by date format and value
    const dateCounts = {};
    matches.forEach(m => {
      dateCounts[m.date] = (dateCounts[m.date] || 0) + 1;
    });
    console.log('\nMatches grouped by date:');
    console.log(dateCounts);

    // Let's analyze June 6th matches specifically
    const todayMatches = matches.filter(m => m.date === '06 juin 2026' || m.date === '2026-06-06');
    console.log(`\nFound ${todayMatches.length} matches for today (06 juin 2026 or 2026-06-06):`);
    
    // Check coverage rate per league in the DB
    const coverageRows = await dbQuery(`
      SELECT 
        tournament,
        ROUND(CAST(SUM(CASE WHEN statistics_json IS NOT NULL THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 1) as coverage_rate,
        COUNT(*) as total
      FROM scraped_predictions
      WHERE is_historical = 0 AND is_finished = 1
      GROUP BY tournament
    `);
    const coverageMap = new Map();
    for (const row of coverageRows) {
      coverageMap.set(row.tournament, row.coverage_rate);
    }

    console.log(`\n--- Inspecting first 10 matches for today ---`);
    for (let i = 0; i < Math.min(10, todayMatches.length); i++) {
      const match = todayMatches[i];
      const coverage = coverageMap.get(match.tournament) || 0;
      
      const h2hMatches = await dbQuery(`
        SELECT * FROM scraped_predictions 
        WHERE is_finished = 1 
          AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))
        ORDER BY date DESC LIMIT 15
      `, [match.home_team, match.away_team, match.away_team, match.home_team]);

      console.log(`\nMatch: ${match.home_team} vs ${match.away_team} (${match.sport})`);
      console.log(` - Date: ${match.date}`);
      console.log(` - League: ${match.tournament}`);
      console.log(` - League Coverage Rate: ${coverage}%`);
      console.log(` - Historical H2H matches in DB: ${h2hMatches.length}`);
      
      if (h2hMatches.length > 0) {
        h2hMatches.forEach((h, hIdx) => {
          console.log(`    H2H #${hIdx+1}: ${h.home_team} ${h.score} ${h.away_team} | Date: ${h.date} | Stats: ${h.statistics_json ? 'Yes' : 'No'}`);
        });
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    db.close();
  }
}

diagnose();
