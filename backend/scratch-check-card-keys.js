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

async function diagnose() {
  try {
    const rows = await dbQuery("SELECT statistics_json FROM scraped_predictions WHERE statistics_json IS NOT NULL");
    let countJanues = 0;
    let countYellowCards = 0;
    let total = 0;

    for (const r of rows) {
      try {
        const stats = JSON.parse(r.statistics_json);
        total++;
        if (stats.cartons_janues !== undefined) countJanues++;
        if (stats.yellow_cards !== undefined) countYellowCards++;
      } catch (e) {}
    }

    console.log(`Total statistics parsed: ${total}`);
    console.log(`Matches with 'cartons_janues' (typo): ${countJanues}`);
    console.log(`Matches with 'yellow_cards': ${countYellowCards}`);
  } catch (err) {
    console.error(err);
  } finally {
    db.close();
  }
}

diagnose();
