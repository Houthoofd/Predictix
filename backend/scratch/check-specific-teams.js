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
    const nigerMatches = await dbQuery("SELECT match_id, home_team, away_team, date, is_historical, is_finished, first_half_corners_home FROM scraped_predictions WHERE home_team LIKE '%Niger%' OR away_team LIKE '%Niger%'");
    console.log(`=== Matches for Niger: ${nigerMatches.length} ===`);
    console.log(nigerMatches);

    const mauritanieMatches = await dbQuery("SELECT match_id, home_team, away_team, date, is_historical, is_finished, first_half_corners_home FROM scraped_predictions WHERE home_team LIKE '%Mauritanie%' OR away_team LIKE '%Mauritanie%'");
    console.log(`\n=== Matches for Mauritanie: ${mauritanieMatches.length} ===`);
    console.log(mauritanieMatches);
  } catch (error) {
    console.error(error);
  } finally {
    db.close();
  }
}

check();
