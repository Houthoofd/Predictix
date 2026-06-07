import { getCronLogs, scheduleMatchReScraping } from '../src/services/cronService.js';

console.log('--- Testing Cron Logs Buffer ---');
console.log('Initial logs in buffer:', getCronLogs());

console.log('Scheduling a dummy match re-scrape to generate a log line...');
// We can schedule a dummy match with ID 999999, which will generate a log line
scheduleMatchReScraping(999999, '2026-06-07', '23:59', 'football');

const currentLogs = getCronLogs();
console.log('Current logs in buffer:', currentLogs);
if (currentLogs.length > 0 && currentLogs[0].includes('Scheduling re-scrape')) {
  console.log('✓ Cron log buffering works successfully!');
} else {
  console.error('✗ Cron log buffering failed to capture scheduling event.');
}
console.log('--- Test finished ---');
