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

async function check() {
  try {
    // 1. Get dates present in database
    console.log("=== Dates in scraped_predictions ===");
    const dates = await dbQuery("SELECT date, COUNT(*) as count FROM scraped_predictions GROUP BY date ORDER BY date");
    console.log(dates);

    // 2. Find any matches around June 5th
    console.log("\n=== Matches around June 5 ===");
    const matchesJune5 = await dbQuery("SELECT match_id, home_team, away_team, date, time, tournament, is_historical, is_finished FROM scraped_predictions WHERE date LIKE '%05 juin%' OR date LIKE '%june 5%' OR date LIKE '%05/06%'");
    console.log(`Found ${matchesJune5.length} matches for June 5th:`);
    matchesJune5.forEach(m => {
      console.log(`- [${m.tournament}] ${m.home_team} vs ${m.away_team} on ${m.date} at ${m.time} (historical: ${m.is_historical}, finished: ${m.is_finished})`);
    });

    if (matchesJune5.length === 0) {
      console.log("No matches found for June 5th at all.");
      db.close();
      return;
    }

    // 3. Check if there are active strategies
    const activeStrategies = await dbQuery("SELECT * FROM custom_strategies WHERE status = 'ACTIVE'");
    console.log(`\n=== Active Strategies (${activeStrategies.length}) ===`);
    activeStrategies.forEach(s => {
      console.log(`- [${s.id}] ${s.name} (${s.metric})`);
    });

    // 4. Check coverage rates for the tournaments of these matches
    console.log("\n=== Tournaments Coverage for June 5 Matches ===");
    const tournaments = [...new Set(matchesJune5.map(m => m.tournament))];
    for (const tourn of tournaments) {
      const cov = await dbQuery(`
        SELECT 
          COUNT(*) as total_matches,
          SUM(CASE WHEN statistics_json IS NOT NULL THEN 1 ELSE 0 END) as matches_with_stats,
          ROUND(CAST(SUM(CASE WHEN statistics_json IS NOT NULL THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 1) as coverage_rate
        FROM scraped_predictions
        WHERE tournament = ?
      `, [tourn]);
      console.log(`- ${tourn}: Total matches: ${cov[0].total_matches}, with stats: ${cov[0].matches_with_stats}, coverage: ${cov[0].coverage_rate}%`);
    }

    // 5. Check H2H matches for June 5 matches
    console.log("\n=== H2H Stats for June 5 Matches ===");
    for (const m of matchesJune5) {
      const h2h = await dbQuery(`
        SELECT match_id, home_team, away_team, date, is_finished, statistics_json IS NOT NULL as has_stats
        FROM scraped_predictions
        WHERE is_finished = 1
          AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))
      `, [m.home_team, m.away_team, m.away_team, m.home_team]);
      console.log(`- ${m.home_team} vs ${m.away_team}: Found ${h2h.length} finished H2H matches (${h2h.filter(h => h.has_stats).length} with stats)`);
    }

  } catch (error) {
    console.error("Error running diagnostics:", error);
  } finally {
    db.close();
  }
}

check();
