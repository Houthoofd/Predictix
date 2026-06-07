import { dbRun, dbGet, dbQuery } from '../src/db/database.js';
import { autoSettleBetsForMatch } from '../src/services/betsService.js';

async function runTest() {
  console.log('--- Testing 1X2 and Handicap Auto-Settle ---');

  const matchId = 'mock_basket_1';
  
  // 1. Clean up old entries
  await dbRun('DELETE FROM scraped_predictions WHERE match_id = ?', [matchId]);
  await dbRun('DELETE FROM bets WHERE match_id = ?', [matchId]);

  // 2. Insert mock finished basketball prediction (Score: 102 - 98)
  console.log('Inserting mock finished basketball prediction...');
  await dbRun(`
    INSERT INTO scraped_predictions (match_id, home_team, away_team, score, sport, is_finished, status, is_historical)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [matchId, 'MockHome', 'MockAway', '102 - 98', 'basketball', 1, 'Finished', 0]);

  // 3. Insert mock bets
  console.log('Inserting pending mock bets...');
  // Bet 1: Domicile (1X2) -> Expected: WON
  await dbRun(`
    INSERT INTO bets (match_id, date, time, league, home_team, away_team, best_tip, card_line, odds, stake, status, sport)
    VALUES (?, '2026-06-07', '12:00', 'MockLeague', 'MockHome', 'MockAway', '1', 0, 1.80, 10, 'PENDING', 'basketball')
  `, [matchId]);

  // Bet 2: Extérieur (1X2) -> Expected: LOST
  await dbRun(`
    INSERT INTO bets (match_id, date, time, league, home_team, away_team, best_tip, card_line, odds, stake, status, sport)
    VALUES (?, '2026-06-07', '12:00', 'MockLeague', 'MockHome', 'MockAway', '2', 0, 2.10, 10, 'PENDING', 'basketball')
  `, [matchId]);

  // Bet 3: Domicile Handicap -3.5 -> Expected: WON (102 - 3.5 = 98.5 > 98)
  await dbRun(`
    INSERT INTO bets (match_id, date, time, league, home_team, away_team, best_tip, card_line, odds, stake, status, sport)
    VALUES (?, '2026-06-07', '12:00', 'MockLeague', 'MockHome', 'MockAway', '1', -3.5, 1.90, 10, 'PENDING', 'basketball')
  `, [matchId]);

  // Bet 4: Domicile Handicap -4.5 -> Expected: LOST (102 - 4.5 = 97.5 < 98)
  await dbRun(`
    INSERT INTO bets (match_id, date, time, league, home_team, away_team, best_tip, card_line, odds, stake, status, sport)
    VALUES (?, '2026-06-07', '12:00', 'MockLeague', 'MockHome', 'MockAway', '1', -4.5, 1.90, 10, 'PENDING', 'basketball')
  `, [matchId]);

  // Bet 5: Total Over 198.5 -> Expected: WON (102 + 98 = 200 > 198.5)
  await dbRun(`
    INSERT INTO bets (match_id, date, time, league, home_team, away_team, best_tip, card_line, odds, stake, status, sport)
    VALUES (?, '2026-06-07', '12:00', 'MockLeague', 'MockHome', 'MockAway', 'over', 198.5, 1.90, 10, 'PENDING', 'basketball')
  `, [matchId]);

  // 4. Run autoSettleBetsForMatch
  console.log('Running autoSettleBetsForMatch...');
  const resolved = await autoSettleBetsForMatch(matchId);
  console.log(`Resolved ${resolved.length} bets.`);

  // 5. Query results and verify
  const bets = await dbQuery('SELECT best_tip, card_line, status FROM bets WHERE match_id = ? ORDER BY id ASC', [matchId]);
  
  const expected = [
    { tip: '1', line: 0, status: 'WON' },
    { tip: '2', line: 0, status: 'LOST' },
    { tip: '1', line: -3.5, status: 'WON' },
    { tip: '1', line: -4.5, status: 'LOST' },
    { tip: 'over', line: 198.5, status: 'WON' },
  ];

  let success = true;
  for (let i = 0; i < expected.length; i++) {
    const b = bets[i];
    const exp = expected[i];
    console.log(`Bet ${i+1} (${b.best_tip} | Line ${b.card_line}): Status = ${b.status} (Expected = ${exp.status})`);
    if (b.status !== exp.status) {
      success = false;
      console.error(`✗ Validation failed for Bet ${i+1}!`);
    }
  }

  if (success) {
    console.log('✓ All bets resolved with the correct status successfully!');
  } else {
    console.error('✗ Some bets resolved incorrectly.');
  }

  // 6. Clean up database
  console.log('Cleaning up mock data...');
  await dbRun('DELETE FROM scraped_predictions WHERE match_id = ?', [matchId]);
  await dbRun('DELETE FROM bets WHERE match_id = ?', [matchId]);

  console.log('--- Test finished ---');
}

runTest().catch(console.error);
