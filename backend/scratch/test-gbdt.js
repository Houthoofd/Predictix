import { dbQuery } from '../src/db/database.js';
import { trainGBDTModels, enrichMatchPredictions } from '../src/utils/predictionEngine.js';

async function test() {
  try {
    console.log("=== Testing GBDT & Bivariate Poisson Models ===");
    
    // Train GBDT Models
    await trainGBDTModels(dbQuery);
    
    // Query a few finished matches with corners
    const sampleMatches = await dbQuery(`
      SELECT * FROM scraped_predictions
      WHERE first_half_corners_home IS NOT NULL AND first_half_corners_away IS NOT NULL
      LIMIT 5
    `);
    
    console.log(`\nSample Predictions Evaluation (Total available matches for testing: ${sampleMatches.length}):`);
    
    for (const match of sampleMatches) {
      // Dummy arrays for h2h/home/away
      const enriched = enrichMatchPredictions(
        match,
        {},
        [],
        [],
        []
      );
      
      console.log(`\nMatch: ${match.home_team} vs ${match.away_team}`);
      console.log(`Actual 1MT Corners: ${match.first_half_corners_home + match.first_half_corners_away} (Home: ${match.first_half_corners_home}, Away: ${match.first_half_corners_away})`);
      
      const pred = enriched.gbdt_predictions;
      console.log(`GBDT Expected Corners:`);
      console.log(` - 1st Half: ${pred.first_half.expected} (Over 4.5 Prob: ${pred.first_half.over_4_5_prob}%)`);
      console.log(` - 2nd Half: ${pred.second_half.expected} (Over 4.5 Prob: ${pred.second_half.over_4_5_prob}%)`);
      console.log(` - Full Time: ${pred.full_time.expected} (Over 9.5 Prob: ${pred.full_time.over_9_5_prob}%)`);
    }

    console.log("\n✓ SUCCESS: GBDT models and Bivariate Poisson calculations tested successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

setTimeout(test, 1000);
