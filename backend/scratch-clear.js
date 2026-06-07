import sqlite3 from 'sqlite3';

const dbPath = 'predictix.db';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open database:', err);
    process.exit(1);
  }
});

db.serialize(() => {
  db.run('DELETE FROM scraped_predictions', [], (err) => {
    if (err) {
      console.error('Error clearing scraped_predictions:', err);
    } else {
      console.log('Successfully wiped scraped_predictions cache table!');
    }
  });
});

db.close();
