import { dbQuery, dbGet } from './src/db/database.js';

async function main() {
  try {
    const strategies = await dbQuery("SELECT * FROM custom_strategies");
    console.log('\n--- CUSTOM STRATEGIES ---');
    strategies.forEach(s => {
      console.log(`ID: ${s.id}, Name: ${s.name}, Metric: ${s.metric}, Status: ${s.status}, Prompt: "${s.prompt}"`);
      console.log(`Conditions: ${s.conditions_json}`);
    });

    const match = await dbGet("SELECT * FROM scraped_predictions WHERE home_team LIKE '%Gent%' AND away_team LIKE '%Genk%' AND is_historical = 0");
    if (!match) {
      console.log('\nNo upcoming Gent vs Genk match found!');
      return;
    }

    console.log(`\nEvaluating match: ${match.home_team} vs ${match.away_team} [ID: ${match.match_id}]`);

    // Fetch H2H
    const h2hMatches = await dbQuery(`
      SELECT * FROM scraped_predictions 
      WHERE is_finished = 1 
        AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))
      ORDER BY date DESC LIMIT 15
    `, [match.home_team, match.away_team, match.away_team, match.home_team]);

    console.log(`Found ${h2hMatches.length} historical H2H matches in SQLite.`);

    for (const strategy of strategies) {
      const conds = JSON.parse(strategy.conditions_json);
      const limit = conds.limit || 5;
      const metric = strategy.metric;
      const operator = conds.operator || '>=';
      const threshold = parseFloat(conds.threshold);

      console.log(`\nEvaluating Strategy "${strategy.name}" (Metric: ${metric}, Threshold: ${threshold}, Operator: ${operator}, Limit: ${limit})`);

      let values = [];
      let skippedNoStatsCount = 0;
      let details = [];

      for (const h2h of h2hMatches) {
        if (values.length >= limit) break;

        let stats = null;
        try {
          if (h2h.statistics_json) {
            stats = JSON.parse(h2h.statistics_json);
          }
        } catch (e) {}

        if (!stats) {
          skippedNoStatsCount++;
          continue;
        }

        if (metric === 'possession') {
          if (stats.possession && stats.possession.home !== undefined) {
            const val = (h2h.home_team === match.home_team) 
              ? parseFloat(stats.possession.home) 
              : parseFloat(stats.possession.away);
            values.push(val);
            details.push(`${h2h.home_team} vs ${h2h.away_team}: ${val}% possession`);
          }
        } else {
          if (stats[metric] && stats[metric].home !== undefined && stats[metric].away !== undefined) {
            const val = parseFloat(stats[metric].home) + parseFloat(stats[metric].away);
            values.push(val);
            details.push(`${h2h.home_team} vs ${h2h.away_team}: ${stats[metric].home} + ${stats[metric].away} = ${val} ${metric}`);
          }
        }
      }

      console.log(`  H2H Matches with valid "${metric}" statistics: ${values.length} (Skipped due to missing stats: ${skippedNoStatsCount})`);
      if (values.length > 0) {
        console.log(`  Details:`, details);
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = parseFloat((sum / values.length).toFixed(1));
        console.log(`  Computed H2H average: ${avg}`);
        
        let qualified = false;
        if (operator === '>=') qualified = avg >= threshold;
        else if (operator === '<=') qualified = avg <= threshold;
        
        console.log(`  Condition check: ${avg} ${operator} ${threshold} -> ${qualified ? '✅ QUALIFIED!' : '❌ NOT QUALIFIED'}`);
      } else {
        console.log(`  ❌ Cannot evaluate strategy: 0 H2H matches have the "${metric}" statistics in SQLite.`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

main();
