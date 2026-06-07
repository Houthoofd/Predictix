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
    const minCoverage = 50.0;
    const activeStrategies = await dbQuery("SELECT * FROM custom_strategies WHERE status = 'ACTIVE'");
    console.log(`Active strategies count: ${activeStrategies.length}`);
    for (const strat of activeStrategies) {
      console.log(` - ID: ${strat.id}, Name: ${strat.name}, Metric: ${strat.metric}`);
    }

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

    const upcomingMatches = await dbQuery("SELECT * FROM scraped_predictions WHERE is_historical = 0 AND date = '2026-06-06'");
    console.log(`\nUpcoming matches for today (June 6th): ${upcomingMatches.length}`);

    const signals = [];
    for (const match of upcomingMatches) {
      const leagueCoverage = coverageMap.has(match.tournament) ? coverageMap.get(match.tournament) : 100.0;
      if (leagueCoverage < minCoverage) {
        continue;
      }

      const h2hMatches = await dbQuery(`
        SELECT * FROM scraped_predictions 
        WHERE is_finished = 1 
          AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))
        ORDER BY date DESC LIMIT 15
      `, [match.home_team, match.away_team, match.away_team, match.home_team]);

      if (h2hMatches.length === 0) continue;

      for (const strategy of activeStrategies) {
        let conditions = {};
        try {
          conditions = JSON.parse(strategy.conditions_json);
        } catch (e) {
          continue;
        }

        const limit = conditions.limit || 5;
        const metric = strategy.metric;
        const operator = conditions.operator || '>=';
        const threshold = parseFloat(conditions.threshold);

        let values = [];
        for (const h2h of h2hMatches) {
          if (values.length >= limit) break;

          let stats = null;
          try {
            if (h2h.statistics_json) {
              stats = JSON.parse(h2h.statistics_json);
            }
          } catch (e) {
            continue;
          }

          if (stats) {
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
        }

        if (values.length > 0) {
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
          } else if (operator === '==') {
            qualified = avg === threshold;
          }

          if (qualified) {
            signals.push({
              match_id: match.match_id,
              home_team: match.home_team,
              away_team: match.away_team,
              sport: match.sport,
              tournament: match.tournament,
              metric: metric,
              avg: avg,
              threshold: threshold,
              operator: operator,
              strategy_name: strategy.name
            });
          }
        }
      }
    }

    console.log(`\nFound ${signals.length} magic signals for today:`);
    signals.forEach(s => {
      console.log(` - [${s.sport}] ${s.home_team} vs ${s.away_team} | Strat: ${s.strategy_name} | Avg: ${s.avg.toFixed(1)} ${s.operator} ${s.threshold}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    db.close();
  }
}

diagnose();
