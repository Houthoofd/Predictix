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

async function test() {
  try {
    const minCoverage = 50.0;
    const activeStrategies = await dbQuery("SELECT * FROM custom_strategies WHERE status = 'ACTIVE'");
    console.log(`Active strategies count: ${activeStrategies.length}`);

    // Coverage rate map
    const coverageRows = await dbQuery(`
      SELECT 
        tournament,
        ROUND(CAST(SUM(CASE WHEN statistics_json IS NOT NULL THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 1) as coverage_rate
      FROM scraped_predictions
      WHERE is_historical = 0 AND is_finished = 1
      GROUP BY tournament
    `);
    const coverageMap = new Map();
    for (const row of coverageRows) {
      coverageMap.set(row.tournament, row.coverage_rate);
    }

    const upcomingMatches = await dbQuery("SELECT * FROM scraped_predictions WHERE is_historical = 0 ORDER BY date ASC, time ASC");
    
    // Filter to matches on June 5th
    const june5Matches = upcomingMatches.filter(m => m.date.includes('05 juin 2026'));
    console.log(`Upcoming June 5th matches: ${june5Matches.length}`);

    const signalsOriginal = [];
    const signalsFixed = [];

    const metricLabels = {
      fouls: 'fautes',
      yellow_cards: 'cartons jaunes',
      possession: 'possession',
      shots_on_target: 'tirs cadrés',
      shots: 'tirs',
      offsides: 'hors-jeu',
      corners: 'corners'
    };

    for (const match of june5Matches) {
      const h2hMatches = await dbQuery(`
        SELECT * FROM scraped_predictions 
        WHERE is_finished = 1 
          AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))
        ORDER BY date DESC LIMIT 15
      `, [match.home_team, match.away_team, match.away_team, match.home_team]);

      if (h2hMatches.length === 0) continue;

      for (const strategy of activeStrategies) {
        const conditions = JSON.parse(strategy.conditions_json);
        const limit = conditions.limit || 5;
        const metric = strategy.metric;
        const operator = conditions.operator || '>=';
        const threshold = parseFloat(conditions.threshold);

        let values = [];
        for (const h2h of h2hMatches) {
          if (values.length >= limit) break;
          if (!h2h.statistics_json) continue;
          let stats = null;
          try {
            stats = JSON.parse(h2h.statistics_json);
          } catch (e) {
            continue;
          }
          if (!stats) continue;

          if (metric === 'possession') {
            if (stats.possession && stats.possession.home !== undefined && stats.possession.away !== undefined) {
              const val = (h2h.home_team === match.home_team) 
                ? parseFloat(stats.possession.home) 
                : parseFloat(stats.possession.away);
              values.push(val);
            }
          } else {
            if (stats[metric] && stats[metric].home !== undefined && stats[metric].away !== undefined) {
              const val = parseFloat(stats[metric].home) + parseFloat(stats[metric].away);
              values.push(val);
            }
          }
        }

        if (values.length === 0) continue;

        const sum = values.reduce((acc, curr) => acc + curr, 0);
        const avg = parseFloat((sum / values.length).toFixed(1));

        let qualified = false;
        if (operator === '>=' || operator === '>=') {
          qualified = avg >= threshold;
        } else if (operator === '<=') {
          qualified = avg <= threshold;
        } else if (operator === '>') {
          qualified = avg > threshold;
        } else if (operator === '<') {
          qualified = avg < threshold;
        }

        if (qualified) {
          const sigObj = {
            match: `${match.home_team} - ${match.away_team}`,
            tournament: match.tournament,
            strategy: strategy.name,
            avg
          };

          // 1. Original logic check
          const leagueCoverageOriginal = coverageMap.get(match.tournament) || 0.0;
          if (leagueCoverageOriginal >= minCoverage) {
            signalsOriginal.push(sigObj);
          }

          // 2. Fixed logic check (default to 100% if tournament not in coverage map)
          const leagueCoverageFixed = coverageMap.has(match.tournament) ? coverageMap.get(match.tournament) : 100.0;
          if (leagueCoverageFixed >= minCoverage) {
            signalsFixed.push(sigObj);
          }
        }
      }
    }

    console.log(`\n=== Original Logic Signals (June 5): ${signalsOriginal.length} ===`);
    console.log(signalsOriginal);

    console.log(`\n=== Fixed Logic Signals (June 5): ${signalsFixed.length} ===`);
    console.log(signalsFixed);

  } catch (e) {
    console.error(e);
  } finally {
    db.close();
  }
}

test();
