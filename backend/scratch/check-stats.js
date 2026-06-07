import { dbGet } from '../src/db/database.js';

async function check() {
  const matchId = 'W2hTGps3';
  console.log(`Checking match ID in DB: ${matchId}`);
  try {
    const match = await dbGet('SELECT * FROM scraped_predictions WHERE match_id = ?', [matchId]);
    console.log("Match in DB:");
    console.log(JSON.stringify(match, null, 2));
  } catch (err) {
    console.error("Error querying:", err);
  }
  process.exit(0);
}

setTimeout(check, 1000);
