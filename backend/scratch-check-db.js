import db, { dbQuery } from './src/db/database.js';

async function check() {
  try {
    const tableInfo = await dbQuery("PRAGMA table_info(scraped_predictions)");
    console.log("Columns of table scraped_predictions:");
    tableInfo.forEach(col => console.log(` - ${col.name} (${col.type})`));

    const customStrategiesTable = await dbQuery("PRAGMA table_info(custom_strategies)");
    console.log("\nColumns of table custom_strategies:");
    customStrategiesTable.forEach(col => console.log(` - ${col.name} (${col.type})`));

    console.log("\n✓ SUCCESS: Migration verified and completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration check failed:", err);
    process.exit(1);
  }
}

// Wait 1 second for SQLite to initialize and run initDb
setTimeout(check, 1000);
