import { scraperState } from '../src/controllers/scraperState.js';
import { saveIntegrityState, loadIntegrityState } from '../src/controllers/integrityStatePersist.js';
import integrityController from '../src/controllers/integrityController.js';

async function test() {
  console.log("Starting test-integrity-resume.js...");

  // 1. Simulate an interrupted active batch state
  const mockBatch = {
    status: 'running',
    queue: [
      { match_id: 'test-match-1', home_team: 'PSG', away_team: 'Marseille' },
      { match_id: 'test-match-2', home_team: 'Real Madrid', away_team: 'Barcelona' }
    ],
    currentIndex: 1, // Second match next
    processedCount: 1,
    successCount: 1,
    errorCount: 0,
    logs: ['[INFO] Initialized test batch', '[INFO] Processed PSG vs Marseille']
  };

  console.log("Saving mock active batch state to SQLite...");
  await saveIntegrityState(mockBatch);

  // Verify it was saved
  const saved = await loadIntegrityState();
  console.log("Saved state read from DB:", saved);

  if (!saved || saved.status !== 'running' || saved.queue.length !== 2) {
    console.error("✗ Failure: State was not correctly saved to database!");
    process.exit(1);
  }
  console.log("✓ State successfully saved and verified in DB.");

  // 2. Call restoreIntegrityBatch to trigger recovery
  console.log("Calling restoreIntegrityBatch()...");
  await integrityController.restoreIntegrityBatch();

  // 3. Since there might not be Tor active locally during this test, the loop will exit or try to bootstrap.
  // Wait a moment and check activeIntegrityBatch state.
  await new Promise(resolve => setTimeout(resolve, 1500));

  const batch = scraperState.activeIntegrityBatch;
  console.log("Active scraperState batch after restore:", {
    status: batch.status,
    currentIndex: batch.currentIndex,
    queueLength: batch.queue.length,
    logs: batch.logs
  });

  // Check if recovery log was added
  const recoveryLogFound = batch.logs.some(l => l.includes("Reprise automatique après redémarrage"));
  if (recoveryLogFound) {
    console.log("✓ Success! Recovery log found in batch logs.");
  } else {
    console.error("✗ Failure: Recovery log not found in batch logs.");
    process.exit(1);
  }

  console.log("✓ Success! Integrity resume test completed successfully.");
  process.exit(0);
}

test().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
