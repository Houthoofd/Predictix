import {
  poissonUnder,
  poissonOver,
  getMetricTitle as getPoissonMetricTitle,
  getAverage
} from './poissonUtils';

export function getValueBetsForMatch(matchDetails) {
  if (!matchDetails) return [];
  const list = [];
  const popularMarkets = [
    'corners', 'fouls', 'yellow_cards', 'red_cards', 'shots_on_target', 'shots', 'offsides',
    'goals', 'total_rebounds', 'assists', 'blocks', 'steals', 'field_goals', 'free_throws',
    'aces', 'double_faults', 'first_serve', 'break_points', 'tries', 'penalties', 'conversions', 'saves',
    'first_half_points'
  ];
  
  const allMatches = [
    matchDetails,
    ...(matchDetails.recent_h2h_matches || []),
    ...(matchDetails.recent_home_matches || []),
    ...(matchDetails.recent_away_matches || [])
  ];
  const metrics = new Set();
  for (const m of allMatches) {
    if (m.statistics_json) {
      try {
        const stats = typeof m.statistics_json === 'string' ? JSON.parse(m.statistics_json) : m.statistics_json;
        if (stats) {
          Object.keys(stats).forEach(k => {
            if (stats[k] && (stats[k].home !== undefined || stats[k].away !== undefined)) {
              metrics.add(k);
            }
          });
        }
      } catch (e) {}
    }
  }
  const metricsToScan = Array.from(metrics).filter(m => popularMarkets.includes(m));

  for (const m of metricsToScan) {
    const homeAvg = getAverage(matchDetails.recent_home_matches, m, true, false, matchDetails.home_team, matchDetails.away_team);
    const awayAvg = getAverage(matchDetails.recent_away_matches, m, false, true, matchDetails.home_team, matchDetails.away_team);

    if (homeAvg !== null && awayAvg !== null) {
      const lambda = homeAvg + awayAvg;
      const startK = Math.max(0, Math.floor(lambda) - 4);
      const endK = Math.ceil(lambda) + 4;

      const maxProbLimit = (m === 'first_half_points') ? 0.85 : 0.70;

      for (let k = startK; k <= endK; k++) {
        const line = k + 0.5;
        const overProb = poissonOver(lambda, line);
        const underProb = poissonUnder(lambda, line);

        if (overProb >= 0.53 && overProb <= maxProbLimit) {
          list.push({
            metric: m,
            metricTitle: getPoissonMetricTitle(m, matchDetails.sport || 'football'),
            line,
            tip: 'Plus de',
            probability: Math.round(overProb * 100),
            fairOdds: 1 / overProb
          });
        }
        if (underProb >= 0.53 && underProb <= maxProbLimit) {
          list.push({
            metric: m,
            metricTitle: getPoissonMetricTitle(m, matchDetails.sport || 'football'),
            line,
            tip: 'Moins de',
            probability: Math.round(underProb * 100),
            fairOdds: 1 / underProb
          });
        }
      }
    }
  }
  return list.sort((a, b) => b.probability - a.probability);
}

export function scanAllValueBets(preds) {
  const list = [];
  preds.forEach(p => {
    const bets = getValueBetsForMatch(p);
    bets.forEach(b => {
      list.push({
        ...b,
        match_id: p.match_id,
        home_team: p.home_team,
        away_team: p.away_team,
        home_logo: p.home_logo,
        away_logo: p.away_logo,
        date: p.date,
        time: p.time,
        tournament: p.tournament,
        match_url: p.match_url,
        periodLabel: 'Match Entier'
      });
    });
  });
  return list.sort((a, b) => b.probability - a.probability);
}
