import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { evaluateMagicSignals } from './utils/magicSignalsEvaluator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../predictix.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open database:', err);
    process.exit(1);
  }
});

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function run() {
  try {
    console.log("=== Checking Active Custom Strategies ===");
    const activeStrategies = await query("SELECT * FROM custom_strategies WHERE status = 'ACTIVE'");
    console.log(activeStrategies.map(s => ({ id: s.id, name: s.name, metric: s.metric, conds: s.conditions_json })));

    console.log("\n=== Checking Basketball matches H2H counts ===");
    const basketMatches = await query(`
      SELECT match_id, home_team, away_team, date, is_finished 
      FROM scraped_predictions 
      WHERE is_historical = 0 AND sport = 'basketball' AND date = '2026-06-06'
    `);
    console.log(`Found ${basketMatches.length} basketball matches today:`);
    
    let totalH2HFound = 0;
    for (const m of basketMatches) {
      const h2h = await query(`
        SELECT match_id, home_team, away_team, score, date, is_finished, statistics_json 
        FROM scraped_predictions 
        WHERE is_finished = 1 
          AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))
      `, [m.home_team, m.away_team, m.away_team, m.home_team]);
      
      console.log(`- ${m.home_team} vs ${m.away_team}: H2H count: ${h2h.length}`);
      if (h2h.length > 0) {
        totalH2HFound += h2h.length;
        h2h.forEach(h => {
          console.log(`  H2H: ${h.home_team} vs ${h.away_team} (${h.date}) -> Score: "${h.score}"`);
        });
      }
    }

    console.log(`\nTotal H2H matches found across all today's basketball matches: ${totalH2HFound}`);

    console.log("\n=== Running Magic Signals Evaluator for Basketball ===");
    const signals = await evaluateMagicSignals(50.0);
    const basketSignals = signals.filter(s => s.sport === 'basketball');
    console.log(`Evaluator returned ${basketSignals.length} basketball signals:`);
    basketSignals.forEach(s => {
      console.log(`- ${s.home_team} vs ${s.away_team} (${s.date}) -> Avg: ${s.avg_value} (Thresh: ${s.operator} ${s.threshold})`);
    });

  } catch (err) {
    console.error("Error:", err);
  } finally {
    db.close();
  }
}

run();
