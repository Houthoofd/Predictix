import { dbQuery, dbGet } from '../db/database.js';
import { parseFrenchDate } from './scraperHelpers.js';
import { metricLabels } from './magicSignalsEvaluator.js';

export async function runBacktest(strategyId, defaultOddsInput = 1.80, minCoverage = 50.0) {
  // 1. Get the strategy
  const strategy = await dbGet('SELECT * FROM custom_strategies WHERE id = ?', [strategyId]);
  if (!strategy) {
    throw new Error('Stratégie introuvable.');
  }

  const conditions = JSON.parse(strategy.conditions_json);
  const limit = conditions.limit || 5;
  const metric = strategy.metric;
  const operator = conditions.operator || '>=';
  const threshold = parseFloat(conditions.threshold);

  // Fetch coverage rate per league
  const coverageRows = await dbQuery(`
    SELECT 
      tournament,
      COUNT(*) as total_matches,
      SUM(CASE WHEN statistics_json IS NOT NULL THEN 1 ELSE 0 END) as matches_with_stats,
      ROUND(CAST(SUM(CASE WHEN statistics_json IS NOT NULL THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 1) as coverage_rate
    FROM scraped_predictions
    WHERE is_historical = 0 AND is_finished = 1
    GROUP BY tournament
    ORDER BY total_matches DESC, coverage_rate DESC
  `);
  
  const coverageMap = new Map();
  for (const row of coverageRows) {
    coverageMap.set(row.tournament, row.coverage_rate);
  }

  // 2. Fetch all completed main matches (is_historical = 0, is_finished = 1)
  const finishedMatches = await dbQuery(`
    SELECT * FROM scraped_predictions 
    WHERE is_historical = 0 AND is_finished = 1
    ORDER BY date ASC, time ASC
  `);

  const betLogs = [];
  let totalBets = 0;
  let wins = 0;
  let losses = 0;
  let cumulativeProfit = 0;
  const profitTimeline = [];
  
  let skippedLowCoverage = 0;
  let skippedMissingStats = 0;

  // 3. For each finished main match, simulate the prediction
  for (const match of finishedMatches) {
    // Check league coverage rate first
    const leagueCoverage = coverageMap.get(match.tournament) || 0.0;
    if (leagueCoverage < minCoverage) {
      skippedLowCoverage++;
      continue;
    }

    // Parse main match date
    const mainMatchDateStr = parseFrenchDate(match.date);
    if (!mainMatchDateStr) continue;

    // Find finished matches for home/away teams to use as prior H2H
    const allH2H = await dbQuery(`
      SELECT * FROM scraped_predictions 
      WHERE is_finished = 1 
        AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))
    `, [match.home_team, match.away_team, match.away_team, match.home_team]);

    // Filter H2H matches that occurred strictly before the main match date
    const priorH2H = allH2H.filter(h => {
      const hDate = parseFrenchDate(h.date);
      return hDate && hDate < mainMatchDateStr;
    });

    // Sort prior H2H by date descending
    priorH2H.sort((a, b) => {
      const dateA = parseFrenchDate(a.date);
      const dateB = parseFrenchDate(b.date);
      return dateB.localeCompare(dateA); // Newest first
    });

    // Keep only up to the strategy limit
    const activeH2H = priorH2H.slice(0, limit);
    if (activeH2H.length === 0) {
      skippedMissingStats++;
      continue; // No prior H2H data to evaluate strategy
    }

    // Compute historical average of the metric
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

      if (metric === 'goals') {
        if (h2h.score) {
          const scoreMatch = h2h.score.match(/(\d+)\s*-\s*(\d+)/);
          if (scoreMatch) {
            const val = parseFloat(scoreMatch[1]) + parseFloat(scoreMatch[2]);
            values.push(val);
          }
        }
      } else if (metric === 'possession') {
        if (stats && stats.possession && stats.possession.home !== undefined && stats.possession.away !== undefined) {
          const val = (h2h.home_team === match.home_team) 
            ? parseFloat(stats.possession.home) 
            : parseFloat(stats.possession.away);
          values.push(val);
        }
      } else {
        if (stats && stats[metric] && stats[metric].home !== undefined && stats[metric].away !== undefined) {
          const val = parseFloat(stats[metric].home) + parseFloat(stats[metric].away);
          values.push(val);
        }
      }
    }

    if (values.length === 0) {
      skippedMissingStats++;
      continue;
    }

    const sum = values.reduce((acc, curr) => acc + curr, 0);
    const avg = parseFloat((sum / values.length).toFixed(2));

    // Evaluate operator condition for triggers
    let triggered = false;
    if (operator === '>=' || operator === '>=') {
      triggered = avg >= threshold;
    } else if (operator === '<=') {
      triggered = avg <= threshold;
    } else if (operator === '>') {
      triggered = avg > threshold;
    } else if (operator === '<') {
      triggered = avg < threshold;
    }

    if (triggered) {
      // The strategy recommends placing a bet. Let's see if it won!
      let mainMatchStats = null;
      try {
        if (match.statistics_json) {
          mainMatchStats = JSON.parse(match.statistics_json);
        }
      } catch (e) {
        // parse error
      }

      let actualVal = 0;
      if (metric === 'possession') {
        if (mainMatchStats && mainMatchStats.possession && mainMatchStats.possession.home !== undefined) {
          actualVal = parseFloat(mainMatchStats.possession.home);
        } else {
          skippedMissingStats++;
          continue;
        }
      } else if (metric === 'goals') {
        if (match.score) {
          const scoreMatch = match.score.match(/(\d+)\s*-\s*(\d+)/);
          if (scoreMatch) {
            actualVal = parseFloat(scoreMatch[1]) + parseFloat(scoreMatch[2]);
          } else {
            skippedMissingStats++;
            continue;
          }
        } else {
          skippedMissingStats++;
          continue;
        }
      } else {
        if (mainMatchStats && mainMatchStats[metric] && mainMatchStats[metric].home !== undefined && mainMatchStats[metric].away !== undefined) {
          actualVal = parseFloat(mainMatchStats[metric].home) + parseFloat(mainMatchStats[metric].away);
        } else {
          skippedMissingStats++;
          continue;
        }
      }

      // Evaluate actual outcome
      let won = false;
      if (operator === '>=' || operator === '>=') {
        won = actualVal >= threshold;
      } else if (operator === '<=') {
        won = actualVal <= threshold;
      } else if (operator === '>') {
        won = actualVal > threshold;
      } else if (operator === '<') {
        won = actualVal < threshold;
      }

      // Determine bet odds
      const oddsVal = parseFloat(operator === '>=' || operator === '>' ? match.over_odds : match.under_odds) || defaultOddsInput;

      // Calculate profit
      const profit = won ? (oddsVal - 1.0) : -1.0;
      cumulativeProfit += profit;
      totalBets++;

      if (won) wins++;
      else losses++;

      profitTimeline.push({
        bet_index: totalBets,
        date: mainMatchDateStr,
        match: `${match.home_team} - ${match.away_team}`,
        profit: parseFloat(profit.toFixed(2)),
        cumulative: parseFloat(cumulativeProfit.toFixed(2))
      });

      betLogs.push({
        date: mainMatchDateStr,
        match_id: match.match_id,
        home_team: match.home_team,
        away_team: match.away_team,
        score: match.score,
        avg_value: avg,
        actual_value: actualVal,
        odds: oddsVal,
        won: won,
        profit: parseFloat(profit.toFixed(2))
      });
    }
  }

  const winRate = totalBets > 0 ? parseFloat(((wins / totalBets) * 100).toFixed(1)) : 0;
  const roi = totalBets > 0 ? parseFloat(((cumulativeProfit / totalBets) * 100).toFixed(1)) : 0;

  return {
    strategy_id: strategy.id,
    strategy_name: strategy.name,
    metric: metric,
    threshold: threshold,
    operator: operator,
    limit: limit,
    total_bets: totalBets,
    wins: wins,
    losses: losses,
    win_rate: winRate,
    roi: roi,
    total_profit: parseFloat(cumulativeProfit.toFixed(2)),
    profit_timeline: profitTimeline,
    logs: betLogs,
    skipped_low_coverage: skippedLowCoverage,
    skipped_missing_stats: skippedMissingStats,
    leagues_coverage: coverageRows
  };
}
