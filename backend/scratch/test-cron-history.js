import { dbQuery, dbRun } from '../src/db/database.js';

async function runTest() {
  console.log('--- Testing Cron History Database Seeding ---');
  
  // Clear any previous mock items to start fresh
  console.log('Clearing old mock entries from cron_history...');
  await dbRun("DELETE FROM cron_history WHERE match_id LIKE 'mock_%'");

  console.log('Seeding mock entries into cron_history...');
  await dbRun(
    'INSERT INTO cron_history (match_id, home_team, away_team, sport, status, retries, score) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ['mock_1', 'PSG', 'Marseille', 'football', 'SUCCESS', 0, '3-1']
  );
  await dbRun(
    'INSERT INTO cron_history (match_id, home_team, away_team, sport, status, retries, error_message) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ['mock_2', 'Lakers', 'Celtics', 'basketball', 'FAILED', 5, 'Max retries reached']
  );
  await dbRun(
    'INSERT INTO cron_history (match_id, home_team, away_team, sport, status, retries, score) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ['mock_3', 'Nadal', 'Federer', 'tennis', 'SUCCESS', 1, '2-1']
  );

  console.log('Querying seeded cron history...');
  const history = await dbQuery("SELECT * FROM cron_history WHERE match_id LIKE 'mock_%' ORDER BY completed_at DESC");
  console.log('History entries retrieved:', history);

  if (history.length === 3) {
    console.log('✓ Cron history database table seeding and queries work successfully!');
  } else {
    console.error('✗ Cron history database test failed. Expected 3 entries, got:', history.length);
  }

  // Clean up
  console.log('Cleaning up mock entries from database...');
  await dbRun("DELETE FROM cron_history WHERE match_id LIKE 'mock_%'");

  console.log('--- Test finished ---');
}

runTest().catch(console.error);
