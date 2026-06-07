import { dbQuery, dbGet, dbRun } from '../db/database.js';
import { scrapeSingleMatch, isTorActive } from '../utils/scraperHelpers.js';
import { syncBankroll } from './betsService.js';

// Resolves a single bet by scraping its match page
export async function resolveSingleBet(id, scraperPath) {
  const torActive = await isTorActive();
  if (!torActive) {
    throw new Error("Le proxy Tor local n'est pas actif sur le port 9050. Veuillez lancer Tor et réessayer.");
  }

  const bet = await dbGet('SELECT * FROM bets WHERE id = ?', [id]);
  if (!bet) {
    throw new Error('Pari introuvable.');
  }

  let link = bet.match_url;
  if (!link && bet.match_id) {
    const pred = await dbGet('SELECT match_url FROM scraped_predictions WHERE match_id = ?', [bet.match_id]);
    if (pred && pred.match_url) {
      link = pred.match_url;
    }
  }
  if (!link) {
    link = bet.match_id;
  }
  if (!link) {
    throw new Error('Ce pari ne dispose d\'aucun lien de match pour mise à jour automatique.');
  }
  if (!link.startsWith('/live-score/') && !link.startsWith('http')) {
    link = `/live-score/${link}`;
  }

  console.log(`[Predictix Bet Auto-Settle] Refreshing bet ${id} for match: ${link}`);
  
  const matchData = await scrapeSingleMatch(scraperPath, link, true);
  if (!matchData) {
    throw new Error('Impossible de joindre Matchendirect pour récupérer le score.');
  }

  const homeCorners = matchData.first_half_corners_home;
  const awayCorners = matchData.first_half_corners_away;

  if (homeCorners === null || homeCorners === undefined || awayCorners === null || awayCorners === undefined) {
    return {
      resolved: false,
      message: 'Les statistiques de corners 1MT ne sont pas encore disponibles (match en cours ou non commencé).'
    };
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
    return {
      resolved: false,
      message: `Match analysé, mais le résultat est indéterminé. Corners 1MT: ${totalCorners} contre une ligne de ${cardLine}.`,
      data: { bet, corners: { home: homeCorners, away: awayCorners, total: totalCorners } }
    };
  }

  let payout = 0.0;
  if (newStatus === 'WON') {
    payout = bet.stake * bet.odds;
  } else if (newStatus === 'REFUNDED') {
    payout = bet.stake;
  }

  await dbRun(
    'UPDATE bets SET status = ?, payout = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [newStatus, payout, id]
  );

  const bankroll = await syncBankroll();
  const updatedBet = await dbGet('SELECT * FROM bets WHERE id = ?', [id]);

  return {
    resolved: true,
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
  };
}

// Resolves all pending bets in parallel batches
export async function resolveAllPendingBets(scraperPath) {
  const torActive = await isTorActive();
  if (!torActive) {
    throw new Error("Le proxy Tor local n'est pas actif sur le port 9050. Veuillez lancer Tor et réessayer.");
  }

  const pendingBets = await dbQuery("SELECT * FROM bets WHERE status = 'PENDING' AND match_id IS NOT NULL AND match_id != ''");
  if (pendingBets.length === 0) {
    return {
      updatedCount: 0,
      results: [],
      settledBets: [],
      bankroll: await dbGet('SELECT * FROM bankroll ORDER BY id DESC LIMIT 1')
    };
  }

  const results = [];
  let updatedCount = 0;

  const processBet = async (bet) => {
    let link = bet.match_url;
    if (!link && bet.match_id) {
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

  let bankroll = null;
  if (updatedCount > 0) {
    bankroll = await syncBankroll();
  } else {
    bankroll = await dbGet('SELECT * FROM bankroll ORDER BY id DESC LIMIT 1');
  }

  return {
    updatedCount,
    results,
    settledBets: settledBetsList,
    bankroll
  };
}
