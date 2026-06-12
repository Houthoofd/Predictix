import { spawn } from 'child_process';
import path from 'path';
import { GradientBoostingRegressor } from './gradientBoosting.js';
import { getLeagueKey, computeLeagueAverages } from './predictionAverages.js';

// Cache for trained GBDT models and covariances
export let model1MT = null;
export let model2MT = null;
export let modelFT = null;
export let modelBasket1MT = null;
export let modelBasket1QT = null;
export let teamAverages = null;
export let covariance1MT = 0.15; // default fallback
export let covariance2MT = 0.20; // default fallback
export let covarianceFT = 0.35; // default fallback
export let covarianceBasket1MT = 0.15;
export let covarianceBasket1QT = 0.20;
export let leagueAveragesCache = null;
export let basketballLeagueAveragesCache = {};
export let lastTrainTime = 0;
const TRAIN_COOLDOWN = 120000; // 2 minutes cooldown

/**
 * Train GBDT models on scraped predictions and update covariances
 */
export async function trainGBDTModels(dbQueryFn) {
  const now = Date.now();
  if (model1MT && now - lastTrainTime < TRAIN_COOLDOWN) {
    return;
  }
  lastTrainTime = now;

  try {
    const matches = await dbQueryFn(`
      SELECT home_team, away_team, tournament, first_half_corners_home, first_half_corners_away, statistics_json
      FROM scraped_predictions
      WHERE first_half_corners_home IS NOT NULL AND first_half_corners_away IS NOT NULL
    `);

    const basketMatches = await dbQueryFn(`
      SELECT home_team, away_team, tournament, score, date, statistics_json
      FROM scraped_predictions
      WHERE sport = 'basketball' AND is_finished = 1 AND statistics_json IS NOT NULL
      ORDER BY date ASC, time ASC
    `);

    if (matches.length < 10) {
      console.log("[GBDT Train] Not enough data to train models");
      return;
    }

    teamAverages = {};
    for (const m of matches) {
      const home = m.home_team;
      const away = m.away_team;
      
      if (!teamAverages[home]) teamAverages[home] = { sum1MT: 0, count1MT: 0, sumFT: 0, countFT: 0 };
      if (!teamAverages[away]) teamAverages[away] = { sum1MT: 0, count1MT: 0, sumFT: 0, countFT: 0 };

      teamAverages[home].sum1MT += m.first_half_corners_home;
      teamAverages[home].count1MT++;
      teamAverages[away].sum1MT += m.first_half_corners_away;
      teamAverages[away].count1MT++;

      try {
        if (m.statistics_json) {
          const stats = JSON.parse(m.statistics_json);
          if (stats && stats.corners) {
            teamAverages[home].sumFT += parseFloat(stats.corners.home || 0);
            teamAverages[home].countFT++;
            teamAverages[away].sumFT += parseFloat(stats.corners.away || 0);
            teamAverages[away].countFT++;
          }
        }
      } catch (e) {}
    }

    leagueAveragesCache = computeLeagueAverages(matches);

    // Calculate basketball league averages dynamically
    basketballLeagueAveragesCache = {};
    const basketGroups = {};
    for (const m of basketMatches) {
      let rawTour = m.tournament || '';
      if (m.home_team && rawTour.includes(m.home_team)) {
        const idx = rawTour.indexOf(m.home_team);
        rawTour = rawTour.substring(0, idx);
      }
      const key = getLeagueKey(rawTour);
      if (!key) continue;

      let stats = null;
      try {
        stats = typeof m.statistics_json === 'string' ? JSON.parse(m.statistics_json) : m.statistics_json;
      } catch (e) {}

      if (stats && stats.field_goals_attempted && stats.field_goals_attempted.home !== undefined && stats.field_goals_attempted.away !== undefined) {
        const homeFGA = parseFloat(stats.field_goals_attempted.home) || 0;
        const awayFGA = parseFloat(stats.field_goals_attempted.away) || 0;
        if (homeFGA > 0 && awayFGA > 0) {
          if (!basketGroups[key]) {
            basketGroups[key] = { fgaSum: 0, pointsSum: 0, count: 0 };
          }
          let homeScore = 0;
          let awayScore = 0;
          if (m.score) {
            const match = m.score.match(/(\d+)\s*-\s*(\d+)/);
            if (match) {
              homeScore = parseFloat(match[1]) || 0;
              awayScore = parseFloat(match[2]) || 0;
            }
          }
          basketGroups[key].fgaSum += (homeFGA + awayFGA);
          basketGroups[key].pointsSum += (homeScore + awayScore);
          basketGroups[key].count += 2;
        }
      }
    }

    for (const key in basketGroups) {
      const g = basketGroups[key];
      if (g.count >= 6) {
        basketballLeagueAveragesCache[key] = {
          avgFGA: parseFloat((g.fgaSum / g.count).toFixed(2)),
          avgEFF: parseFloat((g.pointsSum / g.fgaSum).toFixed(4))
        };
      }
    }

    const trainingInput = {
      samples_1mt: [],
      samples_ft: [],
      samples_2mt: [],
      samples_basket_1mt: [],
      samples_basket_1qt: [],
      cov_data_1mt: { home: [], away: [] },
      cov_data_ft: { home: [], away: [] },
      cov_data_2mt: { home: [], away: [] },
      cov_data_basket_1mt: { home: [], away: [] },
      cov_data_basket_1qt: { home: [], away: [] }
    };

    // Populate corners training samples (football)
    for (const m of matches) {
      const home = m.home_team;
      const away = m.away_team;
      
      const homeAvg1MT = teamAverages[home]?.count1MT > 0 ? (teamAverages[home].sum1MT / teamAverages[home].count1MT) : 2.2;
      const awayAvg1MT = teamAverages[away]?.count1MT > 0 ? (teamAverages[away].sum1MT / teamAverages[away].count1MT) : 2.0;

      const homeAvgFT = teamAverages[home]?.countFT > 0 ? (teamAverages[home].sumFT / teamAverages[home].countFT) : 4.8;
      const awayAvgFT = teamAverages[away]?.countFT > 0 ? (teamAverages[away].sumFT / teamAverages[away].countFT) : 4.4;

      const leagueKey = getLeagueKey(m.tournament);
      const league1MTHome = leagueAveragesCache[leagueKey]?.home || 2.2;
      const league1MTAway = leagueAveragesCache[leagueKey]?.away || 2.0;

      const features1MT = {
        home_avg: homeAvg1MT,
        away_avg: awayAvg1MT,
        league_home: league1MTHome,
        league_away: league1MTAway,
        sum_avg: homeAvg1MT + awayAvg1MT
      };

      trainingInput.samples_1mt.push({
        features: features1MT,
        target: m.first_half_corners_home + m.first_half_corners_away
      });
      trainingInput.cov_data_1mt.home.push(m.first_half_corners_home);
      trainingInput.cov_data_1mt.away.push(m.first_half_corners_away);

      try {
        if (m.statistics_json) {
          const stats = JSON.parse(m.statistics_json);
          if (stats && stats.corners) {
            const ftHome = parseFloat(stats.corners.home || 0);
            const ftAway = parseFloat(stats.corners.away || 0);
            const ftTotal = ftHome + ftAway;
            const shHome = Math.max(0, ftHome - m.first_half_corners_home);
            const shAway = Math.max(0, ftAway - m.first_half_corners_away);
            const shTotal = shHome + shAway;

            const featuresFT = {
              home_avg_1mt: homeAvg1MT,
              away_avg_1mt: awayAvg1MT,
              home_avg_ft: homeAvgFT,
              away_avg_ft: awayAvgFT,
              league_home: league1MTHome,
              league_away: league1MTAway,
              sum_avg: homeAvgFT + awayAvgFT
            };

            trainingInput.samples_ft.push({
              features: featuresFT,
              target: ftTotal
            });
            trainingInput.cov_data_ft.home.push(ftHome);
            trainingInput.cov_data_ft.away.push(ftAway);

            trainingInput.samples_2mt.push({
              features: featuresFT,
              target: shTotal
            });
            trainingInput.cov_data_2mt.home.push(shHome);
            trainingInput.cov_data_2mt.away.push(shAway);
          }
        }
      } catch (e) {}
    }

    // Populate basketball training samples (running stats to avoid data leakage)
    const getLeagueKeyLocal = (t) => {
      if (!t) return '';
      return t.toLowerCase()
              .replace(/match en direct/g, '')
              .replace(/\(live score en direct\)/g, '')
              .replace(/[^a-z0-9]/g, '');
    };

    const getTeamStats = (history, teamName, leagueFGA, leagueEFF) => {
      let fgaSum = 0;
      let offPointsSum = 0;
      let defPointsSum = 0;
      let oppFgaSum = 0;
      let sumWeights = 0;
      let validMatches = 0;

      const recentMatches = history.slice(-10).reverse();

      recentMatches.forEach((histMatch, index) => {
        let stats = null;
        try {
          stats = typeof histMatch.statistics_json === 'string' ? JSON.parse(histMatch.statistics_json) : histMatch.statistics_json;
        } catch (e) {}

        let homeFGA = leagueFGA;
        let awayFGA = leagueFGA;
        if (stats && stats.field_goals_attempted) {
          if (stats.field_goals_attempted.home !== undefined) homeFGA = parseFloat(stats.field_goals_attempted.home) || leagueFGA;
          if (stats.field_goals_attempted.away !== undefined) awayFGA = parseFloat(stats.field_goals_attempted.away) || leagueFGA;
        }

        let homeScore = 0;
        let awayScore = 0;
        if (histMatch.score) {
          const match = histMatch.score.match(/(\d+)\s*-\s*(\d+)/);
          if (match) {
            homeScore = parseFloat(match[1]) || 0;
            awayScore = parseFloat(match[2]) || 0;
          }
        }
        if (homeScore === 0 && awayScore === 0) return;

        validMatches++;
        const weight = Math.pow(0.9, index);

        if (histMatch.home_team === teamName) {
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

      const avgFGA = validMatches > 0 ? (fgaSum / sumWeights) : leagueFGA;
      const avgOffEff = fgaSum > 0 ? (offPointsSum / fgaSum) : leagueEFF;
      const avgDefEff = oppFgaSum > 0 ? (defPointsSum / oppFgaSum) : leagueEFF;

      return { avgFGA, avgOffEff, avgDefEff };
    };

    const teamHistories = {};
    for (const m of basketMatches) {
      const homeHistory = teamHistories[m.home_team] || [];
      const awayHistory = teamHistories[m.away_team] || [];

      let leagueFGA = 70;
      let leagueEFF = 1.15;
      const primaryKey = getLeagueKeyLocal(m.tournament);
      if (primaryKey) {
        const matchedKey = Object.keys(basketballLeagueAveragesCache).find(k => k.includes(primaryKey) || primaryKey.includes(k));
        if (matchedKey) {
          leagueFGA = basketballLeagueAveragesCache[matchedKey].avgFGA || 70;
          leagueEFF = basketballLeagueAveragesCache[matchedKey].avgEFF || 1.15;
        }
      }

      const homeStats = getTeamStats(homeHistory, m.home_team, leagueFGA, leagueEFF);
      const awayStats = getTeamStats(awayHistory, m.away_team, leagueFGA, leagueEFF);

      const expectedPaceFull = ((homeStats.avgFGA * 1.01) + (awayStats.avgFGA * 0.99)) / 2;
      const expectedEffHome = (homeStats.avgOffEff * 1.025) * ((awayStats.avgDefEff * 1.025) / leagueEFF);
      const expectedEffAway = (awayStats.avgOffEff * 0.975) * ((homeStats.avgDefEff * 0.975) / leagueEFF);

      const expectedPace1stHalf = expectedPaceFull * 0.502;
      const home_proj_1mt = expectedPace1stHalf * expectedEffHome;
      const away_proj_1mt = expectedPace1stHalf * expectedEffAway;

      const expectedPace1stQuarter = expectedPaceFull * 0.254;
      const home_proj_1qt = expectedPace1stQuarter * expectedEffHome;
      const away_proj_1qt = expectedPace1stQuarter * expectedEffAway;

      let stats = null;
      try {
        stats = typeof m.statistics_json === 'string' ? JSON.parse(m.statistics_json) : m.statistics_json;
      } catch (e) {}

      let actual1MTHome = null;
      let actual1MTAway = null;
      if (stats && stats.first_half_points && stats.first_half_points.home !== undefined) {
        actual1MTHome = parseFloat(stats.first_half_points.home);
        actual1MTAway = parseFloat(stats.first_half_points.away);
      } else if (m.score) {
        const match = m.score.match(/(\d+)\s*-\s*(\d+)/);
        if (match) {
          actual1MTHome = parseFloat(match[1]) * 0.49;
          actual1MTAway = parseFloat(match[2]) * 0.49;
        }
      }

      let actual1QTHome = null;
      let actual1QTAway = null;
      if (stats && stats.first_quarter_points && stats.first_quarter_points.home !== undefined) {
        actual1QTHome = parseFloat(stats.first_quarter_points.home);
        actual1QTAway = parseFloat(stats.first_quarter_points.away);
      } else if (actual1MTHome !== null) {
        actual1QTHome = actual1MTHome * 0.506;
        actual1QTAway = actual1MTAway * 0.506;
      }

      if (actual1MTHome !== null && actual1MTAway !== null) {
        trainingInput.samples_basket_1mt.push({
          features: {
            home_projected: home_proj_1mt,
            away_projected: away_proj_1mt,
            sum_projected: home_proj_1mt + away_proj_1mt
          },
          target: actual1MTHome + actual1MTAway
        });
        trainingInput.cov_data_basket_1mt.home.push(actual1MTHome);
        trainingInput.cov_data_basket_1mt.away.push(actual1MTAway);
      }

      if (actual1QTHome !== null && actual1QTAway !== null) {
        trainingInput.samples_basket_1qt.push({
          features: {
            home_projected: home_proj_1qt,
            away_projected: away_proj_1qt,
            sum_projected: home_proj_1qt + away_proj_1qt
          },
          target: actual1QTHome + actual1QTAway
        });
        trainingInput.cov_data_basket_1qt.home.push(actual1QTHome);
        trainingInput.cov_data_basket_1qt.away.push(actual1QTAway);
      }

      if (!teamHistories[m.home_team]) teamHistories[m.home_team] = [];
      teamHistories[m.home_team].push(m);
      if (!teamHistories[m.away_team]) teamHistories[m.away_team] = [];
      teamHistories[m.away_team].push(m);
    }

    const isWindows = process.platform === 'win32';
    const exeName = isWindows ? 'predictix-crawler.exe' : 'predictix-crawler';
    const scraperPath = process.env.SCRAPER_PATH || 'E:\\Developpement\\scrapper-v3';
    const exePath = path.join(scraperPath, 'cmd', 'predictix-crawler', exeName);

    console.log(`[GBDT Train Go] Spawning GBDT training: ${exePath}`);
    const outputJSON = await new Promise((resolve, reject) => {
      const child = spawn(exePath, ['-action', 'train']);
      let stdoutData = '';
      let stderrData = '';

      child.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`GBDT training Go process exited with code ${code}. Stderr: ${stderrData}`));
        }
        resolve(stdoutData);
      });

      child.on('error', (err) => {
        reject(err);
      });

      child.stdin.write(JSON.stringify(trainingInput));
      child.stdin.end();
    });

    const result = JSON.parse(outputJSON);

    model1MT = new GradientBoostingRegressor({ nEstimators: 15, maxDepth: 3, learningRate: 0.1 });
    model1MT.load(result.model_1mt);

    if (result.model_ft) {
      modelFT = new GradientBoostingRegressor({ nEstimators: 15, maxDepth: 3, learningRate: 0.1 });
      modelFT.load(result.model_ft);
    } else {
      modelFT = null;
    }

    if (result.model_2mt) {
      model2MT = new GradientBoostingRegressor({ nEstimators: 15, maxDepth: 3, learningRate: 0.1 });
      model2MT.load(result.model_2mt);
    } else {
      model2MT = null;
    }

    if (result.model_basket_1mt) {
      modelBasket1MT = new GradientBoostingRegressor({ nEstimators: 15, maxDepth: 3, learningRate: 0.1 });
      modelBasket1MT.load(result.model_basket_1mt);
    } else {
      modelBasket1MT = null;
    }

    if (result.model_basket_1qt) {
      modelBasket1QT = new GradientBoostingRegressor({ nEstimators: 15, maxDepth: 3, learningRate: 0.1 });
      modelBasket1QT.load(result.model_basket_1qt);
    } else {
      modelBasket1QT = null;
    }

    covariance1MT = result.covariance_1mt;
    covarianceFT = result.covariance_ft;
    covariance2MT = result.covariance_2mt;
    covarianceBasket1MT = result.covariance_basket_1mt;
    covarianceBasket1QT = result.covariance_basket_1qt;

    console.log(`[GBDT & Bivariate Poisson] Models trained successfully in Go. 1MT cov: ${covariance1MT.toFixed(3)}, FT cov: ${covarianceFT.toFixed(3)}, Basket 1MT cov: ${covarianceBasket1MT.toFixed(3)}`);
  } catch (error) {
    console.error("[GBDT Train] Error training GBDT models:", error);
  }
}
