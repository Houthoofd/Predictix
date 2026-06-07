import express from 'express';
import { dbQuery, dbGet, dbRun } from '../db/database.js';
import { parsePromptToStrategy } from '../utils/nlpParser.js';
import { evaluateMagicSignals } from '../utils/magicSignalsEvaluator.js';
import { runBacktest } from '../utils/backtestEngine.js';

const router = express.Router();

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
    const parsed = parsePromptToStrategy(prompt);
    const conditionsJson = JSON.stringify(parsed.conditions);

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
    const report = await runBacktest(id, defaultOddsInput, minCoverage);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/predictions/magic', async (req, res) => {
  const minCoverage = req.query.minCoverage !== undefined ? parseFloat(req.query.minCoverage) : 50.0;

  try {
    const signals = await evaluateMagicSignals(minCoverage);
    const mappedSignals = signals.map(sig => {
      const result = { ...sig };
      if (sig.home_matches && !sig.recent_home_matches) {
        result.recent_home_matches = sig.home_matches;
      }
      if (sig.away_matches && !sig.recent_away_matches) {
        result.recent_away_matches = sig.away_matches;
      }
      if (sig.h2h_matches && !sig.recent_h2h_matches) {
        result.recent_h2h_matches = sig.h2h_matches;
      }
      return result;
    });
    res.json({ success: true, data: mappedSignals });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
