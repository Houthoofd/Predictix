import { dbRun, dbGet, dbQuery } from '../src/db/database.js';

async function test() {
  console.log("Starting test-db-archive.js...");

  // 1. Insert dummy records
  const id1 = 'archive-test-match-1';
  const id2 = 'archive-test-match-2';
  const id3 = 'archive-test-match-3'; // Recent finished match, should NOT be pruned

  // Clean first
  await dbRun("DELETE FROM scraped_predictions WHERE match_id IN (?, ?, ?)", [id1, id2, id3]);

  // Insert historical match (is_historical = 1)
  await dbRun(`
    INSERT INTO scraped_predictions (match_id, date, home_team, away_team, is_historical, is_finished, statistics_json, historical_links)
    VALUES (?, '2026-06-01', 'Team A', 'Team B', 1, 1, '{"stats": true}', '["link1"]')
  `, [id1]);

  // Insert old finished match (is_finished = 1, date > 30 days ago)
  await dbRun(`
    INSERT INTO scraped_predictions (match_id, date, home_team, away_team, is_historical, is_finished, statistics_json, historical_links)
    VALUES (?, '2026-04-01', 'Team C', 'Team D', 0, 1, '{"stats": true}', '["link2"]')
  `, [id2]);

  // Insert recent finished match (is_finished = 1, date = today)
  const todayStr = new Date().toISOString().substring(0, 10);
  await dbRun(`
    INSERT INTO scraped_predictions (match_id, date, home_team, away_team, is_historical, is_finished, statistics_json, historical_links)
    VALUES (?, ?, 'Team E', 'Team F', 0, 1, '{"stats": true}', '["link3"]')
  `, [id3, todayStr]);

  console.log("Successfully inserted mock predictions for archiving.");

  // Verify initial state
  const m1_before = await dbGet("SELECT statistics_json, historical_links FROM scraped_predictions WHERE match_id = ?", [id1]);
  const m2_before = await dbGet("SELECT statistics_json, historical_links FROM scraped_predictions WHERE match_id = ?", [id2]);
  const m3_before = await dbGet("SELECT statistics_json, historical_links FROM scraped_predictions WHERE match_id = ?", [id3]);

  console.log("Before archiving:", { m1: m1_before, m2: m2_before, m3: m3_before });

  if (!m1_before.statistics_json || !m2_before.statistics_json || !m3_before.statistics_json) {
    console.error("✗ Failure: Mock records were not correctly inserted with payloads!");
    process.exit(1);
  }

  // 2. Perform the archiving/pruning SQL updates
  console.log("Running pruning SQL commands...");
  await dbRun("UPDATE scraped_predictions SET statistics_json = NULL, historical_links = NULL WHERE is_historical = 1 AND (statistics_json IS NOT NULL OR historical_links IS NOT NULL)");
  await dbRun("UPDATE scraped_predictions SET statistics_json = NULL, historical_links = NULL WHERE is_finished = 1 AND date < date('now', '-30 days') AND (statistics_json IS NOT NULL OR historical_links IS NOT NULL)");

  // 3. Verify final state
  const m1_after = await dbGet("SELECT statistics_json, historical_links FROM scraped_predictions WHERE match_id = ?", [id1]);
  const m2_after = await dbGet("SELECT statistics_json, historical_links FROM scraped_predictions WHERE match_id = ?", [id2]);
  const m3_after = await dbGet("SELECT statistics_json, historical_links FROM scraped_predictions WHERE match_id = ?", [id3]);

  console.log("After archiving:", { m1: m1_after, m2: m2_after, m3: m3_after });

  const success1 = (m1_after.statistics_json === null && m1_after.historical_links === null);
  const success2 = (m2_after.statistics_json === null && m2_after.historical_links === null);
  const success3 = (m3_after.statistics_json !== null && m3_after.historical_links !== null); // Should remain intact

  if (success1 && success2 && success3) {
    console.log("✓ Success! Pruning and archiving logic executed correctly.");
    
    // Clean up test records
    await dbRun("DELETE FROM scraped_predictions WHERE match_id IN (?, ?, ?)", [id1, id2, id3]);
    process.exit(0);
  } else {
    console.error("✗ Failure: Archiving logic did not prune the correct records!");
    process.exit(1);
  }
}

test().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
