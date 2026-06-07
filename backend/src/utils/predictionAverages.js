/**
 * Normalizes tournament strings into clean league keys
 */
export function getLeagueKey(t) {
  if (!t) return '';
  return t.toLowerCase()
          .replace(/match en direct/g, '')
          .replace(/\(live score en direct\)/g, '')
          .replace(/[^a-z0-9]/g, '');
}

/**
 * Dynamically learns league baselines from finished historical matches
 */
export function computeLeagueAverages(allHistoricalMatches) {
  const leagueGroups = {};
  for (const m of allHistoricalMatches) {
    let rawTour = m.tournament || '';
    if (m.home_team && rawTour.includes(m.home_team)) {
      const idx = rawTour.indexOf(m.home_team);
      rawTour = rawTour.substring(0, idx);
    }
    const key = getLeagueKey(rawTour);
    if (!key) continue;
    if (!leagueGroups[key]) {
      leagueGroups[key] = { homeSum: 0, homeCount: 0, awaySum: 0, awayCount: 0 };
    }
    if (m.first_half_corners_home !== null && m.first_half_corners_home !== undefined) {
      leagueGroups[key].homeSum += m.first_half_corners_home;
      leagueGroups[key].homeCount++;
    }
    if (m.first_half_corners_away !== null && m.first_half_corners_away !== undefined) {
      leagueGroups[key].awaySum += m.first_half_corners_away;
      leagueGroups[key].awayCount++;
    }
  }

  const leagueAverages = {};
  for (const key in leagueGroups) {
    const g = leagueGroups[key];
    if (g.homeCount >= 5 && g.awayCount >= 5) {
      leagueAverages[key] = {
        home: parseFloat((g.homeSum / g.homeCount).toFixed(2)),
        away: parseFloat((g.awaySum / g.awayCount).toFixed(2))
      };
    }
  }
  return leagueAverages;
}

/**
 * Performs statistical shrinkage estimation (Mean Reversion) to regress home/away averages against league baselines
 */
export function calculateRegressedAverages(row, leagueAverages, homeAvg, awayAvg) {
  let defaultHome = 2.2;
  let defaultAway = 2.0;
  
  const primaryKey = getLeagueKey(row.tournament);
  if (primaryKey) {
    const matchedKey = Object.keys(leagueAverages).find(k => k.includes(primaryKey) || primaryKey.includes(k));
    if (matchedKey) {
      defaultHome = leagueAverages[matchedKey].home;
      defaultAway = leagueAverages[matchedKey].away;
    }
  }
  
  const teamWeight = 0.6;
  const homeRegressed = homeAvg !== null ? parseFloat((teamWeight * homeAvg + (1 - teamWeight) * defaultHome).toFixed(2)) : defaultHome;
  const awayRegressed = awayAvg !== null ? parseFloat((teamWeight * awayAvg + (1 - teamWeight) * defaultAway).toFixed(2)) : defaultAway;
  
  return { homeRegressed, awayRegressed };
}
