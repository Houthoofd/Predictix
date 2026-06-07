import db from '../src/db/database.js';

function runQuery(sql) {
  return new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function apply() {
  console.log("Applying indexes to optimize performance...");
  try {
    console.time("Indexes creation");
    await runQuery("CREATE INDEX IF NOT EXISTS idx_predictions_historical_date ON scraped_predictions(is_historical, date)");
    await runQuery("CREATE INDEX IF NOT EXISTS idx_predictions_home_finished ON scraped_predictions(home_team, is_finished, date DESC)");
    await runQuery("CREATE INDEX IF NOT EXISTS idx_predictions_away_finished ON scraped_predictions(away_team, is_finished, date DESC)");
    await runQuery("CREATE INDEX IF NOT EXISTS idx_bets_match_pending ON bets(match_id, status)");
    await runQuery("CREATE INDEX IF NOT EXISTS idx_bets_date ON bets(date, time)");
    console.timeEnd("Indexes creation");
    console.log("Indexes applied successfully!");
  } catch (err) {
    console.error("Error creating indexes:", err);
  }
  process.exit(0);
}

setTimeout(apply, 1000);
