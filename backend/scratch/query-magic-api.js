import { evaluateMagicSignals } from '../src/utils/magicSignalsEvaluator.js';

async function query() {
  console.log("Simulating API response for /api/predictions/magic...");
  try {
    const signals = await evaluateMagicSignals(50.0);
    const torontoSkySignal = signals.find(s => s.match_id === 'x4oCT0Xa');
    
    if (torontoSkySignal) {
      console.log("\nToronto vs Chicago Signal Details:");
      console.log(JSON.stringify(torontoSkySignal, null, 2));
    } else {
      console.log("\nNo signal found for Toronto Tempo vs Chicago Sky match.");
    }
  } catch (err) {
    console.error("Error simulating API:", err);
  }
  process.exit(0);
}

setTimeout(query, 1000);
