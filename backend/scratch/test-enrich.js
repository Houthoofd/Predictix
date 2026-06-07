import { dbQuery } from '../src/db/database.js';
import { getEnrichedPredictions } from '../src/utils/predictionEngine.js';

async function test() {
  try {
    const rows = await getEnrichedPredictions({ startDate: '2026-06-06', endDate: '2026-06-06' }, dbQuery);
    const spurs = rows.find(r => r.match_id === 'C0SkW6TO');
    if (!spurs) {
      console.log("Spurs match C0SkW6TO not found in daily predictions!");
      // Let's query it directly from db and enrich it
      const row = await dbQuery("SELECT * FROM scraped_predictions WHERE match_id = 'C0SkW6TO'");
      console.log("Direct row:", row);
      return;
    }
    
    console.log(`Enriched match: ${spurs.home_team} vs ${spurs.away_team}`);
    console.log(`recent_home_matches count: ${spurs.recent_home_matches.length}`);
    console.log(`recent_away_matches count: ${spurs.recent_away_matches.length}`);
    
    // Now let's calculate average goals
    // We will import getAverage from poissonUtils or mock it
    const getAverage = (matches, metric, isHomeOnly = false, isAwayOnly = false, homeTeam = '', awayTeam = '') => {
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
        }
      }
      return count > 0 ? parseFloat((sum / count).toFixed(1)) : null;
    };

    const hAvg = getAverage(spurs.recent_home_matches, 'goals', true, false, spurs.home_team, spurs.away_team);
    const aAvg = getAverage(spurs.recent_away_matches, 'goals', false, true, spurs.home_team, spurs.away_team);
    console.log(`Home average goals: ${hAvg}`);
    console.log(`Away average goals: ${aAvg}`);

  } catch (e) {
    console.error(e);
  }
}

test();
