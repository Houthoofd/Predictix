import { validateMatchStats, checkScoreSanity } from './integrityLinter.js';

/**
 * Finds matching squad player statistics for an absent player name.
 * Matches exact, substring, or last name + first initial.
 *
 * @param {string} playerName
 * @param {Array<object>} teamPlayers
 * @returns {object|null}
 */
export function findSquadPlayerStats(playerName, teamPlayers) {
  if (!playerName || !Array.isArray(teamPlayers)) return null;

  const normalize = (str) => {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacritics
      .replace(/[^a-z0-9\s]/g, '')     // keep letters and spaces
      .trim();
  };

  const cleanAbsName = normalize(playerName);
  const absParts = cleanAbsName.split(/\s+/).filter(Boolean);
  if (absParts.length === 0) return null;

  // Let's first look for an exact match or substring match
  for (const tp of teamPlayers) {
    const cleanTpName = normalize(tp.player_name);
    if (cleanTpName === cleanAbsName || cleanTpName.includes(cleanAbsName) || cleanAbsName.includes(cleanTpName)) {
      return tp;
    }
  }

  // If no exact/substring match, try to match last names and initials
  for (const tp of teamPlayers) {
    const cleanTpName = normalize(tp.player_name);
    const tpParts = cleanTpName.split(/\s+/).filter(Boolean);
    if (tpParts.length === 0) continue;

    const absLast = absParts[absParts.length - 1];
    const tpLast = tpParts[tpParts.length - 1];
    
    if (absLast === tpLast) {
      if (absParts.length > 1 && tpParts.length > 1) {
        const absFirstChar = absParts[0].charAt(0);
        const tpFirstChar = tpParts[0].charAt(0);
        if (absFirstChar === tpFirstChar) {
          return tp;
        }
      } else {
        return tp;
      }
    }
  }

  return null;
}

/**
 * Overlays custom team logos onto a list of matches.
 *
 * @param {Array<object>} matchList
 * @param {Record<string, string>} customLogosMap
 * @returns {Array<object>}
 */
export function overlayTeamLogos(matchList, customLogosMap = {}) {
  if (!Array.isArray(matchList)) return [];
  return matchList.map(m => {
    const hKey = (m.home_team || '').toLowerCase().trim();
    const aKey = (m.away_team || '').toLowerCase().trim();
    return {
      ...m,
      home_logo: customLogosMap[hKey] || m.home_logo,
      away_logo: customLogosMap[aKey] || m.away_logo
    };
  });
}

/**
 * Evaluates match integrity and data completeness to produce a diagnostic report.
 *
 * @param {object} row
 * @param {Array<object>} homeMatches
 * @param {Array<object>} awayMatches
 * @param {Array<object>} h2hMatches
 * @param {string} homeLogo
 * @param {string} awayLogo
 * @returns {object} Diagnostic result and scoring
 */
export function computePredictionDiagnostic(row, homeMatches = [], awayMatches = [], h2hMatches = [], homeLogo = '', awayLogo = '') {
  const isHomeLogoMissing = !homeLogo || homeLogo.trim() === '' || homeLogo.toLowerCase().includes('placeholder') || homeLogo.toLowerCase().includes('logo_default') || homeLogo.toLowerCase().includes('logo-default');
  const isAwayLogoMissing = !awayLogo || awayLogo.trim() === '' || awayLogo.toLowerCase().includes('placeholder') || awayLogo.toLowerCase().includes('logo_default') || awayLogo.toLowerCase().includes('logo-default');
  
  const statsValidation = validateMatchStats(row);
  const sanityCheck = checkScoreSanity(row);

  let diagnosticScore = 100;
  if (homeMatches.length === 0) diagnosticScore -= 25;
  else if (homeMatches.length < 5) diagnosticScore -= 10;
  
  if (awayMatches.length === 0) diagnosticScore -= 25;
  else if (awayMatches.length < 5) diagnosticScore -= 10;
  
  if (h2hMatches.length === 0) diagnosticScore -= 30;
  
  if (isHomeLogoMissing) diagnosticScore -= 10;
  if (isAwayLogoMissing) diagnosticScore -= 10;
  
  if (!statsValidation.isValid) {
    diagnosticScore -= 20;
  }
  if (!sanityCheck.isSane) {
    diagnosticScore -= 30;
  }
  
  diagnosticScore = Math.max(0, diagnosticScore);

  return {
    missing_home_history: homeMatches.length === 0,
    missing_away_history: awayMatches.length === 0,
    missing_h2h: h2hMatches.length === 0,
    missing_home_logo: isHomeLogoMissing,
    missing_away_logo: isAwayLogoMissing,
    missing_match_stats: !statsValidation.isValid,
    score_sanity_mismatch: !sanityCheck.isSane,
    sanity_error_message: sanityCheck.reason,
    home_matches_count: homeMatches.length,
    away_matches_count: awayMatches.length,
    h2h_matches_count: h2hMatches.length,
    score: diagnosticScore,
    is_complete: homeMatches.length >= 5 && 
                 awayMatches.length >= 5 && 
                 h2hMatches.length >= 1 && 
                 !isHomeLogoMissing && 
                 !isAwayLogoMissing && 
                 statsValidation.isValid && 
                 sanityCheck.isSane
  };
}

/**
 * Parses and enriches missing squad players (absences) with tactical importance and ratings.
 *
 * @param {object} row
 * @param {Map<string, Array<object>>|null} playerStatsMap
 * @returns {Array<object>}
 */
export function parseAndEnrichAbsences(row, playerStatsMap = null) {
  let absences = [];
  try {
    const rawAbs = row.absences_json ? (typeof row.absences_json === 'string' ? JSON.parse(row.absences_json) : row.absences_json) : [];
    if (Array.isArray(rawAbs)) {
      absences = rawAbs.map(player => {
        const teamName = player.team === 'home' ? row.home_team : row.away_team;
        const teamKey = (teamName || '').toLowerCase().trim();
        const teamPlayers = playerStatsMap ? (playerStatsMap.get(teamKey) || []) : [];
        
        const stats = findSquadPlayerStats(player.player_name, teamPlayers);
        
        let position = 'M'; // Default
        let rating = 0;
        let appearances = 0;
        let starts = 0;
        let goals = 0;
        let assists = 0;
        let importance = 'reserve';
        let importanceLabel = 'Remplaçant';
        
        if (stats) {
          position = stats.position || 'M';
          rating = stats.rating || 0;
          appearances = stats.appearances || 0;
          starts = stats.starts || 0;
          goals = stats.goals || 0;
          assists = stats.assists || 0;
          
          const maxApps = Math.max(...teamPlayers.map(tp => tp.appearances || 0), 1);
          const startRate = starts / maxApps;
          const appearRate = appearances / maxApps;
          
          if (rating >= 7.20 || startRate >= 0.8) {
            importance = 'key';
            importanceLabel = 'Joueur clé';
          } else if (startRate >= 0.5) {
            importance = 'starter';
            importanceLabel = 'Titulaire';
          } else if (startRate >= 0.2 || appearRate >= 0.2) {
            importance = 'rotation';
            importanceLabel = 'Rotation';
          } else {
            importance = 'reserve';
            importanceLabel = 'Remplaçant';
          }
        }
        
        return {
          ...player,
          position,
          rating,
          appearances,
          starts,
          goals,
          assists,
          importance,
          importanceLabel,
          has_stats: !!stats
        };
      });
    }
  } catch (e) {
    console.error('[Prediction Engine] Failed to parse/enrich absences:', e);
  }
  return absences;
}

/**
 * Builds the comprehensive prediction context for a match.
 *
 * @param {object} row
 * @param {Array<object>} homeMatches
 * @param {Array<object>} awayMatches
 * @param {Array<object>} h2hMatches
 * @param {Record<string, string>} customLogosMap
 * @param {Map<string, Array<object>>|null} playerStatsMap
 * @returns {object} Context bundle
 */
export function buildPredictionContext(row, homeMatches, awayMatches, h2hMatches, customLogosMap = {}, playerStatsMap = null) {
  const cleanHomeTeamKey = (row.home_team || '').toLowerCase().trim();
  const cleanAwayTeamKey = (row.away_team || '').toLowerCase().trim();
  const homeLogo = customLogosMap[cleanHomeTeamKey] || row.home_logo;
  const awayLogo = customLogosMap[cleanAwayTeamKey] || row.away_logo;

  const enrichedHomeMatches = overlayTeamLogos(homeMatches, customLogosMap);
  const enrichedAwayMatches = overlayTeamLogos(awayMatches, customLogosMap);
  const enrichedH2HMatches = overlayTeamLogos(h2hMatches, customLogosMap);

  const diagnostic = computePredictionDiagnostic(row, homeMatches, awayMatches, h2hMatches, homeLogo, awayLogo);
  const absences = parseAndEnrichAbsences(row, playerStatsMap);

  return {
    homeLogo,
    awayLogo,
    enrichedHomeMatches,
    enrichedAwayMatches,
    enrichedH2HMatches,
    diagnostic,
    absences
  };
}
