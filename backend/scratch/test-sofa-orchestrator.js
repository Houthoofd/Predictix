import { tryResolveSofaStatsFallback } from '../src/utils/scraperHelpers.js';

async function run() {
  try {
    const dateStr = "2026-06-03";
    const home = "Junior";
    const away = "Atletico Nacional";
    
    console.log("Triggering tryResolveSofaStatsFallback...");
    const res = await tryResolveSofaStatsFallback(dateStr, home, away);
    console.log("Result of fallback:", JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("Failed test:", err);
  }
}

run();
