import express from 'express';
import { dbQuery, dbGet, dbRun } from '../db/database.js';
import { syncBankroll, normalizeBookmaker } from '../services/betsService.js';
import { resolveSingleBet, resolveAllPendingBets } from '../services/betsResolverService.js';

const router = express.Router();
const handleError = (res, err) => res.status(500).json({ success: false, error: { message: err.message } });

/* ========================================================================
   BANKROLL ROUTES
   ======================================================================== */

// Get current bankroll status
router.get('/bankroll', async (req, res) => {
  try {
    const bankroll = await syncBankroll();
    res.json({ success: true, data: bankroll });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Reset bankroll with new initial balance
router.post('/bankroll/reset', async (req, res) => {
  const { initial_balance, currency } = req.body;
  
  if (initial_balance === undefined || isNaN(parseFloat(initial_balance))) {
    return res.status(400).json({ success: false, error: { message: 'Initial balance must be a number' } });
  }

  const cleanBalance = parseFloat(initial_balance);
  const cleanCurrency = currency || '€';

  try {
    const existing = await dbGet('SELECT id FROM bankroll ORDER BY id DESC LIMIT 1');
    
    if (existing) {
      await dbRun(
        'UPDATE bankroll SET initial_balance = ?, currency = ? WHERE id = ?',
        [cleanBalance, cleanCurrency, existing.id]
      );
    } else {
      await dbRun(
        'INSERT INTO bankroll (balance, initial_balance, currency) VALUES (?, ?, ?)',
        [cleanBalance, cleanBalance, cleanCurrency]
      );
    }

    const updatedBankroll = await syncBankroll();
    res.json({ success: true, data: updatedBankroll });
  } catch (error) { handleError(res, error); }
});

// Get advanced bankroll and betting statistics
router.get('/bankroll/stats', async (req, res) => {
  try {
    const { getBetsStats } = await import('../services/betsService.js');
    const statsData = await getBetsStats();
    res.json({ success: true, data: statsData });
  } catch (error) { handleError(res, error); }
});

/* ========================================================================
   BETS CRUD ROUTES
   ======================================================================== */

// Get all bets
router.get('/bets', async (req, res) => {
  try {
    const bets = await dbQuery('SELECT * FROM bets ORDER BY date DESC, time DESC, id DESC');
    res.json({ success: true, data: bets });
  } catch (error) { handleError(res, error); }
});

// Add a new bet
router.post('/bets', async (req, res) => {
  const {
    match_id, date, time, league, home_team, away_team,
    best_tip, card_line, odds, stake, probability,
    bookmaker, status, notes, match_url, sport
  } = req.body;

  if (!date || !time || !league || !home_team || !away_team || !best_tip || card_line === undefined || odds === undefined || stake === undefined) {
    return res.status(400).json({ success: false, error: { message: 'Missing required bet fields' } });
  }

  const cleanCardLine = parseFloat(card_line);
  const cleanOdds = parseFloat(odds);
  const cleanStake = parseFloat(stake);
  const cleanProb = probability ? parseInt(probability) : null;
  const cleanStatus = status || 'PENDING';
  const cleanSport = sport || 'football';
  
  let payout = 0;
  if (cleanStatus === 'WON') {
    payout = cleanStake * cleanOdds;
  } else if (cleanStatus === 'REFUNDED') {
    payout = cleanStake;
  }

  try {
    const sql = `
      INSERT INTO bets (
        match_id, date, time, league, home_team, away_team,
        best_tip, card_line, odds, stake, probability,
        bookmaker, status, payout, notes, match_url, sport
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      match_id || null, date, time, league, home_team, away_team,
      best_tip, cleanCardLine, cleanOdds, cleanStake, cleanProb,
      normalizeBookmaker(bookmaker || 'Unibet'), cleanStatus, payout, notes || null, match_url || null, cleanSport
    ];

    const result = await dbRun(sql, params);
    await syncBankroll();

    const newBet = await dbGet('SELECT * FROM bets WHERE id = ?', [result.id]);
    res.status(201).json({ success: true, data: newBet });
  } catch (error) { handleError(res, error); }
});

// Add multiple bets at once (batch mode)
router.post('/bets/batch', async (req, res) => {
  const { bets } = req.body;

  if (!bets || !Array.isArray(bets) || bets.length === 0) {
    return res.status(400).json({ success: false, error: { message: 'Missing or invalid bets array' } });
  }

  try {
    const insertedBets = [];
    
    for (const bet of bets) {
      const {
        match_id, date, time, league, home_team, away_team,
        best_tip, card_line, odds, stake, probability,
        bookmaker, status, notes, match_url, sport
      } = bet;

      if (!date || !time || !league || !home_team || !away_team || !best_tip || card_line === undefined || odds === undefined || stake === undefined) {
        continue;
      }

      const cleanCardLine = parseFloat(card_line);
      const cleanOdds = parseFloat(odds);
      const cleanStake = parseFloat(stake);
      const cleanProb = probability ? parseInt(probability) : null;
      const cleanStatus = status || 'PENDING';
      const cleanSport = sport || 'football';
      
      let payout = 0;
      if (cleanStatus === 'WON') {
        payout = cleanStake * cleanOdds;
      } else if (cleanStatus === 'REFUNDED') {
        payout = cleanStake;
      }

      const sql = `
        INSERT INTO bets (
          match_id, date, time, league, home_team, away_team,
          best_tip, card_line, odds, stake, probability,
          bookmaker, status, payout, notes, match_url, sport
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        match_id || null, date, time, league, home_team, away_team,
        best_tip, cleanCardLine, cleanOdds, cleanStake, cleanProb,
        normalizeBookmaker(bookmaker || 'Unibet'), cleanStatus, payout, notes || null, match_url || null, cleanSport
      ];

      const result = await dbRun(sql, params);
      const newBet = await dbGet('SELECT * FROM bets WHERE id = ?', [result.id]);
      insertedBets.push(newBet);
    }

    await syncBankroll();
    res.status(201).json({ success: true, data: insertedBets, count: insertedBets.length });
  } catch (error) { handleError(res, error); }
});

// Update an existing bet
router.put('/bets/:id', async (req, res) => {
  const { id } = req.params;
  const {
    date, time, league, home_team, away_team, best_tip,
    card_line, odds, stake, probability, bookmaker, status, notes, sport
  } = req.body;

  try {
    const existing = await dbGet('SELECT * FROM bets WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Bet not found' } });
    }

    const cleanCardLine = card_line !== undefined ? parseFloat(card_line) : existing.card_line;
    const cleanOdds = odds !== undefined ? parseFloat(odds) : existing.odds;
    const cleanStake = stake !== undefined ? parseFloat(stake) : existing.stake;
    const cleanProb = probability !== undefined ? (probability ? parseInt(probability) : null) : existing.probability;
    const cleanStatus = status !== undefined ? status : existing.status;
    const cleanNotes = notes !== undefined ? notes : existing.notes;
    const cleanSport = sport !== undefined ? sport : existing.sport;
    
    let payout = 0;
    if (cleanStatus === 'WON') {
      payout = cleanStake * cleanOdds;
    } else if (cleanStatus === 'REFUNDED') {
      payout = cleanStake;
    }

    const sql = `
      UPDATE bets SET
        date = ?, time = ?, league = ?, home_team = ?, away_team = ?,
        best_tip = ?, card_line = ?, odds = ?, stake = ?, probability = ?,
        bookmaker = ?, status = ?, payout = ?, notes = ?, sport = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const params = [
      date || existing.date, time || existing.time, league || existing.league,
      home_team || existing.home_team, away_team || existing.away_team, best_tip || existing.best_tip,
      cleanCardLine, cleanOdds, cleanStake, cleanProb, normalizeBookmaker(bookmaker || existing.bookmaker),
      cleanStatus, payout, cleanNotes, cleanSport, id
    ];

    await dbRun(sql, params);
    await syncBankroll();

    const updatedBet = await dbGet('SELECT * FROM bets WHERE id = ?', [id]);
    res.json({ success: true, data: updatedBet });
  } catch (error) { handleError(res, error); }
});

// Delete multiple bets
router.post('/bets/delete-batch', async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, error: { message: 'Missing or invalid ids array' } });
  }

  try {
    const placeholders = ids.map(() => '?').join(',');
    await dbRun(`DELETE FROM bets WHERE id IN (${placeholders})`, ids);
    await syncBankroll();
    res.json({ success: true, message: `${ids.length} bets deleted successfully` });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Delete a bet
router.delete('/bets/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await dbGet('SELECT * FROM bets WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Bet not found' } });
    }

    await dbRun('DELETE FROM bets WHERE id = ?', [id]);
    await syncBankroll();
    res.json({ success: true, data: { id, message: 'Bet deleted successfully' } });
  } catch (error) { handleError(res, error); }
});

// Refresh a single bet outcome by scraping its match page
router.post('/bets/:id/refresh', async (req, res) => {
  const { id } = req.params;
  const scraperPath = process.env.SCRAPER_PATH || 'E:\\Developpement\\scrapper-v3';

  try {
    const result = await resolveSingleBet(id, scraperPath);
    res.json(result);
  } catch (error) {
    console.error('Error auto-resolving single bet:', error);
    handleError(res, error);
  }
});

// Refresh all pending bets in parallel batches (concurrency = 3)
router.post('/bets/refresh-all', async (req, res) => {
  const scraperPath = process.env.SCRAPER_PATH || 'E:\\Developpement\\scrapper-v3';

  try {
    const result = await resolveAllPendingBets(scraperPath);
    res.json({ success: true, message: `${result.updatedCount} pari(s) résolu(s) automatiquement !`, ...result });
  } catch (error) {
    console.error('Error auto-resolving all pending bets:', error);
    handleError(res, error);
  }
});

export default router;
export { syncBankroll };
