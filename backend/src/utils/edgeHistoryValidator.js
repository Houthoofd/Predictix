/** History contract for rolling-counts/2, emitted and validated by the C++ engine. */
import { isBoundedInteger } from './edgeNumericValidation.js';
export function validateDetailedEdgeHistory(history, sport) {
  const fail = reason => ({ valid: false, reason });
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const validDate = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split('-').map(Number);
    if (y < 1900 || y > 2200 || m < 1 || m > 12) return false;
    const days = [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return d >= 1 && d <= days[m - 1];
  };
  if (!object(history) || history.schema_version !== 'predictix-edge-history/2' || history.feature_schema !== 'rolling-counts/2') return fail('Unsupported detailed history schema');
  const { window, minimum_team_history: minimum, maximum_age_days: age, last_match_date: last, teams, team_games: details } = history;
  if (!isBoundedInteger(window, 3, 100) || !isBoundedInteger(minimum, 3, window) || !isBoundedInteger(age, 1, 3650)) return fail('Invalid history policy');
  if (!validDate(last) || !object(teams) || !object(details) || Object.keys(teams).length === 0 || Object.keys(teams).length !== Object.keys(details).length) return fail('Invalid history dates or team collections');
  let maximum = '';
  const matches = new Map();
  for (const [key, summary] of Object.entries(teams)) {
    let identity;
    try { identity = JSON.parse(key); } catch { return fail('Invalid history identity'); }
    if (!Array.isArray(identity) || identity.length !== 4 || identity.some(part => typeof part !== 'string' || part === '') || !['flashscore', 'matchendirect', 'arbworld'].includes(identity[0]) || !['football', 'basketball'].includes(identity[1]) || (sport && identity[1] !== sport)) return fail('Invalid history identity or sport');
    const games = details[key];
    if (!Array.isArray(games) || games.length === 0 || games.length > window || !Array.isArray(summary) || summary.length !== 3) return fail('Invalid history window or summary');
    let previous = '', scored = 0, conceded = 0;
    const seen = new Set();
    for (const game of games) {
      if (!object(game) || !validDate(game.date) || game.date < previous || game.date > last || typeof game.match_key !== 'string' || game.match_key === '' || seen.has(game.match_key)) return fail('Invalid history game chronology or identity');
      if (game.home !== undefined && typeof game.home !== 'boolean') return fail('Invalid history home orientation');
      if ([game.scored, game.conceded].some(n => typeof n !== 'number' || !Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 10000)) return fail('Invalid history observed count');
      seen.add(game.match_key); previous = game.date; if (game.date > maximum) maximum = game.date;
      const occurrences = matches.get(game.match_key) || [];
      occurrences.push({ identity, game }); matches.set(game.match_key, occurrences);
      scored += game.scored; conceded += game.conceded;
    }
    const expected = [scored / games.length, conceded / games.length, games.length];
    if (summary.some((n, i) => typeof n !== 'number' || !Number.isFinite(n) || n < 0 || Math.abs(n - expected[i]) > 1e-9)) return fail('History summary differs from observed games');
  }
  if (maximum !== last) return fail('History global date differs from observed games');
  for (const occurrences of matches.values()) {
    if (occurrences.length > 2) return fail('Match identity occurs in more than two teams');
    if (occurrences.length === 2) {
      const [a, b] = occurrences;
      if (a.identity.slice(0, 3).some((part, i) => part !== b.identity[i]) ||
          a.identity[3] === b.identity[3] || a.game.date !== b.game.date ||
          a.game.scored !== b.game.conceded || a.game.conceded !== b.game.scored ||
          (a.game.home !== undefined && b.game.home !== undefined && a.game.home === b.game.home))
        return fail('Conflicting cross-team match identity');
    }
  }
  return { valid: true };
}

export function requireFreshDetailedHistory(history, match, homeKey, awayKey) {
  const validation = validateDetailedEdgeHistory(history, match.sport);
  if (!validation.valid) throw new Error(validation.reason);
  const day = value => Date.parse(`${value}T00:00:00Z`) / 86400000;
  for (const [key, name] of [[homeKey, match.home_team], [awayKey, match.away_team]]) {
    const games = history.team_games[key];
    if (!games) throw new Error(`No usable history for team: ${name}`);
    if (games.length < history.minimum_team_history) throw new Error(`Not enough prior matches for team: ${name}`);
    if (day(match.date) - day(games.at(-1).date) > history.maximum_age_days) throw new Error(`Stale history for team: ${name}`);
  }
}
