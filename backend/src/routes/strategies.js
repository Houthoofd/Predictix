import express from 'express';
import { dbQuery, dbGet, dbRun } from '../db/database.js';
import { parseFrenchDate } from '../utils/scraperHelpers.js';

const router = express.Router();


// Smart deterministic NLP Pattern Matcher for Magic Strategies
function parsePromptToStrategy(prompt) {
  const text = (prompt || '').toLowerCase();
  
  // 1. Identify Metric
  let metric = 'corners'; // Default fallback
  let metricLabel = 'Corners';
  if (text.includes('faute')) {
    metric = 'fouls';
    metricLabel = 'Fautes commises';
  } else if (text.includes('carton') || text.includes('jaune') || text.includes('rouge')) {
    metric = 'yellow_cards';
    metricLabel = 'Cartons';
  } else if (text.includes('possession') || text.includes('balle')) {
    metric = 'possession';
    metricLabel = 'Possession';
  } else if (text.includes('tir') && text.includes('cadr')) {
    metric = 'shots_on_target';
    metricLabel = 'Tirs cadrés';
  } else if (text.includes('tir')) {
    metric = 'shots';
    metricLabel = 'Tirs';
  } else if (text.includes('hors-jeu') || text.includes('hors jeu')) {
    metric = 'offsides';
    metricLabel = 'Hors-jeu';
  } else if (text.includes('rebond')) {
    metric = 'total_rebounds';
    metricLabel = 'Rebonds';
  } else if (text.includes('passe') || text.includes('assist')) {
    metric = 'assists';
    metricLabel = 'Passes décisives';
  } else if (text.includes('contre') || text.includes('block')) {
    metric = 'blocks';
    metricLabel = 'Contres';
  } else if (text.includes('interception') || text.includes('steal')) {
    metric = 'steals';
    metricLabel = 'Interceptions';
  } else if (text.includes('panier') || text.includes('field goal')) {
    metric = 'field_goals';
    metricLabel = 'Paniers';
  } else if (text.includes('lancer franc') || text.includes('free throw')) {
    metric = 'free_throws';
    metricLabel = 'Lancers francs';
  } else if (text.includes('ace')) {
    metric = 'aces';
    metricLabel = 'Aces';
  } else if (text.includes('double faute') || text.includes('double fault')) {
    metric = 'double_faults';
    metricLabel = 'Doubles fautes';
  } else if (text.includes('premier service') || text.includes('1er service') || text.includes('first serve')) {
    metric = 'first_serve';
    metricLabel = 'Premiers services';
  } else if (text.includes('break')) {
    metric = 'break_points';
    metricLabel = 'Balles de break';
  } else if (text.includes('essai') || text.includes('trie')) {
    metric = 'tries';
    metricLabel = 'Essais';
  } else if (text.includes('pénalité') || text.includes('penal')) {
    metric = 'penalties';
    metricLabel = 'Pénalités';
  } else if (text.includes('transformation') || text.includes('conversion')) {
    metric = 'conversions';
    metricLabel = 'Transformations';
  } else if (text.includes('but') || text.includes('goal')) {
    metric = 'goals';
    metricLabel = 'Buts';
  } else if (text.includes('arrêt') || text.includes('save')) {
    metric = 'saves';
    metricLabel = 'Arrêts';
  }

  // 2. Identify Operator
  let operator = '>='; // Default fallback
  let opLabel = 'au moins';
  if (text.includes('moins') || text.includes('inférieur') || text.includes('<') || text.includes('maximum')) {
    operator = '<=';
    opLabel = 'maximum';
  }

  // 3. Identify Scope & Limit (e.g., "5 H2H" or "10 confrontations")
  let scope = 'h2h';
  let limit = 5;
  const h2hMatch = text.match(/(\d+)\s*(?:confrontation|h2h|oppo|rencontre|match)/);
  if (h2hMatch) {
    limit = parseInt(h2hMatch[1], 10);
  }

  // 4. Identify Threshold (excluding the number used for limit if possible)
  let threshold = null;
  const numMatch = text.match(/\d+\.\d+|\d+/g);
  if (numMatch) {
    // Find the number that doesn't correspond to the match limit
    for (const numStr of numMatch) {
      const val = parseFloat(numStr);
      if (val === limit && text.includes(numStr + ' h2h') || text.includes(numStr + ' match') || text.includes(numStr + ' confrontation')) {
        continue; // Skip the limit number
      }
      threshold = val;
      break;
    }
    // Fallback if we only found one number and it was the limit
    if (threshold === null && numMatch.length > 0) {
      threshold = parseFloat(numMatch[numMatch.length - 1]);
    }
  }

  // Set default thresholds if no number was extracted
  if (threshold === null) {
    if (metric === 'fouls') threshold = 24.5;
    else if (metric === 'yellow_cards') threshold = 3.5;
    else if (metric === 'possession') threshold = 50.0;
    else if (metric === 'shots_on_target') threshold = 8.5;
    else if (metric === 'shots') threshold = 18.5;
    else if (metric === 'offsides') threshold = 3.5;
    else if (metric === 'total_rebounds') threshold = 70.5;
    else if (metric === 'assists') threshold = 38.5;
    else if (metric === 'blocks') threshold = 7.5;
    else if (metric === 'steals') threshold = 12.5;
    else if (metric === 'field_goals') threshold = 60.5;
    else if (metric === 'free_throws') threshold = 30.5;
    else if (metric === 'aces') threshold = 12.5;
    else if (metric === 'double_faults') threshold = 5.5;
    else if (metric === 'first_serve') threshold = 60.0;
    else if (metric === 'break_points') threshold = 4.5;
    else if (metric === 'tries') threshold = 4.5;
    else if (metric === 'penalties') threshold = 3.5;
    else if (metric === 'conversions') threshold = 3.5;
    else if (metric === 'goals') threshold = 5.5;
    else if (metric === 'saves') threshold = 14.5;
    else threshold = 4.5;
  }

  // Formulate readable Strategy Name
  const name = `${metricLabel} : ${opLabel} ${threshold} (Moyenne H2H)`;

  const conditions = {
    scope: scope,
    limit: limit,
    operator: operator,
    threshold: threshold,
    aggregation: 'avg' // default average
  };

  return {
    name,
    metric,
    conditions
  };
}

/* ========================================================================
   MAGIC STRATEGY API ENDPOINTS
   ======================================================================== */

// Get stats data coverage for all leagues
router.get('/strategies/leagues-coverage', async (req, res) => {
  try {
    const sql = `
      SELECT 
        tournament,
        COUNT(*) as total_matches,
        SUM(CASE WHEN statistics_json IS NOT NULL THEN 1 ELSE 0 END) as matches_with_stats,
        ROUND(CAST(SUM(CASE WHEN statistics_json IS NOT NULL THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 1) as coverage_rate
      FROM scraped_predictions
      WHERE is_historical = 0 AND is_finished = 1
      GROUP BY tournament
      ORDER BY total_matches DESC, coverage_rate DESC
    `;
    const coverage = await dbQuery(sql);
    res.json({ success: true, data: coverage });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Get all custom strategies
router.get('/strategies/magic', async (req, res) => {
  try {
    const strategies = await dbQuery('SELECT * FROM custom_strategies ORDER BY created_at DESC');
    // Parse conditions_json back to object for convenience
    const parsed = strategies.map(s => ({
      ...s,
      conditions: JSON.parse(s.conditions_json)
    }));
    res.json({ success: true, data: parsed });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Create a new magic strategy based on prompt
router.post('/strategies/magic', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return res.status(400).json({ success: false, error: { message: 'Le prompt est obligatoire et doit être valide.' } });
  }

  try {
    // Run NLP pattern matcher
    const parsed = parsePromptToStrategy(prompt);
    const conditionsJson = JSON.stringify(parsed.conditions);

    // Save in SQLite
    const sql = `
      INSERT INTO custom_strategies (name, prompt, metric, conditions_json, status)
      VALUES (?, ?, ?, ?, 'ACTIVE')
    `;
    const result = await dbRun(sql, [parsed.name, prompt.trim(), parsed.metric, conditionsJson]);

    const created = await dbGet('SELECT * FROM custom_strategies WHERE id = ?', [result.id]);
    res.json({
      success: true,
      message: `Stratégie "${parsed.name}" générée et activée avec succès !`,
      data: {
        ...created,
        conditions: parsed.conditions
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Toggle strategy status (ACTIVE / INACTIVE)
router.post('/strategies/magic/:id/toggle', async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await dbGet('SELECT * FROM custom_strategies WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Stratégie introuvable.' } });
    }

    const newStatus = existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await dbRun('UPDATE custom_strategies SET status = ? WHERE id = ?', [newStatus, id]);
    
    const updated = await dbGet('SELECT * FROM custom_strategies WHERE id = ?', [id]);
    res.json({ 
      success: true, 
      message: `Stratégie "${existing.name}" est désormais ${newStatus === 'ACTIVE' ? 'activée' : 'désactivée'}.`,
      data: updated 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Delete a custom strategy
router.delete('/strategies/magic/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await dbGet('SELECT * FROM custom_strategies WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Stratégie introuvable.' } });
    }

    await dbRun('DELETE FROM custom_strategies WHERE id = ?', [id]);
    res.json({ success: true, message: `Stratégie "${existing.name}" supprimée avec succès.`, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// POST /api/strategies/backtest/:id - Simulate a strategy over historical matches
router.post('/strategies/backtest/:id', async (req, res) => {
  const { id } = req.params;
  const defaultOddsInput = parseFloat(req.body.defaultOdds) || 1.80;
  const minCoverage = req.body.minCoverage !== undefined ? parseFloat(req.body.minCoverage) : 50.0;

  try {
    // 1. Get the strategy
    const strategy = await dbGet('SELECT * FROM custom_strategies WHERE id = ?', [id]);
    if (!strategy) {
      return res.status(404).json({ success: false, error: { message: 'Stratégie introuvable.' } });
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

    // Helper map for metric labels in French
    const metricLabels = {
      fouls: 'fautes',
      yellow_cards: 'cartons jaunes',
      possession: 'possession',
      shots_on_target: 'tirs cadrés',
      shots: 'tirs',
      offsides: 'hors-jeu',
      corners: 'corners',
      total_rebounds: 'rebonds',
      assists: 'passes décisives',
      blocks: 'contres',
      steals: 'interceptions',
      field_goals: 'paniers réussis',
      free_throws: 'lancers francs',
      aces: 'aces',
      double_faults: 'doubles fautes',
      first_serve: '1er service (%)',
      break_points: 'balles de break',
      tries: 'essais',
      penalties: 'pénalités',
      conversions: 'transformations',
      goals: 'buts',
      saves: 'arrêts'
    };

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

        if (!mainMatchStats) {
          skippedMissingStats++;
          continue; // Missing stats for main match, skip
        }

        let actualVal = 0;
        if (metric === 'possession') {
          if (mainMatchStats.possession && mainMatchStats.possession.home !== undefined) {
            actualVal = parseFloat(mainMatchStats.possession.home);
          } else {
            skippedMissingStats++;
            continue;
          }
        } else {
          if (mainMatchStats[metric] && mainMatchStats[metric].home !== undefined && mainMatchStats[metric].away !== undefined) {
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

    res.json({
      success: true,
      data: {
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
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// GET /api/predictions/magic - Reactive Screener comparing matches against active custom strategies
router.get('/predictions/magic', async (req, res) => {
  const minCoverage = req.query.minCoverage !== undefined ? parseFloat(req.query.minCoverage) : 50.0;

  try {
    // 1. Get all active strategies
    const activeStrategies = await dbQuery("SELECT * FROM custom_strategies WHERE status = 'ACTIVE'");
    if (activeStrategies.length === 0) {
      return res.json({ success: true, data: [] });
    }

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

    // 2. Get all matches (including finished ones)
    const upcomingMatches = await dbQuery("SELECT * FROM scraped_predictions WHERE is_historical = 0 ORDER BY date ASC, time ASC");
    
    const signals = [];

    // Helper map for metric labels in French
    const metricLabels = {
      fouls: 'fautes',
      yellow_cards: 'cartons jaunes',
      possession: 'possession',
      shots_on_target: 'tirs cadrés',
      shots: 'tirs',
      offsides: 'hors-jeu',
      corners: 'corners',
      total_rebounds: 'rebonds',
      assists: 'passes décisives',
      blocks: 'contres',
      steals: 'interceptions',
      field_goals: 'paniers réussis',
      free_throws: 'lancers francs',
      aces: 'aces',
      double_faults: 'doubles fautes',
      first_serve: '1er service (%)',
      break_points: 'balles de break',
      tries: 'essais',
      penalties: 'pénalités',
      conversions: 'transformations',
      goals: 'buts',
      saves: 'arrêts'
    };

    // 3. For each upcoming match, check active strategies
    for (const match of upcomingMatches) {
      // Check league coverage rate first
      const leagueCoverage = coverageMap.has(match.tournament) ? coverageMap.get(match.tournament) : 100.0;
      if (leagueCoverage < minCoverage) {
        continue;
      }

      // Find historical finished H2H matches (up to 15 to cover potential limits)
      const h2hMatches = await dbQuery(`
        SELECT * FROM scraped_predictions 
        WHERE is_finished = 1 
          AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))
        ORDER BY date DESC LIMIT 15
      `, [match.home_team, match.away_team, match.away_team, match.home_team]);

      if (h2hMatches.length === 0) {
        continue; // No H2H data, cannot evaluate custom strategies
      }

      for (const strategy of activeStrategies) {
        let conditions = {};
        try {
          conditions = JSON.parse(strategy.conditions_json);
        } catch (e) {
          continue; // Malformed JSON conditions
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

          if (!stats) continue;

          // Standard evaluation logic based on metric type
          if (metric === 'possession') {
            if (stats.possession && stats.possession.home !== undefined && stats.possession.away !== undefined) {
              // Relative possession for the upcoming home team
              const val = (h2h.home_team === match.home_team) 
                ? parseFloat(stats.possession.home) 
                : parseFloat(stats.possession.away);
              values.push(val);
            }
          } else {
            // Cumulated metric (sum of home + away)
            if (stats[metric] && stats[metric].home !== undefined && stats[metric].away !== undefined) {
              const val = parseFloat(stats[metric].home) + parseFloat(stats[metric].away);
              values.push(val);
            }
          }
        }

        // We require at least 1 historical match with stats to evaluate
        if (values.length === 0) {
          continue;
        }

        // Compute average
        const sum = values.reduce((acc, curr) => acc + curr, 0);
        const avg = parseFloat((sum / values.length).toFixed(1));

        // Evaluate operator condition
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
          const metricLabel = metricLabels[metric] || metric;
          const readableOp = operator === '>=' ? 'au moins' : (operator === '<=' ? 'maximum' : operator);
          
          let rationale = '';
          if (metric === 'possession') {
            rationale = `Sélectionné par la stratégie "${strategy.name}" car la possession moyenne de ${match.home_team} sur les ${values.length} dernières confrontations H2H est de ${avg}% (seuil requis ${readableOp} ${threshold}%).`;
          } else {
            rationale = `Détecté par la stratégie "${strategy.name}" car la moyenne cumulée de ${metricLabel} sur les ${values.length} dernières confrontations H2H est de ${avg} (seuil requis ${readableOp} ${threshold}).`;
          }

          signals.push({
            id: `${match.match_id}_${strategy.id}`,
            match_id: match.match_id,
            time: match.time,
            date: match.date,
            tournament: match.tournament,
            home_team: match.home_team,
            away_team: match.away_team,
            home_logo: match.home_logo,
            away_logo: match.away_logo,
            score: match.score,
            match_url: match.match_url,
            strategy_id: strategy.id,
            strategy_name: strategy.name,
            metric: metric,
            prompt: strategy.prompt,
            avg_value: avg,
            threshold: threshold,
            operator: operator,
            rationale: rationale,
            sport: match.sport || 'football',
            scraped_at: match.scraped_at
          });
        }
      }
    }

    res.json({ success: true, data: signals });

  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
