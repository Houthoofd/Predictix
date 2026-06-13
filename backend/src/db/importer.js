import { dbRun, dbQuery, dbGet } from './database.js';
import { parseFrenchDate } from '../utils/scraperHelpers.js';
import { autoSettleBetsForMatch } from '../services/betsService.js';
import { validateMatchStats, checkScoreSanity } from '../utils/integrityLinter.js';

/**
 * Maps and imports all freshly scraped matches into the SQLite scraped_predictions table,
 * and triggers real-time bet auto-settling if applicable.
 */
export async function importScrapedMatches(matches, scrapedAt) {
  let importedCount = 0;
  const settledBetsList = [];
  const matchesToCrawl = [];
  const matchesToRepair = [];

  // Load integrity configurations
  let importGuardStrict = true;
  let realtimeSelfHealing = true;
  try {
    const guardStrictRow = await dbGet("SELECT value FROM settings WHERE key = 'import_guard_strict'");
    const selfHealingRow = await dbGet("SELECT value FROM settings WHERE key = 'realtime_self_healing'");
    importGuardStrict = guardStrictRow ? guardStrictRow.value === 'true' : true;
    realtimeSelfHealing = selfHealingRow ? selfHealingRow.value === 'true' : true;
  } catch (err) {
    console.warn('[Predictix Import] Failed to load settings:', err.message);
  }

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
      INSERT INTO scraped_predictions (
        match_id, time, date, tournament, home_team, away_team, score,
        over_odds, under_odds, card_line, probability, best_tip, win_rate, status,
        is_live, is_finished, first_half_corners_home, first_half_corners_away, odds_corners,
        home_logo, away_logo, historical_links, match_url, statistics_json, sport, scraped_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(match_id) DO UPDATE SET
        time = excluded.time,
        date = excluded.date,
        tournament = excluded.tournament,
        score = excluded.score,
        status = excluded.status,
        is_live = excluded.is_live,
        is_finished = excluded.is_finished,
        first_half_corners_home = COALESCE(excluded.first_half_corners_home, scraped_predictions.first_half_corners_home),
        first_half_corners_away = COALESCE(excluded.first_half_corners_away, scraped_predictions.first_half_corners_away),
        odds_corners = COALESCE(excluded.odds_corners, scraped_predictions.odds_corners),
        home_logo = COALESCE(excluded.home_logo, scraped_predictions.home_logo),
        away_logo = COALESCE(excluded.away_logo, scraped_predictions.away_logo),
        historical_links = COALESCE(excluded.historical_links, scraped_predictions.historical_links),
        match_url = COALESCE(excluded.match_url, scraped_predictions.match_url),
        statistics_json = COALESCE(excluded.statistics_json, scraped_predictions.statistics_json),
        sport = COALESCE(excluded.sport, scraped_predictions.sport),
        card_line = COALESCE(excluded.card_line, scraped_predictions.card_line),
        best_tip = COALESCE(excluded.best_tip, scraped_predictions.best_tip),
        probability = COALESCE(excluded.probability, scraped_predictions.probability),
        win_rate = COALESCE(excluded.win_rate, scraped_predictions.win_rate),
        over_odds = COALESCE(excluded.over_odds, scraped_predictions.over_odds),
        under_odds = COALESCE(excluded.under_odds, scraped_predictions.under_odds),
        scraped_at = CURRENT_TIMESTAMP
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

    // Perform data integrity checks on finished matches
    if (isFinished) {
      const dbMatchObj = {
        is_finished: isFinished,
        status,
        sport,
        score: match.score || '',
        first_half_corners_home: match.first_half_corners_home !== undefined ? match.first_half_corners_home : null,
        first_half_corners_away: match.first_half_corners_away !== undefined ? match.first_half_corners_away : null,
        statistics_json: match.statistics ? JSON.stringify(normalizeStatistics(match.statistics)) : null
      };

      const statsVal = validateMatchStats(dbMatchObj);
      const sanityVal = checkScoreSanity(dbMatchObj);

      if (!statsVal.isValid || !sanityVal.isSane) {
        console.warn(`[Predictix Import Guard] Le match ${matchId} présente des problèmes d'intégrité :`, { 
          missingStats: statsVal.missing, 
          sanityError: sanityVal.reason 
        });
        if (realtimeSelfHealing) {
          matchesToRepair.push({ matchId, sport });
        }
      }
    }

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

      // Collect for automatic background H2H history crawling if none exists
      try {
        const h2hCheck = await dbQuery('SELECT COUNT(*) as count FROM scraped_predictions WHERE is_historical = 1 AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))', [homeClean, awayClean, awayClean, homeClean]);
        const hasHistory = h2hCheck && h2hCheck[0] && h2hCheck[0].count > 0;
        if (!hasHistory) {
          matchesToCrawl.push({ matchId, sport });
        }
      } catch (e) {
        console.error('[Predictix Import] Failed to check H2H history count:', e.message);
      }
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

  // Trigger background crawling sequentially after transaction COMMIT
  if (matchesToCrawl.length > 0) {
    console.log(`[Predictix Import] Found ${matchesToCrawl.length} new upcoming matches without cached H2H history. Triggering background crawls...`);
    import('../controllers/historyCrawler.js')
      .then(({ crawlMatchHistory }) => {
        matchesToCrawl.forEach((m, idx) => {
          setTimeout(() => {
            console.log(`[Predictix Import] Auto-triggering background crawl for match ${m.matchId} (${m.sport})`);
            crawlMatchHistory({ params: { matchId: m.matchId } }, { json: () => {}, status: () => ({ json: () => {} }), headersSent: true })
              .catch(err => console.error(`[Predictix Import] Auto-crawl failed for ${m.matchId}:`, err.message));
          }, idx * 5000); // 5s delay between crawls
        });
      })
      .catch(err => console.error('[Predictix Import] Failed to import history crawler for auto-trigger:', err));
  }

  // Trigger background repairs sequentially after transaction COMMIT
  if (matchesToRepair.length > 0) {
    console.log(`[Predictix Import] Found ${matchesToRepair.length} finished matches with integrity warnings. Triggering real-time self-healing...`);
    import('../services/cronService.js')
      .then(({ reScrapeMatch }) => {
        matchesToRepair.forEach((m, idx) => {
          setTimeout(() => {
            console.log(`[Predictix Import] Auto-repairing match ${m.matchId} (${m.sport}) in background...`);
            reScrapeMatch(m.matchId)
              .catch(err => console.error(`[Predictix Import] Auto-repair failed for ${m.matchId}:`, err.message));
          }, idx * 6000 + 3000); // 6s delay between repairs to avoid Tor load, offset by 3s from H2H crawls
        });
      })
      .catch(err => console.error('[Predictix Import] Failed to import cronService for real-time repair:', err));
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
  // Conservé pour compatibilité ascendante avec les anciennes données JSON scrapées (contenant la coquille 'cartons_janues')
  if (normalized.cartons_janues !== undefined) {
    normalized.yellow_cards = normalized.cartons_janues;
    delete normalized.cartons_janues;
  }
  return normalized;
}
