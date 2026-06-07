import db, { dbQuery } from './src/db/database.js';

async function check() {
  try {
    const total = await dbQuery("SELECT COUNT(*) as count FROM scraped_predictions");
    console.log("Total predictions in DB:", total[0].count);

    const countsByStatus = await dbQuery("SELECT status, COUNT(*) as count FROM scraped_predictions GROUP BY status");
    console.log("Counts by status:", countsByStatus);

    const countsByIsFinished = await dbQuery("SELECT is_finished, COUNT(*) as count FROM scraped_predictions GROUP BY is_finished");
    console.log("Counts by is_finished:", countsByIsFinished);

    const sample = await dbQuery("SELECT match_id, home_team, away_team, date, time, tournament, is_finished, score FROM scraped_predictions WHERE is_historical = 0 ORDER BY scraped_at DESC LIMIT 20");
    console.log("\nSample primary predictions (not historical):");
    sample.forEach(row => {
      console.log(`- [${row.match_id}] ${row.home_team} vs ${row.away_team} | Date: ${row.date} | Time: ${row.time} | Tournament: ${row.tournament} | Finished: ${row.is_finished} | Score: ${row.score}`);
    });

    process.exit(0);
  } catch (err) {
    console.error("Check failed:", err);
    process.exit(1);
  }
}

setTimeout(check, 500);
