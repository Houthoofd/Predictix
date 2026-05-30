import express from 'express';
import { dbQuery, dbGet, dbRun } from '../db/database.js';

const router = express.Router();

// Helper to synchronize bankroll balance based on initial balance and all bet outcomes
async function syncBankroll() {
  try {
    // 1. Get initial bankroll info
    const bankroll = await dbGet('SELECT * FROM bankroll ORDER BY id DESC LIMIT 1');
    if (!bankroll) {
      throw new Error('Bankroll not initialized');
    }

    // 2. Get all settled bets
    const bets = await dbQuery("SELECT stake, odds, status FROM bets WHERE status != 'PENDING'");
    
    // 3. Calculate cumulative net profit/loss
    let netProfit = 0;
    for (const bet of bets) {
      if (bet.status === 'WON') {
        netProfit += bet.stake * (bet.odds - 1);
      } else if (bet.status === 'LOST') {
        netProfit -= bet.stake;
      }
      // REFUNDED has 0 impact
    }

    const newBalance = bankroll.initial_balance + netProfit;

    // 4. Update balance in database
    await dbRun('UPDATE bankroll SET balance = ? WHERE id = ?', [newBalance, bankroll.id]);
    
    return {
      initial_balance: bankroll.initial_balance,
      balance: newBalance,
      currency: bankroll.currency,
      updated_at: bankroll.updated_at
    };
  } catch (error) {
    console.error('Error syncing bankroll:', error);
    throw error;
  }
}

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
    // Check if a bankroll exists
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
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Get advanced bankroll and betting statistics
router.get('/bankroll/stats', async (req, res) => {
  try {
    const bankroll = await syncBankroll();
    const allBets = await dbQuery('SELECT * FROM bets ORDER BY date ASC, time ASC, id ASC');
    
    let totalProfit = 0;
    let totalStake = 0;
    let wonCount = 0;
    let lostCount = 0;
    let pendingCount = 0;
    let refundedCount = 0;
    
    // Dynamic bankroll history starting with the initial balance
    const history = [{
      name: 'Départ',
      balance: bankroll.initial_balance,
      profit: 0,
      date: 'Init'
    }];
    
    let currentBalance = bankroll.initial_balance;
    const leagueStats = {};
    const bookmakerStats = {};
    const monthlyStats = {};

    for (const bet of allBets) {
      let betProfit = 0;
      
      if (bet.status === 'WON') {
        wonCount++;
        betProfit = bet.stake * (bet.odds - 1);
        totalStake += bet.stake;
      } else if (bet.status === 'LOST') {
        lostCount++;
        betProfit = -bet.stake;
        totalStake += bet.stake;
      } else if (bet.status === 'REFUNDED') {
        refundedCount++;
        betProfit = 0;
        totalStake += bet.stake; // Stake counted or not in ROI? Standard ROI divides net profit by total settled stakes.
      } else if (bet.status === 'PENDING') {
        pendingCount++;
      }

      if (bet.status !== 'PENDING') {
        totalProfit += betProfit;
        currentBalance += betProfit;
        
        // Add to history
        history.push({
          name: `${bet.home_team} vs ${bet.away_team}`.substring(0, 20) + '...',
          balance: parseFloat(currentBalance.toFixed(2)),
          profit: parseFloat(totalProfit.toFixed(2)),
          date: bet.date
        });

        // Group stats by league
        if (!leagueStats[bet.league]) {
          leagueStats[bet.league] = { name: bet.league, profit: 0, won: 0, lost: 0, total: 0 };
        }
        leagueStats[bet.league].profit += betProfit;
        leagueStats[bet.league].total++;
        if (bet.status === 'WON') leagueStats[bet.league].won++;
        if (bet.status === 'LOST') leagueStats[bet.league].lost++;

        // Group stats by bookmaker
        if (!bookmakerStats[bet.bookmaker]) {
          bookmakerStats[bet.bookmaker] = { name: bet.bookmaker, profit: 0, won: 0, lost: 0, total: 0 };
        }
        bookmakerStats[bet.bookmaker].profit += betProfit;
        bookmakerStats[bet.bookmaker].total++;
        if (bet.status === 'WON') bookmakerStats[bet.bookmaker].won++;
        if (bet.status === 'LOST') bookmakerStats[bet.bookmaker].lost++;

        // Group by month
        const month = bet.date.substring(0, 7); // YYYY-MM
        if (!monthlyStats[month]) {
          monthlyStats[month] = { month, profit: 0, total: 0 };
        }
        monthlyStats[month].profit += betProfit;
        monthlyStats[month].total++;
      }
    }

    const settledCount = wonCount + lostCount;
    const winRate = settledCount > 0 ? (wonCount / settledCount) * 100 : 0;
    const roi = totalStake > 0 ? (totalProfit / totalStake) * 100 : 0;

    // Convert objects to arrays for client consumption
    const leaguesList = Object.values(leagueStats).map(l => ({
      ...l,
      profit: parseFloat(l.profit.toFixed(2))
    })).sort((a, b) => b.profit - a.profit);

    const bookmakersList = Object.values(bookmakerStats).map(b => ({
      ...b,
      profit: parseFloat(b.profit.toFixed(2))
    })).sort((a, b) => b.profit - a.profit);

    const monthlyList = Object.values(monthlyStats).map(m => ({
      ...m,
      profit: parseFloat(m.profit.toFixed(2))
    })).sort((a, b) => a.month.localeCompare(b.month));

    // Profit this month helper
    const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM
    const currentMonthProfit = monthlyStats[currentMonthStr]?.profit || 0;

    res.json({
      success: true,
      data: {
        bankroll: {
          initial: bankroll.initial_balance,
          current: bankroll.balance,
          currency: bankroll.currency
        },
        summary: {
          total_profit: parseFloat(totalProfit.toFixed(2)),
          total_stake: parseFloat(totalStake.toFixed(2)),
          roi: parseFloat(roi.toFixed(2)),
          win_rate: parseFloat(winRate.toFixed(2)),
          current_month_profit: parseFloat(currentMonthProfit.toFixed(2)),
          counts: {
            total: allBets.length,
            won: wonCount,
            lost: lostCount,
            pending: pendingCount,
            refunded: refundedCount,
            settled: settledCount
          }
        },
        charts: {
          history,
          leagues: leaguesList,
          bookmakers: bookmakersList,
          monthly: monthlyList
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/* ========================================================================
   BETS CRUD ROUTES
   ======================================================================== */

// Get all bets
router.get('/bets', async (req, res) => {
  try {
    const bets = await dbQuery('SELECT * FROM bets ORDER BY date DESC, time DESC, id DESC');
    res.json({ success: true, data: bets });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Add a new bet
router.post('/bets', async (req, res) => {
  const {
    match_id,
    date,
    time,
    league,
    home_team,
    away_team,
    best_tip,
    card_line,
    odds,
    stake,
    probability,
    bookmaker,
    status,
    notes
  } = req.body;

  // Validation
  if (!date || !time || !league || !home_team || !away_team || !best_tip || card_line === undefined || odds === undefined || stake === undefined) {
    return res.status(400).json({ success: false, error: { message: 'Missing required bet fields' } });
  }

  const cleanCardLine = parseFloat(card_line);
  const cleanOdds = parseFloat(odds);
  const cleanStake = parseFloat(stake);
  const cleanProb = probability ? parseInt(probability) : null;
  const cleanStatus = status || 'PENDING';
  
  // Calculate initial payout
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
        bookmaker, status, payout, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      match_id || null,
      date,
      time,
      league,
      home_team,
      away_team,
      best_tip,
      cleanCardLine,
      cleanOdds,
      cleanStake,
      cleanProb,
      bookmaker || 'Unibet',
      cleanStatus,
      payout,
      notes || null
    ];

    const result = await dbRun(sql, params);
    
    // Sync bankroll
    await syncBankroll();

    const newBet = await dbGet('SELECT * FROM bets WHERE id = ?', [result.id]);
    res.status(201).json({ success: true, data: newBet });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Update an existing bet
router.put('/bets/:id', async (req, res) => {
  const { id } = req.params;
  const {
    date,
    time,
    league,
    home_team,
    away_team,
    best_tip,
    card_line,
    odds,
    stake,
    probability,
    bookmaker,
    status,
    notes
  } = req.body;

  try {
    // Check if exists
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
    
    // Calculate payout
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
        bookmaker = ?, status = ?, payout = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const params = [
      date || existing.date,
      time || existing.time,
      league || existing.league,
      home_team || existing.home_team,
      away_team || existing.away_team,
      best_tip || existing.best_tip,
      cleanCardLine,
      cleanOdds,
      cleanStake,
      cleanProb,
      bookmaker || existing.bookmaker,
      cleanStatus,
      payout,
      cleanNotes,
      id
    ];

    await dbRun(sql, params);
    
    // Sync bankroll
    await syncBankroll();

    const updatedBet = await dbGet('SELECT * FROM bets WHERE id = ?', [id]);
    res.json({ success: true, data: updatedBet });
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
    
    // Sync bankroll
    await syncBankroll();

    res.json({ success: true, data: { id, message: 'Bet deleted successfully' } });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
export { syncBankroll };
