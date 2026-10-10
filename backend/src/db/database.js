import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import { EventEmitter } from 'events';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure DB directory exists
const defaultDbPath = path.join(__dirname, '../../predictix.db');
let effectiveDbPath = process.env.PREDICTIX_DB_PATH || process.env.PREDICTIX_TEST_DB_PATH;
if (!effectiveDbPath && (process.env.VITEST || process.env.NODE_ENV === 'test')) {
  effectiveDbPath = path.join(os.tmpdir(), `predictix_test_fallback_${Date.now()}_${Math.random().toString(36).slice(2)}.db`);
  process.env.PREDICTIX_DB_PATH = effectiveDbPath;
  console.warn(`[Database] Test environment detected without PREDICTIX_DB_PATH. Guard activated: using isolated temp database: ${effectiveDbPath}`);
}
const dbPath = effectiveDbPath || (process.env.DATABASE_PATH ? path.resolve(process.env.DATABASE_PATH) : (process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : defaultDbPath));
const dbDir = path.dirname(dbPath);
try {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
} catch (err) {
  // directory creation error will be reported by sqlite3
}

let dbInitResolve;
export const dbReady = new Promise((resolve) => {
  dbInitResolve = resolve;
});

const sqlite3Verbose = sqlite3.verbose();
const db = new sqlite3Verbose.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    if (dbInitResolve) dbInitResolve();
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    db.configure("busyTimeout", 30000);
    initDb();
  }
});

export const dbQuery = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

export const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

export const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) { err ? reject(err) : resolve({ id: this.lastID, changes: this.changes }); });
});

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
        db.run("INSERT INTO bankroll (balance, initial_balance, currency) VALUES (1000.00, 1000.00, '€')", () => {
          console.log("Seeded initial bankroll with 1000.00 €");
          if (dbInitResolve) dbInitResolve();
        });
      } else {
        if (dbInitResolve) dbInitResolve();
      }
    });

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
        match_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Table scraped_predictions
    db.run(`
      CREATE TABLE IF NOT EXISTS scraped_predictions (
        match_id TEXT PRIMARY KEY,
        source_match_id TEXT,
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
        home_logo TEXT,
        away_logo TEXT,
        historical_links TEXT,
        is_historical INTEGER DEFAULT 0,
        match_url TEXT,
        statistics_json TEXT,
        absences_json TEXT,
        betfair_json TEXT,
        sport TEXT DEFAULT "football",
        source TEXT,
        scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Table custom_strategies
    db.run(`
      CREATE TABLE IF NOT EXISTS custom_strategies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        prompt TEXT NOT NULL,
        metric TEXT NOT NULL,
        conditions_json TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Safe schema migrations for existing databases
    const migrations = [
      'ALTER TABLE scraped_predictions ADD COLUMN source_match_id TEXT',
      'ALTER TABLE scraped_predictions ADD COLUMN first_half_corners_home INTEGER',
      'ALTER TABLE scraped_predictions ADD COLUMN first_half_corners_away INTEGER',
      'ALTER TABLE scraped_predictions ADD COLUMN odds_corners TEXT',
      'ALTER TABLE scraped_predictions ADD COLUMN home_logo TEXT',
      'ALTER TABLE scraped_predictions ADD COLUMN away_logo TEXT',
      'ALTER TABLE scraped_predictions ADD COLUMN historical_links TEXT',
      'ALTER TABLE scraped_predictions ADD COLUMN is_historical INTEGER DEFAULT 0',
      'ALTER TABLE bets ADD COLUMN match_url TEXT',
      'ALTER TABLE scraped_predictions ADD COLUMN match_url TEXT',
      'ALTER TABLE scraped_predictions ADD COLUMN statistics_json TEXT',
      'ALTER TABLE scraped_predictions ADD COLUMN absences_json TEXT',
      'ALTER TABLE scraped_predictions ADD COLUMN sport TEXT DEFAULT "football"',
      'ALTER TABLE bets ADD COLUMN sport TEXT DEFAULT "football"',
      'ALTER TABLE scraped_predictions ADD COLUMN betfair_json TEXT',
      'ALTER TABLE scraped_predictions ADD COLUMN source TEXT'
    ];


    migrations.forEach(m => {
      db.run(m, () => {});
    });

    db.run("UPDATE scraped_predictions SET is_historical = 1 WHERE match_id LIKE '%/%' OR match_id LIKE 'http%'");
    db.run(`
      UPDATE scraped_predictions 
      SET source = CASE 
        WHEN source IS NOT NULL AND source != '' THEN source
        WHEN match_url LIKE '%flashscore%' OR match_id LIKE '%flashscore%' OR match_id LIKE '/match/%' THEN 'flashscore'
        WHEN match_url LIKE '%matchendirect%' OR match_id LIKE '%matchendirect%' OR match_id LIKE 'med_%' THEN 'matchendirect'
        WHEN match_url LIKE '%sofascore%' THEN 'sofascore'
        WHEN match_url LIKE '%1xbet%' THEN '1xbet'
        WHEN match_url LIKE '%arbworld%' THEN 'arbworld'
        ELSE 'unknown'
      END
      WHERE source IS NULL OR source = ''
    `, () => {});
    
    // Retroactive status repair for finished matches currently marked as Planned
    db.run(`
      UPDATE scraped_predictions 
      SET is_finished = 1, status = 'Finished' 
      WHERE is_historical = 0 
        AND is_finished = 0 
        AND (LOWER(TRIM(time)) = 'ter' OR LOWER(TRIM(time)) = 'ter.' OR LOWER(time) LIKE '%terminé%')
    `, (err) => {
      if (err) console.error("Error running database retroactive repair query:", err.message);
    });

    // Retroactive bookmaker name casing normalization
    db.all("SELECT DISTINCT bookmaker FROM bets", (err, rows) => {
      if (err || !rows) return;
      const mapping = {
        '1xbet': '1XBet',
        'unibet': 'Unibet',
        'betclic': 'Betclic',
        'winamax': 'Winamax',
        'pmu': 'PMU',
        'zebet': 'ZEbet',
        'bwin': 'Bwin',
        'bet365': 'Bet365',
        'parions sport': 'Parions Sport',
        'parionssport': 'Parions Sport'
      };
      rows.forEach(r => {
        if (!r.bookmaker) return;
        const clean = r.bookmaker.trim();
        const lower = clean.toLowerCase();
        const expected = mapping[lower] || (clean.charAt(0).toUpperCase() + clean.slice(1));
        if (clean !== expected) {
          db.run("UPDATE bets SET bookmaker = ? WHERE bookmaker = ?", [expected, r.bookmaker]);
        }
      });
    });
    
    // 5. Table custom_team_logos
    db.run(`
      CREATE TABLE IF NOT EXISTS custom_team_logos (
        team_name TEXT PRIMARY KEY,
        logo_url TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 7. Table notifications (persistent alert log)
    db.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'info',
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        read INTEGER DEFAULT 0
      )
    `);

    // 8. Table cron_history (re-scraping execution log)
    db.run(`
      CREATE TABLE IF NOT EXISTS cron_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id TEXT NOT NULL,
        home_team TEXT NOT NULL,
        away_team TEXT NOT NULL,
        sport TEXT NOT NULL DEFAULT 'football',
        status TEXT NOT NULL, -- SUCCESS, FAILED, RUNNING
        retries INTEGER DEFAULT 0,
        score TEXT,
        error_message TEXT,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
 
    // 11. Table integrity_history (historical data quality trend scores)
    db.run(`
      CREATE TABLE IF NOT EXISTS integrity_history (
        date TEXT PRIMARY KEY,
        score REAL NOT NULL,
        total_matches INTEGER NOT NULL,
        healthy_matches INTEGER NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 10. Table integrity_batch_state (persistence of the active integrity batcher state)
    db.run(`
      CREATE TABLE IF NOT EXISTS integrity_batch_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        status TEXT NOT NULL,
        queue TEXT NOT NULL,
        current_index INTEGER NOT NULL,
        processed_count INTEGER NOT NULL,
        success_count INTEGER NOT NULL,
        error_count INTEGER NOT NULL,
        logs TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. Table settings (configuration parameters)
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `, () => {
      const defaults = [
        ['keep_awake_mode', 'active_only'],
        ['cron_integrity_repair', 'true'],
        ['cron_db_cleanup', 'true'],
        ['value_bet_min_edge', '5'],
        ['default_stake_pct', '5'],
        ['default_bookmaker', 'Unibet'],
        ['football_corner_line', '4.5'],
        ['realtime_notifications', 'true'],
        ['cron_retry_interval_live', '10'],
        ['cron_retry_interval_fail', '15'],
        ['cron_max_retries', '5'],
        ['cron_db_backup', 'true'],
        ['cron_db_backup_keep_days', '7'],
        ['use_gbdt_models', 'true'],
        ['import_guard_strict', 'true'],
        ['realtime_self_healing', 'true'],
        ['score_date_sanity_check', 'true']
      ];
      for (const [key, val] of defaults) {
        db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, val]);
      }
    });
    
    // 6. Performance Indexes
    const indexes = [
      "idx_predictions_historical_date ON scraped_predictions(is_historical, date)",
      "idx_predictions_finished_date ON scraped_predictions(is_finished, date DESC)",
      "idx_predictions_home_finished ON scraped_predictions(home_team, is_finished, date DESC)",
      "idx_predictions_away_finished ON scraped_predictions(away_team, is_finished, date DESC)",
      "idx_bets_match_pending ON bets(match_id, status)",
      "idx_bets_date ON bets(date, time)"
    ];
    indexes.forEach(idx => db.run(`CREATE INDEX IF NOT EXISTS ${idx}`));
    
    // 7. Table player_stats for player-level importance tracking
    db.run(`
      CREATE TABLE IF NOT EXISTS player_stats (
        player_id TEXT PRIMARY KEY,
        team_name TEXT,
        player_name TEXT,
        position TEXT,          -- "G", "D", "M", "A"
        rating REAL,            -- SofaScore average rating
        appearances INTEGER,    -- Matches played
        starts INTEGER,         -- Matches started
        goals INTEGER,
        assists INTEGER,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run("CREATE INDEX IF NOT EXISTS idx_player_stats_team ON player_stats(team_name)");
    
    console.log("Database tables and indexes initialized successfully");
  });
}

export const notificationEvents = new EventEmitter();

export const insertNotification = async (message, type = 'info') => {
  try {
    const result = await dbRun('INSERT INTO notifications (message, type) VALUES (?, ?)', [message, type]);
    console.log(`[Predictix Notification] [${type.toUpperCase()}] ${message}`);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    notificationEvents.emit('notification', {
      id: result.id,
      message,
      type,
      timestamp: timeStr,
      read: 0
    });
  } catch (err) { console.error('Failed to insert notification:', err); }
};

export const closeDatabase = async () => {
  if (!db) return;
  try {
    await dbReady;
  } catch (e) {}
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        if (err.message && err.message.includes('Database is closed')) {
          return resolve();
        }
        return reject(err);
      }
      resolve();
    });
  });
};

export default db;
