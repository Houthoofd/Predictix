import { dbQuery, dbGet } from '../src/db/database.js';
import { getEnrichedPredictions } from '../src/utils/predictionFetcher.js';
import { evaluateMagicSignals } from '../src/utils/magicSignalsEvaluator.js';

async function measure() {
  console.time('Total Setup');
  const totalPreds = await dbGet('SELECT COUNT(*) as count FROM scraped_predictions');
  const upcomingPreds = await dbGet('SELECT COUNT(*) as count FROM scraped_predictions WHERE is_historical = 0');
  const historicalPreds = await dbGet('SELECT COUNT(*) as count FROM scraped_predictions WHERE is_historical = 1');
  const finishedPreds = await dbGet('SELECT COUNT(*) as count FROM scraped_predictions WHERE is_finished = 1');
  const totalBets = await dbGet('SELECT COUNT(*) as count FROM bets');
  console.log('Database Statistics:');
  console.log(`- Total Predictions in DB: ${totalPreds.count}`);
  console.log(`- Upcoming (is_historical=0): ${upcomingPreds.count}`);
  console.log(`- Historical (is_historical=1): ${historicalPreds.count}`);
  console.log(`- Finished (is_finished=1): ${finishedPreds.count}`);
  console.log(`- Total Bets: ${totalBets.count}`);
  console.timeEnd('Total Setup');

  console.log('\n--- Measuring getEnrichedPredictions (range=all) ---');
  console.time('getEnrichedPredictions');
  try {
    const predictions = await getEnrichedPredictions({ dateRange: 'all' }, dbQuery);
    console.log(`Loaded ${predictions.length} enriched predictions.`);
  } catch (err) {
    console.error('Error in getEnrichedPredictions:', err);
  }
  console.timeEnd('getEnrichedPredictions');

  console.log('\n--- Measuring evaluateMagicSignals ---');
  console.time('evaluateMagicSignals');
  try {
    const signals = await evaluateMagicSignals(50.0);
    console.log(`Loaded ${signals.length} magic signals.`);
  } catch (err) {
    console.error('Error in evaluateMagicSignals:', err);
  }
  console.timeEnd('evaluateMagicSignals');
  
  process.exit(0);
}

// Wait 1 second to ensure DB connection is ready
setTimeout(measure, 1000);
