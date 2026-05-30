import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure DB directory exists
const dbDir = path.join(__dirname, '../..');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.resolve(dbDir, 'predictix.db');
const sqlite3Verbose = sqlite3.verbose();
const db = new sqlite3Verbose.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initDb();
  }
});

// Promisify DB methods
export const dbQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

function initDb() {
  db.serialize(() => {
    // 1. Table bankroll
    db.run(`
      CREATE TABLE IF NOT EXISTS bankroll (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        balance REAL NOT NULL,
        initial_balance REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT '€',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed bankroll if empty
    db.get("SELECT COUNT(*) as count FROM bankroll", (err, row) => {
      if (row && row.count === 0) {
        db.run("INSERT INTO bankroll (balance, initial_balance, currency) VALUES (1000.00, 1000.00, '€')");
        console.log("Seeded initial bankroll with 1000.00 €");
      }
    });

    // 2. Table bets
    db.run(`
      CREATE TABLE IF NOT EXISTS bets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id TEXT,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        league TEXT NOT NULL,
        home_team TEXT NOT NULL,
        away_team TEXT NOT NULL,
        best_tip TEXT NOT NULL,
        card_line REAL NOT NULL,
        odds REAL NOT NULL,
        stake REAL NOT NULL,
        probability INTEGER,
        bookmaker TEXT NOT NULL DEFAULT 'Unibet',
        status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, WON, LOST, REFUNDED
        payout REAL NOT NULL DEFAULT 0.0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Table scraped_predictions
    db.run(`
      CREATE TABLE IF NOT EXISTS scraped_predictions (
        match_id TEXT PRIMARY KEY,
        time TEXT,
        date TEXT,
        tournament TEXT,
        home_team TEXT,
        away_team TEXT,
        score TEXT,
        over_odds TEXT,
        under_odds TEXT,
        card_line TEXT,
        probability TEXT,
        best_tip TEXT,
        win_rate TEXT,
        status TEXT,
        is_live INTEGER DEFAULT 0,
        is_finished INTEGER DEFAULT 0,
        first_half_corners_home INTEGER,
        first_half_corners_away INTEGER,
        odds_corners TEXT,
        scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Safe schema migrations for existing databases
    db.run(`
      ALTER TABLE scraped_predictions ADD COLUMN first_half_corners_home INTEGER
    `, (err) => {
      // Ignore error if column already exists
    });

    db.run(`
      ALTER TABLE scraped_predictions ADD COLUMN first_half_corners_away INTEGER
    `, (err) => {
      // Ignore error if column already exists
    });
    
    db.run(`
      ALTER TABLE scraped_predictions ADD COLUMN odds_corners TEXT
    `, (err) => {
      // Ignore error if column already exists
    });
    
    console.log("Database tables initialized successfully");
  });
}
export default db;
