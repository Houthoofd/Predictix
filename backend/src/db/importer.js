import { dbRun, dbQuery } from './database.js';
import { parseFrenchDate } from '../utils/scraperHelpers.js';
import { autoSettleBetsForMatch } from '../services/betsService.js';

/**
 * Maps and imports all freshly scraped matches into the SQLite scraped_predictions table,
 * and triggers real-time bet auto-settling if applicable.
 */
export async function importScrapedMatches(matches, scrapedAt) {
  let importedCount = 0;
  const settledBetsList = [];

  try {
    await dbRun('BEGIN TRANSACTION');

    for (const match of matches) {
    if (!match.home_team || !match.away_team) {
      continue;
    }

    let status = match.status || 'Planned';
    const matchTime = String(match.time || '');
    const lowerTime = matchTime.toLowerCase().trim();
    if (matchTime.includes("'") || lowerTime.includes('mi-temps') || lowerTime.includes('mt') || lowerTime.includes('prol.')) {
      status = 'Live';
    } else if (lowerTime.includes('fin') || lowerTime.includes('terminé') || lowerTime.includes('ft') || lowerTime === 'ter' || lowerTime === 'ter.') {
      status = 'Finished';
    }

    const isLive = match.is_live === true || status === 'Live' ? 1 : 0;
    const isFinished = match.is_finished === true || status === 'Finished' ? 1 : 0;
    const matchId = match.match_id || `${match.home_team}_${match.away_team}_${match.date || new Date().toISOString().slice(0,10)}`;

    const hashSeed = match.home_team + match.away_team;
    let charSum = 0;
    for (let i = 0; i < hashSeed.length; i++) {
      charSum += hashSeed.charCodeAt(i);
    }
    
    const sport = (match.sport || 'football').toLowerCase().trim();
    const stableProb = 55 + (charSum % 25);
    
    let defaultLine = charSum % 2 === 0 ? '4.5' : '5.5';
    if (sport !== 'football') {
      if (sport === 'basketball') defaultLine = '165.5';
      else if (sport === 'tennis') defaultLine = '2.5';
      else if (sport.includes('rugby')) defaultLine = '42.5';
      else if (sport === 'handball') defaultLine = '52.5';
      else if (sport === 'volleyball') defaultLine = '3.5';
      else if (sport === 'hockey' || sport === 'ice-hockey' || sport === 'futsal') defaultLine = '5.5';
      else if (sport === 'baseball') defaultLine = '8.5';
      else if (sport === 'american-football') defaultLine = '45.5';
      else if (sport === 'table-tennis' || sport === 'badminton') defaultLine = '2.5';
      else if (sport === 'snooker') defaultLine = '9.5';
      else defaultLine = '2.5';
    }

    const cardLine = match.card_line || defaultLine;
    const bestTip = match.best_tip || (stableProb >= 66 ? 'Plus de' : 'Moins de');
    const probability = match.probability || `${stableProb}%`;
    const overOdds = match.over_odds || (bestTip === 'Plus de' ? '1.85' : '2.05');
    const underOdds = match.under_odds || (bestTip === 'Moins de' ? '1.90' : '1.75');
    const winRate = match.win_rate || `${45 + (charSum % 35)}%`;

    const homeClean = (match.home_team || '').replace(/[▲▼]/g, '').trim();
    const awayClean = (match.away_team || '').replace(/[▲▼]/g, '').trim();

    const sql = `
      INSERT OR REPLACE INTO scraped_predictions (
        match_id, time, date, tournament, home_team, away_team, score,
        over_odds, under_odds, card_line, probability, best_tip, win_rate, status,
        is_live, is_finished, first_half_corners_home, first_half_corners_away, odds_corners,
        home_logo, away_logo, historical_links, match_url, statistics_json, sport, scraped_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    await dbRun(sql, [
      matchId,
      match.time || '',
      parseFrenchDate(match.date) || match.date || scrapedAt?.substring(0, 10) || new Date().toISOString().substring(0, 10),
      match.tournament || match.league || 'Football',
      homeClean,
      awayClean,
      match.score || '',
      overOdds,
      underOdds,
      cardLine,
      probability,
      bestTip,
      winRate,
      status,
      isLive,
      isFinished,
      match.first_half_corners_home !== undefined ? match.first_half_corners_home : null,
      match.first_half_corners_away !== undefined ? match.first_half_corners_away : null,
      match.odds_corners ? JSON.stringify(match.odds_corners) : null,
      match.home_logo || null,
      match.away_logo || null,
      match.historical_links ? JSON.stringify(match.historical_links) : null,
      match.match_url || null,
      match.statistics ? JSON.stringify(normalizeStatistics(match.statistics)) : null,
      match.sport || 'football'
    ]);

    importedCount++;

    // Auto-settle any pending bets for this primary match in real time
    try {
      const resolved = await autoSettleBetsForMatch(matchId);
      if (resolved && resolved.length > 0) {
        settledBetsList.push(...resolved);
      }
    } catch (err) {
      console.error('[Predictix Import] Failed to auto-settle bet:', err.message);
    }

    // Schedule background re-scraping if match is not finished
    if (!isFinished) {
      import('../services/cronService.js')
        .then(({ scheduleMatchReScraping }) => {
          scheduleMatchReScraping(matchId, match.date, match.time, sport);
        })
        .catch(err => console.error('[Predictix Import] Failed to schedule re-scrape:', err));
    }
    }

    await dbRun('COMMIT');
  } catch (err) {
    console.error('[Predictix Import] Error during match import, rolling back:', err.message);
    try {
      await dbRun('ROLLBACK');
    } catch (rbErr) {
      console.error('[Predictix Import] Rollback failed:', rbErr.message);
    }
    throw err;
  }

  if (importedCount > 0) {
    import('../utils/gbdtTrainer.js')
      .then(({ trainGBDTModels }) => {
        trainGBDTModels(dbQuery).catch(err => console.error('[Predictix Import] GBDT retraining failed:', err));
      })
      .catch(err => console.error('[Predictix Import] Failed to import GBDT trainer:', err));
  }

  return { importedCount, settledBetsList };
}

/**
 * Imports a crawled historical/H2H match into SQLite
 */
export async function importHistoricalMatch(link, histMatch) {
  const homeClean = histMatch.home_team.replace(/[▲▼]/g, '').trim();
  const awayClean = histMatch.away_team.replace(/[▲▼]/g, '').trim();

  const sqlHist = `
    INSERT OR REPLACE INTO scraped_predictions (
      match_id, time, date, tournament, home_team, away_team, score,
      over_odds, under_odds, card_line, probability, best_tip, win_rate, status,
      is_live, is_finished, first_half_corners_home, first_half_corners_away, odds_corners,
      home_logo, away_logo, is_historical, match_url, statistics_json, sport, scraped_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  const hashSeed = homeClean + awayClean;
  let charSum = 0;
  for (let k = 0; k < hashSeed.length; k++) charSum += hashSeed.charCodeAt(k);
  const sport = (histMatch.sport || 'football').toLowerCase().trim();
  const stableProb = 55 + (charSum % 25);
  
  let defaultLine = charSum % 2 === 0 ? '4.5' : '5.5';
  if (sport !== 'football') {
    if (sport === 'basketball') defaultLine = '165.5';
    else if (sport === 'tennis') defaultLine = '2.5';
    else if (sport.includes('rugby')) defaultLine = '42.5';
    else if (sport === 'handball') defaultLine = '52.5';
    else if (sport === 'volleyball') defaultLine = '3.5';
    else if (sport === 'hockey' || sport === 'ice-hockey' || sport === 'futsal') defaultLine = '5.5';
    else if (sport === 'baseball') defaultLine = '8.5';
    else if (sport === 'american-football') defaultLine = '45.5';
    else if (sport === 'table-tennis' || sport === 'badminton') defaultLine = '2.5';
    else if (sport === 'snooker') defaultLine = '9.5';
    else defaultLine = '2.5';
  }

  const cardLine = histMatch.card_line || defaultLine;
  const bestTip = histMatch.best_tip || (stableProb >= 66 ? 'Plus de' : 'Moins de');

  let parsedDate = parseFrenchDate(histMatch.date);
  let histDate = parsedDate || histMatch.date || new Date().toISOString().substring(0, 10);
  let histTime = histMatch.time || 'Finished';
  if (histDate.includes(':')) {
    histTime = histDate;
    histDate = new Date().toISOString().substring(0, 10);
  }

  await dbRun(sqlHist, [
    link,
    histTime,
    histDate,
    histMatch.tournament || 'Football',
    homeClean,
    awayClean,
    histMatch.score || '',
    '1.85', '1.90', cardLine, `${stableProb}%`, bestTip, '60%', 'Finished',
    0, 1,
    histMatch.first_half_corners_home,
    histMatch.first_half_corners_away,
    null,
    histMatch.home_logo || null,
    histMatch.away_logo || null,
    1, // is_historical = 1
    histMatch.match_url || link,
    histMatch.statistics ? JSON.stringify(normalizeStatistics(histMatch.statistics)) : null,
    histMatch.sport || 'football'
  ]);
}

/**
 * Imports a skipped match confrontation (failed Tor crawl) to cache skips and prevent endless crawl attempts
 */
export async function importSkippedMatch(link) {
  const sqlHistSkipped = `
    INSERT OR REPLACE INTO scraped_predictions (
      match_id, time, date, tournament, home_team, away_team, score,
      over_odds, under_odds, card_line, probability, best_tip, win_rate, status,
      is_live, is_finished, is_historical, scraped_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;
  await dbRun(sqlHistSkipped, [
    link,
    'Finished',
    new Date().toISOString().substring(0, 10),
    'Football',
    'Skipped Match',
    'Skipped Match',
    '-',
    '1.85', '1.90', '4.5', '50%', 'Plus de', '50%', 'Finished',
    0, 1,
    1
  ]);
}

/**
 * Enriches the primary match predictions with detailed H2H/advanced statistics retrieved on demand
 */
export async function enrichPrimaryMatch(matchId, primaryDetails, targetLink, match) {
  const homeClean = primaryDetails.home_team.replace(/[▲▼]/g, '').trim();
  const awayClean = primaryDetails.away_team.replace(/[▲▼]/g, '').trim();
  const hashSeed = homeClean + awayClean;
  let charSum = 0;
  for (let k = 0; k < hashSeed.length; k++) charSum += hashSeed.charCodeAt(k);
  const stableProb = 55 + (charSum % 25);
  const cardLine = primaryDetails.card_line || (charSum % 2 === 0 ? '4.5' : '5.5');
  const bestTip = primaryDetails.best_tip || (stableProb >= 66 ? 'Plus de' : 'Moins de');

  let parsedPrimaryDate = parseFrenchDate(primaryDetails.date);
  let pDate = parsedPrimaryDate || match.date || new Date().toISOString().substring(0, 10);
  let pTime = primaryDetails.time || match.time;
  if (primaryDetails.date && primaryDetails.date.includes(':')) {
    pTime = primaryDetails.date;
    pDate = match.date || new Date().toISOString().substring(0, 10);
  }

  await dbRun(`
    UPDATE scraped_predictions SET
      first_half_corners_home = ?,
      first_half_corners_away = ?,
      home_logo = ?,
      away_logo = ?,
      historical_links = ?,
      odds_corners = ?,
      card_line = ?,
      best_tip = ?,
      probability = ?,
      date = ?,
      time = ?,
      match_url = ?,
      statistics_json = ?,
      sport = ?
    WHERE match_id = ?
  `, [
    primaryDetails.first_half_corners_home,
    primaryDetails.first_half_corners_away,
    primaryDetails.home_logo || null,
    primaryDetails.away_logo || null,
    primaryDetails.historical_links ? JSON.stringify(primaryDetails.historical_links) : null,
    primaryDetails.odds_corners ? JSON.stringify(primaryDetails.odds_corners) : null,
    cardLine,
    bestTip,
    `${stableProb}%`,
    pDate,
    pTime,
    primaryDetails.match_url || targetLink,
    primaryDetails.statistics ? JSON.stringify(normalizeStatistics(primaryDetails.statistics)) : null,
    primaryDetails.sport || match.sport || 'football',
    matchId
  ]);

  // Auto-settle any pending bets for this primary match in real time
  try {
    await autoSettleBetsForMatch(matchId);
  } catch (err) {
    console.error('[Predictix On-Demand Background] Failed to auto-settle bet:', err.message);
  }
}

function normalizeStatistics(stats) {
  if (!stats) return null;
  const normalized = { ...stats };
  if (normalized.cartons_janues !== undefined) {
    normalized.yellow_cards = normalized.cartons_janues;
    delete normalized.cartons_janues;
  }
  return normalized;
}
