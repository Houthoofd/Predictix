import express from 'express';
import { dbQuery, dbGet, dbRun } from '../db/database.js';
import { scrapeSingleMatch, isTorActive } from './scraper.js';

const router = express.Router();

// Helper to synchronize bankroll balance based on initial balance and all bet outcomes
async function syncBankroll() {
  try {
    // 1. Get initial bankroll info
    const bankroll = await dbGet('SELECT * FROM bankroll ORDER BY id DESC LIMIT 1');
    if (!bankroll) {
      throw new Error('Bankroll not initialized');
    }

    // 2. Get all bets (both pending and settled)
    const bets = await dbQuery("SELECT stake, odds, status FROM bets");
    
    // 3. Calculate cumulative net profit/loss and pending active stakes
    let netProfit = 0;
    let pendingStakes = 0;
    for (const bet of bets) {
      if (bet.status === 'WON') {
        netProfit += bet.stake * (bet.odds - 1);
      } else if (bet.status === 'LOST') {
        netProfit -= bet.stake;
      } else if (bet.status === 'PENDING') {
        pendingStakes += bet.stake;
      }
      // REFUNDED has 0 impact
    }

    const newBalance = bankroll.initial_balance + netProfit - pendingStakes;

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

// Auto-settle any PENDING bets for a specific match when its corners are scraped/updated
export async function autoSettleBetsForMatch(matchId, homeCorners, awayCorners) {
  if (homeCorners === null || homeCorners === undefined || awayCorners === null || awayCorners === undefined) {
    return [];
  }
  
  try {
    // Look up any pending bets for this match
    const pendingBets = await dbQuery("SELECT * FROM bets WHERE status = 'PENDING' AND match_id = ?", [matchId]);
    if (pendingBets.length === 0) return [];
    
    const totalCorners = parseFloat(homeCorners) + parseFloat(awayCorners);
    console.log(`[Predictix Auto-Settle] Found ${pendingBets.length} pending bet(s) for match ${matchId}. Settling with corners: ${totalCorners} (${homeCorners}-${awayCorners})`);
    
    const resolved = [];

    for (const bet of pendingBets) {
      const cardLine = parseFloat(bet.card_line);
      const tip = bet.best_tip.toLowerCase();
      
      let newStatus = 'PENDING';
      if (tip === 'over' || tip === 'plus de') {
        if (totalCorners > cardLine) newStatus = 'WON';
        else if (totalCorners < cardLine) newStatus = 'LOST';
        else newStatus = 'REFUNDED';
      } else if (tip === 'under' || tip === 'moins de') {
        if (totalCorners < cardLine) newStatus = 'WON';
        else if (totalCorners > cardLine) newStatus = 'LOST';
        else newStatus = 'REFUNDED';
      }
      
      if (newStatus !== 'PENDING') {
        let payout = 0.0;
        if (newStatus === 'WON') {
          payout = bet.stake * bet.odds;
        } else if (newStatus === 'REFUNDED') {
          payout = bet.stake;
        }
        
        await dbRun(
          'UPDATE bets SET status = ?, payout = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [newStatus, payout, bet.id]
        );
        
        console.log(`[Predictix Auto-Settle] ✓ Bet ID ${bet.id} resolved successfully: ${newStatus} (Payout: ${payout})`);
        
        resolved.push({
          id: bet.id,
          home_team: bet.home_team,
          away_team: bet.away_team,
          status: newStatus,
          payout: payout,
          stake: bet.stake,
          odds: bet.odds,
          best_tip: bet.best_tip,
          card_line: bet.card_line,
          total_corners: totalCorners,
          home_corners: parseFloat(homeCorners),
          away_corners: parseFloat(awayCorners)
        });
      }
    }
    
    // Sync the bankroll to immediately reflect won/lost amounts and pending stakes!
    await syncBankroll();
    return resolved;
  } catch (error) {
    console.error(`[Predictix Auto-Settle Error] Failed to auto-settle bets for match ${matchId}:`, error);
    return [];
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
    notes,
    match_url
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
        bookmaker, status, payout, notes, match_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      notes || null,
      match_url || null
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

// Refresh a single bet outcome by scraping its match page
router.post('/bets/:id/refresh', async (req, res) => {
  const { id } = req.params;
  try {
    const torActive = await isTorActive();
    if (!torActive) {
      return res.status(400).json({ 
        success: false, 
        error: { message: "Le proxy Tor local n'est pas actif sur le port 9050. Veuillez lancer Tor et réessayer." } 
      });
    }

    // 1. Fetch bet from database
    const bet = await dbGet('SELECT * FROM bets WHERE id = ?', [id]);
    if (!bet) {
      return res.status(404).json({ success: false, error: { message: 'Pari introuvable.' } });
    }

    // 2. Resolve target match URL link
    const scraperPath = process.env.SCRAPER_PATH || 'E:\\Developpement\\scrapper-v3';
    let link = bet.match_url;
    if (!link && bet.match_id) {
      // Fallback: look up in scraped_predictions
      const pred = await dbGet('SELECT match_url FROM scraped_predictions WHERE match_id = ?', [bet.match_id]);
      if (pred && pred.match_url) {
        link = pred.match_url;
      }
    }
    if (!link) {
      link = bet.match_id;
    }
    if (!link) {
      return res.status(400).json({ success: false, error: { message: 'Ce pari ne dispose d\'aucun lien de match pour mise à jour automatique.' } });
    }
    if (!link.startsWith('/live-score/') && !link.startsWith('http')) {
      link = `/live-score/${link}`;
    }

    console.log(`[Predictix Bet Auto-Settle] Refreshing bet ${id} for match: ${link}`);
    
    // 3. Scraping the match page (skipOdds = true for speed)
    const matchData = await scrapeSingleMatch(scraperPath, link, true);
    if (!matchData) {
      return res.status(500).json({ success: false, error: { message: 'Impossible de joindre Matchendirect pour récupérer le score.' } });
    }

    // 4. Extract first half corners
    const homeCorners = matchData.first_half_corners_home;
    const awayCorners = matchData.first_half_corners_away;

    if (homeCorners === null || homeCorners === undefined || awayCorners === null || awayCorners === undefined) {
      return res.json({
        success: false,
        message: 'Les statistiques de corners 1MT ne sont pas encore disponibles (match en cours ou non commencé).'
      });
    }

    const totalCorners = parseFloat(homeCorners) + parseFloat(awayCorners);
    const cardLine = parseFloat(bet.card_line);
    const tip = bet.best_tip.toLowerCase();

    let newStatus = 'PENDING';
    if (tip === 'over' || tip === 'plus de') {
      if (totalCorners > cardLine) newStatus = 'WON';
      else if (totalCorners < cardLine) newStatus = 'LOST';
      else newStatus = 'REFUNDED';
    } else if (tip === 'under' || tip === 'moins de') {
      if (totalCorners < cardLine) newStatus = 'WON';
      else if (totalCorners > cardLine) newStatus = 'LOST';
      else newStatus = 'REFUNDED';
    }

    if (newStatus === 'PENDING') {
      return res.json({
        success: true,
        message: `Match analysé, mais le résultat est indéterminé. Corners 1MT: ${totalCorners} contre une ligne de ${cardLine}.`,
        data: { bet, corners: { home: homeCorners, away: awayCorners, total: totalCorners } }
      });
    }

    // Calculate payout
    let payout = 0.0;
    if (newStatus === 'WON') {
      payout = bet.stake * bet.odds;
    } else if (newStatus === 'REFUNDED') {
      payout = bet.stake;
    }

    // 5. Update bet status in DB
    await dbRun(
      'UPDATE bets SET status = ?, payout = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, payout, id]
    );

    // 6. Synchronize bankroll
    const bankroll = await syncBankroll();
    const updatedBet = await dbGet('SELECT * FROM bets WHERE id = ?', [id]);

    res.json({
      success: true,
      message: `Pari résolu avec succès ! Corners 1MT: ${totalCorners} (${homeCorners}-${awayCorners}) contre une ligne de ${cardLine}. Résultat: ${newStatus === 'WON' ? 'Gagné' : newStatus === 'LOST' ? 'Perdu' : 'Remboursé'}.`,
      data: {
        bet: {
          ...updatedBet,
          total_corners: totalCorners,
          home_corners: parseFloat(homeCorners),
          away_corners: parseFloat(awayCorners)
        },
        bankroll
      }
    });

  } catch (error) {
    console.error('Error auto-resolving single bet:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Refresh all pending bets in parallel batches (concurrency = 3)
router.post('/bets/refresh-all', async (req, res) => {
  try {
    const torActive = await isTorActive();
    if (!torActive) {
      return res.status(400).json({ 
        success: false, 
        error: { message: "Le proxy Tor local n'est pas actif sur le port 9050. Veuillez lancer Tor et réessayer." } 
      });
    }

    // 1. Get all pending bets with valid match_id
    const pendingBets = await dbQuery("SELECT * FROM bets WHERE status = 'PENDING' AND match_id IS NOT NULL AND match_id != ''");
    if (pendingBets.length === 0) {
      return res.json({
        success: true,
        message: 'Aucun pari en attente à rafraîchir.',
        updatedCount: 0,
        results: []
      });
    }

    const scraperPath = process.env.SCRAPER_PATH || 'E:\\Developpement\\scrapper-v3';
    const results = [];
    let updatedCount = 0;

    // Helper to process a single bet in our parallel pipeline
    const processBet = async (bet) => {
      let link = bet.match_url;
      if (!link && bet.match_id) {
        // Fallback: look up in scraped_predictions
        const pred = await dbGet('SELECT match_url FROM scraped_predictions WHERE match_id = ?', [bet.match_id]);
        if (pred && pred.match_url) {
          link = pred.match_url;
        }
      }
      if (!link) {
        link = bet.match_id;
      }
      if (!link) {
        return { id: bet.id, match: `${bet.home_team} vs ${bet.away_team}`, status: 'ERROR', reason: 'Aucun lien de match disponible.' };
      }
      if (!link.startsWith('/live-score/') && !link.startsWith('http')) {
        link = `/live-score/${link}`;
      }

      try {
        const matchData = await scrapeSingleMatch(scraperPath, link, true);
        if (!matchData) {
          return { id: bet.id, match: `${bet.home_team} vs ${bet.away_team}`, status: 'ERROR', reason: 'Liaison Matchendirect échouée.' };
        }

        const homeCorners = matchData.first_half_corners_home;
        const awayCorners = matchData.first_half_corners_away;

        if (homeCorners === null || homeCorners === undefined || awayCorners === null || awayCorners === undefined) {
          return { id: bet.id, match: `${bet.home_team} vs ${bet.away_team}`, status: 'PENDING', reason: 'Corners 1MT non encore disponibles.' };
        }

        const totalCorners = parseFloat(homeCorners) + parseFloat(awayCorners);
        const cardLine = parseFloat(bet.card_line);
        const tip = bet.best_tip.toLowerCase();

        let newStatus = 'PENDING';
        if (tip === 'over' || tip === 'plus de') {
          if (totalCorners > cardLine) newStatus = 'WON';
          else if (totalCorners < cardLine) newStatus = 'LOST';
          else newStatus = 'REFUNDED';
        } else if (tip === 'under' || tip === 'moins de') {
          if (totalCorners < cardLine) newStatus = 'WON';
          else if (totalCorners > cardLine) newStatus = 'LOST';
          else newStatus = 'REFUNDED';
        }

        if (newStatus !== 'PENDING') {
          let payout = 0.0;
          if (newStatus === 'WON') {
            payout = bet.stake * bet.odds;
          } else if (newStatus === 'REFUNDED') {
            payout = bet.stake;
          }

          await dbRun(
            'UPDATE bets SET status = ?, payout = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newStatus, payout, bet.id]
          );
          updatedCount++;
          return {
            id: bet.id,
            home_team: bet.home_team,
            away_team: bet.away_team,
            status: newStatus,
            payout: payout,
            stake: bet.stake,
            odds: bet.odds,
            best_tip: bet.best_tip,
            card_line: bet.card_line,
            total_corners: totalCorners,
            home_corners: parseFloat(homeCorners),
            away_corners: parseFloat(awayCorners)
          };
        }

        return { id: bet.id, match: `${bet.home_team} vs ${bet.away_team}`, status: 'PENDING', corners: `${homeCorners}-${awayCorners}`, line: cardLine };
      } catch (err) {
        console.error(`Error auto-settling bet ID ${bet.id}:`, err);
        return { id: bet.id, match: `${bet.home_team} vs ${bet.away_team}`, status: 'ERROR', reason: err.message };
      }
    };

    const settledBetsList = [];

    // Concurrently run in parallel groups of 3 over Tor
    const concurrency = 3;
    for (let i = 0; i < pendingBets.length; i += concurrency) {
      const chunk = pendingBets.slice(i, i + concurrency);
      const chunkResults = await Promise.all(chunk.map(bet => processBet(bet)));
      for (const resItem of chunkResults) {
        if (resItem && resItem.status && resItem.status !== 'PENDING' && resItem.status !== 'ERROR') {
          settledBetsList.push(resItem);
        }
      }
      results.push(...chunkResults);
    }

    // Sync bankroll if any bets got resolved
    let bankroll = null;
    if (updatedCount > 0) {
      bankroll = await syncBankroll();
    } else {
      bankroll = await dbGet('SELECT * FROM bankroll ORDER BY id DESC LIMIT 1');
    }

    res.json({
      success: true,
      message: `${updatedCount} pari(s) résolu(s) automatiquement !`,
      updatedCount,
      results,
      settledBets: settledBetsList,
      bankroll
    });

  } catch (error) {
    console.error('Error auto-resolving all pending bets:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
export { syncBankroll };
