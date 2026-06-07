import { dbQuery, dbGet, dbRun, insertNotification } from '../db/database.js';

export async function syncBankroll() {
  try {
    const bankroll = await dbGet('SELECT * FROM bankroll ORDER BY id DESC LIMIT 1');
    if (!bankroll) throw new Error('Bankroll not initialized');

    const bets = await dbQuery("SELECT stake, odds, status FROM bets");
    let netProfit = 0, pendingStakes = 0;
    for (const b of bets) {
      if (b.status === 'WON') netProfit += b.stake * (b.odds - 1);
      else if (b.status === 'LOST') netProfit -= b.stake;
      else if (b.status === 'PENDING') pendingStakes += b.stake;
    }

    const newBalance = bankroll.initial_balance + netProfit - pendingStakes;
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

export async function autoSettleBetsForMatch(matchId) {
  try {
    const match = await dbGet('SELECT * FROM scraped_predictions WHERE match_id = ?', [matchId]);
    if (!match) return [];

    const pendingBets = await dbQuery("SELECT * FROM bets WHERE status = 'PENDING' AND match_id = ?", [matchId]);
    if (pendingBets.length === 0) return [];
    
    const sport = (match.sport || 'football').toLowerCase().trim();
    console.log(`[Predictix Auto-Settle] Found ${pendingBets.length} pending bet(s) for [${sport}] match ${matchId}.`);
    
    const resolved = [];

    for (const bet of pendingBets) {
      const cardLine = parseFloat(bet.card_line);
      const tip = bet.best_tip.toLowerCase();
      let newStatus = 'PENDING';
      let totalMetric = null;
      let homeScore = null, awayScore = null;

      if (sport === 'football') {
        const homeCorners = match.first_half_corners_home;
        const awayCorners = match.first_half_corners_away;
        if (homeCorners === null || homeCorners === undefined || awayCorners === null || awayCorners === undefined) {
          continue;
        }
        totalMetric = parseFloat(homeCorners) + parseFloat(awayCorners);
      } else {
        const score = match.score;
        if (!score || score.trim() === '' || score.trim() === '-' || !score.includes('-')) {
          continue;
        }
        const scoreMatch = score.match(/(\d+)\s*-\s*(\d+)/);
        if (!scoreMatch) continue;
        homeScore = parseFloat(scoreMatch[1]);
        awayScore = parseFloat(scoreMatch[2]);
        totalMetric = homeScore + awayScore;
      }

      if (tip === 'over' || tip === 'plus de' || tip === 'under' || tip === 'moins de') {
        if (tip === 'over' || tip === 'plus de') {
          newStatus = totalMetric > cardLine ? 'WON' : (totalMetric < cardLine ? 'LOST' : 'REFUNDED');
        } else {
          newStatus = totalMetric < cardLine ? 'WON' : (totalMetric > cardLine ? 'LOST' : 'REFUNDED');
        }
      } else if (homeScore !== null && awayScore !== null) {
        const isHome = tip === '1' || tip === 'home' || tip === 'domicile';
        const isAway = tip === '2' || tip === 'away' || tip === 'extérieur' || tip === 'exterieur';
        const isDraw = tip === 'x' || tip === 'n' || tip === 'nul' || tip === 'match nul';

        if (isHome) {
          if (cardLine !== 0 && !isNaN(cardLine)) {
            const netHome = homeScore + cardLine;
            newStatus = netHome > awayScore ? 'WON' : (netHome < awayScore ? 'LOST' : 'REFUNDED');
          } else {
            newStatus = homeScore > awayScore ? 'WON' : 'LOST';
          }
        } else if (isAway) {
          if (cardLine !== 0 && !isNaN(cardLine)) {
            const netAway = awayScore + cardLine;
            newStatus = netAway > homeScore ? 'WON' : (netAway < homeScore ? 'LOST' : 'REFUNDED');
          } else {
            newStatus = awayScore > homeScore ? 'WON' : 'LOST';
          }
        } else if (isDraw) {
          newStatus = homeScore === awayScore ? 'WON' : 'LOST';
        }
      }
      
      if (newStatus !== 'PENDING') {
        let payout = newStatus === 'WON' ? bet.stake * bet.odds : (newStatus === 'REFUNDED' ? bet.stake : 0.0);
        
        await dbRun(
          'UPDATE bets SET status = ?, payout = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [newStatus, payout, bet.id]
        );
        
        console.log(`[Predictix Auto-Settle] ✓ Bet ID ${bet.id} resolved successfully: ${newStatus} (Payout: ${payout})`);
        
        const statusLabel = newStatus === 'WON' ? 'GAGNÉ' : (newStatus === 'LOST' ? 'PERDU' : 'ANNULÉ');
        const profit = newStatus === 'WON' ? (bet.stake * (bet.odds - 1)).toFixed(2) : (newStatus === 'LOST' ? (-bet.stake).toFixed(2) : '0.00');
        const profitSign = newStatus === 'WON' ? '+' : '';
        const currency = '€';
        
        const notificationMsg = `Pari ${statusLabel} (${profitSign}${profit} ${currency}) : ${bet.home_team} vs ${bet.away_team} (${bet.best_tip} ${bet.card_line})`;
        const notificationType = newStatus === 'WON' ? 'success' : (newStatus === 'LOST' ? 'error' : 'info');
        
        await insertNotification(notificationMsg, notificationType);
        
        const resItem = {
          id: bet.id,
          home_team: bet.home_team,
          away_team: bet.away_team,
          status: newStatus,
          payout: payout,
          stake: bet.stake,
          odds: bet.odds,
          best_tip: bet.best_tip,
          card_line: bet.card_line,
          sport
        };

        if (sport === 'football') {
          resItem.total_corners = totalMetric;
          resItem.home_corners = parseFloat(match.first_half_corners_home);
          resItem.away_corners = parseFloat(match.first_half_corners_away);
        } else {
          resItem.total_score = totalMetric;
          resItem.score = match.score;
        }
        resolved.push(resItem);
      }
    }
    
    if (resolved.length > 0) await syncBankroll();
    return resolved;
  } catch (error) {
    console.error(`[Predictix Auto-Settle Error] Failed to auto-settle bets for match ${matchId}:`, error);
    return [];
  }
}

export async function getBetsStats() {
  const bankroll = await syncBankroll();
  const allBets = await dbQuery('SELECT * FROM bets ORDER BY date ASC, time ASC, id ASC');
  
  let totalProfit = 0, totalStake = 0, wonCount = 0, lostCount = 0, pendingCount = 0, refundedCount = 0;
  const history = [{ name: 'Départ', balance: bankroll.initial_balance, profit: 0, date: 'Init' }];
  
  let currentBalance = bankroll.initial_balance;
  const leagueStats = {};
  const bookmakerStats = {};
  const monthlyStats = {};

  for (const bet of allBets) {
    let betProfit = 0;
    if (bet.status === 'WON') { wonCount++; betProfit = bet.stake * (bet.odds - 1); totalStake += bet.stake; }
    else if (bet.status === 'LOST') { lostCount++; betProfit = -bet.stake; totalStake += bet.stake; }
    else if (bet.status === 'REFUNDED') { refundedCount++; totalStake += bet.stake; }
    else if (bet.status === 'PENDING') pendingCount++;

    if (bet.status !== 'PENDING') {
      totalProfit += betProfit;
      currentBalance += betProfit;
      
      history.push({
        name: `${bet.home_team} vs ${bet.away_team}`.substring(0, 20) + '...',
        balance: parseFloat(currentBalance.toFixed(2)),
        profit: parseFloat(totalProfit.toFixed(2)),
        date: bet.date
      });

      if (!leagueStats[bet.league]) leagueStats[bet.league] = { name: bet.league, profit: 0, won: 0, lost: 0, total: 0 };
      leagueStats[bet.league].profit += betProfit;
      leagueStats[bet.league].total++;
      if (bet.status === 'WON') leagueStats[bet.league].won++;
      if (bet.status === 'LOST') leagueStats[bet.league].lost++;

      if (!bookmakerStats[bet.bookmaker]) bookmakerStats[bet.bookmaker] = { name: bet.bookmaker, profit: 0, won: 0, lost: 0, total: 0 };
      bookmakerStats[bet.bookmaker].profit += betProfit;
      bookmakerStats[bet.bookmaker].total++;
      if (bet.status === 'WON') bookmakerStats[bet.bookmaker].won++;
      if (bet.status === 'LOST') bookmakerStats[bet.bookmaker].lost++;

      const month = bet.date.substring(0, 7);
      if (!monthlyStats[month]) monthlyStats[month] = { month, profit: 0, total: 0 };
      monthlyStats[month].profit += betProfit;
      monthlyStats[month].total++;
    }
  }

  const settledCount = wonCount + lostCount;
  const winRate = settledCount > 0 ? (wonCount / settledCount) * 100 : 0;
  const roi = totalStake > 0 ? (totalProfit / totalStake) * 100 : 0;

  const leaguesList = Object.values(leagueStats).map(l => ({ ...l, profit: parseFloat(l.profit.toFixed(2)) })).sort((a, b) => b.profit - a.profit);
  const bookmakersList = Object.values(bookmakerStats).map(b => ({ ...b, profit: parseFloat(b.profit.toFixed(2)) })).sort((a, b) => b.profit - a.profit);
  const monthlyList = Object.values(monthlyStats).map(m => ({ ...m, profit: parseFloat(m.profit.toFixed(2)) })).sort((a, b) => a.month.localeCompare(b.month));

  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const currentMonthProfit = monthlyStats[currentMonthStr]?.profit || 0;

  return {
    bankroll: { initial: bankroll.initial_balance, current: bankroll.balance, currency: bankroll.currency },
    summary: {
      total_profit: parseFloat(totalProfit.toFixed(2)),
      total_stake: parseFloat(totalStake.toFixed(2)),
      roi: parseFloat(roi.toFixed(2)),
      win_rate: parseFloat(winRate.toFixed(2)),
      current_month_profit: parseFloat(currentMonthProfit.toFixed(2)),
      counts: { total: allBets.length, won: wonCount, lost: lostCount, pending: pendingCount, refunded: refundedCount, settled: settledCount }
    },
    charts: { history, leagues: leaguesList, bookmakers: bookmakersList, monthly: monthlyList }
  };
}
