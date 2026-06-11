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
  first_half_points: 'points 1ère mi-temps',
  saves: 'arrêts'
};

export async function evaluateMagicSignals(minCoverage = 50.0) {
  // Fetch active custom strategies
  let activeStrategies = [];
  try {
    activeStrategies = await dbQuery("SELECT * FROM custom_strategies WHERE status = 'ACTIVE'");
  } catch (err) {
    console.warn("Could not fetch custom strategies, defaulting to empty list:", err.message);
  }

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
  
  // Fetch finished matches once to build in-memory H2H mapping
  const allFinished = await dbQuery(`
    SELECT home_team, away_team, score, date, time, tournament, statistics_json, sport
    FROM scraped_predictions 
    WHERE is_finished = 1
    ORDER BY date DESC
  `);

  const h2hMatchesMap = new Map();
  for (const m of allFinished) {
    const teams = [m.home_team, m.away_team].sort();
    const h2hKey = `${teams[0]} vs ${teams[1]}`;
    if (!h2hMatchesMap.has(h2hKey)) {
      h2hMatchesMap.set(h2hKey, []);
    }
    const h2hArr = h2hMatchesMap.get(h2hKey);
    if (h2hArr.length < 15) {
      h2hArr.push(m);
    }
  }

  const signals = [];

  // For each upcoming match, check H2H data
  for (const match of upcomingMatches) {
    // Check league coverage rate first
    const leagueCoverage = coverageMap.has(match.tournament) ? coverageMap.get(match.tournament) : 100.0;
    if (leagueCoverage < minCoverage) {
      continue;
    }

    const teams = [match.home_team, match.away_team].sort();
    const h2hKey = `${teams[0]} vs ${teams[1]}`;
    const h2hMatches = h2hMatchesMap.get(h2hKey) || [];

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

    // Evaluate active custom strategies
    for (const strategy of activeStrategies) {
      let conds = {};
      try {
        conds = JSON.parse(strategy.conditions_json);
      } catch (e) {
        continue;
      }
      
      const stratLimit = conds.limit || 5;
      const stratMetric = strategy.metric;
      const operator = conds.operator || '>=';
      const threshold = parseFloat(conds.threshold);
      
      let stratValues = [];
      for (const h2h of h2hMatches) {
        if (stratValues.length >= stratLimit) break;
        
        let stats = null;
        try {
          if (h2h.statistics_json) {
            stats = JSON.parse(h2h.statistics_json);
          }
        } catch (e) {
          continue;
        }
        
        if (stratMetric === 'goals') {
          if (h2h.score) {
            const scoreMatch = h2h.score.match(/(\d+)\s*-\s*(\d+)/);
            if (scoreMatch) {
              const val = parseFloat(scoreMatch[1]) + parseFloat(scoreMatch[2]);
              stratValues.push(val);
            }
          }
        } else if (stratMetric === 'possession') {
          if (stats && stats.possession && stats.possession.home !== undefined && stats.possession.away !== undefined) {
            const val = (h2h.home_team === match.home_team) 
              ? parseFloat(stats.possession.home) 
              : parseFloat(stats.possession.away);
            stratValues.push(val);
          }
        } else {
          if (stats && stats[stratMetric] && stats[stratMetric].home !== undefined && stats[stratMetric].away !== undefined) {
            const val = parseFloat(stats[stratMetric].home) + parseFloat(stats[stratMetric].away);
            stratValues.push(val);
          }
        }
      }
      
      if (stratValues.length === 0) continue;
      
      const stratSum = stratValues.reduce((acc, curr) => acc + curr, 0);
      const stratAvg = parseFloat((stratSum / stratValues.length).toFixed(1));
      
      let qualified = false;
      if (operator === '>=') qualified = stratAvg >= threshold;
      else if (operator === '<=') qualified = stratAvg <= threshold;
      else if (operator === '>') qualified = stratAvg > threshold;
      else if (operator === '<') qualified = stratAvg < threshold;
      
      if (qualified) {
        const metricLabel = metricLabels[stratMetric] || stratMetric;
        const opText = operator === '>=' ? 'au moins' : (operator === '<=' ? 'maximum' : (operator === '>' ? 'plus de' : 'moins de'));
        const rationaleText = `Moyenne H2H de ${metricLabel} sur les ${stratValues.length} dernières confrontations : ${stratAvg} (Seuil ciblé : ${opText} ${threshold}).`;
        
        signals.push({
          id: `${match.match_id}_${strategy.id}`,
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
          strategy_id: strategy.id,
          strategy_name: strategy.name,
          metric: stratMetric,
          prompt: strategy.prompt || '',
          avg_value: stratAvg,
          threshold: threshold,
          operator: operator,
          rationale: rationaleText,
          sport: match.sport || 'football',
          scraped_at: match.scraped_at
        });
      }
    }
  }

  return signals;
}
