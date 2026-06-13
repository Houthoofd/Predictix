import {
  modelBasket1MT,
  modelBasket1QT,
  covarianceBasket1MT,
  covarianceBasket1QT,
  basketballLeagueAveragesCache
} from './gbdtTrainer.js';

/**
 * Predicts and enriches non-football match details (points, sets, goals, runs, etc.)
 */
export function enrichNonFootballMatch(row, h2hMatches, homeMatches, awayMatches, homeLogo, awayLogo, diagnostic, enrichedHomeMatches, enrichedAwayMatches, enrichedH2HMatches, calibrationDelta = 0, basketballLeagueAverages = {}, useGbdtModels = true, allTeamMatchesMap = null) {
  const cleanHomeTeamKey = (row.home_team || '').toLowerCase().trim();
  const cleanAwayTeamKey = (row.away_team || '').toLowerCase().trim();
  const sport = (row.sport || 'football').toLowerCase().trim();

  // 1. Get default line depending on the sport
  let defaultLine = 2.5;
  if (sport === 'basketball') defaultLine = 80.5;
  else if (sport === 'tennis') defaultLine = 2.5;
  else if (sport.includes('rugby')) defaultLine = 42.5;
  else if (sport === 'handball') defaultLine = 52.5;
  else if (sport === 'volleyball') defaultLine = 3.5;
  else if (sport === 'hockey' || sport === 'ice-hockey' || sport === 'futsal') defaultLine = 5.5;
  else if (sport === 'baseball') defaultLine = 8.5;
  else if (sport === 'american-football') defaultLine = 45.5;
  else if (sport === 'table-tennis' || sport === 'badminton') defaultLine = 2.5;
  else if (sport === 'snooker') defaultLine = 9.5;
  else if (sport === 'cricket') defaultLine = 250.5;
  
  // 2. Parse scores from recent and H2H matches to calculate average
  const totals = [];
  const parseTotalScore = (m) => {
    if (sport === 'basketball') {
      if (m.statistics_json) {
        try {
          const stats = typeof m.statistics_json === 'string' ? JSON.parse(m.statistics_json) : m.statistics_json;
          if (stats && stats.first_half_points && stats.first_half_points.home !== undefined && stats.first_half_points.away !== undefined) {
            return parseFloat(stats.first_half_points.home) + parseFloat(stats.first_half_points.away);
          }
        } catch (e) {}
      }
      if (!m.score) return null;
      const match = m.score.match(/(\d+)\s*-\s*(\d+)/);
      if (match) {
        return (parseFloat(match[1]) + parseFloat(match[2])) * 0.49; // approx. 49% of final score
      }
      return null;
    }

    if (!m.score) return null;
    const match = m.score.match(/(\d+)\s*-\s*(\d+)/);
    if (match) {
      return parseFloat(match[1]) + parseFloat(match[2]);
    }
    return null;
  };
  
  // Add H2H matches
  for (const m of h2hMatches) {
    const tot = parseTotalScore(m);
    if (tot !== null) totals.push(tot);
  }
  // Add home matches
  for (const m of homeMatches) {
    const tot = parseTotalScore(m);
    if (tot !== null) totals.push(tot);
  }
  // Add away matches
  for (const m of awayMatches) {
    const tot = parseTotalScore(m);
    if (tot !== null) totals.push(tot);
  }

  let home_avg_first_half_points = null;
  let away_avg_first_half_points = null;
  let h2h_avg_first_half_points = null;
  let home_avg_first_quarter_points = null;
  let away_avg_first_quarter_points = null;

  if (sport === 'basketball') {
    // Local utility to normalize tournament strings into clean league keys
    const getLeagueKeyLocal = (t) => {
      if (!t) return '';
      return t.toLowerCase()
              .replace(/match en direct/g, '')
              .replace(/\(live score en direct\)/g, '')
              .replace(/[^a-z0-9]/g, '');
    };

    let leagueFGA = 70;
    let leagueEFF = 1.15;

    const primaryKey = getLeagueKeyLocal(row.tournament);
    const baselines = (basketballLeagueAverages && Object.keys(basketballLeagueAverages).length > 0)
      ? basketballLeagueAverages
      : basketballLeagueAveragesCache;

    if (primaryKey && baselines) {
      const matchedKey = Object.keys(baselines).find(k => k.includes(primaryKey) || primaryKey.includes(k));
      if (matchedKey) {
        leagueFGA = baselines[matchedKey].avgFGA || 70;
        leagueEFF = baselines[matchedKey].avgEFF || 1.15;
      }
    }

    const parseStats = (m) => {
      let homeFGA = leagueFGA;
      let awayFGA = leagueFGA;
      if (m.statistics_json) {
        try {
          const stats = typeof m.statistics_json === 'string' ? JSON.parse(m.statistics_json) : m.statistics_json;
          if (stats && stats.field_goals_attempted) {
            if (stats.field_goals_attempted.home !== undefined) homeFGA = parseFloat(stats.field_goals_attempted.home) || leagueFGA;
            if (stats.field_goals_attempted.away !== undefined) awayFGA = parseFloat(stats.field_goals_attempted.away) || leagueFGA;
          }
        } catch (e) {}
      }
      return { homeFGA, awayFGA };
    };

    const getMatchScores = (m) => {
      let homeScore = 0;
      let awayScore = 0;
      if (m.score) {
        const match = m.score.match(/(\d+)\s*-\s*(\d+)/);
        if (match) {
          homeScore = parseFloat(match[1]) || 0;
          awayScore = parseFloat(match[2]) || 0;
        }
      }
      return { homeScore, awayScore };
    };

    const getOpponentBaselines = (oppName, leagueFGA, leagueEFF) => {
      const oppMatches = (allTeamMatchesMap && allTeamMatchesMap.get(oppName)) || [];
      const recentMatches = oppMatches.slice(0, 10);
      let fgaSum = 0;
      let offPointsSum = 0;
      let defPointsSum = 0;
      let oppFgaSum = 0;
      let sumWeights = 0;
      let validMatches = 0;

      recentMatches.forEach((m, index) => {
        const { homeFGA, awayFGA } = parseStats(m);
        const { homeScore, awayScore } = getMatchScores(m);
        if (homeScore === 0 && awayScore === 0) return;

        validMatches++;
        const weight = Math.pow(0.9, index);

        if (m.home_team === oppName) {
          fgaSum += homeFGA * weight;
          offPointsSum += homeScore * weight;
          defPointsSum += awayScore * weight;
          oppFgaSum += awayFGA * weight;
        } else {
          fgaSum += awayFGA * weight;
          offPointsSum += awayScore * weight;
          defPointsSum += homeScore * weight;
          oppFgaSum += homeFGA * weight;
        }
        sumWeights += weight;
      });

      const pace = validMatches > 0 ? (fgaSum / sumWeights) : leagueFGA;
      const offEff = fgaSum > 0 ? (offPointsSum / fgaSum) : leagueEFF;
      const defEff = oppFgaSum > 0 ? (defPointsSum / oppFgaSum) : leagueEFF;

      return { pace, offEff, defEff };
    };

    const getTeamStats = (matches, teamName) => {
      let fgaSum = 0;
      let offPointsSum = 0;
      let defPointsSum = 0;
      let oppFgaSum = 0;
      let sumWeights = 0;
      let validMatches = 0;

      matches.forEach((m, index) => {
        const { homeFGA, awayFGA } = parseStats(m);
        const { homeScore, awayScore } = getMatchScores(m);
        if (homeScore === 0 && awayScore === 0) return;

        validMatches++;
        // Exponential time decay weight (most recent match weight = 1.0, then 0.9, 0.81, ...)
        const weight = Math.pow(0.9, index);

        const oppName = m.home_team === teamName ? m.away_team : m.home_team;
        const oppBaselines = getOpponentBaselines(oppName, leagueFGA, leagueEFF);

        if (m.home_team === teamName) {
          fgaSum += homeFGA * weight;
          oppFgaSum += awayFGA * weight;

          const offScale = Math.max(0.5, Math.min(2.0, oppBaselines.defEff / leagueEFF));
          const defScale = Math.max(0.5, Math.min(2.0, oppBaselines.offEff / leagueEFF));

          offPointsSum += (homeScore / offScale) * weight;
          defPointsSum += (awayScore / defScale) * weight;
        } else {
          fgaSum += awayFGA * weight;
          oppFgaSum += homeFGA * weight;

          const offScale = Math.max(0.5, Math.min(2.0, oppBaselines.defEff / leagueEFF));
          const defScale = Math.max(0.5, Math.min(2.0, oppBaselines.offEff / leagueEFF));

          offPointsSum += (awayScore / offScale) * weight;
          defPointsSum += (homeScore / defScale) * weight;
        }
        sumWeights += weight;
      });

      const avgFGA = validMatches > 0 ? (fgaSum / sumWeights) : leagueFGA;
      const avgOffEff = fgaSum > 0 ? (offPointsSum / fgaSum) : leagueEFF;
      const avgDefEff = oppFgaSum > 0 ? (defPointsSum / oppFgaSum) : leagueEFF;

      return { avgFGA, avgOffEff, avgDefEff };
    };

    const homeStats = getTeamStats(homeMatches, row.home_team);
    const awayStats = getTeamStats(awayMatches, row.away_team);

    // Apply Home Court Advantage (HCA):
    // Home team plays 1% faster at home, away team plays 1% slower on road.
    const expectedPaceFull = ((homeStats.avgFGA * 1.01) + (awayStats.avgFGA * 0.99)) / 2;
    const expectedPace1stHalf = expectedPaceFull * 0.502;

    // Home team's offensive rating is +2.5% at home, away team's is -2.5% on road.
    // Home team's defensive rating is -2.5% (better defense), away team's is +2.5% (weaker defense).
    const expectedEffHome = (homeStats.avgOffEff * 1.025) * ((awayStats.avgDefEff * 1.025) / leagueEFF);
    const expectedEffAway = (awayStats.avgOffEff * 0.975) * ((homeStats.avgDefEff * 0.975) / leagueEFF);

    let home_proj_1mt = expectedPace1stHalf * expectedEffHome;
    let away_proj_1mt = expectedPace1stHalf * expectedEffAway;

    if (useGbdtModels && modelBasket1MT) {
      const X1MT = {
        home_projected: home_proj_1mt,
        away_projected: away_proj_1mt,
        sum_projected: home_proj_1mt + away_proj_1mt
      };
      const gbdt1MTExpected = modelBasket1MT.predictRow(X1MT);
      const splitRatio = home_proj_1mt / (home_proj_1mt + away_proj_1mt || 1);
      home_avg_first_half_points = gbdt1MTExpected * splitRatio;
      away_avg_first_half_points = gbdt1MTExpected * (1 - splitRatio);
    } else {
      home_avg_first_half_points = home_proj_1mt;
      away_avg_first_half_points = away_proj_1mt;
    }

    const expectedPace1stQuarter = expectedPaceFull * 0.254;
    let home_proj_1qt = expectedPace1stQuarter * expectedEffHome;
    let away_proj_1qt = expectedPace1stQuarter * expectedEffAway;
    home_avg_first_quarter_points = home_proj_1qt;
    away_avg_first_quarter_points = away_proj_1qt;

    if (useGbdtModels && modelBasket1QT) {
      const X1QT = {
        home_projected: home_proj_1qt,
        away_projected: away_proj_1qt,
        sum_projected: home_proj_1qt + away_proj_1qt
      };
      const gbdt1QTExpected = modelBasket1QT.predictRow(X1QT);
      const splitRatioQT = home_proj_1qt / (home_proj_1qt + away_proj_1qt || 1);
      home_avg_first_quarter_points = gbdt1QTExpected * splitRatioQT;
      away_avg_first_quarter_points = gbdt1QTExpected * (1 - splitRatioQT);
    }

    let h2hSum = 0;
    let h2hCount = 0;
    for (const m of h2hMatches) {
      let firstHalfTotal = null;
      try {
        if (m.statistics_json) {
          const stats = typeof m.statistics_json === 'string' ? JSON.parse(m.statistics_json) : m.statistics_json;
          if (stats && stats.first_half_points && stats.first_half_points.home !== undefined && stats.first_half_points.away !== undefined) {
            firstHalfTotal = parseFloat(stats.first_half_points.home) + parseFloat(stats.first_half_points.away);
          }
        }
      } catch (e) {}
      if (firstHalfTotal === null && m.score) {
        const match = m.score.match(/(\d+)\s*-\s*(\d+)/);
        if (match) {
          firstHalfTotal = (parseFloat(match[1]) + parseFloat(match[2])) * 0.5;
        }
      }
      if (firstHalfTotal !== null) {
        h2hSum += firstHalfTotal;
        h2hCount++;
      }
    }
    h2h_avg_first_half_points = h2hCount > 0 ? (h2hSum / h2hCount) : (home_avg_first_half_points + away_avg_first_half_points);
  }

  let avgTotal = defaultLine;
  if (sport === 'basketball') {
    avgTotal = home_avg_first_half_points + away_avg_first_half_points;
  } else if (totals.length > 0) {
    const sum = totals.reduce((a, b) => a + b, 0);
    avgTotal = sum / totals.length;
  }
  
  // Line is average rounded to nearest .5
  let calculatedLine = Math.floor(avgTotal) + 0.5;
  
  // For sets, it's typically 2.5 or 3.5. Force 2.5 for tennis/volleyball sets.
  if (sport === 'tennis' || sport === 'volleyball' || sport === 'table-tennis' || sport === 'badminton') {
    calculatedLine = 2.5;
  }
  
  // Calculate percentage of matches over this line
  let overCount = 0;
  let validCount = 0;
  for (const tot of totals) {
    validCount++;
    if (tot > calculatedLine) {
      overCount++;
    }
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
    // Seed fallback probability dynamically based on team name sum
    const hashSeed = cleanHomeTeamKey + cleanAwayTeamKey;
    let charSum = 0;
    for (let i = 0; i < hashSeed.length; i++) charSum += hashSeed.charCodeAt(i);
    probVal = 52 + (charSum % 15);
    bestTip = probVal % 2 === 0 ? "Plus de" : "Moins de";
  }
  
  // Ensure probability is in a realistic range (e.g. 50% - 85%) before calibration
  probVal = Math.max(50, Math.min(85, probVal));
  
  // Apply calibration delta
  let calibratedProb = probVal + (calibrationDelta * 100);
  probVal = Math.max(50, Math.min(95, Math.round(calibratedProb)));
  
  const labelMapping = {
    basketball: 'Points 1ère MT',
    tennis: 'Sets',
    volleyball: 'Sets',
    handball: 'Buts',
    rugby: 'Points',
    'rugby-union': 'Points',
    'rugby-league': 'Points',
    hockey: 'Buts',
    'ice-hockey': 'Buts',
    baseball: 'Runs',
    'american-football': 'Points',
    'table-tennis': 'Sets',
    badminton: 'Sets',
    cricket: 'Runs',
    darts: 'Sets',
    snooker: 'Frames',
    futsal: 'Buts'
  };
  const unitLabel = labelMapping[sport] || 'Points';
  
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
    home_avg_first_half_points: home_avg_first_half_points,
    away_avg_first_half_points: away_avg_first_half_points,
    h2h_avg_first_half_points: h2h_avg_first_half_points,
    home_avg_first_quarter_points: home_avg_first_quarter_points,
    away_avg_first_quarter_points: away_avg_first_quarter_points,
    covariance_basket_1mt: covarianceBasket1MT,
    covariance_basket_1qt: covarianceBasket1QT,
    odds_corners: [],
    scraped_at: row.scraped_at
  };
}
