import { dbQuery } from '../src/db/database.js';

async function main() {
  try {
    const betsCount = await dbQuery("SELECT COUNT(*) as count FROM bets");
    console.log(`Total bets: ${betsCount[0].count}`);

    const statusCounts = await dbQuery("SELECT status, COUNT(*) as count FROM bets GROUP BY status");
    console.log("\nBets by status:");
    statusCounts.forEach(r => console.log(`- ${r.status}: ${r.count}`));

    const leagues = await dbQuery("SELECT league, COUNT(*) as count FROM bets GROUP BY league");
    console.log("\nBets by league:");
    leagues.forEach(r => console.log(`- ${r.league}: ${r.count}`));

    const sample = await dbQuery("SELECT * FROM bets ORDER BY id DESC LIMIT 5");
    console.log("\nSample bets:");
    sample.forEach(b => console.log(`- [${b.id}] ${b.date} : ${b.home_team} vs ${b.away_team} | Stake: ${b.stake} | Status: ${b.status} | Payout: ${b.payout}`));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

setTimeout(main, 1000);
