import { GradientBoostingRegressor } from './gradientBoosting.js';
import { getLeagueKey, computeLeagueAverages } from './predictionAverages.js';

// Cache for trained GBDT models and covariances
export let model1MT = null;
export let model2MT = null;
export let modelFT = null;
export let teamAverages = null;
export let covariance1MT = 0.15; // default fallback
export let covariance2MT = 0.20; // default fallback
export let covarianceFT = 0.35; // default fallback
export let leagueAveragesCache = null;
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

    let count1MT = 0;
    let countFT = 0;

    const homeVals1MT = [];
    const awayVals1MT = [];
    const homeValsFT = [];
    const awayValsFT = [];
    const homeVals2MT = [];
    const awayVals2MT = [];

    const X1MT = [];
    const y1MT = [];
    const X2MT = [];
    const y2MT = [];
    const XFT = [];
    const yFT = [];

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

      X1MT.push(features1MT);
      const sum1MT = m.first_half_corners_home + m.first_half_corners_away;
      y1MT.push(sum1MT);

      homeVals1MT.push(m.first_half_corners_home);
      awayVals1MT.push(m.first_half_corners_away);
      count1MT++;

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

            XFT.push(featuresFT);
            yFT.push(ftTotal);
            homeValsFT.push(ftHome);
            awayValsFT.push(ftAway);

            X2MT.push(featuresFT);
            y2MT.push(shTotal);
            homeVals2MT.push(shHome);
            awayVals2MT.push(shAway);

            countFT++;
          }
        }
      } catch (e) {}
    }

    model1MT = new GradientBoostingRegressor({ nEstimators: 15, maxDepth: 3, learningRate: 0.1 });
    model1MT.fit(X1MT, y1MT);

    if (XFT.length > 10) {
      modelFT = new GradientBoostingRegressor({ nEstimators: 15, maxDepth: 3, learningRate: 0.1 });
      modelFT.fit(XFT, yFT);

      model2MT = new GradientBoostingRegressor({ nEstimators: 15, maxDepth: 3, learningRate: 0.1 });
      model2MT.fit(X2MT, y2MT);
    }

    const calcCov = (homeArr, awayArr) => {
      const n = homeArr.length;
      if (n === 0) return 0.15;
      const mHome = homeArr.reduce((a, b) => a + b, 0) / n;
      const mAway = awayArr.reduce((a, b) => a + b, 0) / n;
      let prodSum = 0;
      for (let i = 0; i < n; i++) {
        prodSum += homeArr[i] * awayArr[i];
      }
      return Math.max(0.01, (prodSum / n) - (mHome * mAway));
    };

    covariance1MT = calcCov(homeVals1MT, awayVals1MT);
    if (countFT > 0) {
      covarianceFT = calcCov(homeValsFT, awayValsFT);
      covariance2MT = calcCov(homeVals2MT, awayVals2MT);
    }

    console.log(`[GBDT & Bivariate Poisson] Models trained successfully. 1MT cov: ${covariance1MT.toFixed(3)}, FT cov: ${covarianceFT.toFixed(3)}`);
  } catch (error) {
    console.error("[GBDT Train] Error training GBDT models:", error);
  }
}
