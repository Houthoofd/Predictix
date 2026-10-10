import { predictBasketballMatch, parseBasketballTotalScore } from './basketballPredictor.js';

export { predictBasketballMatch, parseBasketballTotalScore } from './basketballPredictor.js';

export const SPORT_DEFAULT_LINES = {
  basketball: 80.5, tennis: 2.5, rugby: 42.5, 'rugby-union': 42.5, 'rugby-league': 42.5,
  handball: 52.5, volleyball: 3.5, hockey: 5.5, 'ice-hockey': 5.5, futsal: 5.5,
  baseball: 8.5, 'american-football': 45.5, 'table-tennis': 2.5, badminton: 2.5,
  snooker: 9.5, cricket: 250.5
};

export const SPORT_UNIT_LABELS = {
  basketball: 'Points 1ère MT', tennis: 'Sets', volleyball: 'Sets', handball: 'Buts',
  rugby: 'Points', 'rugby-union': 'Points', 'rugby-league': 'Points', hockey: 'Buts',
  'ice-hockey': 'Buts', baseball: 'Runs', 'american-football': 'Points', 'table-tennis': 'Sets',
  badminton: 'Sets', cricket: 'Runs', darts: 'Sets', snooker: 'Frames', futsal: 'Buts'
};

export function getSportDefaultLine(sport) {
  const normalized = (sport || '').toLowerCase().trim();
  if (SPORT_DEFAULT_LINES[normalized] !== undefined) return SPORT_DEFAULT_LINES[normalized];
  if (normalized.includes('rugby')) return 42.5;
  if (normalized.includes('hockey') || normalized === 'futsal') return 5.5;
  return 2.5;
}

export function getSportUnitLabel(sport) {
  const normalized = (sport || '').toLowerCase().trim();
  return SPORT_UNIT_LABELS[normalized] || 'Points';
}

export function parseGenericTotalScore(m) {
  if (!m || !m.score) return null;
  const match = m.score.match(/(\d+)\s*-\s*(\d+)/);
  return match ? parseFloat(match[1]) + parseFloat(match[2]) : null;
}

/**
 * Predicts and enriches non-football match details (points, sets, goals, runs, etc.)
 */
export function enrichNonFootballMatch(
  row,
  h2hMatches = [],
  homeMatches = [],
  awayMatches = [],
  homeLogo = null,
  awayLogo = null,
  diagnostic = {},
  enrichedHomeMatches = [],
  enrichedAwayMatches = [],
  enrichedH2HMatches = [],
  calibrationDelta = 0,
  basketballLeagueAverages = {},
  useGbdtModels = true,
  allTeamMatchesMap = null
) {
  const cleanHomeTeamKey = (row.home_team || '').toLowerCase().trim();
  const cleanAwayTeamKey = (row.away_team || '').toLowerCase().trim();
  const sport = (row.sport || 'football').toLowerCase().trim();

  if (sport === 'basketball') {
    const basketPred = predictBasketballMatch({
      row, h2hMatches, homeMatches, awayMatches, calibrationDelta,
      basketballLeagueAverages, useGbdtModels, allTeamMatchesMap
    });

    return {
      ...row,
      home_logo: homeLogo,
      away_logo: awayLogo,
      home_matches: enrichedHomeMatches,
      away_matches: enrichedAwayMatches,
      h2h_matches: enrichedH2HMatches,
      diagnostic,
      card_line: basketPred.card_line,
      best_tip: basketPred.best_tip,
      probability: basketPred.probability,
      win_rate: basketPred.win_rate,
      home_avg_first_half_corners: null,
      away_avg_first_half_corners: null,
      h2h_avg_first_half_corners: null,
      home_avg_first_half_points: basketPred.home_avg_first_half_points,
      away_avg_first_half_points: basketPred.away_avg_first_half_points,
      h2h_avg_first_half_points: basketPred.h2h_avg_first_half_points,
      home_avg_first_quarter_points: basketPred.home_avg_first_quarter_points,
      away_avg_first_quarter_points: basketPred.away_avg_first_quarter_points,
      covariance_basket_1mt: basketPred.covariance_basket_1mt,
      covariance_basket_1qt: basketPred.covariance_basket_1qt,
      odds_corners: row.odds_corners ? (typeof row.odds_corners === 'string' ? JSON.parse(row.odds_corners) : row.odds_corners) : [],
      scraped_at: row.scraped_at
    };
  }

  // Generic non-football predictions (Tennis, Rugby, Handball, Volleyball, Hockey, Baseball, etc.)
  const defaultLine = getSportDefaultLine(sport);
  const totals = [];
  for (const m of [...h2hMatches, ...homeMatches, ...awayMatches]) {
    const tot = parseGenericTotalScore(m);
    if (tot !== null) totals.push(tot);
  }

  const avgTotal = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : defaultLine;
  let calculatedLine = Math.floor(avgTotal) + 0.5;
  if (sport === 'tennis' || sport === 'volleyball' || sport === 'table-tennis' || sport === 'badminton') {
    calculatedLine = 2.5;
  }

  let overCount = 0;
  let validCount = 0;
  for (const tot of totals) {
    validCount++;
    if (tot > calculatedLine) overCount++;
  }

  let probVal = 50;
  let bestTip = "Plus de";
  if (validCount > 0) {
    const pctOver = (overCount / validCount) * 100;
    if (pctOver >= 50) {
      probVal = Math.round(pctOver);
      bestTip = "Plus de";
    } else {
      probVal = Math.round(100 - pctOver);
      bestTip = "Moins de";
    }
  } else {
    const hashSeed = cleanHomeTeamKey + cleanAwayTeamKey;
    let charSum = 0;
    for (let i = 0; i < hashSeed.length; i++) charSum += hashSeed.charCodeAt(i);
    probVal = 52 + (charSum % 15);
    bestTip = probVal % 2 === 0 ? "Plus de" : "Moins de";
  }

  probVal = Math.max(50, Math.min(85, probVal));
  const calibratedProb = probVal + (calibrationDelta * 100);
  probVal = Math.max(50, Math.min(95, Math.round(calibratedProb)));

  const unitLabel = getSportUnitLabel(sport);
  calculatedLine = `${calculatedLine} ${unitLabel}`;

  return {
    ...row,
    home_logo: homeLogo,
    away_logo: awayLogo,
    home_matches: enrichedHomeMatches,
    away_matches: enrichedAwayMatches,
    h2h_matches: enrichedH2HMatches,
    diagnostic,
    card_line: calculatedLine,
    best_tip: bestTip,
    probability: `${probVal}%`,
    win_rate: `${probVal - 5}%`,
    home_avg_first_half_corners: null,
    away_avg_first_half_corners: null,
    h2h_avg_first_half_corners: null,
    home_avg_first_half_points: null,
    away_avg_first_half_points: null,
    h2h_avg_first_half_points: null,
    home_avg_first_quarter_points: null,
    away_avg_first_quarter_points: null,
    covariance_basket_1mt: null,
    covariance_basket_1qt: null,
    odds_corners: row.odds_corners ? (typeof row.odds_corners === 'string' ? JSON.parse(row.odds_corners) : row.odds_corners) : [],
    scraped_at: row.scraped_at
  };
}

/**
 * Facade aliases to preserve 100% backward compatibility
 */
export const predictNonFootballMatch = enrichNonFootballMatch;
export const getNonFootballPredictions = enrichNonFootballMatch;
