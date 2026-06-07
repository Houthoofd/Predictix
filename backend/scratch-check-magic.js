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
    console.log(activeStrategies);

    if (activeStrategies.length === 0) {
      db.close();
      return;
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

    const upcomingMatches = await dbQuery("SELECT * FROM scraped_predictions WHERE is_historical = 0 ORDER BY date ASC, time ASC");
    console.log(`Total scraped_predictions (is_historical = 0): ${upcomingMatches.length}`);

    const june4Matches = upcomingMatches.filter(m => m.date.includes('04 juin 2026'));
    console.log(`June 4th matches (is_historical = 0): ${june4Matches.length}`);

    const signals = [];
    const metricLabels = {
      fouls: 'fautes',
      yellow_cards: 'cartons jaunes',
      possession: 'possession',
      shots_on_target: 'tirs cadrés',
      shots: 'tirs',
      offsides: 'hors-jeu',
      corners: 'corners'
    };

    for (const match of june4Matches) {
      const leagueCoverage = coverageMap.get(match.tournament) || 0.0;
      if (leagueCoverage < minCoverage) {
        // console.log(`Skipped match ${match.home_team} - ${match.away_team} because of coverage ${leagueCoverage}`);
        continue;
      }

      // Query H2H matches
      const h2hMatches = await dbQuery(`
        SELECT * FROM scraped_predictions 
        WHERE is_finished = 1 
          AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))
        ORDER BY date DESC LIMIT 15
      `, [match.home_team, match.away_team, match.away_team, match.home_team]);

      if (h2hMatches.length === 0) {
        // console.log(`No H2H matches found for ${match.home_team} - ${match.away_team}`);
        continue;
      }

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
          } catch(e) {
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

        if (values.length === 0) {
          continue;
        }

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
          signals.push({
            match: `${match.home_team} - ${match.away_team}`,
            strategy: strategy.name,
            avg,
            threshold
          });
        }
      }
    }

    console.log(`Generated signals count for June 4th: ${signals.length}`);
    console.log(signals);

  } catch(e) {
    console.error(e);
  } finally {
    db.close();
  }
}

test();
