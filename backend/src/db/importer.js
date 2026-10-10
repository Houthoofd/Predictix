import { dbRun, dbQuery } from './database.js';
import { autoSettleBetsForMatch } from '../services/betsService.js';
import { normalizeMatchStatus } from '../utils/statusNormalizer.js';
import {
  validateMatchesEnvelope,
  isMatchEligibleForImport,
  resolveMatchDate,
  resolveHistoricalDateAndTime,
  resolveMatchId,
  computeMatchOddsAndLines,
  checkFinishedMatchIntegrity
} from './importerValidation.js';
import {
  triggerBackgroundCrawls,
  triggerBackgroundRepairs,
  scheduleMatchReScrape,
  triggerGBDTRetraining,
  checkMatchNeedsHistoryCrawl,
  enrichPrimaryMatch,
  importTeamSquadStats
} from './importerEnrichment.js';
import {
  upsertScrapedMatch,
  upsertHistoricalMatch,
  recordSkippedMatch,
  findExistingMatchSameDay,
  countHistoricalMatches,
  getImportSetting,
  updatePrimaryMatchEnrichment,
  deletePlayerStatsByTeam,
  insertPlayerStat,
  normalizeStatistics,
  getMatchSource
} from './importerQueries.js';

export {
  normalizeMatchStatus,
  isMatchEligibleForImport,
  upsertScrapedMatch,
  upsertHistoricalMatch,
  recordSkippedMatch,
  findExistingMatchSameDay,
  countHistoricalMatches,
  getImportSetting,
  updatePrimaryMatchEnrichment,
  deletePlayerStatsByTeam,
  insertPlayerStat,
  normalizeStatistics,
  getMatchSource,
  enrichPrimaryMatch,
  importTeamSquadStats
};

export const importMatchDetails = enrichPrimaryMatch;

/**
 * Maps and imports all freshly scraped matches into SQLite scraped_predictions table.
 * @param {Array<object>|object} matches
 * @param {string} [scrapedAt]
 * @returns {Promise<{importedCount: number, settledBetsList: Array}>}
 */
export async function importScrapedMatches(matches, scrapedAt) {
  let importedCount = 0;
  const settledBetsList = [];
  const matchesToCrawl = [];
  const matchesToRepair = [];

  const envelope = validateMatchesEnvelope(matches);
  if (!envelope.isValid) {
    console.warn(`[Importer] Document envelope rejected: ${envelope.reason}`);
    return { importedCount: 0, settledBetsList: [] };
  }

  let realtimeSelfHealing = true;
  try {
    const selfHealingVal = await getImportSetting(null, 'realtime_self_healing');
    realtimeSelfHealing = selfHealingVal !== null ? selfHealingVal === 'true' : true;
  } catch (err) {
    console.warn('[Predictix Import] Failed to load settings:', err.message);
  }

  try {
    await dbRun('BEGIN TRANSACTION');

    for (const match of envelope.matches) {
      const eligibility = isMatchEligibleForImport(match);
      if (!eligibility.eligible) {
        console.warn(`[Importer] [Ignoré] Match rejeté (${eligibility.reason}): ${match?.home_team || 'unknown'} vs ${match?.away_team || 'unknown'}`);
        continue;
      }

      const { status, isLive, isFinished } = normalizeMatchStatus(match);
      const homeClean = (match.home_team || '').replace(/[▲▼]/g, '').trim();
      const awayClean = (match.away_team || '').replace(/[▲▼]/g, '').trim();
      const sport = (match.sport || 'football').toLowerCase().trim();
      const source = getMatchSource(match);
      const matchDate = resolveMatchDate(match.date);

      let matchId = resolveMatchId(match.match_id, { source, sport, homeClean, awayClean, matchDate });
      const sourceMatchId = match.source_match_id || (typeof match.match_id === 'string' ? match.match_id : null);

      if (matchDate) {
        const existingSameDay = await findExistingMatchSameDay(null, homeClean, awayClean, matchDate, sport, source, {
          tournament: match.tournament || match.league,
          allowReversed: false
        });
        if (existingSameDay && existingSameDay.length === 1) {
          matchId = existingSameDay[0].match_id;
        }
      }

      const oddsLines = computeMatchOddsAndLines(sport, homeClean, awayClean, match);

      await upsertScrapedMatch(null, match, {
        matchId,
        sourceMatchId,
        matchDate,
        source,
        sport,
        homeClean,
        awayClean,
        status,
        isLive,
        isFinished,
        ...oddsLines
      });

      importedCount++;

      if (isFinished) {
        const integrity = checkFinishedMatchIntegrity(match, {
          isFinished,
          status,
          sport,
          normalizedStats: match.statistics ? normalizeStatistics(match.statistics) : null
        });

        if (!integrity.isValid || !integrity.isSane) {
          console.warn(`[Predictix Import Guard] Le match ${matchId} présente des problèmes d'intégrité :`, {
            missingStats: integrity.missingStats,
            sanityError: integrity.sanityError
          });
          if (realtimeSelfHealing) {
            matchesToRepair.push({ matchId, sport });
          }
        }
      }

      try {
        const resolved = await autoSettleBetsForMatch(matchId);
        if (resolved && resolved.length > 0) settledBetsList.push(...resolved);
      } catch (err) {
        console.error('[Predictix Import] Failed to auto-settle bet:', err.message);
      }

      if (!isFinished) {
        scheduleMatchReScrape(matchId, match.date, match.time, sport);
        const needsCrawl = await checkMatchNeedsHistoryCrawl(homeClean, awayClean);
        if (needsCrawl) matchesToCrawl.push({ matchId, sport });
      }
    }

    await dbRun('COMMIT');
  } catch (err) {
    console.error('[Predictix Import] Error during match import, rolling back:', err.message);
    try { await dbRun('ROLLBACK'); } catch (rbErr) { console.error('[Predictix Import] Rollback failed:', rbErr.message); }
    throw err;
  }

  triggerBackgroundCrawls(matchesToCrawl);
  triggerBackgroundRepairs(matchesToRepair);
  triggerGBDTRetraining(importedCount, dbQuery);

  return { importedCount, settledBetsList };
}

/**
 * Imports a single historical (H2H) match confrontation.
 * @param {string} link
 * @param {object} histMatch
 * @returns {Promise<boolean>}
 */
export async function importHistoricalMatch(link, histMatch) {
  if (!histMatch) return false;

  const eligibility = isMatchEligibleForImport(histMatch);
  if (!eligibility.eligible) {
    console.warn(`[Importer] [Ignoré] Match historique rejeté (${eligibility.reason}): ${histMatch.home_team || 'unknown'} vs ${histMatch.away_team || 'unknown'}`);
    return false;
  }

  const homeClean = histMatch.home_team.replace(/[▲▼]/g, '').trim();
  const awayClean = histMatch.away_team.replace(/[▲▼]/g, '').trim();
  const sport = (histMatch.sport || 'football').toLowerCase().trim();
  const source = getMatchSource(histMatch, link);
  const { histDate, histTime } = resolveHistoricalDateAndTime(histMatch.date, histMatch.time);

  let cleanMatchId = resolveMatchId(histMatch.match_id || link, { source, sport, homeClean, awayClean, matchDate: histDate });
  const sourceMatchId = histMatch.source_match_id || histMatch.match_id || link || null;

  if (histDate) {
    const existingSameDay = await findExistingMatchSameDay(null, homeClean, awayClean, histDate, sport, source, {
      tournament: histMatch.tournament,
      allowReversed: false
    });
    if (existingSameDay && existingSameDay.length === 1) {
      cleanMatchId = existingSameDay[0].match_id;
    }
  }

  const oddsLines = computeMatchOddsAndLines(sport, homeClean, awayClean, histMatch);
  const { status, isFinished, isLive } = normalizeMatchStatus({
    status: histMatch.status,
    time: histMatch.time || histTime,
    score: histMatch.score
  });

  await upsertHistoricalMatch(null, {
    ...histMatch,
    cleanMatchId,
    sourceMatchId,
    homeClean,
    awayClean,
    histDate,
    histTime,
    status,
    isLive,
    isFinished,
    link,
    sport,
    source,
    ...oddsLines
  });

  return true;
}

/**
 * Imports a skipped match confrontation (failed Tor crawl).
 * @param {string|object} link
 * @returns {Promise<object>}
 */
export async function importSkippedMatch(link) {
  return recordSkippedMatch(null, link);
}
