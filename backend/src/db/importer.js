import { dbRun } from './database.js';
import { parseFrenchDate } from '../utils/scraperHelpers.js';

/**
 * Maps and imports all freshly scraped matches into the SQLite scraped_predictions table,
 * and triggers real-time bet auto-settling if applicable.
 */
export async function importScrapedMatches(matches, scrapedAt) {
  let importedCount = 0;
  const settledBetsList = [];

  for (const match of matches) {
    if (!match.home_team || !match.away_team) {
      continue;
    }

    let status = match.status || 'Planned';
    const matchTime = String(match.time || '');
    if (matchTime.includes("'") || matchTime.toLowerCase().includes('mi-temps') || matchTime.toLowerCase().includes('mt') || matchTime.toLowerCase().includes('prol.')) {
      status = 'Live';
    } else if (matchTime.toLowerCase().includes('fin') || matchTime.toLowerCase().includes('terminé') || matchTime.toLowerCase().includes('ft')) {
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
    
    const stableProb = 55 + (charSum % 25);
    const cardLine = match.card_line || (charSum % 2 === 0 ? '4.5' : '5.5');
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
        home_logo, away_logo, historical_links, match_url, statistics_json, scraped_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    await dbRun(sql, [
      matchId,
      match.time || '',
      match.date || scrapedAt?.substring(0, 10) || new Date().toISOString().substring(0, 10),
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
      match.statistics ? JSON.stringify(match.statistics) : null
    ]);

    importedCount++;

    // Auto-settle any pending bets for this primary match in real time
    if (match.first_half_corners_home !== null && match.first_half_corners_home !== undefined &&
        match.first_half_corners_away !== null && match.first_half_corners_away !== undefined) {
      try {
        const { autoSettleBetsForMatch } = await import('../routes/bets.js');
        const resolved = await autoSettleBetsForMatch(matchId, match.first_half_corners_home, match.first_half_corners_away);
        if (resolved && resolved.length > 0) {
          settledBetsList.push(...resolved);
        }
      } catch (err) {
        console.error('[Predictix Import] Failed to auto-settle bet:', err.message);
      }
    }
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
      home_logo, away_logo, is_historical, match_url, statistics_json, scraped_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  const hashSeed = homeClean + awayClean;
  let charSum = 0;
  for (let k = 0; k < hashSeed.length; k++) charSum += hashSeed.charCodeAt(k);
  const stableProb = 55 + (charSum % 25);
  const cardLine = histMatch.card_line || (charSum % 2 === 0 ? '4.5' : '5.5');
  const bestTip = histMatch.best_tip || (stableProb >= 66 ? 'Plus de' : 'Moins de');

  let histDate = histMatch.date || new Date().toISOString().substring(0, 10);
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
    histMatch.statistics ? JSON.stringify(histMatch.statistics) : null
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
      statistics_json = ?
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
    primaryDetails.statistics ? JSON.stringify(primaryDetails.statistics) : null,
    matchId
  ]);

  // Auto-settle any pending bets for this primary match in real time
  try {
    const { autoSettleBetsForMatch } = await import('../routes/bets.js');
    await autoSettleBetsForMatch(matchId, primaryDetails.first_half_corners_home, primaryDetails.first_half_corners_away);
  } catch (err) {
    console.error('[Predictix On-Demand Background] Failed to auto-settle bet:', err.message);
  }
}
