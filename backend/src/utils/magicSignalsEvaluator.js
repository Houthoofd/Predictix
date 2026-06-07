import { dbQuery } from '../db/database.js';

// Helper map for metric labels in French
export const metricLabels = {
  fouls: 'fautes',
  yellow_cards: 'cartons jaunes',
  possession: 'possession',
  shots_on_target: 'tirs cadrés',
  shots: 'tirs',
  offsides: 'hors-jeu',
  corners: 'corners',
  total_rebounds: 'rebonds',
  assists: 'passes décisives',
  blocks: 'contres',
  steals: 'interceptions',
  field_goals: 'paniers réussis',
  free_throws: 'lancers francs',
  aces: 'aces',
  double_faults: 'doubles fautes',
  first_serve: '1er service (%)',
  break_points: 'balles de break',
  tries: 'essais',
  penalties: 'pénalités',
  conversions: 'transformations',
  goals: 'buts / points',
  saves: 'arrêts'
};

export async function evaluateMagicSignals(minCoverage = 50.0) {
  // Fetch coverage rate per league
  const coverageRows = await dbQuery(`
    SELECT 
      tournament,
      ROUND(CAST(SUM(CASE WHEN statistics_json IS NOT NULL THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 1) as coverage_rate
    FROM scraped_predictions
    WHERE is_historical = 0 AND is_finished = 1
    GROUP BY tournament
  `);
  
  const coverageMap = new Map();
  for (const row of coverageRows) {
    coverageMap.set(row.tournament, row.coverage_rate);
  }

  // Get all matches (including finished ones)
  const upcomingMatches = await dbQuery("SELECT * FROM scraped_predictions WHERE is_historical = 0 ORDER BY date ASC, time ASC");
  
  const signals = [];

  // For each upcoming match, check H2H data
  for (const match of upcomingMatches) {
    // Check league coverage rate first
    const leagueCoverage = coverageMap.has(match.tournament) ? coverageMap.get(match.tournament) : 100.0;
    if (leagueCoverage < minCoverage) {
      continue;
    }

    // Find historical finished H2H matches (up to 15 to cover potential limits)
    const h2hMatches = await dbQuery(`
      SELECT * FROM scraped_predictions 
      WHERE is_finished = 1 
        AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))
      ORDER BY date DESC LIMIT 15
    `, [match.home_team, match.away_team, match.away_team, match.home_team]);

    // Default strategy logic: evaluate "goals" (Buts / Points) for all matches
    const limit = 5;
    const metric = 'goals';

    let values = [];
    for (const h2h of h2hMatches) {
      if (values.length >= limit) break;

      if (h2h.score) {
        const scoreMatch = h2h.score.match(/(\d+)\s*-\s*(\d+)/);
        if (scoreMatch) {
          const val = parseFloat(scoreMatch[1]) + parseFloat(scoreMatch[2]);
          values.push(val);
        }
      }
    }

    // Compute average
    let avg = 0;
    let rationaleText = '';
    if (values.length > 0) {
      const sum = values.reduce((acc, curr) => acc + curr, 0);
      avg = parseFloat((sum / values.length).toFixed(1));
      rationaleText = `Moyenne de buts/points sur les ${values.length} dernières confrontations H2H : ${avg}.`;
    } else {
      avg = 0;
      rationaleText = `Aucun historique H2H disponible. Ouvrez les détails du match pour lancer l'analyse H2H.`;
    }

    const metricLabel = metricLabels[metric] || metric;

    signals.push({
      id: `${match.match_id}_all`,
      match_id: match.match_id,
      time: match.time,
      date: match.date,
      tournament: match.tournament,
      home_team: match.home_team,
      away_team: match.away_team,
      home_logo: match.home_logo,
      away_logo: match.away_logo,
      score: match.score,
      match_url: match.match_url,
      strategy_id: 0,
      strategy_name: 'Analyse H2H',
      metric: metric,
      prompt: '',
      avg_value: avg,
      threshold: 0,
      operator: '>=',
      rationale: rationaleText,
      sport: match.sport || 'football',
      scraped_at: match.scraped_at
    });
  }

  return signals;
}
