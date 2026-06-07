import sqlite3 from 'sqlite3';

const dbPath = 'e:\\Developpement\\Predictix\\predictix.db';
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
    console.log("=== Active Strategies ===");
    const activeStrategies = await query("SELECT * FROM custom_strategies WHERE status = 'ACTIVE'");
    console.log(`Found ${activeStrategies.length} active strategies:`);
    activeStrategies.forEach(s => {
      console.log(`- [ID: ${s.id}] Name: "${s.name}", Metric: "${s.metric}", Conditions: ${s.conditions_json}`);
    });

    console.log("\n=== Total matches in DB ===");
    const counts = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_historical = 0 THEN 1 ELSE 0 END) as main_matches,
        SUM(CASE WHEN is_historical = 1 THEN 1 ELSE 0 END) as historical_matches,
        SUM(CASE WHEN is_finished = 1 THEN 1 ELSE 0 END) as finished_matches,
        SUM(CASE WHEN statistics_json IS NOT NULL THEN 1 ELSE 0 END) as matches_with_stats
      FROM scraped_predictions
    `);
    console.log(JSON.stringify(counts[0], null, 2));

    console.log("\n=== Main Matches by Sport ===");
    const sportsCounts = await query(`
      SELECT sport, COUNT(*) as count 
      FROM scraped_predictions 
      WHERE is_historical = 0 
      GROUP BY sport
    `);
    console.log(sportsCounts);

    console.log("\n=== Coverage rate calculation (is_historical = 0 AND is_finished = 1) ===");
    const coverageRows = await query(`
      SELECT 
        tournament,
        COUNT(*) as total_main_finished,
        SUM(CASE WHEN statistics_json IS NOT NULL THEN 1 ELSE 0 END) as with_stats,
        ROUND(CAST(SUM(CASE WHEN statistics_json IS NOT NULL THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 1) as coverage_rate
      FROM scraped_predictions
      WHERE is_historical = 0 AND is_finished = 1
      GROUP BY tournament
      LIMIT 10
    `);
    console.log(coverageRows);

    console.log("\n=== Any Main Finished Matches at all? ===");
    const finishedMainCount = await query(`
      SELECT COUNT(*) as count FROM scraped_predictions WHERE is_historical = 0 AND is_finished = 1
    `);
    console.log(`Total is_historical = 0 AND is_finished = 1: ${finishedMainCount[0].count}`);

    console.log("\n=== H2H Matches for Upcoming Matches ===");
    const upcoming = await query(`
      SELECT match_id, home_team, away_team, tournament, sport, date, is_finished 
      FROM scraped_predictions 
      WHERE is_historical = 0 AND is_finished = 0
      LIMIT 5
    `);
    for (const match of upcoming) {
      const h2h = await query(`
        SELECT COUNT(*) as count, SUM(CASE WHEN statistics_json IS NOT NULL THEN 1 ELSE 0 END) as with_stats
        FROM scraped_predictions 
        WHERE is_finished = 1 
          AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))
      `, [match.home_team, match.away_team, match.away_team, match.home_team]);
      console.log(`Match: ${match.home_team} vs ${match.away_team} [${match.sport}] - H2H count: ${h2h[0].count}, with stats: ${h2h[0].with_stats}`);
    }

  } catch (err) {
    console.error("Error running diagnose script:", err);
  } finally {
    db.close();
  }
}

run();
