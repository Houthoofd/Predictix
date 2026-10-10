import { resolveDb } from './dbResolver.js';

/**
 * Normalizes a tournament name for comparison.
 * @param {string} t
 * @returns {string}
 */
export function normalizeTournamentName(t) {
  if (!t || typeof t !== 'string') return '';
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/match en direct/g, '')
    .replace(/\(live score en direct\)/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Checks whether two tournament names are compatible.
 * If either is empty or a generic sport placeholder, considered compatible.
 * If both are specified, requires exact normalized match or substring inclusion.
 * @param {string} t1
 * @param {string} t2
 * @returns {boolean}
 */
export function isTournamentCompatible(t1, t2) {
  const n1 = normalizeTournamentName(t1);
  const n2 = normalizeTournamentName(t2);
  if (!n1 || !n2) return true;
  if (n1 === 'football' || n2 === 'football' || n1 === 'basketball' || n2 === 'basketball') return true;
  if (n1 === n2) return true;
  if (n1.includes(n2) || n2.includes(n1)) return true;
  return false;
}

/**
 * Loads a configuration value from the settings table.
 * @param {object|null} db Database context
 * @param {string} key
 * @returns {Promise<string|null>} Setting value
 */
export async function getImportSetting(db, key) {
  const runner = resolveDb(db);
  const row = await runner.get("SELECT value FROM settings WHERE key = ?", [key]);
  return row ? row.value : null;
}

/**
 * Deletes all player stats for a specific team.
 * @param {object|null} db Database context
 * @param {string} teamName
 * @returns {Promise<object>} Run result
 */
export async function deletePlayerStatsByTeam(db, teamName) {
  const runner = resolveDb(db);
  return runner.run('DELETE FROM player_stats WHERE team_name = ?', [teamName]);
}

/**
 * Inserts a single player stat row into player_stats.
 * @param {object|null} db Database context
 * @param {object} playerRow
 * @returns {Promise<object>} Run result
 */
export async function insertPlayerStat(db, playerRow) {
  const runner = resolveDb(db);
  const sql = `
    INSERT INTO player_stats (
      player_id, team_name, player_name, position, rating, appearances, starts, goals, assists, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;
  return runner.run(sql, [
    playerRow.player_id,
    playerRow.team_name,
    playerRow.player_name,
    playerRow.position || 'M',
    playerRow.rating || 0.0,
    playerRow.appearances || 0,
    playerRow.starts || 0,
    playerRow.goals || 0,
    playerRow.assists || 0
  ]);
}
