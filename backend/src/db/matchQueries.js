import { normalizeTournamentName, isTournamentCompatible } from './metadataRepository.js';

export const SQL_UPSERT_SCRAPED_MATCH = `
  INSERT INTO scraped_predictions (
    match_id, source_match_id, time, date, tournament, home_team, away_team, score,
    over_odds, under_odds, card_line, probability, best_tip, win_rate, status,
    is_live, is_finished, first_half_corners_home, first_half_corners_away, odds_corners,
    home_logo, away_logo, historical_links, match_url, statistics_json, absences_json, betfair_json, sport, source, scraped_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(match_id) DO UPDATE SET
    source_match_id = COALESCE(excluded.source_match_id, scraped_predictions.source_match_id),
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
    absences_json = COALESCE(excluded.absences_json, scraped_predictions.absences_json),
    betfair_json = COALESCE(excluded.betfair_json, scraped_predictions.betfair_json),
    sport = COALESCE(excluded.sport, scraped_predictions.sport),
    source = COALESCE(excluded.source, scraped_predictions.source),
    card_line = COALESCE(excluded.card_line, scraped_predictions.card_line),
    best_tip = COALESCE(excluded.best_tip, scraped_predictions.best_tip),
    probability = COALESCE(excluded.probability, scraped_predictions.probability),
    win_rate = COALESCE(excluded.win_rate, scraped_predictions.win_rate),
    over_odds = COALESCE(excluded.over_odds, scraped_predictions.over_odds),
    under_odds = COALESCE(excluded.under_odds, scraped_predictions.under_odds),
    scraped_at = CURRENT_TIMESTAMP
`;

export const SQL_UPDATE_PRIMARY_MATCH_ENRICHMENT = `
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
`;

export const SQL_FIND_EXISTING_MATCH_SAME_DAY = `
  SELECT match_id, source_match_id, is_historical, sport, source, match_url, tournament, home_team, away_team, date, score
  FROM scraped_predictions 
  WHERE ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?)) 
    AND date = ?
    AND LOWER(COALESCE(sport, 'football')) = ?
    AND (
      LOWER(COALESCE(source, '')) = ?
      OR (
        (source IS NULL OR source = '' OR source = 'unknown')
        AND (
          (? = 'flashscore' AND (match_url LIKE '%flashscore%' OR match_id LIKE '/match/%' OR match_id LIKE 'fs_%'))
          OR (? = 'matchendirect' AND (match_url LIKE '%matchendirect%' OR match_id LIKE 'med_%'))
          OR (? = 'sofascore' AND match_url LIKE '%sofascore%')
          OR (? = '1xbet' AND match_url LIKE '%1xbet%')
          OR (? = 'arbworld' AND match_url LIKE '%arbworld%')
        )
      )
    )
`;

/**
 * Validates whether a match date string represents an authentic calendar date.
 *
 * @param {string|null} date
 * @returns {boolean}
 */
export function isAuthenticMatchDate(date) {
  return !(!date || typeof date !== 'string' || !date.trim() || date.includes(':'));
}

/**
 * Executes low-level database query searching for same-day match rows.
 *
 * @param {object} runner Database runner instance
 * @param {object} params
 * @returns {Promise<Array<object>>}
 */
export async function queryExistingMatchesSameDay(runner, { homeClean, awayClean, date, cleanSport, cleanSource }) {
  const queryParams = [
    homeClean, awayClean, awayClean, homeClean,
    date.trim(),
    cleanSport,
    cleanSource, cleanSource, cleanSource, cleanSource, cleanSource, cleanSource
  ];
  return runner.query(SQL_FIND_EXISTING_MATCH_SAME_DAY, queryParams);
}

/**
 * Builds parameter array for upserting a scraped match.
 *
 * @param {object} match
 * @param {object} options
 * @param {function} normalizeStatisticsFn
 * @param {function} getMatchSourceFn
 * @returns {Array}
 */
export function buildMatchUpsertParams(match, options, normalizeStatisticsFn, getMatchSourceFn) {
  const homeClean = options.homeClean ?? (match.home_team || '').replace(/[▲▼]/g, '').trim();
  const awayClean = options.awayClean ?? (match.away_team || '').replace(/[▲▼]/g, '').trim();
  const matchDate = options.matchDate !== undefined ? options.matchDate : (match.date || null);
  const source = options.source || match.source || getMatchSourceFn(match);
  const sport = options.sport || match.sport || 'football';
  const matchId = options.matchId ?? match.match_id ?? (matchDate ? `${source}_${sport}_${homeClean}_${awayClean}_${matchDate}` : `${source}_${sport}_${homeClean}_${awayClean}`);
  const sourceMatchId = options.sourceMatchId ?? match.source_match_id ?? (match.match_id && match.match_id !== matchId ? match.match_id : null);

  const status = options.status ?? match.status ?? 'Planned';
  const isLive = options.isLive !== undefined ? options.isLive : (match.is_live ? 1 : 0);
  const isFinished = options.isFinished !== undefined ? options.isFinished : (match.is_finished ? 1 : 0);

  const overOdds = options.overOdds ?? match.over_odds ?? '1.85';
  const underOdds = options.underOdds ?? match.under_odds ?? '1.90';
  const cardLine = options.cardLine ?? match.card_line ?? '4.5';
  const probability = options.probability ?? match.probability ?? '55%';
  const bestTip = options.bestTip ?? match.best_tip ?? 'Plus de';
  const winRate = options.winRate ?? match.win_rate ?? '50%';

  const statsJson = typeof match.statistics === 'string'
    ? match.statistics
    : (match.statistics_json || (match.statistics ? JSON.stringify(normalizeStatisticsFn(match.statistics)) : null));

  const absencesJson = typeof match.absences === 'string'
    ? match.absences
    : (match.absences_json || (match.absences ? JSON.stringify(match.absences) : null));

  const betfairJson = match.betfair_json
    ? (typeof match.betfair_json === 'string' ? match.betfair_json : JSON.stringify(match.betfair_json))
    : null;

  const oddsCorners = match.odds_corners
    ? (typeof match.odds_corners === 'string' ? match.odds_corners : JSON.stringify(match.odds_corners))
    : null;

  const historicalLinks = match.historical_links
    ? (typeof match.historical_links === 'string' ? match.historical_links : JSON.stringify(match.historical_links))
    : null;

  return [
    matchId,
    sourceMatchId,
    match.time || '',
    matchDate,
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
    oddsCorners,
    match.home_logo || null,
    match.away_logo || null,
    historicalLinks,
    match.match_url || null,
    statsJson,
    absencesJson,
    betfairJson,
    sport,
    source
  ];
}

/**
 * Builds parameter array for updating primary match enrichment.
 *
 * @param {string} matchId
 * @param {object} data
 * @returns {Array}
 */
export function buildMatchEnrichmentParams(matchId, data) {
  return [
    data.first_half_corners_home,
    data.first_half_corners_away,
    data.home_logo || null,
    data.away_logo || null,
    data.historical_links ? (typeof data.historical_links === 'string' ? data.historical_links : JSON.stringify(data.historical_links)) : null,
    data.odds_corners ? (typeof data.odds_corners === 'string' ? data.odds_corners : JSON.stringify(data.odds_corners)) : null,
    data.card_line,
    data.best_tip,
    data.probability,
    data.date,
    data.time,
    data.match_url,
    data.statistics_json,
    data.sport,
    matchId
  ];
}

/**
 * Filters and scores candidate matches against home/away orientation and tournament compatibility.
 *
 * @param {Array<object>} rows
 * @param {object} filterOptions
 * @returns {Array<{ row: object, confidence: number, isDirect: boolean }>}
 */
export function filterAndScoreMatchCandidates(rows, { homeClean, awayClean, cleanSport, allowReversed, tournament }) {
  const isNeutralCourtSport = ['tennis', 'table-tennis', 'badminton'].includes(cleanSport);
  const candidates = [];

  for (const row of rows) {
    const isDirect = (row.home_team === homeClean && row.away_team === awayClean);
    const isReversed = (row.home_team === awayClean && row.away_team === homeClean);

    // If teams are reversed, verify whether sport / data actually represents reverse before matching
    if (isReversed && !isDirect) {
      if (!allowReversed && !isNeutralCourtSport) {
        continue; // Discard reversed match for sports where home/away orientation is strictly preserved
      }
    }

    // If competition / tournament is known on both, require tournament match or compatibility
    if (tournament && row.tournament) {
      if (!isTournamentCompatible(tournament, row.tournament)) {
        continue; // Tournament mismatch, discard candidate
      }
    }

    // Confidence scoring
    let confidence = isDirect ? 1.0 : 0.8;
    if (tournament && row.tournament) {
      const n1 = normalizeTournamentName(tournament);
      const n2 = normalizeTournamentName(row.tournament);
      if (n1 && n2 && n1 === n2) {
        confidence += 0.05;
      } else if (isTournamentCompatible(tournament, row.tournament)) {
        confidence += 0.02;
      }
    }

    candidates.push({ row, confidence, isDirect });
  }

  return candidates;
}
