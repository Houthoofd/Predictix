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
    const dates = await dbQuery("SELECT date, COUNT(*) as count FROM scraped_predictions GROUP BY date ORDER BY date DESC LIMIT 10");
    console.log("=== Top 10 Dates in DB ===");
    console.log(dates);

    const sample = await dbQuery("SELECT match_id, home_team, away_team, date, is_historical, is_finished FROM scraped_predictions WHERE date LIKE '%05 juin%' LIMIT 5");
    console.log("\n=== Sample June 5 matches ===");
    console.log(sample);

    if (sample.length > 0) {
      const match = sample[0];
      console.log(`\n=== Checking H2Hs for ${match.home_team} vs ${match.away_team} ===`);
      
      // Let's find any matches (finished or not, historical or not) with these team names
      const allMatchesForTeams = await dbQuery(`
        SELECT match_id, home_team, away_team, date, is_historical, is_finished, first_half_corners_home
        FROM scraped_predictions
        WHERE home_team LIKE ? OR away_team LIKE ? OR home_team LIKE ? OR away_team LIKE ?
      `, [`%${match.home_team}%`, `%${match.home_team}%`, `%${match.away_team}%`, `%${match.away_team}%`]);
      console.log(allMatchesForTeams);
    }
  } catch (error) {
    console.error(error);
  } finally {
    db.close();
  }
}

check();
