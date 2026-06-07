import { evaluateMagicSignals } from '../src/utils/magicSignalsEvaluator.js';

async function check() {
  console.log("Running evaluateMagicSignals(50.0) to see if the match generates a signal...");
  try {
    const signals = await evaluateMagicSignals(50.0);
    console.log(`Generated ${signals.length} signals in total.`);
    
    let found = false;
    for (const s of signals) {
      const match = s.home_team.includes('Toronto') || s.away_team.includes('Toronto') ||
                    s.home_team.includes('Chicago') || s.away_team.includes('Chicago');
      if (match) {
        console.log(`[FOUND SIGNAL] -> Match ID: ${s.match_id} | ${s.date} ${s.time} | ${s.home_team} vs ${s.away_team} | Avg: ${s.avg_value} | Sport: ${s.sport}`);
        found = true;
      }
    }
    
    if (!found) {
      console.log("No signal found for Toronto or Chicago matches.");
    }
  } catch (err) {
    console.error("Error evaluating signals:", err);
  }
  process.exit(0);
}

setTimeout(check, 1000);
