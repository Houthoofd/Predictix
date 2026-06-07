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

const parseFrenchDate = (str) => {
  if (!str) return null;
  const months = {
    'janvier': '01', 'février': '02', 'fevrier': '02', 'mars': '03', 'avril': '04', 'mai': '05', 'juin': '06',
    'juillet': '07', 'août': '08', 'aout': '08', 'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12', 'decembre': '12'
  };
  const parts = str.toLowerCase().split(' ');
  if (parts.length >= 3) {
    const day = parts[1].padStart(2, '0');
    const monthStr = parts[2].replace(',', '');
    const month = months[monthStr];
    const year = parts[3];
    if (month && day && year) {
      return `${year}-${month}-${day}`;
    }
  }
  return str;
};

async function test() {
  try {
    const minCoverage = 50.0;
    const activeStrategies = await dbQuery("SELECT * FROM custom_strategies WHERE status = 'ACTIVE'");
    console.log(`Active strategies: ${activeStrategies.length}`);

    // Fetch coverage rate per league
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
    console.log(`Total upcoming matches: ${upcomingMatches.length}`);

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

      if (h2hMatches.length === 0) {
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
            if (stats.possession && stats.possession.home !== undefined) {
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
          signals.push({
            match: `${match.home_team} vs ${match.away_team}`,
            date: match.date,
            strategy: strategy.name,
            avg,
            threshold
          });
        }
      }
    }

    console.log(`Total qualified signals: ${signals.length}`);
    console.log(`Signals:`);
    console.log(signals);

  } catch(e) {
    console.error(e);
  } finally {
    db.close();
  }
}

test();
