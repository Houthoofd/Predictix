import { dbQuery } from '../src/db/database.js';

async function check() {
  console.log("Checking coverage rows in DB...");
  try {
    const coverageRows = await dbQuery(`
      SELECT 
        tournament,
        COUNT(*) as total_matches,
        SUM(CASE WHEN is_finished = 1 THEN 1 ELSE 0 END) as finished_matches,
        SUM(CASE WHEN statistics_json IS NOT NULL THEN 1 ELSE 0 END) as matches_with_stats,
        ROUND(CAST(SUM(CASE WHEN statistics_json IS NOT NULL THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 1) as coverage_rate
      FROM scraped_predictions
      WHERE is_historical = 0 AND is_finished = 1
      GROUP BY tournament
    `);
    
    console.log(`Coverage rows (${coverageRows.length}):`);
    for (const r of coverageRows) {
      console.log(`- ${r.tournament}: total=${r.total_matches}, finished=${r.finished_matches}, with_stats=${r.matches_with_stats}, rate=${r.coverage_rate}%`);
    }
    
    console.log("\nChecking all upcoming matches and their tournaments:");
    const upcoming = await dbQuery(`
      SELECT match_id, home_team, away_team, tournament, date, time
      FROM scraped_predictions
      WHERE is_historical = 0
      ORDER BY date ASC
      LIMIT 10
    `);
    for (const u of upcoming) {
      console.log(`- [${u.date}] ${u.home_team} vs ${u.away_team} | Tournament: "${u.tournament}" | ID: ${u.match_id}`);
    }
  } catch (err) {
    console.error("Error querying:", err);
  }
  process.exit(0);
}

setTimeout(check, 1000);
