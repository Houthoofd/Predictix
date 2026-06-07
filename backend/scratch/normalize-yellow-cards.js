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

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

async function migrate() {
  try {
    const rows = await dbQuery("SELECT match_id, statistics_json FROM scraped_predictions WHERE statistics_json LIKE '%cartons_janues%'");
    console.log(`Found ${rows.length} matches with 'cartons_janues' to normalize.`);
    
    let updated = 0;
    await dbRun("BEGIN TRANSACTION");
    for (const r of rows) {
      try {
        const stats = JSON.parse(r.statistics_json);
        if (stats.cartons_janues !== undefined) {
          stats.yellow_cards = stats.cartons_janues;
          delete stats.cartons_janues;
          await dbRun("UPDATE scraped_predictions SET statistics_json = ? WHERE match_id = ?", [JSON.stringify(stats), r.match_id]);
          updated++;
        }
      } catch (e) {
        console.error(`Error parsing stats for ${r.match_id}:`, e.message);
      }
    }
    await dbRun("COMMIT");
    console.log(`Successfully normalized ${updated} matches in SQLite.`);
  } catch (err) {
    try { await dbRun("ROLLBACK"); } catch (e) {}
    console.error("Migration failed:", err);
  } finally {
    db.close();
  }
}

migrate();
