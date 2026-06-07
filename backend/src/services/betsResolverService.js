import { dbQuery, dbGet } from '../db/database.js';
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

  const sport = (bet.sport || 'football').toLowerCase().trim();
  const scraper = sport === 'football' ? 'matchendirect' : 'flashscore';

  if (sport === 'football' && !link.startsWith('/live-score/') && !link.startsWith('http')) {
    link = `/live-score/${link}`;
  }

  console.log(`[Predictix Bet Auto-Settle] Refreshing bet ${id} for match: ${link} (${sport})`);
  
  const matchData = await scrapeSingleMatch(scraperPath, link, true, null, 9050, scraper, sport);
  if (!matchData) {
    throw new Error(`Impossible de joindre le scraper ${scraper} pour récupérer le score.`);
  }

  const isFinished = matchData.is_finished === true || 
    (matchData.score && matchData.score.trim() !== '-' && matchData.score.trim() !== '' && matchData.score.includes('-')) ||
    (matchData.time && (matchData.time.toLowerCase().includes('fin') || matchData.time.toLowerCase().includes('terminé') || matchData.time.toLowerCase() === 'ter' || matchData.time.toLowerCase() === 'ter.'));

  const enriched = {
    match_id: bet.match_id || link,
    time: matchData.time || 'Finished',
    date: matchData.date || bet.date || '',
    tournament: (matchData.tournament && matchData.tournament !== 'Flashscore Match' && matchData.tournament !== 'Match en Direct') ? matchData.tournament : (bet.league || ''),
    home_team: matchData.home_team || bet.home_team,
    away_team: matchData.away_team || bet.away_team,
    home_logo: matchData.home_logo || null,
    away_logo: matchData.away_logo || null,
    score: matchData.score || '',
    first_half_corners_home: matchData.first_half_corners_home,
    first_half_corners_away: matchData.first_half_corners_away,
    historical_links: matchData.historical_links,
    match_url: link,
    statistics: matchData.statistics,
    sport: sport,
    is_finished: isFinished ? 1 : 0,
    status: isFinished ? 'Finished' : 'Live'
  };

  const { importScrapedMatches } = await import('../db/importer.js');
  await importScrapedMatches([enriched], new Date().toISOString());

  const updatedBet = await dbGet('SELECT * FROM bets WHERE id = ?', [id]);
  const bankroll = await syncBankroll();

  if (updatedBet.status !== 'PENDING') {
    const detailText = sport === 'football'
      ? `Corners 1MT: ${parseFloat(matchData.first_half_corners_home) + parseFloat(matchData.first_half_corners_away)} (${matchData.first_half_corners_home}-${matchData.first_half_corners_away})`
      : `Score final: ${matchData.score}`;
      
    return {
      resolved: true,
      message: `Pari résolu avec succès ! ${detailText} contre une ligne de ${updatedBet.card_line}. Résultat: ${updatedBet.status}.`,
      data: { bet: updatedBet, bankroll }
    };
  }

  return {
    resolved: false,
    message: 'Match analysé, mais le résultat est toujours indéterminé.',
    data: { bet: updatedBet, bankroll }
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
  const settledBetsList = [];

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

    const sport = (bet.sport || 'football').toLowerCase().trim();
    const scraper = sport === 'football' ? 'matchendirect' : 'flashscore';

    if (sport === 'football' && !link.startsWith('/live-score/') && !link.startsWith('http')) {
      link = `/live-score/${link}`;
    }

    try {
      const matchData = await scrapeSingleMatch(scraperPath, link, true, null, 9050, scraper, sport);
      if (!matchData) {
        return { id: bet.id, match: `${bet.home_team} vs ${bet.away_team}`, status: 'ERROR', reason: 'Liaison scraper échouée.' };
      }

      const isFinished = matchData.is_finished === true || 
        (matchData.score && matchData.score.trim() !== '-' && matchData.score.trim() !== '' && matchData.score.includes('-')) ||
        (matchData.time && (matchData.time.toLowerCase().includes('fin') || matchData.time.toLowerCase().includes('terminé') || matchData.time.toLowerCase() === 'ter' || matchData.time.toLowerCase() === 'ter.'));

      const enriched = {
        match_id: bet.match_id || link,
        time: matchData.time || 'Finished',
        date: matchData.date || bet.date || '',
        tournament: (matchData.tournament && matchData.tournament !== 'Flashscore Match' && matchData.tournament !== 'Match en Direct') ? matchData.tournament : (bet.league || ''),
        home_team: matchData.home_team || bet.home_team,
        away_team: matchData.away_team || bet.away_team,
        home_logo: matchData.home_logo || null,
        away_logo: matchData.away_logo || null,
        score: matchData.score || '',
        first_half_corners_home: matchData.first_half_corners_home,
        first_half_corners_away: matchData.first_half_corners_away,
        historical_links: matchData.historical_links,
        match_url: link,
        statistics: matchData.statistics,
        sport: sport,
        is_finished: isFinished ? 1 : 0,
        status: isFinished ? 'Finished' : 'Live'
      };

      const { importScrapedMatches } = await import('../db/importer.js');
      const { settledBetsList: newlySettled } = await importScrapedMatches([enriched], new Date().toISOString());

      if (newlySettled && newlySettled.length > 0) {
        updatedCount++;
        const resolvedBet = newlySettled.find(b => b.id === bet.id);
        if (resolvedBet) {
          settledBetsList.push(resolvedBet);
          return resolvedBet;
        }
      }

      const refreshedBet = await dbGet('SELECT * FROM bets WHERE id = ?', [bet.id]);
      return { id: bet.id, match: `${bet.home_team} vs ${bet.away_team}`, status: refreshedBet.status, reason: 'Mis à jour en base.' };

    } catch (err) {
      console.error(`Error auto-settling bet ID ${bet.id}:`, err);
      return { id: bet.id, match: `${bet.home_team} vs ${bet.away_team}`, status: 'ERROR', reason: err.message };
    }
  };

  const concurrency = 3;
  for (let i = 0; i < pendingBets.length; i += concurrency) {
    const chunk = pendingBets.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map(bet => processBet(bet)));
    results.push(...chunkResults);
  }

  const bankroll = await syncBankroll();

  return {
    updatedCount,
    results,
    settledBets: settledBetsList,
    bankroll
  };
}
