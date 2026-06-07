import { dbQuery, dbGet } from '../src/db/database.js';
import { parseFrenchDate } from '../src/utils/scraperHelpers.js';

async function test() {
  try {
    // 1. Get first active strategy
    const strategy = await dbGet("SELECT * FROM custom_strategies WHERE status = 'ACTIVE' LIMIT 1");
    if (!strategy) {
      console.log("No active strategy found in database to test backtest. Creating a temporary one...");
      // Let's create a temporary strategy for testing
      const tempId = 9999;
      const conditions = {
        scope: 'h2h',
        limit: 5,
        operator: '>=',
        threshold: 9.5,
        aggregation: 'avg'
      };
      
      const testStrategy = {
        id: tempId,
        name: 'Test corners strategy',
        metric: 'corners',
        conditions_json: JSON.stringify(conditions)
      };
      
      await runBacktest(testStrategy);
    } else {
      console.log(`Running backtest for strategy: "${strategy.name}" (ID: ${strategy.id})`);
      await runBacktest(strategy);
    }

    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

async function runBacktest(strategy) {
  const conditions = JSON.parse(strategy.conditions_json);
  const limit = conditions.limit || 5;
  const metric = strategy.metric;
  const operator = conditions.operator || '>=';
  const threshold = parseFloat(conditions.threshold);

  const finishedMatches = await dbQuery(`
    SELECT * FROM scraped_predictions 
    WHERE is_historical = 0 AND is_finished = 1 AND statistics_json IS NOT NULL 
    ORDER BY date ASC, time ASC
  `);

  console.log(`Found ${finishedMatches.length} finished main matches to evaluate`);

  const betLogs = [];
  let totalBets = 0;
  let wins = 0;
  let losses = 0;
  let cumulativeProfit = 0;
  const defaultOddsInput = 1.80;

  for (const match of finishedMatches) {
    const mainMatchDateStr = parseFrenchDate(match.date);
    if (!mainMatchDateStr) continue;

    const allH2H = await dbQuery(`
      SELECT * FROM scraped_predictions 
      WHERE is_finished = 1 
        AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))
    `, [match.home_team, match.away_team, match.away_team, match.home_team]);

    const priorH2H = allH2H.filter(h => {
      const hDate = parseFrenchDate(h.date);
      return hDate && hDate < mainMatchDateStr;
    });

    priorH2H.sort((a, b) => {
      const dateA = parseFrenchDate(a.date);
      const dateB = parseFrenchDate(b.date);
      return dateB.localeCompare(dateA);
    });

    const activeH2H = priorH2H.slice(0, limit);
    if (activeH2H.length === 0) continue;

    let values = [];
    for (const h2h of activeH2H) {
      let stats = null;
      try {
        if (h2h.statistics_json) {
          stats = JSON.parse(h2h.statistics_json);
        }
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
    const avg = parseFloat((sum / values.length).toFixed(2));

    let triggered = false;
    if (operator === '>=') triggered = avg >= threshold;
    else if (operator === '<=') triggered = avg <= threshold;
    else if (operator === '>') triggered = avg > threshold;
    else if (operator === '<') triggered = avg < threshold;

    if (triggered) {
      let mainMatchStats = null;
      try {
        mainMatchStats = JSON.parse(match.statistics_json);
      } catch (e) {
        continue;
      }

      if (!mainMatchStats) continue;

      let actualVal = 0;
      if (metric === 'possession') {
        if (mainMatchStats.possession && mainMatchStats.possession.home !== undefined) {
          actualVal = parseFloat(mainMatchStats.possession.home);
        } else {
          continue;
        }
      } else {
        if (mainMatchStats[metric] && mainMatchStats[metric].home !== undefined && mainMatchStats[metric].away !== undefined) {
          actualVal = parseFloat(mainMatchStats[metric].home) + parseFloat(mainMatchStats[metric].away);
        } else {
          continue;
        }
      }

      let won = false;
      if (operator === '>=') won = actualVal >= threshold;
      else if (operator === '<=') won = actualVal <= threshold;
      else if (operator === '>') won = actualVal > threshold;
      else if (operator === '<') won = actualVal < threshold;

      const oddsVal = parseFloat(operator === '>=' || operator === '>' ? match.over_odds : match.under_odds) || defaultOddsInput;
      const profit = won ? (oddsVal - 1.0) : -1.0;
      cumulativeProfit += profit;
      totalBets++;

      if (won) wins++;
      else losses++;

      betLogs.push({
        date: mainMatchDateStr,
        match: `${match.home_team} vs ${match.away_team}`,
        avg_value: avg,
        actual_value: actualVal,
        odds: oddsVal,
        won,
        profit: parseFloat(profit.toFixed(2))
      });
    }
  }

  const winRate = totalBets > 0 ? ((wins / totalBets) * 100).toFixed(1) : 0;
  const roi = totalBets > 0 ? ((cumulativeProfit / totalBets) * 100).toFixed(1) : 0;

  console.log(`\n=== BACKTEST RESULTS ===`);
  console.log(`Strategy: ${strategy.name}`);
  console.log(`Total Bets Placed: ${totalBets}`);
  console.log(`Wins: ${wins} / Losses: ${losses}`);
  console.log(`Win Rate: ${winRate}%`);
  console.log(`ROI: ${roi}%`);
  console.log(`Total Profit: ${cumulativeProfit.toFixed(2)} U`);
  console.log(`\nSample bets:`);
  betLogs.slice(0, 5).forEach((b, i) => {
    console.log(`  #${i+1} [${b.date}] ${b.match} -> Avg: ${b.avg_value}, Actual: ${b.actual_value}, Odds: ${b.odds}, Won: ${b.won}, Profit: ${b.profit} U`);
  });
}

setTimeout(test, 1000);
