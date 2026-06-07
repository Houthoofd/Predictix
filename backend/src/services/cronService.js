import { dbQuery, dbGet, insertNotification } from '../db/database.js';
import { scrapeSingleMatch, isTorActive } from '../utils/scraperHelpers.js';

const scheduledTimeouts = new Map();
const retryCounts = new Map();
const MAX_RETRIES = 5;

// Helper to determine match duration based on sport
function getMatchDurationMinutes(sport) {
  const s = (sport || 'football').toLowerCase().trim();
  if (s === 'football') return 120; // 90 min + 15 min HT + buffer
  if (s === 'basketball') return 120; // 48 min + pauses + buffer
  if (s === 'tennis') return 150; // tennis is variable, 2.5h is a safe start
  if (s === 'hockey' || s === 'ice-hockey') return 150; // 60 min + intervals + overtime
  if (s === 'rugby') return 120;
  if (s === 'handball') return 90;
  if (s === 'volleyball') return 120;
  return 150; // Default fallback
}

// Parses target start time to expected end Date object in local time
export function getExpectedEndTime(dateStr, timeStr, sport) {
  if (!dateStr || !timeStr) return null;
  const timeMatch = timeStr.trim().match(/^(\d{2}):(\d{2})$/);
  if (!timeMatch) return null;

  const [_, hours, minutes] = timeMatch;
  const date = new Date(`${dateStr}T${hours}:${minutes}:00`);
  if (isNaN(date.getTime())) return null;

  const durationMins = getMatchDurationMinutes(sport);
  date.setMinutes(date.getMinutes() + durationMins);
  return date;
}

// Reschedule function
function reschedule(matchId, minutes) {
  if (scheduledTimeouts.has(matchId)) {
    clearTimeout(scheduledTimeouts.get(matchId));
  }
  
  const retries = retryCounts.get(matchId) || 0;
  if (retries >= MAX_RETRIES) {
    console.warn(`[Predictix Re-Scraper] Max retries (${MAX_RETRIES}) reached for match ${matchId}. Stopping re-scraping attempts.`);
    dbGet('SELECT home_team, away_team FROM scraped_predictions WHERE match_id = ?', [matchId])
      .then(match => {
        if (match) {
          insertNotification(`Échec du re-scraping automatique de ${match.home_team} vs ${match.away_team} (Max retries atteint).`, 'warning');
        }
      })
      .catch(e => console.error(e));
    retryCounts.delete(matchId);
    scheduledTimeouts.delete(matchId);
    return;
  }
  
  retryCounts.set(matchId, retries + 1);
  const timer = setTimeout(() => {
    reScrapeMatch(matchId);
  }, minutes * 60 * 1000);
  scheduledTimeouts.set(matchId, timer);
}

// Re-scraping execution logic
export async function reScrapeMatch(matchId) {
  console.log(`[Predictix Re-Scraper] Running re-scrape for match ID: ${matchId}`);
  try {
    const match = await dbGet('SELECT * FROM scraped_predictions WHERE match_id = ?', [matchId]);
    if (!match) {
      console.warn(`[Predictix Re-Scraper] Match ${matchId} not found in database.`);
      return;
    }

    if (match.is_finished) {
      console.log(`[Predictix Re-Scraper] Match ${matchId} is already marked as finished.`);
      scheduledTimeouts.delete(matchId);
      retryCounts.delete(matchId);
      return;
    }

    const torActive = await isTorActive();
    if (!torActive) {
      console.warn(`[Predictix Re-Scraper] Tor proxy is not active. Will retry in 10 minutes.`);
      reschedule(matchId, 10);
      return;
    }

    const scraperPath = process.env.SCRAPER_PATH || 'E:\\Developpement\\scrapper-v3';
    const sport = match.sport || 'football';
    const scraper = sport === 'football' ? 'matchendirect' : 'flashscore';
    let link = match.match_url || match.match_id;

    if (sport === 'football' && !link.startsWith('/live-score/') && !link.startsWith('http')) {
      link = `/live-score/${link}`;
    }

    console.log(`[Predictix Re-Scraper] Scraping details for match ${matchId} via ${scraper} (${sport})...`);
    const details = await scrapeSingleMatch(scraperPath, link, true, null, 9050, scraper, sport);
    if (!details) {
      console.warn(`[Predictix Re-Scraper] Scraping failed for match ${matchId}. Will retry in 15 minutes.`);
      reschedule(matchId, 15);
      return;
    }

    const isFinished = details.is_finished === true || 
      (details.score && details.score.trim() !== '-' && details.score.trim() !== '' && details.score.includes('-')) ||
      (details.time && (details.time.toLowerCase().includes('fin') || details.time.toLowerCase().includes('terminé') || details.time.toLowerCase() === 'ter' || details.time.toLowerCase() === 'ter.'));

    console.log(`[Predictix Re-Scraper] Scrape outcome for ${matchId} - isFinished: ${isFinished}, score: ${details.score || 'N/A'}`);

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
      sport: sport,
      is_finished: isFinished ? 1 : 0,
      status: isFinished ? 'Finished' : (details.status || 'Live')
    };

    const { importScrapedMatches } = await import('../db/importer.js');
    await importScrapedMatches([enriched], new Date().toISOString());

    if (!isFinished) {
      console.log(`[Predictix Re-Scraper] Match ${matchId} is still not finished. Rescheduling check in 10 minutes.`);
      reschedule(matchId, 10);
    } else {
      console.log(`[Predictix Re-Scraper] Match ${matchId} successfully settled and marked as finished!`);
      insertNotification(`Match terminé : ${details.home_team} vs ${details.away_team} (Score: ${details.score || 'N/A'})`, 'info');
      scheduledTimeouts.delete(matchId);
      retryCounts.delete(matchId);
    }
  } catch (err) {
    console.error(`[Predictix Re-Scraper] Error re-scraping match ${matchId}:`, err);
    reschedule(matchId, 15);
  }
}

// Main scheduler function called when match is discovered/imported
export function scheduleMatchReScraping(matchId, dateStr, timeStr, sport) {
  const endTime = getExpectedEndTime(dateStr, timeStr, sport);
  if (!endTime) return;

  if (scheduledTimeouts.has(matchId)) {
    // Already scheduled, no need to overwrite unless the details changed
    return;
  }

  const delay = endTime.getTime() - Date.now();
  console.log(`[Predictix Re-Scraper] Scheduling re-scrape for match ${matchId} in ${Math.round(delay / 1000 / 60)} minutes (Expected End: ${endTime.toISOString()})`);

  const timer = setTimeout(() => {
    reScrapeMatch(matchId);
  }, Math.max(1000, delay));

  scheduledTimeouts.set(matchId, timer);
}

// Cancel a scheduled re-scrape
export function cancelScheduledReScrape(matchId) {
  if (scheduledTimeouts.has(matchId)) {
    clearTimeout(scheduledTimeouts.get(matchId));
    scheduledTimeouts.delete(matchId);
    retryCounts.delete(matchId);
    console.log(`[Predictix Re-Scraper] Cancelled scheduling for match ${matchId}`);
    return true;
  }
  return false;
}

// Returns the list of scheduled crons for UI display
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
        retries: retries,
        status: retries > 0 ? `Retrying (Attempt ${retries}/${MAX_RETRIES})` : 'Scheduled'
      });
    } catch (e) {
      console.error(`[Predictix Re-Scraper] Error fetching scheduled cron info for ${matchId}:`, e);
    }
  }
  
  // Sort by expected end time ascending
  return list.sort((a, b) => {
    if (!a.expected_end_time) return 1;
    if (!b.expected_end_time) return -1;
    return a.expected_end_time.localeCompare(b.expected_end_time);
  });
}

// Initial bootstrapper to recover pending re-scrapes on server launch
export async function initReScraper() {
  console.log('[Predictix Re-Scraper] Initializing background match re-scraper service...');
  try {
    const unfinishedMatches = await dbQuery(`
      SELECT match_id, date, time, sport 
      FROM scraped_predictions 
      WHERE is_finished = 0 
        AND is_historical = 0
    `);

    console.log(`[Predictix Re-Scraper] Found ${unfinishedMatches.length} unfinished matches in database.`);
    
    let immediateCount = 0;
    for (const match of unfinishedMatches) {
      const endTime = getExpectedEndTime(match.date, match.time, match.sport);
      if (!endTime) continue;

      const delay = endTime.getTime() - Date.now();
      if (delay > 0) {
        scheduleMatchReScraping(match.match_id, match.date, match.time, match.sport);
      } else {
        immediateCount++;
        const timer = setTimeout(() => {
          reScrapeMatch(match.match_id);
        }, immediateCount * 10000); // Stagger execution by 10s intervals
        scheduledTimeouts.set(match.match_id, timer);
      }
    }
    
    if (immediateCount > 0) {
      console.log(`[Predictix Re-Scraper] Scheduled ${immediateCount} past-due matches for immediate staggered execution.`);
    }

    // Fallback periodic check every 15 minutes
    setInterval(async () => {
      console.log('[Predictix Re-Scraper] Fallback checker running...');
      try {
        const pending = await dbQuery(`
          SELECT match_id, date, time, sport 
          FROM scraped_predictions 
          WHERE is_finished = 0 
            AND is_historical = 0
        `);
        for (const m of pending) {
          const end = getExpectedEndTime(m.date, m.time, m.sport);
          if (end && end.getTime() <= Date.now()) {
            if (!scheduledTimeouts.has(m.match_id)) {
              console.log(`[Predictix Re-Scraper Fallback] Found past-due unscheduled match: ${m.match_id}. Launching re-scrape.`);
              reScrapeMatch(m.match_id);
            }
          }
        }
      } catch (err) {
        console.error('[Predictix Re-Scraper Fallback] Error in interval check:', err);
      }
    }, 15 * 60 * 1000);

  } catch (err) {
    console.error('[Predictix Re-Scraper Initialization Error]:', err);
  }
}
