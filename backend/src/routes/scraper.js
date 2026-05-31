import express from 'express';
import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import net from 'net';
import { dbQuery, dbRun, dbGet } from '../db/database.js';

const router = express.Router();

let activeScraperProcess = null;
let stopScraperRequested = false;
const activeCrawlHistoryMatches = new Set();

// Helper: Check if Tor SOCKS5 proxy port is active
export function isTorActive() {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1500);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    const onError = () => {
      socket.destroy();
      resolve(false);
    };
    
    socket.on('error', onError);
    socket.on('timeout', onError);
    
    socket.connect(9050, '127.0.0.1');
  });
}

// Helper: Poisson distribution probability of exactly k events with expected lambda
function poissonProbability(lambda, k) {
  let factorial = 1;
  for (let i = 1; i <= k; i++) factorial *= i;
  return Math.pow(lambda, k) * Math.exp(-lambda) / factorial;
}

// Helper: Cumulative Poisson probability of OVER line (e.g. > line)
function poissonOver(lambda, line) {
  const floor = Math.floor(line);
  let sumUnder = 0;
  for (let i = 0; i <= floor; i++) {
    sumUnder += poissonProbability(lambda, i);
  }
  return 1 - sumUnder;
}

// Helper: Cumulative Poisson probability of UNDER line (e.g. < line)
function poissonUnder(lambda, line) {
  const floor = Math.ceil(line) - 1;
  let sumUnder = 0;
  for (let i = 0; i <= floor; i++) {
    sumUnder += poissonProbability(lambda, i);
  }
  return sumUnder;
}

// Helper: Binary search to find expected lambda given target cumulative probability P(X <= k) = targetProb
function findPoissonMean(k, targetProb) {
  let low = 0.1;
  let high = 30.0;
  let mid = 0.0;
  for (let iter = 0; iter < 40; iter++) {
    mid = (low + high) / 2;
    let sumUnder = 0;
    let current = 1;
    for (let i = 0; i <= k; i++) {
      if (i > 0) {
        current = current * mid / i;
      }
      sumUnder += current;
    }
    const prob = sumUnder * Math.exp(-mid);
    if (prob > targetProb) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return mid;
}

// Get cached predictions from database and compute predictive stats + Value Bets
router.get('/predictions', async (req, res) => {
  try {
    let sql = 'SELECT * FROM scraped_predictions WHERE is_historical = 0';
    const params = [];
    
    const { startDate, endDate, dateRange } = req.query;
    
    if (startDate && endDate) {
      sql += ' AND date >= ? AND date <= ?';
      params.push(startDate, endDate);
    } else if (dateRange && dateRange !== 'all') {
      const today = new Date();
      const todayStr = today.toISOString().substring(0, 10);
      
      if (dateRange === 'today') {
        sql += ' AND date = ?';
        params.push(todayStr);
      } else if (dateRange === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().substring(0, 10);
        sql += ' AND date = ?';
        params.push(yesterdayStr);
      } else if (dateRange === 'week') {
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - 7);
        const startOfWeekStr = startOfWeek.toISOString().substring(0, 10);
        sql += ' AND date >= ? AND date <= ?';
        params.push(startOfWeekStr, todayStr);
      } else if (dateRange === 'month') {
        const startOfMonth = new Date();
        startOfMonth.setDate(startOfMonth.getDate() - 30);
        const startOfMonthStr = startOfMonth.toISOString().substring(0, 10);
        sql += ' AND date >= ? AND date <= ?';
        params.push(startOfMonthStr, todayStr);
      } else if (dateRange === 'year') {
        const startOfYear = new Date();
        startOfYear.setDate(startOfYear.getDate() - 365);
        const startOfYearStr = startOfYear.toISOString().substring(0, 10);
        sql += ' AND date >= ? AND date <= ?';
        params.push(startOfYearStr, todayStr);
      }
    }
    
    sql += ' ORDER BY scraped_at DESC, time ASC';
    const rows = await dbQuery(sql, params);
    
    // Helper to normalize tournament strings to clean league keys
    function getLeagueKey(t) {
      if (!t) return '';
      return t.toLowerCase()
              .replace(/match en direct/g, '')
              .replace(/\(live score en direct\)/g, '')
              .replace(/[^a-z0-9]/g, '');
    }

    // Dynamic League Averages learning: fetch completed historical matches to dynamically compute league baselines
    const allHistoricalMatches = await dbQuery(`
      SELECT tournament, home_team, away_team, first_half_corners_home, first_half_corners_away 
      FROM scraped_predictions 
      WHERE is_historical = 1 AND first_half_corners_home IS NOT NULL
    `);

    const leagueGroups = {};
    for (const m of allHistoricalMatches) {
      let rawTour = m.tournament || '';
      // Slice off team names if present using home_team to group matches by exact league
      if (m.home_team && rawTour.includes(m.home_team)) {
        const idx = rawTour.indexOf(m.home_team);
        rawTour = rawTour.substring(0, idx);
      }
      const key = getLeagueKey(rawTour);
      if (!key) continue;
      if (!leagueGroups[key]) {
        leagueGroups[key] = { homeSum: 0, homeCount: 0, awaySum: 0, awayCount: 0 };
      }
      if (m.first_half_corners_home !== null && m.first_half_corners_home !== undefined) {
        leagueGroups[key].homeSum += m.first_half_corners_home;
        leagueGroups[key].homeCount++;
      }
      if (m.first_half_corners_away !== null && m.first_half_corners_away !== undefined) {
        leagueGroups[key].awaySum += m.first_half_corners_away;
        leagueGroups[key].awayCount++;
      }
    }

    const leagueAverages = {};
    for (const key in leagueGroups) {
      const g = leagueGroups[key];
      // Require at least 5 matches to establish a robust specific league baseline
      if (g.homeCount >= 5 && g.awayCount >= 5) {
        leagueAverages[key] = {
          home: parseFloat((g.homeSum / g.homeCount).toFixed(2)),
          away: parseFloat((g.awaySum / g.awayCount).toFixed(2))
        };
      }
    }

    const enrichedRows = [];
    
    for (const row of rows) {
      // Find historical H2H matches between A and B (up to 10)
      const h2hMatchesRaw = await dbQuery(`
        SELECT first_half_corners_home, first_half_corners_away, home_team, away_team, home_logo, away_logo, score, date, time, tournament
        FROM scraped_predictions 
        WHERE is_finished = 1 
          AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))
        ORDER BY date DESC LIMIT 10
      `, [row.home_team, row.away_team, row.away_team, row.home_team]);
      
      const normalizeMatchRow = (m) => {
        let date = m.date || '';
        let time = m.time || '';
        if (date.includes(':')) {
          time = date;
          date = row.date || new Date().toISOString().substring(0, 10);
        }
        return { ...m, date, time };
      };

      const h2hMatches = h2hMatchesRaw.map(normalizeMatchRow);
      
      // Find Team A (Home) recent matches played STRICTLY at Domicile (up to 10)
      const homeMatchesRaw = await dbQuery(`
        SELECT first_half_corners_home, first_half_corners_away, home_team, away_team, home_logo, away_logo, score, date, time, tournament
        FROM scraped_predictions 
        WHERE is_finished = 1 
          AND home_team = ?
        ORDER BY date DESC LIMIT 10
      `, [row.home_team]);
      
      const homeMatches = homeMatchesRaw.map(normalizeMatchRow);
      
      // Find Team B (Away) recent matches played STRICTLY at Extérieur (up to 10)
      const awayMatchesRaw = await dbQuery(`
        SELECT first_half_corners_home, first_half_corners_away, home_team, away_team, home_logo, away_logo, score, date, time, tournament
        FROM scraped_predictions 
        WHERE is_finished = 1 
          AND away_team = ?
        ORDER BY date DESC LIMIT 10
      `, [row.away_team]);

      const awayMatches = awayMatchesRaw.map(normalizeMatchRow);
      
      // Calculate H2H corners average (Total match corners in H2H)
      let h2hSum = 0;
      let h2hCount = 0;
      for (const m of h2hMatches) {
        if (m.first_half_corners_home !== null && m.first_half_corners_away !== null) {
          h2hSum += (m.first_half_corners_home + m.first_half_corners_away);
          h2hCount++;
        }
      }
      const h2hAvg = h2hCount > 0 ? parseFloat((h2hSum / h2hCount).toFixed(1)) : null;
      
      // Calculate Team A recent corners average (Corners obtained by Team A)
      let homeSum = 0;
      let homeCount = 0;
      for (const m of homeMatches) {
        const corners = m.home_team === row.home_team ? m.first_half_corners_home : m.first_half_corners_away;
        if (corners !== null && corners !== undefined) {
          homeSum += corners;
          homeCount++;
        }
      }
      const homeAvg = homeCount > 0 ? parseFloat((homeSum / homeCount).toFixed(1)) : null;
      
      // Calculate Team B recent corners average (Corners obtained by Team B)
      let awaySum = 0;
      let awayCount = 0;
      for (const m of awayMatches) {
        const corners = m.home_team === row.away_team ? m.first_half_corners_home : m.first_half_corners_away;
        if (corners !== null && corners !== undefined) {
          awaySum += corners;
          awayCount++;
        }
      }
      const awayAvg = awayCount > 0 ? parseFloat((awaySum / awayCount).toFixed(1)) : null;
      
      // Apply statistical shrinkage estimation (Mean Reversion) to stabilize lambda across all matches
      let defaultHome = 2.2;
      let defaultAway = 2.0;
      
      const primaryKey = getLeagueKey(row.tournament);
      if (primaryKey) {
        const matchedKey = Object.keys(leagueAverages).find(k => k.includes(primaryKey) || primaryKey.includes(k));
        if (matchedKey) {
          defaultHome = leagueAverages[matchedKey].home;
          defaultAway = leagueAverages[matchedKey].away;
        }
      }
      
      const teamWeight = 0.6;
      const homeRegressed = homeAvg !== null ? parseFloat((teamWeight * homeAvg + (1 - teamWeight) * defaultHome).toFixed(2)) : defaultHome;
      const awayRegressed = awayAvg !== null ? parseFloat((teamWeight * awayAvg + (1 - teamWeight) * defaultAway).toFixed(2)) : defaultAway;
      
      const lambda1MT = homeRegressed + awayRegressed;
      
      // Dynamic Poisson prediction
      let dynamicBestTip = row.best_tip;
      let dynamicCardLine = row.card_line;
      let dynamicProbability = row.probability;

      const targetLine = 4.5;
      const overProb = poissonOver(lambda1MT, targetLine);
      const underProb = poissonUnder(lambda1MT, targetLine);

      if (overProb >= underProb) {
        dynamicBestTip = "Plus de";
        dynamicCardLine = "4.5";
        dynamicProbability = `${Math.round(overProb * 100)}%`;
      } else {
        dynamicBestTip = "Moins de";
        dynamicCardLine = "4.5";
        dynamicProbability = `${Math.round(underProb * 100)}%`;
      }

      // Calculate actual historical corner success rate for the recommended line (dynamicCardLine) in the recent matches of home and away teams
      const targetLineVal = parseFloat(dynamicCardLine);
      const isOverTip = dynamicBestTip === "Plus de";
      
      let successMatches = 0;
      let totalMatchesWithCorners = 0;
      
      const allRecent = [...homeMatches, ...awayMatches];
      for (const m of allRecent) {
        if (m.first_half_corners_home !== null && m.first_half_corners_away !== null) {
          totalMatchesWithCorners++;
          const sum = m.first_half_corners_home + m.first_half_corners_away;
          const isSuccess = isOverTip ? sum > targetLineVal : sum < targetLineVal;
          if (isSuccess) {
            successMatches++;
          }
        }
      }
      
      const dynamicWinRate = totalMatchesWithCorners > 0 
        ? `${Math.round((successMatches / totalMatchesWithCorners) * 100)}%` 
        : (row.win_rate || "50%");

      // Parse cached Oddschecker odds
      let oddsCorners = [];
      try {
        if (row.odds_corners) {
          oddsCorners = JSON.parse(row.odds_corners);
        }
      } catch (e) {}

      // Project Full-Time corners odds to First-Half corners odds if First-Half is missing
      const has1stHalf = oddsCorners.some(o => o.market_type === '1st_half');
      const hasFullTime = oddsCorners.some(o => o.market_type === 'full_time');

      if (!has1stHalf && hasFullTime) {
        const ftLine = oddsCorners.find(o => o.market_type === 'full_time' && o.over_decimal && o.under_decimal);
        if (ftLine) {
          const pOver = 1 / ftLine.over_decimal;
          const pUnder = 1 / ftLine.under_decimal;
          const totalP = pOver + pUnder;
          
          if (totalP > 0) {
            const pUnderNorm = pUnder / totalP;
            const k = Math.floor(ftLine.line);
            const derivedLambdaFT = findPoissonMean(k, pUnderNorm);
            
            // Expected 1st half corners is 46% of Full Time corners
            const derivedLambda1MT = 0.46 * derivedLambdaFT;
            const originalPayout = 1 / totalP;
            
            // Generate projected 1st half odds for lines 3.5, 4.5, 5.5
            const projectedLines = [3.5, 4.5, 5.5];
            for (const line of projectedLines) {
              const uProb = poissonUnder(derivedLambda1MT, line);
              const oProb = 1 - uProb;
              
              if (uProb > 0.02 && oProb > 0.02) {
                const overDec = parseFloat((originalPayout / oProb).toFixed(2));
                const underDec = parseFloat((originalPayout / uProb).toFixed(2));
                
                oddsCorners.push({
                  line: line,
                  over_decimal: overDec,
                  under_decimal: underDec,
                  market_type: '1st_half',
                  is_estimated: true
                });
              }
            }
          }
        }
      } else if (!has1stHalf && !hasFullTime) {
        const projectedLines = [3.5, 4.5, 5.5];
        const payout = 0.93;
        for (const line of projectedLines) {
          const uProb = poissonUnder(lambda1MT, line);
          const oProb = 1 - uProb;
          
          if (uProb > 0.02 && oProb > 0.02) {
            const overDec = parseFloat((payout / oProb).toFixed(2));
            const underDec = parseFloat((payout / uProb).toFixed(2));
            
            oddsCorners.push({
              line: line,
              over_decimal: overDec,
              under_decimal: underDec,
              market_type: '1st_half',
              is_estimated: true
            });
          }
        }
      }
      
      // Run Poisson distribution Value Bet calculations
      const enrichedOdds = oddsCorners.map(o => {
        const is1stHalf = o.market_type === '1st_half';
        const lambda = is1stHalf ? lambda1MT : lambda1MT * 2.2; // Full Time corners is about 2.2x of 1st half
        
        const overProb = poissonOver(lambda, o.line);
        const underProb = poissonUnder(lambda, o.line);
        
        const overValue = o.over_decimal ? overProb * o.over_decimal : 0;
        const underValue = o.under_decimal ? underProb * o.under_decimal : 0;
        
        const overValueBet = overValue > 1.05;
        const underValueBet = underValue > 1.05;
        
        return {
          ...o,
          over_value_bet: overValueBet,
          over_value_edge: overValueBet ? Math.round((overValue - 1) * 100) : 0,
          over_fair_odds: overProb > 0 ? parseFloat((1 / overProb).toFixed(2)) : null,
          over_probability: Math.round(overProb * 100) + '%',
          
          under_value_bet: underValueBet,
          under_value_edge: underValueBet ? Math.round((underValue - 1) * 100) : 0,
          under_fair_odds: underProb > 0 ? parseFloat((1 / underProb).toFixed(2)) : null,
          under_probability: Math.round(underProb * 100) + '%'
        };
      });
      
      // Override general card O/U odds with our highly accurate Poisson estimated bookmaker odds
      // when no real scraped corner odds are available.
      const activeLineNum = parseFloat(dynamicCardLine);
      const activeOddsRow = enrichedOdds.find(o => o.market_type === '1st_half' && parseFloat(o.line) === activeLineNum);
      
      let finalOverOdds = row.over_odds;
      let finalUnderOdds = row.under_odds;
      
      if (activeOddsRow && activeOddsRow.is_estimated) {
        finalOverOdds = String(activeOddsRow.over_decimal);
        finalUnderOdds = String(activeOddsRow.under_decimal);
      }
      
      enrichedRows.push({
        ...row,
        best_tip: dynamicBestTip,
        card_line: dynamicCardLine,
        probability: dynamicProbability,
        over_odds: finalOverOdds,
        under_odds: finalUnderOdds,
        win_rate: dynamicWinRate,
        home_avg_first_half_corners: homeRegressed,
        away_avg_first_half_corners: awayRegressed,
        h2h_avg_first_half_corners: h2hAvg,
        odds_corners: enrichedOdds,
        recent_home_matches: homeMatches,
        recent_away_matches: awayMatches,
        recent_h2h_matches: h2hMatches,
        isCrawling: activeCrawlHistoryMatches.has(row.match_id)
      });
    }

    res.json({ success: true, data: enrichedRows });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Helper: Scan scraper output directories and return path of the newest JSON file
function getNewestScrapedFile(outputDirs) {
  let allFiles = [];
  
  for (const dir of outputDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir)
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          return { path: filePath, mtime: stat.mtime };
        });
      allFiles = allFiles.concat(files);
    }
  }

  allFiles.sort((a, b) => b.mtime - a.mtime);
  return allFiles.length > 0 ? allFiles[0].path : null;
}

// Helper: Robustly parse French date string (e.g. "17 mai 2026", "1er juin 2026", "20/05/2026") into YYYY-MM-DD format
export function parseFrenchDate(dateStr) {
  if (!dateStr) return null;
  dateStr = dateStr.trim().toLowerCase();
  
  // Try YYYY-MM-DD first
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Try DD/MM/YYYY or D/M/YYYY
  const dmRef = dateStr.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (dmRef) {
    const day = dmRef[1].padStart(2, '0');
    const month = dmRef[2].padStart(2, '0');
    const year = dmRef[3];
    return `${year}-${month}-${day}`;
  }
  
  // Try French text month, e.g. "17 mai 2026" or "1er juin 2026"
  const frenchMonths = {
    'janvier': '01', 'janv.': '01', 'janv': '01',
    'février': '02', 'févr.': '02', 'févr': '02', 'fevrier': '02',
    'mars': '03',
    'avril': '04', 'avr.': '04', 'avr': '04',
    'mai': '05',
    'juin': '06',
    'juillet': '07', 'juil.': '07', 'juil': '07',
    'août': '08', 'aout': '08',
    'septembre': '09', 'sept.': '09', 'sept': '09',
    'octobre': '10', 'oct.': '10', 'oct': '10',
    'novembre': '11', 'nov.': '11', 'nov': '11',
    'décembre': '12', 'déc.': '12', 'déc': '12', 'decembre': '12'
  };
  
  // Replace "1er" with "1" to simplify parsing
  dateStr = dateStr.replace(/^1er\b/, '1');
  
  const textMatch = dateStr.match(/^(\d{1,2})\s+([a-zéûûöäêèéàç\.]+)\s+(\d{4})$/);
  if (textMatch) {
    const day = textMatch[1].padStart(2, '0');
    const monthName = textMatch[2];
    const year = textMatch[3];
    const month = frenchMonths[monthName];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }
  
  return null;
}

export async function scrapeSingleMatch(scraperPath, link, skipOdds = false, onSpawn = null) {
  const torActive = await isTorActive();
  if (!torActive) {
    console.warn(`[Predictix Scraper] Tor is inactive. Skipping scrape for: ${link}`);
    return null;
  }

  return new Promise((resolve) => {
    let resolved = false;
    const tmpOutFile = path.join(scraperPath, 'data', `tmp_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);
    const exePath = path.join(scraperPath, 'cmd', 'scrapper-lite', 'examples', 'scrapper-matchendirect.exe');
    
    const args = ['-tor', '-url', link, '-output', tmpOutFile];
    if (skipOdds) {
      args.push('-skip-odds');
    }

    // Spawn Go scraper with -url and -tor options
    const child = spawn(exePath, args);
    
    if (onSpawn && typeof onSpawn === 'function') {
      onSpawn(child);
    }
    
    // Security timeout guard: 20 seconds max execution
    const timeout = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      console.warn(`[Predictix Scraper] Single match scraper timed out (20s) for: ${link}. Terminating process.`);
      try {
        if (process.platform === 'win32') {
          exec(`taskkill /pid ${child.pid} /T /F`, (err) => {
            if (err) console.error('Failed to taskkill timed-out child process tree:', err.message);
          });
        } else {
          child.kill();
        }
      } catch (err) {
        console.error('Failed to kill timed-out scraper child process:', err.message);
        try { child.kill(); } catch (e) {}
      }
      if (fs.existsSync(tmpOutFile)) {
        try { fs.unlinkSync(tmpOutFile); } catch (e) {}
      }
      resolve(null);
    }, 20000);
    
    child.on('error', (err) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      console.error('[Predictix Scraper] Failed to spawn single match scraper:', err.message);
      resolve(null);
    });
    
    child.on('close', async (code) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      
      if (code === 0 && fs.existsSync(tmpOutFile)) {
        try {
          const rawData = fs.readFileSync(tmpOutFile, 'utf-8');
          const parsed = JSON.parse(rawData);
          const matchData = (parsed.all_matches || parsed.matches || [])[0];
          
          if (fs.existsSync(tmpOutFile)) fs.unlinkSync(tmpOutFile);
          resolve(matchData || null);
        } catch (e) {
          console.error('Failed to parse single match tmp JSON output:', e);
          if (fs.existsSync(tmpOutFile)) fs.unlinkSync(tmpOutFile);
          resolve(null);
        }
      } else {
        if (fs.existsSync(tmpOutFile)) fs.unlinkSync(tmpOutFile);
        resolve(null);
      }
    });
  });
}

// Discover matches on homepage listing
router.post('/predictions/scrape/discover', async (req, res) => {
  if (activeScraperProcess) {
    return res.status(400).json({ success: false, error: { message: "Un scraping ou une découverte est déjà en cours d'exécution." } });
  }

  const torActive = await isTorActive();
  if (!torActive) {
    return res.status(400).json({ 
      success: false, 
      error: { message: "Le proxy Tor local n'est pas actif sur le port 9050. Veuillez lancer Tor et réessayer." } 
    });
  }

  const scraperPath = process.env.SCRAPER_PATH || 'E:\\Developpement\\scrapper-v3';
  const outputDirs = [
    path.join(scraperPath, 'data', 'matchendirect'),
    path.join(scraperPath, 'data')
  ];

  if (!fs.existsSync(scraperPath)) {
    return res.status(404).json({ success: false, error: { message: `Dossier du scraper introuvable : ${scraperPath}` } });
  }

  let scriptName = 'scrape-matchendirect.bat';
  if (fs.existsSync(path.join(scraperPath, 'scrape-matchendirect.sh'))) {
    scriptName = 'scrape-matchendirect.sh';
  }

  console.log(`[Predictix Discovery] Starting discovery in ${scraperPath}...`);
  
  const child = spawn('cmd.exe', ['/c', scriptName, 'verbose', '0', 'discover'], {
    cwd: scraperPath,
    env: { ...process.env, FORCE_COLOR: '1' }
  });
  activeScraperProcess = child;

  // Discovery timeout guard: 50 seconds max execution
  const timeoutGuard = setTimeout(() => {
    if (activeScraperProcess && activeScraperProcess.pid === child.pid) {
      console.warn(`[Predictix Discovery] Process timed out (50s). Killing process tree.`);
      const pid = child.pid;
      if (process.platform === 'win32') {
        exec(`taskkill /pid ${pid} /T /F`, (err) => {
          if (err) console.error('Failed to taskkill timed-out discovery:', err.message);
        });
      } else {
        child.kill();
      }
      activeScraperProcess = null;
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: { message: "La découverte a expiré (timeout de 50 secondes)." } });
      }
    }
  }, 50000);

  let logOutput = '';
  child.stdout.on('data', (data) => logOutput += data.toString());
  child.stderr.on('data', (data) => logOutput += data.toString());

  child.on('error', (err) => {
    clearTimeout(timeoutGuard);
    activeScraperProcess = null;
    console.error('[Predictix Discovery] Failed to spawn discovery process:', err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: { message: `Impossible de démarrer le processus : ${err.message}` } });
    }
  });

  child.on('close', async (code) => {
    clearTimeout(timeoutGuard);
    activeScraperProcess = null;
    console.log(`[Predictix Discovery] Process closed with code: ${code}`);

    if (code !== 0) {
      if (!res.headersSent) {
        return res.status(500).json({ success: false, error: { message: `Le scraper a échoué (Code : ${code})`, logs: logOutput } });
      }
      return;
    }

    try {
      const newestFile = getNewestScrapedFile(outputDirs);
      if (!newestFile) {
        return res.status(404).json({ success: false, error: { message: "Aucun fichier de résultats de découverte trouvé." } });
      }

      console.log(`[Predictix Discovery] Parsing newest file: ${newestFile}`);
      const rawData = fs.readFileSync(newestFile, 'utf-8');
      const parsed = JSON.parse(rawData);
      const matches = parsed.all_matches || parsed.matches || [];

      // Clean up the temporary discovery file
      try {
        if (fs.existsSync(newestFile)) fs.unlinkSync(newestFile);
      } catch (e) {}

      return res.json({
        success: true,
        count: matches.length,
        matches: matches.map(m => ({
          match_id: m.match_id,
          time: m.time,
          tournament: m.tournament,
          home_team: m.home_team,
          away_team: m.away_team,
          home_logo: m.home_logo,
          away_logo: m.away_logo,
          score: m.score,
          href: m.historical_links?.[0] || '' // retrieve temporarily stored href
        }))
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: { message: `Erreur lors de la lecture du résultat de découverte : ${err.message}` } });
    }
  });
});

// Trigger scraper execution and stream progress via Server-Sent Events (SSE)
router.post('/predictions/scrape', async (req, res) => {
  stopScraperRequested = false;
  
  // Disable Node's default request, response, and socket timeouts for long SSE scraper streams
  req.setTimeout(0);
  res.setTimeout(0);
  req.socket.setTimeout(0);
  
  // Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send an SSE keep-alive comment (":\n\n") every 5 seconds to keep the TCP socket warm and prevent any idle timeouts
  const keepAliveInterval = setInterval(() => {
    try {
      if (!res.writableEnded && !res.destroyed) {
        res.write(':\n\n');
      }
    } catch (err) {
      console.warn('[Predictix Keep-Alive Warning] Write failed:', err.message);
    }
  }, 5000);

  req.on('close', () => {
    clearInterval(keepAliveInterval);
  });

  const sendEvent = (type, data) => {
    try {
      if (!res.writableEnded && !res.destroyed) {
        res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
      }
    } catch (err) {
      console.warn('[Predictix SSE Warning] Write failed:', err.message);
    }
  };

  const torActive = await isTorActive();
  if (!torActive) {
    sendEvent('error', { message: "Le proxy Tor local n'est pas actif sur le port 9050. Veuillez lancer Tor et réessayer." });
    clearInterval(keepAliveInterval);
    return res.end();
  }

  const scraperPath = process.env.SCRAPER_PATH || 'E:\\Developpement\\scrapper-v3';
  const outputDirs = [
    path.join(scraperPath, 'data', 'matchendirect'),
    path.join(scraperPath, 'data', 'ratingbet'),
    path.join(scraperPath, 'data')
  ];

  sendEvent('log', { message: `[Predictix] Initialisation du scraping dans : ${scraperPath}` });
  
  if (!fs.existsSync(scraperPath)) {
    sendEvent('error', { message: `Dossier du scraper introuvable à l'emplacement configuré : ${scraperPath}` });
    return res.end();
  }

  // Detect script to spawn (auto-detect scrape-matchendirect.bat, .sh or fallback to ratingbet)
  let scriptName = process.env.SCRAPER_SCRIPT || 'scrape-ratingbet.bat';
  if (!process.env.SCRAPER_SCRIPT) {
    if (fs.existsSync(path.join(scraperPath, 'scrape-matchendirect.bat'))) {
      scriptName = 'scrape-matchendirect.bat';
    } else if (fs.existsSync(path.join(scraperPath, 'scrape-matchendirect.sh'))) {
      scriptName = 'scrape-matchendirect.sh';
    }
  }

  const limit = req.body.limit || req.query.limit || 30;
  sendEvent('log', { message: `[Predictix] Execution du script : ${scriptName} (limite : ${limit} matchs)` });

  // Spawn the batch file
  const child = spawn('cmd.exe', ['/c', scriptName, 'verbose', limit], {
    cwd: scraperPath,
    env: { ...process.env, FORCE_COLOR: '1' }
  });
  activeScraperProcess = child;

  // Dynamic timeout guard for bulk scraping: (limit * 30 seconds) + 60 seconds buffer
  const timeoutMs = (parseInt(limit, 10) * 30 * 1000) + 60000;
  const timeoutGuard = setTimeout(() => {
    if (activeScraperProcess && activeScraperProcess.pid === child.pid) {
      console.warn(`[Predictix Scraper] Process timed out (${timeoutMs/1000}s). Killing process tree.`);
      sendEvent('log', { message: `[Predictix] Le scraper a expiré après ${timeoutMs/1000}s. Arrêt forcé...` });
      sendEvent('error', { message: `Temps limite de scraping dépassé (${timeoutMs/1000}s).` });
      
      const pid = child.pid;
      if (process.platform === 'win32') {
        exec(`taskkill /pid ${pid} /T /F`, (err) => {
          if (err) console.error('Failed to taskkill timed-out scraper:', err.message);
        });
      } else {
        child.kill();
      }
      activeScraperProcess = null;
      clearInterval(keepAliveInterval);
      res.end();
    }
  }, timeoutMs);

  // Inactivity timeout guard: 45 seconds of silence = kill!
  let inactivityTimer = null;
  const INACTIVITY_TIMEOUT_MS = 45000;

  const resetInactivityTimer = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      if (activeScraperProcess && activeScraperProcess.pid === child.pid) {
        console.warn(`[Predictix Scraper] Inactivity timeout (45s of silence). Killing process tree.`);
        sendEvent('log', { message: `[Predictix] Le scraper est inactif depuis 45s (aucun log). Arrêt forcé...` });
        sendEvent('error', { message: `Scraper arrêté automatiquement pour inactivité (45s de silence).` });
        
        const pid = child.pid;
        if (process.platform === 'win32') {
          exec(`taskkill /pid ${pid} /T /F`, (err) => {
            if (err) console.error('Failed to taskkill inactive scraper:', err.message);
          });
        } else {
          child.kill();
        }
        activeScraperProcess = null;
        clearInterval(keepAliveInterval);
        res.end();
      }
    }, INACTIVITY_TIMEOUT_MS);
  };

  // Start the inactivity timer initially
  resetInactivityTimer();

  let logBuffer = '';

  const handleOutput = (data) => {
    // Reset inactivity timer since we received output
    resetInactivityTimer();

    logBuffer += data.toString();
    const lines = logBuffer.split('\n');
    logBuffer = lines.pop(); // Keep incomplete line in buffer

    for (const line of lines) {
      const cleanLine = line.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').trim();
      if (cleanLine) {
        sendEvent('log', { message: cleanLine });
      }
    }
  };

  child.stdout.on('data', handleOutput);
  child.stderr.on('data', handleOutput);

  child.on('error', (error) => {
    clearTimeout(timeoutGuard);
    if (inactivityTimer) clearTimeout(inactivityTimer);
    console.error('Failed to start scraper process:', error);
    sendEvent('error', { message: `Impossible de lancer le scraper : ${error.message}` });
    clearInterval(keepAliveInterval);
    res.end();
  });

  child.on('close', async (code) => {
    clearTimeout(timeoutGuard);
    if (inactivityTimer) clearTimeout(inactivityTimer);
    activeScraperProcess = null;
    
    if (stopScraperRequested) {
      sendEvent('log', { message: `[Predictix] Scraping annulé par l'utilisateur.` });
      clearInterval(keepAliveInterval);
      return res.end();
    }

    // Process remaining buffer
    if (logBuffer.trim()) {
      sendEvent('log', { message: logBuffer.trim() });
    }

    sendEvent('log', { message: `[Predictix] Le processus scraper s'est terminé avec le code : ${code}` });

    if (code !== 0) {
      sendEvent('error', { message: `Le scraper a rencontré une erreur (Code de sortie : ${code})` });
      clearInterval(keepAliveInterval);
      return res.end();
    }

    try {
      sendEvent('log', { message: '[Predictix] Analyse et importation des données...' });
      
      const newestFile = getNewestScrapedFile(outputDirs);
      if (!newestFile) {
        sendEvent('error', { message: `Aucun fichier de données scrapées (.json) trouvé dans les répertoires scannés.` });
        clearInterval(keepAliveInterval);
        return res.end();
      }

      sendEvent('log', { message: `[Predictix] Lecture du fichier : ${path.basename(newestFile)}` });
      
      const rawData = fs.readFileSync(newestFile, 'utf-8');
      const parsed = JSON.parse(rawData);

      const matches = parsed.all_matches || parsed.matches || [];
      sendEvent('log', { message: `[Predictix] ${matches.length} matchs trouvés. Enregistrement dans SQLite...` });

      let importedCount = 0;
      const settledBetsList = [];

      for (const match of matches) {
        if (!match.home_team || !match.away_team) {
          continue;
        }

        let status = match.status || 'Planned';
        const matchTime = String(match.time || '');
        if (matchTime.includes("'") || matchTime.toLowerCase().includes('mi-temps') || matchTime.toLowerCase().includes('mt') || matchTime.toLowerCase().includes('prol.')) {
          status = 'Live';
        } else if (matchTime.toLowerCase().includes('fin') || matchTime.toLowerCase().includes('terminé') || matchTime.toLowerCase().includes('ft')) {
          status = 'Finished';
        }

        const isLive = match.is_live === true || status === 'Live' ? 1 : 0;
        const isFinished = match.is_finished === true || status === 'Finished' ? 1 : 0;
        const matchId = match.match_id || `${match.home_team}_${match.away_team}_${match.date || new Date().toISOString().slice(0,10)}`;

        const hashSeed = match.home_team + match.away_team;
        let charSum = 0;
        for (let i = 0; i < hashSeed.length; i++) {
          charSum += hashSeed.charCodeAt(i);
        }
        
        const stableProb = 55 + (charSum % 25);
        const cardLine = match.card_line || (charSum % 2 === 0 ? '4.5' : '5.5');
        const bestTip = match.best_tip || (stableProb >= 66 ? 'Plus de' : 'Moins de');
        const probability = match.probability || `${stableProb}%`;
        const overOdds = match.over_odds || (bestTip === 'Plus de' ? '1.85' : '2.05');
        const underOdds = match.under_odds || (bestTip === 'Moins de' ? '1.90' : '1.75');
        const winRate = match.win_rate || `${45 + (charSum % 35)}%`;

        const homeClean = (match.home_team || '').replace(/[▲▼]/g, '').trim();
        const awayClean = (match.away_team || '').replace(/[▲▼]/g, '').trim();

        const sql = `
          INSERT OR REPLACE INTO scraped_predictions (
            match_id, time, date, tournament, home_team, away_team, score,
            over_odds, under_odds, card_line, probability, best_tip, win_rate, status,
            is_live, is_finished, first_half_corners_home, first_half_corners_away, odds_corners,
            home_logo, away_logo, historical_links, match_url, scraped_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;

        await dbRun(sql, [
          matchId,
          match.time || '',
          match.date || parsed.metadata?.scraped_at?.substring(0, 10) || new Date().toISOString().substring(0, 10),
          match.tournament || match.league || 'Football',
          homeClean,
          awayClean,
          match.score || '',
          overOdds,
          underOdds,
          cardLine,
          probability,
          bestTip,
          winRate,
          status,
          isLive,
          isFinished,
          match.first_half_corners_home !== undefined ? match.first_half_corners_home : null,
          match.first_half_corners_away !== undefined ? match.first_half_corners_away : null,
          match.odds_corners ? JSON.stringify(match.odds_corners) : null,
          match.home_logo || null,
          match.away_logo || null,
          match.historical_links ? JSON.stringify(match.historical_links) : null,
          match.match_url || null
        ]);

        importedCount++;

        // Auto-settle any pending bets for this primary match in real time
        if (match.first_half_corners_home !== null && match.first_half_corners_home !== undefined &&
            match.first_half_corners_away !== null && match.first_half_corners_away !== undefined) {
          try {
            const { autoSettleBetsForMatch } = await import('./bets.js');
            const resolved = await autoSettleBetsForMatch(matchId, match.first_half_corners_home, match.first_half_corners_away);
            if (resolved && resolved.length > 0) {
              settledBetsList.push(...resolved);
            }
          } catch (err) {
            console.error('[Predictix Import] Failed to auto-settle bet:', err.message);
          }
        }
      }

      sendEvent('log', { message: `[Predictix] ✓ Importation réussie : ${importedCount} prédictions insérées.` });
      sendEvent('log', { message: `[Predictix] Analyse de l'historique des opposants...` });

      try {
        // Collect all historical links from newly imported matches that are not already cached
        const uncachedLinksSet = new Set();
        for (const match of matches) {
          if (match.historical_links) {
            let linksList = [];
            try {
              linksList = typeof match.historical_links === 'string' 
                ? JSON.parse(match.historical_links) 
                : match.historical_links;
            } catch (e) {
              linksList = match.historical_links;
            }
            
            if (Array.isArray(linksList) && linksList.length > 1) {
              let matchAddedCount = 0;
              for (const link of linksList) {
                if (matchAddedCount >= 10) break; // Limit to 10 past confrontations per match
                
                const cached = await dbQuery('SELECT match_id, date FROM scraped_predictions WHERE match_id = ?', [link]);
                const isPlaceholder = cached.length > 0 && 
                  (cached[0].date === '2026-05-30' || cached[0].date === '2026-05-31' || cached[0].date.includes(':'));
                if (cached.length === 0 || isPlaceholder) {
                  uncachedLinksSet.add(link);
                  matchAddedCount++;
                }
              }
            }
          }
        }

        const linksToScrape = Array.from(uncachedLinksSet).slice(0, 80);
        
        if (linksToScrape.length > 0) {
          sendEvent('log', { message: `[Predictix] ${linksToScrape.length} nouvelles confrontations à scrapper` });
          
          const concurrency = 4;
          for (let i = 0; i < linksToScrape.length; i += concurrency) {
            if (stopScraperRequested) {
              sendEvent('log', { message: `[Predictix] Deep crawl annulé par l'utilisateur.` });
              break;
            }

            const chunk = linksToScrape.slice(i, i + concurrency);
            
            await Promise.all(chunk.map(async (link) => {
              if (stopScraperRequested) return;

              sendEvent('log', { message: `[Predictix] Deep crawling over Tor: ${link}` });
              const histMatch = await scrapeSingleMatch(scraperPath, link, true); // skipOdds = true for past matches

              if (histMatch && histMatch.home_team && histMatch.away_team) {
                const homeClean = histMatch.home_team.replace(/[▲▼]/g, '').trim();
                const awayClean = histMatch.away_team.replace(/[▲▼]/g, '').trim();

                const sqlHist = `
                  INSERT OR REPLACE INTO scraped_predictions (
                    match_id, time, date, tournament, home_team, away_team, score,
                    over_odds, under_odds, card_line, probability, best_tip, win_rate, status,
                    is_live, is_finished, first_half_corners_home, first_half_corners_away, odds_corners,
                    home_logo, away_logo, is_historical, scraped_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `;

                const hashSeed = homeClean + awayClean;
                let charSum = 0;
                for (let k = 0; k < hashSeed.length; k++) charSum += hashSeed.charCodeAt(k);
                const stableProb = 55 + (charSum % 25);
                const cardLine = histMatch.card_line || (charSum % 2 === 0 ? '4.5' : '5.5');
                const bestTip = histMatch.best_tip || (stableProb >= 66 ? 'Plus de' : 'Moins de');

                let histDate = histMatch.date || new Date().toISOString().substring(0, 10);
                let histTime = histMatch.time || 'Finished';
                if (histDate.includes(':')) {
                  histTime = histDate;
                  histDate = new Date().toISOString().substring(0, 10);
                }

                await dbRun(sqlHist, [
                  link,
                  histTime,
                  histDate,
                  histMatch.tournament || 'Football',
                  homeClean,
                  awayClean,
                  histMatch.score || '',
                  '1.85', '1.90', cardLine, `${stableProb}%`, bestTip, '60%', 'Finished',
                  0, 1,
                  histMatch.first_half_corners_home,
                  histMatch.first_half_corners_away,
                  null,
                  histMatch.home_logo || null,
                  histMatch.away_logo || null,
                  1
                ]);

                const scoreText = histMatch.score ? ` (Score: ${histMatch.score})` : '';
                const dateText = histMatch.date ? ` (Date: ${histMatch.date})` : '';
                sendEvent('log', { message: `[Predictix] ✓ Confrontation importée : ${homeClean} vs ${awayClean}${dateText}${scoreText}` });
              } else {
                const sqlHistSkipped = `
                  INSERT OR REPLACE INTO scraped_predictions (
                    match_id, time, date, tournament, home_team, away_team, score,
                    over_odds, under_odds, card_line, probability, best_tip, win_rate, status,
                    is_live, is_finished, is_historical, scraped_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `;
                await dbRun(sqlHistSkipped, [
                  link,
                  'Finished',
                  new Date().toISOString().substring(0, 10),
                  'Football',
                  'Skipped Match',
                  'Skipped Match',
                  '-',
                  '1.85', '1.90', '4.5', '50%', 'Plus de', '50%', 'Finished',
                  0, 1,
                  1
                ]);
                sendEvent('log', { message: `[Predictix] ✓ Confrontation sautée (échec du crawl) : ${link}` });
              }
            }));

            // Polite delay between batches to avoid Tor congestion
            if (i + concurrency < linksToScrape.length) {
              await new Promise(r => setTimeout(r, 1200));
            }
          }
        }
        
        sendEvent('log', { message: `[Predictix] ✓ Scraping de l'historique terminé avec succès.` });
      } catch (deepCrawlErr) {
        console.error("Error in sync deep H2H crawl:", deepCrawlErr);
        sendEvent('log', { message: `[ERREUR H2H] Échec du crawl profond : ${deepCrawlErr.message}` });
      }

      sendEvent('complete', { count: importedCount, settledBets: settledBetsList });
      clearInterval(keepAliveInterval);
      res.end();
    } catch (error) {
      console.error('Error importing scraped data:', error);
      sendEvent('error', { message: `Erreur lors de l'importation en base de données : ${error.message}` });
      clearInterval(keepAliveInterval);
      res.end();
    }
  });
});

// Stop active scraper run
router.post('/predictions/scrape/stop', (req, res) => {
  stopScraperRequested = true;
  
  if (activeScraperProcess) {
    try {
      const pid = activeScraperProcess.pid;
      console.log(`[Predictix] Stopping scraper process tree PID: ${pid}`);
      // Kill the whole process tree on Windows using taskkill
      exec(`taskkill /pid ${pid} /T /F`, (err) => {
        if (err) {
          console.warn(`[Predictix] taskkill failed, fallback to process kill: ${err.message}`);
          activeScraperProcess.kill();
        }
      });
      activeScraperProcess = null;
      return res.json({ success: true, message: "Scraper arrêté avec succès." });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  } else {
    return res.json({ success: true, message: "Demande d'arrêt prise en compte." });
  }
});

// POST /predictions/:matchId/crawl-history
router.post('/predictions/:matchId/crawl-history', async (req, res) => {
  const { matchId } = req.params;
  try {
    const match = await dbGet('SELECT * FROM scraped_predictions WHERE match_id = ?', [matchId]);
    if (!match) {
      return res.status(404).json({ success: false, error: { message: "Match introuvable." } });
    }

    let links = [];
    try {
      if (match.historical_links) {
        links = JSON.parse(match.historical_links);
      }
    } catch (e) {}

    const scraperPath = process.env.SCRAPER_PATH || 'E:\\Developpement\\scrapper-v3';

    // Check if the match is already crawling to avoid duplicate crawler spawns
    if (activeCrawlHistoryMatches.has(matchId)) {
      return res.json({
        success: true,
        message: "Analyse déjà en cours d'exécution pour ce match.",
        count: links.length
      });
    }

    const torActive = await isTorActive();
    if (!torActive) {
      return res.status(400).json({ 
        success: false, 
        error: { message: "Le proxy Tor local n'est pas actif sur le port 9050. Veuillez lancer Tor et réessayer." } 
      });
    }

    // Mark the match as crawling
    activeCrawlHistoryMatches.add(matchId);

    const spawnedChildren = [];
    const onSpawn = (child) => spawnedChildren.push(child);

    // Global safety timeout for this background H2H crawl: 45 seconds max!
    const backgroundTimeout = setTimeout(() => {
      if (activeCrawlHistoryMatches.has(matchId)) {
        console.warn(`[Predictix H2H Crawl] H2H crawl timed out globally (45s) for match: ${matchId}. Aborting background crawl.`);
        
        // Force kill all spawned processes for this match H2H crawl!
        for (const child of spawnedChildren) {
          if (child && !child.killed) {
            try {
              const pid = child.pid;
              if (process.platform === 'win32') {
                exec(`taskkill /pid ${pid} /T /F`, (err) => {
                  if (err) console.error('Failed to taskkill H2H child process on timeout:', err.message);
                });
              } else {
                child.kill();
              }
            } catch (e) {}
          }
        }
        
        activeCrawlHistoryMatches.delete(matchId);
      }
    }, 45000);

    // Send instant success response to the client
    res.json({
      success: true,
      message: "Analyse lancée en arrière-plan.",
      count: links.length
    });

    // Run the crawling logic in the background
    (async () => {
      try {
        let activeLinks = [...links];

        // Phase A: If the match was skipped (so links has only 1 primary URL),
        // we crawl it to enrich the primary match itself.
        if (activeLinks.length === 1 && activeLinks[0].startsWith('/live-score/')) {
          let targetLink = activeLinks[0];
          // If the match is not started yet (time is Planned or not Finished),
          // H2H past matches are located on the '?p=face-a-face' tab.
          if (match.is_finished === 0 || match.time === 'Planned' || !match.score || match.score === '-' || match.score === '') {
            if (!targetLink.includes('?p=')) {
              targetLink += '?p=face-a-face';
            }
          }

          console.log(`[Predictix On-Demand Background] Crawling primary match page: ${targetLink}`);
          const primaryDetails = await scrapeSingleMatch(scraperPath, targetLink, false, onSpawn); // skipOdds = false to retrieve Oddschecker corner odds!

          if (primaryDetails) {
            const homeClean = primaryDetails.home_team.replace(/[▲▼]/g, '').trim();
            const awayClean = primaryDetails.away_team.replace(/[▲▼]/g, '').trim();
            const hashSeed = homeClean + awayClean;
            let charSum = 0;
            for (let k = 0; k < hashSeed.length; k++) charSum += hashSeed.charCodeAt(k);
            const stableProb = 55 + (charSum % 25);
            const cardLine = primaryDetails.card_line || (charSum % 2 === 0 ? '4.5' : '5.5');
            const bestTip = primaryDetails.best_tip || (stableProb >= 66 ? 'Plus de' : 'Moins de');

            let parsedPrimaryDate = parseFrenchDate(primaryDetails.date);
            let pDate = parsedPrimaryDate || match.date || new Date().toISOString().substring(0, 10);
            let pTime = primaryDetails.time || match.time;
            if (primaryDetails.date && primaryDetails.date.includes(':')) {
              pTime = primaryDetails.date;
              pDate = match.date || new Date().toISOString().substring(0, 10);
            }

            await dbRun(`
              UPDATE scraped_predictions SET
                first_half_corners_home = ?,
                first_half_corners_away = ?,
                home_logo = ?,
                away_logo = ?,
                historical_links = ?,
                odds_corners = ?,
                card_line = ?,
                best_tip = ?,
                probability = ?,
                date = ?,
                time = ?
              WHERE match_id = ?
            `, [
              primaryDetails.first_half_corners_home,
              primaryDetails.first_half_corners_away,
              primaryDetails.home_logo || null,
              primaryDetails.away_logo || null,
              primaryDetails.historical_links ? JSON.stringify(primaryDetails.historical_links) : null,
              primaryDetails.odds_corners ? JSON.stringify(primaryDetails.odds_corners) : null,
              cardLine,
              bestTip,
              `${stableProb}%`,
              pDate,
              pTime,
              matchId
            ]);

            console.log(`[Predictix On-Demand Background] ✓ Successfully enriched primary match ${matchId}!`);

            // Auto-settle any pending bets for this primary match in real time
            try {
              const { autoSettleBetsForMatch } = await import('./bets.js');
              await autoSettleBetsForMatch(matchId, primaryDetails.first_half_corners_home, primaryDetails.first_half_corners_away);
            } catch (err) {
              console.error('[Predictix On-Demand Background] Failed to auto-settle bet:', err.message);
            }

            activeLinks = primaryDetails.historical_links || [];
          }
        }

        if (activeLinks.length > 0) {
          console.log(`[Predictix On-Demand Background] Starting background H2H deep crawl for ${activeLinks.length} past matches...`);
          const uncachedLinks = [];
          for (const link of activeLinks) {
            const cached = await dbQuery('SELECT match_id, date FROM scraped_predictions WHERE match_id = ?', [link]);
            const isPlaceholder = cached.length > 0 && 
              (cached[0].date === '2026-05-30' || cached[0].date === '2026-05-31' || cached[0].date.includes(':'));
            if (cached.length === 0 || isPlaceholder) {
              uncachedLinks.push(link);
            }
          }

          console.log(`[Predictix On-Demand Background] ${activeLinks.length - uncachedLinks.length} cached, ${uncachedLinks.length} new to crawl.`);
          
          const linksToScrape = uncachedLinks.slice(0, 8);
          const concurrency = 4;
          let importedCount = 0;

          for (let i = 0; i < linksToScrape.length; i += concurrency) {
            if (stopScraperRequested || !activeCrawlHistoryMatches.has(matchId)) {
              console.log("[Predictix On-Demand Background] Deep H2H crawl cancelled or timed out.");
              break;
            }
            const chunk = linksToScrape.slice(i, i + concurrency);
            
            await Promise.all(chunk.map(async (link) => {
              if (stopScraperRequested || !activeCrawlHistoryMatches.has(matchId)) return;
              console.log(`[Predictix On-Demand Background] Parallel crawling H2H link: ${link}`);
              const histMatch = await scrapeSingleMatch(scraperPath, link, true, onSpawn); // skipOdds = true for speed!

              if (histMatch && histMatch.home_team && histMatch.away_team) {
                const homeClean = histMatch.home_team.replace(/[▲▼]/g, '').trim();
                const awayClean = histMatch.away_team.replace(/[▲▼]/g, '').trim();

                const sqlHist = `
                  INSERT OR REPLACE INTO scraped_predictions (
                    match_id, time, date, tournament, home_team, away_team, score,
                    over_odds, under_odds, card_line, probability, best_tip, win_rate, status,
                    is_live, is_finished, first_half_corners_home, first_half_corners_away, odds_corners,
                    home_logo, away_logo, is_historical, scraped_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `;

                const hashSeed = homeClean + awayClean;
                let charSum = 0;
                for (let k = 0; k < hashSeed.length; k++) charSum += hashSeed.charCodeAt(k);
                const stableProb = 55 + (charSum % 25);
                const cardLine = histMatch.card_line || (charSum % 2 === 0 ? '4.5' : '5.5');
                const bestTip = histMatch.best_tip || (stableProb >= 66 ? 'Plus de' : 'Moins de');

                let parsedHistDate = parseFrenchDate(histMatch.date);
                let histDate = parsedHistDate || new Date().toISOString().substring(0, 10);
                let histTime = histMatch.time || 'Finished';
                if (histMatch.date && histMatch.date.includes(':')) {
                  histTime = histMatch.date;
                  histDate = new Date().toISOString().substring(0, 10);
                }

                await dbRun(sqlHist, [
                  link,
                  histTime,
                  histDate,
                  histMatch.tournament || 'Football',
                  homeClean,
                  awayClean,
                  histMatch.score || '',
                  '1.85', '1.90', cardLine, `${stableProb}%`, bestTip, '60%', 'Finished',
                  0, 1,
                  histMatch.first_half_corners_home,
                  histMatch.first_half_corners_away,
                  null,
                  histMatch.home_logo || null,
                  histMatch.away_logo || null,
                  1 // is_historical = 1
                ]);

                importedCount++;
                const scoreText = histMatch.score ? ` (Score: ${histMatch.score})` : '';
                const dateText = histMatch.date ? ` (Date: ${histMatch.date})` : '';
                console.log(`[Predictix On-Demand Background] ✓ Parallel H2H imported: ${homeClean} vs ${awayClean}${dateText}${scoreText}`);
              } else {
                const sqlHistSkipped = `
                  INSERT OR REPLACE INTO scraped_predictions (
                    match_id, time, date, tournament, home_team, away_team, score,
                    over_odds, under_odds, card_line, probability, best_tip, win_rate, status,
                    is_live, is_finished, is_historical, scraped_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `;
                await dbRun(sqlHistSkipped, [
                  link,
                  'Finished',
                  new Date().toISOString().substring(0, 10),
                  'Football',
                  'Skipped Match',
                  'Skipped Match',
                  '-',
                  '1.85', '1.90', '4.5', '50%', 'Plus de', '50%', 'Finished',
                  0, 1,
                  1
                ]);
                console.log(`[Predictix On-Demand Background] ✓ Parallel H2H skipped (failed): ${link}`);
              }
            }));

            // Polite delay between H2H batches
            if (i + concurrency < linksToScrape.length) {
              await new Promise(r => setTimeout(r, 1200));
            }
          }
        }
        console.log(`[Predictix On-Demand Background] ✓ Finished background crawl of H2H matches for primary match ${matchId}!`);
      } catch (err) {
        console.error('[Predictix On-Demand Background Error]', err.message);
      } finally {
        clearTimeout(backgroundTimeout);
        // Ensure the match ID is removed from active crawling list
        activeCrawlHistoryMatches.delete(matchId);
      }
    })();
  } catch (error) {
    console.error('[Predictix On-Demand Error]', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }
});

export default router;
