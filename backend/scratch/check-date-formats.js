import { dbQuery } from '../src/db/database.js';
import { parseFrenchDate } from '../src/utils/scraperHelpers.js';

async function check() {
  try {
    const historicalSamples = await dbQuery("SELECT match_id, date, is_historical FROM scraped_predictions WHERE is_historical = 1 LIMIT 5");
    console.log("Historical match dates (is_historical = 1):");
    historicalSamples.forEach(r => {
      console.log(`- [${r.match_id}] Date: "${r.date}" -> Parsed: "${parseFrenchDate(r.date)}"`);
    });

    const primarySamples = await dbQuery("SELECT match_id, date, is_historical FROM scraped_predictions WHERE is_historical = 0 LIMIT 5");
    console.log("\nPrimary match dates (is_historical = 0):");
    primarySamples.forEach(r => {
      console.log(`- [${r.match_id}] Date: "${r.date}" -> Parsed: "${parseFrenchDate(r.date)}"`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

setTimeout(check, 1000);
