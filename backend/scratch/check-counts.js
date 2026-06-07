import { dbQuery } from '../src/db/database.js';

async function check() {
  try {
    const finishedCount = await dbQuery("SELECT COUNT(*) as count FROM scraped_predictions WHERE is_historical = 0 AND is_finished = 1");
    console.log(`Finished main matches: ${finishedCount[0].count}`);

    const finishedWithScore = await dbQuery("SELECT COUNT(*) as count FROM scraped_predictions WHERE is_historical = 0 AND is_finished = 1 AND score IS NOT NULL AND score != ''");
    console.log(`Finished matches with score: ${finishedWithScore[0].count}`);

    const sample = await dbQuery("SELECT match_id, home_team, away_team, score, first_half_corners_home, first_half_corners_away, statistics_json FROM scraped_predictions WHERE is_historical = 0 AND is_finished = 1 LIMIT 5");
    console.log("\nSample finished matches:");
    sample.forEach(s => {
      console.log(`- [${s.match_id}] ${s.home_team} vs ${s.away_team} -> Score: ${s.score}, 1MT Corners: ${s.first_half_corners_home}-${s.first_half_corners_away}`);
      console.log(`  Stats JSON: ${s.statistics_json ? s.statistics_json.substring(0, 100) + '...' : 'NULL'}`);
    });

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

setTimeout(check, 1000);
