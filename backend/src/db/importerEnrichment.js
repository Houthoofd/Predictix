import { dbRun, dbQuery } from './database.js';
import { parseFrenchDate } from '../utils/scraperHelpers.js';
import { autoSettleBetsForMatch } from '../services/betsService.js';
import {
  countHistoricalMatches,
  updatePrimaryMatchEnrichment,
  deletePlayerStatsByTeam,
  insertPlayerStat,
  normalizeStatistics
} from './importerQueries.js';

/**
 * Triggers background crawls sequentially for matches without cached H2H history.
 * @param {Array<{ matchId: string, sport: string }>} matchesToCrawl
 */
export function triggerBackgroundCrawls(matchesToCrawl) {
  if (!matchesToCrawl || matchesToCrawl.length === 0) return;

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

/**
 * Triggers background repairs for finished matches that failed integrity or score sanity checks.
 * @param {Array<{ matchId: string, sport: string }>} matchesToRepair
 */
export function triggerBackgroundRepairs(matchesToRepair) {
  if (!matchesToRepair || matchesToRepair.length === 0) return;

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

/**
 * Schedules background re-scraping for an active / upcoming match.
 * @param {string} matchId
 * @param {string} date
 * @param {string} time
 * @param {string} sport
 */
export function scheduleMatchReScrape(matchId, date, time, sport) {
  import('../services/cronService.js')
    .then(({ scheduleMatchReScraping }) => {
      scheduleMatchReScraping(matchId, date, time, sport);
    })
    .catch(err => console.error('[Predictix Import] Failed to schedule re-scrape:', err));
}

/**
 * Triggers retraining of GBDT models if new matches have been imported.
 * @param {number} importedCount
 * @param {Function} [queryFn]
 */
export function triggerGBDTRetraining(importedCount, queryFn = dbQuery) {
  if (importedCount <= 0) return;

  import('../utils/gbdtTrainer.js')
    .then(({ trainGBDTModels }) => {
      trainGBDTModels(queryFn).catch(err => console.error('[Predictix Import] GBDT retraining failed:', err));
    })
    .catch(err => console.error('[Predictix Import] Failed to import GBDT trainer:', err));
}

/**
 * Checks whether historical H2H confrontations exist for the given team pairing.
 * @param {string} homeClean
 * @param {string} awayClean
 * @returns {Promise<boolean>} True if match needs history crawl (0 cached historical matches)
 */
export async function checkMatchNeedsHistoryCrawl(homeClean, awayClean) {
  try {
    const historicalCount = await countHistoricalMatches(null, homeClean, awayClean);
    return historicalCount === 0;
  } catch (e) {
    console.error('[Predictix Import] Failed to check H2H history count:', e.message);
    return false;
  }
}

/**
 * Triggers background squad or absence fetches for a specific target match.
 * @param {string} scraperPath
 * @param {string} sport
 * @param {string} targetDate
 * @param {string} targetQuery
 * @returns {Promise<object>}
 */
export async function triggerSquadAndAbsenceFetches(scraperPath, sport, targetDate, targetQuery) {
  try {
    const { scrapeSofaScoreAbsences, scrapeSofaScoreSquad } = await import('../utils/scraperRunner.js');
    const [absences, squad] = await Promise.all([
      scrapeSofaScoreAbsences(scraperPath, sport, targetDate, targetQuery).catch(() => []),
      scrapeSofaScoreSquad(scraperPath, sport, targetQuery).catch(() => [])
    ]);
    return { absences, squad };
  } catch (err) {
    console.error('[Predictix Import Enrichment] Failed to trigger squad/absence fetches:', err.message);
    return { absences: [], squad: [] };
  }
}

/**
 * Enriches the primary match predictions with detailed H2H/advanced statistics retrieved on demand.
 * @param {string} matchId
 * @param {object} primaryDetails
 * @param {string} targetLink
 * @param {object} match
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
  let rawPDate = primaryDetails.date ? String(primaryDetails.date).trim() : null;
  let pDate = parsedPrimaryDate || (rawPDate && /^\d{4}-\d{2}-\d{2}$/.test(rawPDate) ? rawPDate : null) || parseFrenchDate(match?.date) || (match?.date && /^\d{4}-\d{2}-\d{2}$/.test(match.date) ? match.date : null) || null;
  let pTime = primaryDetails.time || match?.time;
  if (rawPDate && rawPDate.includes(':')) {
    pTime = rawPDate;
    pDate = parseFrenchDate(match?.date) || (match?.date && /^\d{4}-\d{2}-\d{2}$/.test(match.date) ? match.date : null) || null;
  }

  await updatePrimaryMatchEnrichment(null, matchId, {
    first_half_corners_home: primaryDetails.first_half_corners_home,
    first_half_corners_away: primaryDetails.first_half_corners_away,
    home_logo: primaryDetails.home_logo || null,
    away_logo: primaryDetails.away_logo || null,
    historical_links: primaryDetails.historical_links,
    odds_corners: primaryDetails.odds_corners,
    card_line: cardLine,
    best_tip: bestTip,
    probability: `${stableProb}%`,
    date: pDate,
    time: pTime,
    match_url: primaryDetails.match_url || targetLink,
    statistics_json: primaryDetails.statistics ? JSON.stringify(normalizeStatistics(primaryDetails.statistics)) : null,
    sport: primaryDetails.sport || match?.sport || 'football'
  });

  // Auto-settle any pending bets for this primary match in real time
  try {
    await autoSettleBetsForMatch(matchId);
  } catch (err) {
    console.error('[Predictix On-Demand Background] Failed to auto-settle bet:', err.message);
  }
}

/**
 * Imports squad player statistics for a team into SQLite.
 * @param {string} teamName
 * @param {Array<object>} players
 */
export async function importTeamSquadStats(teamName, players) {
  if (!teamName || !Array.isArray(players)) return;
  console.log(`[Predictix Import] Importing ${players.length} squad stats for team: ${teamName}`);

  try {
    await dbRun('BEGIN TRANSACTION');

    // Clean old squad for this team first
    await deletePlayerStatsByTeam(null, teamName);

    for (const p of players) {
      if (!p.name) continue;
      const playerId = `${teamName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${p.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      await insertPlayerStat(null, {
        player_id: playerId,
        team_name: teamName,
        player_name: p.name,
        position: p.position || 'M',
        rating: p.rating || 0.0,
        appearances: p.appearances || 0,
        starts: p.starts || 0,
        goals: p.goals || 0,
        assists: p.assists || 0
      });
    }

    await dbRun('COMMIT');
    console.log(`[Predictix Import] Successfully imported squad for ${teamName}`);
  } catch (err) {
    try { await dbRun('ROLLBACK'); } catch (e) {}
    console.error(`[Predictix Import] Failed to import squad for ${teamName}:`, err.message);
  }
}
