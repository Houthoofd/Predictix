import { resolveDb } from './dbResolver.js';
import { normalizeStatistics, getMatchSource } from './matchRepository.js';
import { parseFrenchDate } from '../utils/dateParser.js';

export const SQL_UPSERT_HISTORICAL_MATCH = `
  INSERT INTO scraped_predictions (
    match_id, source_match_id, time, date, tournament, home_team, away_team, score,
    over_odds, under_odds, card_line, probability, best_tip, win_rate, status,
    is_live, is_finished, first_half_corners_home, first_half_corners_away, odds_corners,
    home_logo, away_logo, is_historical, match_url, statistics_json, sport, source, scraped_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(match_id) DO UPDATE SET
    source_match_id = COALESCE(excluded.source_match_id, scraped_predictions.source_match_id),
    time = excluded.time,
    date = excluded.date,
    tournament = COALESCE(excluded.tournament, scraped_predictions.tournament),
    score = CASE WHEN excluded.score <> '' AND excluded.score <> '-' THEN excluded.score ELSE scraped_predictions.score END,
    status = CASE WHEN scraped_predictions.is_finished = 1 THEN scraped_predictions.status ELSE excluded.status END,
    is_live = CASE WHEN scraped_predictions.is_finished = 1 THEN 0 ELSE excluded.is_live END,
    is_finished = CASE WHEN scraped_predictions.is_finished = 1 THEN 1 ELSE excluded.is_finished END,
    first_half_corners_home = COALESCE(excluded.first_half_corners_home, scraped_predictions.first_half_corners_home),
    first_half_corners_away = COALESCE(excluded.first_half_corners_away, scraped_predictions.first_half_corners_away),
    home_logo = COALESCE(excluded.home_logo, scraped_predictions.home_logo),
    away_logo = COALESCE(excluded.away_logo, scraped_predictions.away_logo),
    is_historical = CASE WHEN scraped_predictions.is_historical IS NOT NULL THEN scraped_predictions.is_historical ELSE excluded.is_historical END,
    statistics_json = CASE WHEN excluded.statistics_json IS NOT NULL AND excluded.statistics_json <> '{}' THEN excluded.statistics_json ELSE scraped_predictions.statistics_json END,
    sport = COALESCE(excluded.sport, scraped_predictions.sport),
    source = COALESCE(excluded.source, scraped_predictions.source),
    scraped_at = CURRENT_TIMESTAMP
`;

/**
 * Upserts a historical (H2H) match confrontation into scraped_predictions.
 * @param {object|null} db Database context
 * @param {object} match Prepared or raw historical match
 * @returns {Promise<object>} Run result
 */
export async function upsertHistoricalMatch(db, match) {
  let targetDb = db;
  let targetMatch = match;
  if (!targetMatch && targetDb && (targetDb.home_team || targetDb.match_id || targetDb.cleanMatchId || targetDb.homeClean)) {
    targetMatch = targetDb;
    targetDb = null;
  }

  const runner = resolveDb(targetDb);
  const homeClean = targetMatch.homeClean ?? (targetMatch.home_team || '').replace(/[▲▼]/g, '').trim();
  const awayClean = targetMatch.awayClean ?? (targetMatch.away_team || '').replace(/[▲▼]/g, '').trim();
  const histDate = targetMatch.histDate !== undefined ? targetMatch.histDate : (targetMatch.date || null);
  const sport = (targetMatch.sport || 'football').toLowerCase().trim();
  const source = targetMatch.source || getMatchSource(targetMatch, targetMatch.link || targetMatch.match_url);
  const matchId = targetMatch.cleanMatchId ?? targetMatch.match_id ?? targetMatch.link ?? (histDate ? `${source}_${sport}_${homeClean}_${awayClean}_${histDate}` : `${source}_${sport}_${homeClean}_${awayClean}`);
  const sourceMatchId = targetMatch.sourceMatchId ?? targetMatch.source_match_id ?? targetMatch.link ?? targetMatch.match_url ?? null;

  const oddsCorners = targetMatch.odds_corners
    ? (typeof targetMatch.odds_corners === 'string' ? targetMatch.odds_corners : JSON.stringify(targetMatch.odds_corners))
    : null;

  const statsJson = typeof targetMatch.statistics === 'string'
    ? targetMatch.statistics
    : (targetMatch.statistics_json || (targetMatch.statistics ? JSON.stringify(normalizeStatistics(targetMatch.statistics)) : null));

  const isLive = targetMatch.isLive !== undefined ? targetMatch.isLive : (targetMatch.is_live ? 1 : 0);
  const isFinished = targetMatch.isFinished !== undefined ? targetMatch.isFinished : (targetMatch.is_finished ? 1 : 0);

  const params = [
    matchId,
    sourceMatchId,
    targetMatch.histTime || targetMatch.time || 'Finished',
    histDate,
    targetMatch.tournament || 'Football',
    homeClean,
    awayClean,
    targetMatch.score || '',
    targetMatch.over_odds || '1.85',
    targetMatch.under_odds || '1.90',
    targetMatch.card_line || targetMatch.cardLine || '4.5',
    targetMatch.probability || '55%',
    targetMatch.best_tip || targetMatch.bestTip || 'Plus de',
    targetMatch.win_rate || targetMatch.winRate || '60%',
    targetMatch.status || 'Finished',
    isLive,
    isFinished,
    targetMatch.first_half_corners_home !== undefined ? targetMatch.first_half_corners_home : null,
    targetMatch.first_half_corners_away !== undefined ? targetMatch.first_half_corners_away : null,
    oddsCorners,
    targetMatch.home_logo || null,
    targetMatch.away_logo || null,
    targetMatch.is_historical !== undefined ? targetMatch.is_historical : 1,
    targetMatch.match_url || targetMatch.link || '',
    statsJson,
    sport,
    source
  ];

  return runner.run(SQL_UPSERT_HISTORICAL_MATCH, params);
}

export const SQL_RECORD_SKIPPED_MATCH = `
  INSERT OR REPLACE INTO scraped_predictions (
    match_id, time, date, tournament, home_team, away_team, score,
    over_odds, under_odds, card_line, probability, best_tip, win_rate, status,
    is_live, is_finished, is_historical, scraped_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
`;

/**
 * Inserts or replaces a skipped match confrontation in scraped_predictions.
 * @param {object|null} db Database context
 * @param {string|object} skipped Match URL or object
 * @returns {Promise<object>} Run result
 */
export async function recordSkippedMatch(db, skipped) {
  let targetDb = db;
  let targetSkipped = skipped;
  if (targetSkipped === undefined && targetDb !== undefined && (typeof targetDb === 'string' || (targetDb && !targetDb.run && !targetDb.dbRun))) {
    targetSkipped = targetDb;
    targetDb = null;
  }

  const runner = resolveDb(targetDb);
  let raw = targetSkipped;
  if (typeof raw === 'object' && raw !== null) {
    raw = raw.match_id || raw.link || raw.match_url || '';
  }
  let cleanMatchId = raw || '';
  if (typeof cleanMatchId === 'string') {
    const flashscoreMatch = cleanMatchId.match(/\/match\/([a-zA-Z0-9]+)/);
    if (flashscoreMatch) {
      cleanMatchId = flashscoreMatch[1];
    }
  }

  const rawDate = (typeof targetSkipped === 'object' && targetSkipped?.date) ? targetSkipped.date : null;
  const date = (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) ? rawDate : (parseFrenchDate(rawDate) || null);
  const time = (typeof targetSkipped === 'object' && targetSkipped?.time) ? targetSkipped.time : 'Finished';
  const tournament = (typeof targetSkipped === 'object' && targetSkipped?.tournament) ? targetSkipped.tournament : 'Football';

  const params = [
    cleanMatchId,
    time,
    date,
    tournament,
    'Skipped Match',
    'Skipped Match',
    '-',
    '1.85', '1.90', '4.5', '50%', 'Plus de', '50%', 'Finished',
    0, 1,
    1
  ];

  return runner.run(SQL_RECORD_SKIPPED_MATCH, params);
}

/**
 * Counts existing historical matches between two teams.
 * @param {object|null} db Database context
 * @param {string} homeClean
 * @param {string} awayClean
 * @returns {Promise<number>} Historical match count
 */
export async function countHistoricalMatches(db, homeClean, awayClean) {
  const runner = resolveDb(db);
  const sql = `
    SELECT COUNT(*) as count FROM scraped_predictions 
    WHERE is_historical = 1 
      AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))
  `;
  const rows = await runner.query(sql, [homeClean, awayClean, awayClean, homeClean]);
  return rows && rows[0] ? rows[0].count : 0;
}
