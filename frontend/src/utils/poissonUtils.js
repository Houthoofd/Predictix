// Pure Poisson CDF calculations and helper functions

export const poissonUnder = (lambda, line) => {
  if (lambda <= 0) return 1;
  let sum = 0;
  let term = Math.exp(-lambda);
  for (let i = 0; i < line; i++) {
    sum += term;
    term = (term * lambda) / (i + 1);
  }
  return sum;
};

export const poissonOver = (lambda, line) => {
  return 1 - poissonUnder(lambda, line);
};

const factCache = [1, 1];
export const factorial = (n) => {
  if (n < 0) return 0;
  if (factCache[n] !== undefined) return factCache[n];
  let res = factCache[factCache.length - 1];
  for (let i = factCache.length; i <= n; i++) {
    res *= i;
    factCache[i] = res;
  }
  return res;
};

export const choose = (n, k) => {
  if (k < 0 || k > n) return 0;
  return factorial(n) / (factorial(k) * factorial(n - k));
};

export const bivariatePoissonPMF = (x, y, meanHome, meanAway, cov) => {
  const l3 = Math.max(0, Math.min(cov, Math.min(meanHome, meanAway) - 0.05));
  const l1 = Math.max(0.05, meanHome - l3);
  const l2 = Math.max(0.05, meanAway - l3);

  const expPart = Math.exp(-(l1 + l2 + l3));
  const term1 = Math.pow(l1, x) / factorial(x);
  const term2 = Math.pow(l2, y) / factorial(y);

  let sum = 0;
  const minXY = Math.min(x, y);
  for (let k = 0; k <= minXY; k++) {
    const c1 = choose(x, k);
    const c2 = choose(y, k);
    const factK = factorial(k);
    const mult = Math.pow(l3 / (l1 * l2), k);
    sum += c1 * c2 * factK * mult;
  }

  return expPart * term1 * term2 * sum;
};

export const bivariatePoissonUnder = (meanHome, meanAway, cov, line) => {
  if (cov <= 0) {
    return poissonUnder(meanHome + meanAway, line);
  }
  const maxVal = Math.floor(line);
  let totalProb = 0;
  for (let x = 0; x <= maxVal; x++) {
    for (let y = 0; y <= maxVal - x; y++) {
      totalProb += bivariatePoissonPMF(x, y, meanHome, meanAway, cov);
    }
  }
  return totalProb;
};

export const bivariatePoissonOver = (meanHome, meanAway, cov, line) => {
  if (cov <= 0) {
    return poissonOver(meanHome + meanAway, line);
  }
  return 1 - bivariatePoissonUnder(meanHome, meanAway, cov, line);
};

export const getMetricPeriodRatio = (metric, period) => {
  if (period === 'full_time') return 1.0;
  if (period === 'first_half') {
    if (metric === 'yellow_cards' || metric === 'red_cards') return 0.30;
    if (metric === 'fouls') return 0.48;
    if (metric === 'offsides') return 0.50;
    if (metric === 'xg_buts_attendus') return 0.45;
    if (metric === 'corners') return 0.46;
    return 0.47;
  }
  if (period === 'second_half') {
    if (metric === 'yellow_cards' || metric === 'red_cards') return 0.70;
    if (metric === 'fouls') return 0.52;
    if (metric === 'offsides') return 0.50;
    if (metric === 'xg_buts_attendus') return 0.55;
    if (metric === 'corners') return 0.54;
    return 0.53;
  }
  return 1.0;
};

export const getMetricExplanation = (key) => {
  const explanations = {
    corners: 'Corners cumulés des deux équipes tirés durant la période spécifiée uniquement. Exclut les corners accordés mais non tirés.',
    fouls: 'Nombre total de fautes commises et sifflées par l\'arbitre durant la période spécifiée.',
    yellow_cards: 'Total des cartons jaunes attribués aux joueurs actifs sur le terrain pendant la période spécifiée.',
    red_cards: 'Total des cartons rouges (directs ou par second jaune consécutif) distribués pendant la période spécifiée.',
    shots_on_target: 'Tentatives de tirs de part et d\'autre qui entrent directement dans le but ou qui auraient franchi la ligne sans intervention décisive.',
    shots: 'Somme cumulée de toutes les tentatives de tirs des deux clubs (cadrés, hors-cadre et contrés) durant la période.',
    offsides: 'Total des positions de hors-jeu signalées par le corps arbitral durant la période spécifiée.',
    possession: 'Pourcentage moyen du temps de contrôle effectif du ballon par l\'équipe à domicile.'
  };
  return explanations[key] || 'Indicateur statistique officiel de la rencontre évalué pour cette opportunité.';
};

export const getMetricTitle = (key) => {
  const titles = {
    corners: 'Corners',
    fouls: 'Fautes Commises',
    yellow_cards: 'Cartons Jaunes',
    possession: 'Possession de Balle',
    shots_on_target: 'Tirs Cadrés',
    shots: 'Tirs',
    offsides: 'Hors-jeu',
    red_cards: 'Cartons Rouges',
    xg_buts_attendus: 'Expected Goals (xG)',
    passes: 'Passes Totales',
    passes_reussis: 'Passes Réussies (%)',
    tacles_reussis: 'Tacles Réussis',
    dribbles_reussis: 'Dribbles Réussis',
    duels_reussis: 'Duels Gagnés',
    duels_aeriens_reussis: 'Duels Aériens Gagnés',
    ballons_touches_dans_la_surface_adverse: 'Touches Surface Adverse',
    centres: 'Centres Tentés',
    centres_reussis: 'Centres Réussis',
    degagements: 'Dégagements',
    rentree_de_touche: 'Touches',
    occasions_manquees: 'Occasions Manquées',
    poteau: 'Tirs sur Poteau',
    total_rebounds: 'Rebonds',
    assists: 'Passes Décisives',
    blocks: 'Contres',
    steals: 'Interceptions',
    field_goals: 'Paniers Réussis',
    free_throws: 'Lancers Francs',
    aces: 'Aces',
    double_faults: 'Doubles Fautes',
    first_serve: '1er Service (%)',
    break_points: 'Balles de Break',
    tries: 'Essais',
    penalties: 'Pénalités',
    conversions: 'Transformations',
    goals: 'Buts',
    saves: 'Arrêts'
  };
  if (titles[key]) return titles[key];
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const getAverage = (matches, metric, isHomeOnly = false, isAwayOnly = false, homeTeam = '', awayTeam = '') => {
  if (!matches || !Array.isArray(matches) || matches.length === 0) return null;
  
  let sum = 0;
  let count = 0;
  
  for (const m of matches) {
    if (metric === 'goals') {
      if (m.score) {
        const matchScore = m.score.match(/(\d+)\s*-\s*(\d+)/);
        if (matchScore) {
          const valHome = parseFloat(matchScore[1]);
          const valAway = parseFloat(matchScore[2]);
          if (isHomeOnly) {
            sum += m.home_team === homeTeam ? valHome : valAway;
            count++;
          } else if (isAwayOnly) {
            sum += m.away_team === awayTeam ? valAway : valHome;
            count++;
          } else {
            sum += (valHome + valAway);
            count++;
          }
        }
      }
      continue;
    }

    if (metric === 'corners') {
      if (isHomeOnly) {
        const val = m.home_team === homeTeam ? m.first_half_corners_home : m.first_half_corners_away;
        if (val !== null && val !== undefined) {
          sum += val;
          count++;
        }
      } else if (isAwayOnly) {
        const val = m.away_team === awayTeam ? m.first_half_corners_away : m.first_half_corners_home;
        if (val !== null && val !== undefined) {
          sum += val;
          count++;
        }
      } else {
        if (m.first_half_corners_home !== null && m.first_half_corners_home !== undefined &&
            m.first_half_corners_away !== null && m.first_half_corners_away !== undefined) {
          sum += (m.first_half_corners_home + m.first_half_corners_away);
          count++;
        }
      }
      continue;
    }
    
    let stats = null;
    try {
      if (m.statistics_json) {
        stats = typeof m.statistics_json === 'string' ? JSON.parse(m.statistics_json) : m.statistics_json;
      }
    } catch (e) {}
    
    if (!stats || !stats[metric]) continue;
    
    if (metric === 'possession') {
      if (stats.possession.home !== undefined) {
        const val = (isHomeOnly || m.home_team === homeTeam)
          ? parseFloat(stats.possession.home)
          : parseFloat(stats.possession.away);
        sum += val;
        count++;
      }
    } else if (stats[metric].home !== undefined && stats[metric].away !== undefined) {
      if (isHomeOnly) {
        const val = m.home_team === homeTeam ? parseFloat(stats[metric].home) : parseFloat(stats[metric].away);
        sum += val;
        count++;
      } else if (isAwayOnly) {
        const val = m.away_team === awayTeam ? parseFloat(stats[metric].away) : parseFloat(stats[metric].home);
        sum += val;
        count++;
      } else {
        sum += (parseFloat(stats[metric].home) + parseFloat(stats[metric].away));
        count++;
      }
    }
  }
  
  return count > 0 ? parseFloat((sum / count).toFixed(1)) : null;
};

export const getOutcomeIndicator = (match, targetTeam) => {
  if (!match.score || !match.score.includes('-')) return null;
  const parts = match.score.split('-');
  const scoreHome = parseInt(parts[0].trim(), 10);
  const scoreAway = parseInt(parts[1].trim(), 10);
  
  if (isNaN(scoreHome) || isNaN(scoreAway)) return null;
  
  const isHome = match.home_team === targetTeam;
  if (scoreHome === scoreAway) {
    return { label: 'N', color: '#ffb020', bg: 'rgba(255, 176, 32, 0.08)', border: '1px solid rgba(255, 176, 32, 0.2)' };
  }
  const isWin = isHome ? (scoreHome > scoreAway) : (scoreAway > scoreHome);
  if (isWin) {
    return { label: 'V', color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' };
  } else {
    return { label: 'D', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' };
  }
};
