/**
 * Integrity Linter for Predictix
 * Validates match statistics structure and checks logical consistency of scores.
 */

/**
 * Validates if the required statistics for the match are present based on the sport.
 * Only applicable for finished matches.
 * @param {Object} match - The match object from DB
 * @returns {Object} { isValid: boolean, missing: string[] }
 */
export function validateMatchStats(match) {
  const isFinished = match.is_finished === 1 || match.status === 'Finished';
  if (!isFinished) {
    return { isValid: true, missing: [] };
  }

  const sport = (match.sport || 'football').toLowerCase().trim();
  const missing = [];

  if (sport === 'football') {
    if (match.first_half_corners_home === null || match.first_half_corners_home === undefined) {
      missing.push('corners_home_1mt');
    }
    if (match.first_half_corners_away === null || match.first_half_corners_away === undefined) {
      missing.push('corners_away_1mt');
    }
  } else if (sport === 'basketball') {
    let stats = null;
    try {
      if (match.statistics_json) {
        stats = typeof match.statistics_json === 'string' 
          ? JSON.parse(match.statistics_json) 
          : match.statistics_json;
      }
    } catch (e) {}

    if (!stats || !stats.first_half_points) {
      missing.push('first_half_points');
    } else {
      const sh = stats.first_half_points;
      if (sh.home === undefined || sh.home === null || sh.away === undefined || sh.away === null) {
        missing.push('first_half_points_values');
      }
    }
  } else {
    // Default check for other sports: statistics_json shouldn't be empty
    if (!match.statistics_json || match.statistics_json === 'null' || match.statistics_json === '') {
      missing.push('statistics_json');
    }
  }

  return {
    isValid: missing.length === 0,
    missing
  };
}

/**
 * Checks if the scores of a match are logically consistent (e.g. 1st half scores do not exceed final scores).
 * @param {Object} match - The match object from DB
 * @returns {Object} { isSane: boolean, reason: string|null }
 */
export function checkScoreSanity(match) {
  const isFinished = match.is_finished === 1 || match.status === 'Finished';
  if (!isFinished || !match.score || match.score.trim() === '-' || match.score.trim() === '') {
    return { isSane: true, reason: null };
  }

  const sport = (match.sport || 'football').toLowerCase().trim();
  
  // Parse final score (e.g., "96-88" or "2 - 1")
  const scoreParts = match.score.match(/^(\d+)\s*-\s*(\d+)$/);
  if (!scoreParts) {
    // Score is not in standard numeric format (could be "AET", "Pen", or walkover, which is fine)
    return { isSane: true, reason: null };
  }

  const homeFinal = parseInt(scoreParts[1], 10);
  const awayFinal = parseInt(scoreParts[2], 10);
  const totalFinal = homeFinal + awayFinal;

  if (sport === 'basketball') {
    let stats = null;
    try {
      if (match.statistics_json) {
        stats = typeof match.statistics_json === 'string' 
          ? JSON.parse(match.statistics_json) 
          : match.statistics_json;
      }
    } catch (e) {}

    if (stats && stats.first_half_points) {
      const homeHalf = parseInt(stats.first_half_points.home, 10);
      const awayHalf = parseInt(stats.first_half_points.away, 10);

      if (isNaN(homeHalf) || isNaN(awayHalf)) {
        return { isSane: false, reason: "Les points de la 1ère mi-temps ne sont pas des nombres valides." };
      }

      if (homeHalf > homeFinal) {
        return { 
          isSane: false, 
          reason: `Points de la 1ère mi-temps à domicile (${homeHalf}) supérieurs au score final (${homeFinal}).` 
        };
      }

      if (awayHalf > awayFinal) {
        return { 
          isSane: false, 
          reason: `Points de la 1ère mi-temps à l'extérieur (${awayHalf}) supérieurs au score final (${awayFinal}).` 
        };
      }

      const totalHalf = homeHalf + awayHalf;
      if (totalHalf >= totalFinal && totalFinal > 0) {
        return {
          isSane: false,
          reason: `Total de la 1ère mi-temps (${totalHalf}) supérieur ou égal au score final (${totalFinal}).`
        };
      }
    }
  }

  return { isSane: true, reason: null };
}
