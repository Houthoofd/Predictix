import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbQuery, dbGet, dbRun, insertNotification } from '../db/database.js';
import { scrapeSingleMatch, getTorPortFromPool, isTorRouting, healTorPort } from '../utils/scraperHelpers.js';
import { updateKeepAwakeStatus, reevaluateKeepAwake } from '../utils/keepAwake.js';

const scheduledTimeouts = new Map();
const retryCounts = new Map();

let cronRetryIntervalLive = 10;
let cronRetryIntervalFail = 15;
let cronMaxRetries = 5;

export async function loadCronSettings() {
  try {
    const rows = await dbQuery('SELECT * FROM settings WHERE key IN ("cron_retry_interval_live", "cron_retry_interval_fail", "cron_max_retries")');
    for (const r of rows) {
      if (r.key === 'cron_retry_interval_live') cronRetryIntervalLive = parseInt(r.value) || 10;
      if (r.key === 'cron_retry_interval_fail') cronRetryIntervalFail = parseInt(r.value) || 15;
      if (r.key === 'cron_max_retries') cronMaxRetries = parseInt(r.value) || 5;
    }
  } catch (e) { console.error('[Predictix Cron] Failed to load settings:', e); }
}

const cronLogs = [];
export const getCronLogs = () => cronLogs;

const logCron = (msg, lvl = 'info') => {
  const f = `[${new Date().toLocaleTimeString('fr-FR')}] [${lvl.toUpperCase()}] ${msg}`;
  cronLogs.push(f);
  if (cronLogs.length > 100) cronLogs.shift();
  console[lvl === 'info' ? 'log' : lvl === 'warn' ? 'warn' : 'error'](f);
};

const SPORT_DURATIONS = { football: 120, basketball: 120, rugby: 120, handball: 90, volleyball: 120, tennis: 150, hockey: 150, 'ice-hockey': 150 };

export function getExpectedEndTime(dateStr, timeStr, sport) {
  if (!dateStr || !timeStr) return null;
  const timeMatch = timeStr.trim().match(/^(\d{2}):(\d{2})$/);
  if (!timeMatch) return null;
  const date = new Date(`${dateStr}T${timeMatch[1]}:${timeMatch[2]}:00`);
  if (isNaN(date.getTime())) return null;
  const duration = SPORT_DURATIONS[(sport || 'football').toLowerCase().trim()] || 150;
  date.setMinutes(date.getMinutes() + duration);
  return date;
}

function reschedule(matchId, minutes) {
  if (scheduledTimeouts.has(matchId)) clearTimeout(scheduledTimeouts.get(matchId));
  const retries = retryCounts.get(matchId) || 0;
  if (retries >= cronMaxRetries) {
    logCron(`Max retries (${cronMaxRetries}) reached for match ${matchId}. Stopping re-scraping.`, 'warn');
    dbGet('SELECT home_team, away_team, sport FROM scraped_predictions WHERE match_id = ?', [matchId]).then(match => {
      if (match) {
        insertNotification(`Échec du re-scraping automatique de ${match.home_team} vs ${match.away_team} (Max retries atteint).`, 'warning');
        dbRun('INSERT INTO cron_history (match_id, home_team, away_team, sport, status, retries, error_message) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [matchId, match.home_team, match.away_team, match.sport || 'football', 'FAILED', retries, 'Max retries reached']).catch(err => logCron(`Error inserting failure: ${err.message}`, 'error'));
      }
    }).catch(e => logCron(`Error notification: ${e.message}`, 'error'));
    retryCounts.delete(matchId);
    scheduledTimeouts.delete(matchId);
    return;
  }
  retryCounts.set(matchId, retries + 1);
  scheduledTimeouts.set(matchId, setTimeout(() => reScrapeMatch(matchId), minutes * 60000));
}

export async function reScrapeMatch(matchId) {
  logCron(`Running re-scrape for match ID: ${matchId}`);
  await updateKeepAwakeStatus(true);
  try {
    const match = await dbGet('SELECT * FROM scraped_predictions WHERE match_id = ?', [matchId]);
    if (!match) return logCron(`Match ${matchId} not found.`, 'warn');
    if (match.is_finished) {
      logCron(`Match ${matchId} already finished.`);
      scheduledTimeouts.delete(matchId);
      retryCounts.delete(matchId);
      return;
    }
    const activePort = await getTorPortFromPool();
    if (!activePort) {
      logCron(`No active Tor port in pool. Will retry in 10m.`, 'warn');
      return reschedule(matchId, 10);
    }
    logCron(`Verifying Tor SOCKS5 traffic routing on port ${activePort}...`);
    if (!(await isTorRouting(activePort))) {
      logCron(`Tor port ${activePort} is not routing traffic. Launching self-healing...`, 'warn');
      const healed = await healTorPort(activePort);
      if (!healed) {
        logCron(`Failed to heal Tor SOCKS5 proxy on port ${activePort}. Postponing re-scrape by 10 minutes.`, 'error');
        await insertNotification(`Défaut de connexion sur le proxy Tor (Port ${activePort}). Le re-scraping du match ${match.home_team} vs ${match.away_team} est reporté.`, 'error');
        return reschedule(matchId, 10);
      }
    }
    const scraperPath = process.env.SCRAPER_PATH || 'E:\\Developpement\\scrapper-v3';
    const sport = match.sport || 'football';
    const scraper = sport === 'football' ? 'matchendirect' : 'flashscore';
    let link = match.match_url || match.match_id;
    if (sport === 'football' && !link.startsWith('/live-score/') && !link.startsWith('http')) link = `/live-score/${link}`;
    logCron(`Scraping match ${matchId} via ${scraper} using Tor Port ${activePort}...`);
    const details = await scrapeSingleMatch(scraperPath, link, true, null, activePort, scraper, sport);
    if (!details) {
      logCron(`Scraping failed for ${matchId}. Retry in ${cronRetryIntervalFail}m.`, 'warn');
      return reschedule(matchId, cronRetryIntervalFail);
    }
    const isFinished = details.is_finished === true || 
      (details.score && details.score.trim() !== '-' && details.score.trim() !== '' && details.score.includes('-')) ||
      (details.time && (details.time.toLowerCase().includes('fin') || details.time.toLowerCase().includes('terminé') || details.time.toLowerCase().startsWith('ter')));
    logCron(`Scrape outcome for ${matchId} - isFinished: ${isFinished}, score: ${details.score || 'N/A'}`);
    const enriched = {
      match_id: matchId,
      time: details.time || match.time || 'Finished',
      date: details.date || match.date || '',
      tournament: (details.tournament && details.tournament !== 'Flashscore Match' && details.tournament !== 'Match en Direct') ? details.tournament : (match.tournament || ''),
      home_team: details.home_team || match.home_team,
      away_team: details.away_team || match.away_team,
      home_logo: details.home_logo || match.home_logo,
      away_logo: details.away_logo || match.away_logo,
      score: details.score || match.score || '',
      first_half_corners_home: details.first_half_corners_home,
      first_half_corners_away: details.first_half_corners_away,
      historical_links: details.historical_links,
      match_url: match.match_url || link,
      statistics: details.statistics,
      sport,
      is_finished: isFinished ? 1 : 0,
      status: isFinished ? 'Finished' : (details.status || 'Live')
    };
    const { importScrapedMatches } = await import('../db/importer.js');
    await importScrapedMatches([enriched], new Date().toISOString());
    if (!isFinished) {
      logCron(`Match ${matchId} not finished. Rescheduling in ${cronRetryIntervalLive}m.`);
      reschedule(matchId, cronRetryIntervalLive);
    } else {
      logCron(`Match ${matchId} finished!`);
      insertNotification(`Match terminé : ${details.home_team} vs ${details.away_team} (Score: ${details.score || 'N/A'})`, 'info');
      const retries = retryCounts.get(matchId) || 0;
      dbRun('INSERT INTO cron_history (match_id, home_team, away_team, sport, status, retries, score) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [matchId, details.home_team || match.home_team, details.away_team || match.away_team, sport, 'SUCCESS', retries, details.score || 'N/A'])
        .catch(err => logCron(`Error inserting success history: ${err.message}`, 'error'));
      scheduledTimeouts.delete(matchId);
      retryCounts.delete(matchId);
    }
  } catch (err) {
    logCron(`Error re-scraping ${matchId}: ${err.message}`, 'error');
    reschedule(matchId, cronRetryIntervalFail);
  } finally {
    await updateKeepAwakeStatus(false);
  }
}

export function scheduleMatchReScraping(matchId, dateStr, timeStr, sport) {
  const endTime = getExpectedEndTime(dateStr, timeStr, sport);
  if (!endTime || scheduledTimeouts.has(matchId)) return;
  const delay = endTime.getTime() - Date.now();
  logCron(`Scheduling re-scrape for match ${matchId} in ${Math.round(delay / 60000)}m (Expected End: ${endTime.toISOString()})`);
  scheduledTimeouts.set(matchId, setTimeout(() => reScrapeMatch(matchId), Math.max(1000, delay)));
}

export function cancelScheduledReScrape(matchId) {
  if (scheduledTimeouts.has(matchId)) {
    clearTimeout(scheduledTimeouts.get(matchId));
    scheduledTimeouts.delete(matchId);
    retryCounts.delete(matchId);
    logCron(`Cancelled scheduling for match ${matchId}`);
    return true;
  }
  return false;
}

export async function getScheduledCrons() {
  const list = [];
  for (const matchId of scheduledTimeouts.keys()) {
    try {
      const match = await dbGet('SELECT home_team, away_team, sport, date, time FROM scraped_predictions WHERE match_id = ?', [matchId]);
      if (!match) continue;
      const endTime = getExpectedEndTime(match.date, match.time, match.sport);
      const retries = retryCounts.get(matchId) || 0;
      list.push({
        match_id: matchId,
        home_team: match.home_team,
        away_team: match.away_team,
        sport: match.sport || 'football',
        start_time: `${match.date} ${match.time}`,
        expected_end_time: endTime ? endTime.toISOString() : null,
        retries,
        status: retries > 0 ? `Retrying (Attempt ${retries}/${cronMaxRetries})` : 'Scheduled'
      });
    } catch (e) { logCron(`Error fetching cron info for ${matchId}: ${e.message}`, 'error'); }
  }
  return list.sort((a, b) => (a.expected_end_time || '').localeCompare(b.expected_end_time || ''));
}

export async function initReScraper() {
  logCron('Initializing background match re-scraper service...');
  try {
    await loadCronSettings();
    await reevaluateKeepAwake();
    scheduleNightlyTasks();
    const unfinishedMatches = await dbQuery('SELECT match_id, date, time, sport FROM scraped_predictions WHERE is_finished = 0 AND is_historical = 0');
    logCron(`Found ${unfinishedMatches.length} unfinished matches.`);
    let immediateCount = 0;
    for (const match of unfinishedMatches) {
      const endTime = getExpectedEndTime(match.date, match.time, match.sport);
      if (!endTime) continue;
      const delay = endTime.getTime() - Date.now();
      if (delay > 0) scheduleMatchReScraping(match.match_id, match.date, match.time, match.sport);
      else {
        immediateCount++;
        scheduledTimeouts.set(match.match_id, setTimeout(() => reScrapeMatch(match.match_id), immediateCount * 10000));
      }
    }
    if (immediateCount > 0) logCron(`Scheduled ${immediateCount} past-due matches for staggered execution.`);
    setInterval(async () => {
      logCron('Fallback checker running...');
      try {
        const pending = await dbQuery('SELECT match_id, date, time, sport FROM scraped_predictions WHERE is_finished = 0 AND is_historical = 0');
        for (const m of pending) {
          const end = getExpectedEndTime(m.date, m.time, m.sport);
          if (end && end.getTime() <= Date.now() && !scheduledTimeouts.has(m.match_id)) {
            logCron(`Found past-due unscheduled match: ${m.match_id}. Launching re-scrape.`);
            reScrapeMatch(m.match_id);
          }
        }
      } catch (err) { logCron(`Error in interval check: ${err.message}`, 'error'); }
    }, 15 * 60 * 1000);
  } catch (err) { logCron(`Initialization Error: ${err.message}`, 'error'); }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runNightlyBackup() {
  try {
    const rowEnabled = await dbGet("SELECT value FROM settings WHERE key = 'cron_db_backup'");
    if (rowEnabled?.value === 'false') return logCron('Nightly database backup disabled.');
    const rowKeepDays = await dbGet("SELECT value FROM settings WHERE key = 'cron_db_backup_keep_days'");
    const keepDays = parseInt(rowKeepDays?.value) || 7;
    logCron('Starting nightly database backup...');
    const backupsDir = path.resolve(__dirname, '../../../backups');
    if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupsDir, `predictix_backup_${timestamp}.db`);
    const dbFile = path.resolve(__dirname, '../../predictix.db');
    if (fs.existsSync(dbFile)) {
      fs.copyFileSync(dbFile, backupFile);
      logCron(`Database backed up to ${backupFile}`);
      const files = fs.readdirSync(backupsDir).filter(f => f.startsWith('predictix_backup_') && f.endsWith('.db'));
      const now = Date.now();
      for (const file of files) {
        const filePath = path.join(backupsDir, file);
        if (now - fs.statSync(filePath).mtimeMs > keepDays * 86400000) {
          fs.unlinkSync(filePath);
          logCron(`Removed old backup: ${file}`);
        }
      }
    } else logCron('Database file predictix.db not found!', 'error');
  } catch (err) { logCron(`Error in backup: ${err.message}`, 'error'); }
}

async function runNightlyRepair() {
  try {
    const row = await dbGet("SELECT value FROM settings WHERE key = 'cron_integrity_repair'");
    if (row?.value === 'false') return logCron('Nightly auto-repair disabled.');
    logCron('Starting nightly auto-repair batch...');
    const { default: integrityController } = await import('../controllers/integrityController.js');
    await integrityController.startIntegrityBatch({}, { status: () => ({ json: (d) => logCron(`Repair response: ${d.message || JSON.stringify(d)}`) }) });
  } catch (err) { logCron(`Error in nightly repair: ${err.message}`, 'error'); }
}

async function runNightlyCleanup() {
  try {
    const row = await dbGet("SELECT value FROM settings WHERE key = 'cron_db_cleanup'");
    if (row?.value === 'false') return logCron('Nightly cleanup disabled.');
    logCron('Starting nightly DB cleanup & VACUUM...');
    await dbRun('DELETE FROM notifications WHERE timestamp < date("now", "-7 days")');
    logCron('Cleaned old notifications.');
    await dbRun('VACUUM');
    logCron('Database VACUUM completed.');
  } catch (err) { logCron(`Error in nightly cleanup: ${err.message}`, 'error'); }
}

function scheduleNightlyTasks() {
  const getNextTime = (hours, minutes = 0) => {
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);
    if (target.getTime() <= Date.now()) target.setDate(target.getDate() + 1);
    return target.getTime() - Date.now();
  };
  const delayRepair = getNextTime(3);
  setTimeout(() => { runNightlyRepair(); setInterval(runNightlyRepair, 24 * 3600000); }, delayRepair);
  const delayBackup = getNextTime(3, 55);
  setTimeout(() => { runNightlyBackup(); setInterval(runNightlyBackup, 24 * 3600000); }, delayBackup);
  const delayCleanup = getNextTime(4);
  setTimeout(() => { runNightlyCleanup(); setInterval(runNightlyCleanup, 24 * 3600000); }, delayCleanup);
  logCron(`Nightly tasks scheduled: Repair at 3:00 AM (in ${Math.round(delayRepair/60000)}m), Backup at 3:55 AM (in ${Math.round(delayBackup/60000)}m), Cleanup at 4:00 AM (in ${Math.round(delayCleanup/60000)}m)`);
}
