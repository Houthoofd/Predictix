import express from 'express';
import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { dbQuery, dbRun, dbGet } from '../db/database.js';

const router = express.Router();

let activeScraperProcess = null;
let stopScraperRequested = false;
const activeCrawlHistoryMatches = new Set();

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
    const rows = await dbQuery('SELECT * FROM scraped_predictions WHERE is_historical = 0 ORDER BY scraped_at DESC, time ASC');
    
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
      const h2hMatches = await dbQuery(`
        SELECT first_half_corners_home, first_half_corners_away, home_team, away_team, home_logo, away_logo, score, date, tournament
        FROM scraped_predictions 
        WHERE is_finished = 1 
          AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))
        ORDER BY date DESC LIMIT 10
      `, [row.home_team, row.away_team, row.away_team, row.home_team]);
      
      // Find Team A (Home) recent matches played STRICTLY at Domicile (up to 10)
      const homeMatches = await dbQuery(`
        SELECT first_half_corners_home, first_half_corners_away, home_team, away_team, home_logo, away_logo, score, date, tournament
        FROM scraped_predictions 
        WHERE is_finished = 1 
          AND home_team = ?
        ORDER BY date DESC LIMIT 10
      `, [row.home_team]);
      
      // Find Team B (Away) recent matches played STRICTLY at Extérieur (up to 10)
      const awayMatches = await dbQuery(`
        SELECT first_half_corners_home, first_half_corners_away, home_team, away_team, home_logo, away_logo, score, date, tournament
        FROM scraped_predictions 
        WHERE is_finished = 1 
          AND away_team = ?
        ORDER BY date DESC LIMIT 10
      `, [row.away_team]);
      
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
      
      enrichedRows.push({
        ...row,
        best_tip: dynamicBestTip,
        card_line: dynamicCardLine,
        probability: dynamicProbability,
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

// Helper: Scrape a single match page dynamically over Tor
async function scrapeSingleMatch(scraperPath, link, skipOdds = false) {
  return new Promise((resolve) => {
    const tmpOutFile = path.join(scraperPath, 'data', `tmp_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);
    const exePath = path.join(scraperPath, 'cmd', 'scrapper-lite', 'examples', 'scrapper-matchendirect.exe');
    
    const args = ['-tor', '-url', link, '-output', tmpOutFile];
    if (skipOdds) {
      args.push('-skip-odds');
    }

    // Spawn Go scraper with -url and -tor options
    const child = spawn(exePath, args);
    
    child.on('error', (err) => {
      console.error('[Predictix Scraper] Failed to spawn single match scraper:', err.message);
      resolve(null);
    });
    
    child.on('close', async (code) => {
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
router.post('/predictions/scrape/discover', (req, res) => {
  if (activeScraperProcess) {
    return res.status(400).json({ success: false, error: { message: "Un scraping ou une découverte est déjà en cours d'exécution." } });
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

  let logOutput = '';
  child.stdout.on('data', (data) => logOutput += data.toString());
  child.stderr.on('data', (data) => logOutput += data.toString());

  child.on('error', (err) => {
    activeScraperProcess = null;
    console.error('[Predictix Discovery] Failed to spawn discovery process:', err);
    return res.status(500).json({ success: false, error: { message: `Impossible de démarrer le processus : ${err.message}` } });
  });

  child.on('close', async (code) => {
    activeScraperProcess = null;
    console.log(`[Predictix Discovery] Process closed with code: ${code}`);

    if (code !== 0) {
      return res.status(500).json({ success: false, error: { message: `Le scraper a échoué (Code : ${code})`, logs: logOutput } });
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
router.post('/predictions/scrape', (req, res) => {
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

  let logBuffer = '';

  const handleOutput = (data) => {
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
    console.error('Failed to start scraper process:', error);
    sendEvent('error', { message: `Impossible de lancer le scraper : ${error.message}` });
    clearInterval(keepAliveInterval);
    res.end();
  });

  child.on('close', async (code) => {
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
            home_logo, away_logo, historical_links, scraped_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
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
          match.historical_links ? JSON.stringify(match.historical_links) : null
        ]);

        importedCount++;
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
              for (const link of linksList) {
                const cached = await dbQuery('SELECT match_id FROM scraped_predictions WHERE match_id = ?', [link]);
                if (cached.length === 0) {
                  uncachedLinksSet.add(link);
                }
              }
            }
          }
        }

        const linksToScrape = Array.from(uncachedLinksSet).slice(0, 12);
        
        if (linksToScrape.length > 0) {
          sendEvent('log', { message: `[Predictix] ${linksToScrape.length} nouveaux à scrapper` });
          
          for (const link of linksToScrape) {
            if (stopScraperRequested) {
              sendEvent('log', { message: `[Predictix] Deep crawl annulé par l'utilisateur.` });
              break;
            }

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
              for (let i = 0; i < hashSeed.length; i++) charSum += hashSeed.charCodeAt(i);
              const stableProb = 55 + (charSum % 25);
              const cardLine = histMatch.card_line || (charSum % 2 === 0 ? '4.5' : '5.5');
              const bestTip = histMatch.best_tip || (stableProb >= 66 ? 'Plus de' : 'Moins de');

              await dbRun(sqlHist, [
                link,
                'Finished',
                histMatch.date || new Date().toISOString().substring(0, 10),
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
              sendEvent('log', { message: `[Predictix] ✓ Confrontation importee : ${homeClean} vs ${awayClean}${dateText}${scoreText}` });
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

            // Polite delay to prevent Tor bottleneck
            await new Promise(r => setTimeout(r, 1500));
          }
        }
        
        sendEvent('log', { message: `[Predictix] ✓ Scraping de l'historique terminé avec succès.` });
      } catch (deepCrawlErr) {
        console.error("Error in sync deep H2H crawl:", deepCrawlErr);
        sendEvent('log', { message: `[ERREUR H2H] Échec du crawl profond : ${deepCrawlErr.message}` });
      }

      sendEvent('complete', { count: importedCount });
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

    // Mark the match as crawling
    activeCrawlHistoryMatches.add(matchId);

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
          const primaryDetails = await scrapeSingleMatch(scraperPath, targetLink, false); // skipOdds = false to retrieve Oddschecker corner odds!

          if (primaryDetails) {
            const homeClean = primaryDetails.home_team.replace(/[▲▼]/g, '').trim();
            const awayClean = primaryDetails.away_team.replace(/[▲▼]/g, '').trim();
            const hashSeed = homeClean + awayClean;
            let charSum = 0;
            for (let k = 0; k < hashSeed.length; k++) charSum += hashSeed.charCodeAt(k);
            const stableProb = 55 + (charSum % 25);
            const cardLine = primaryDetails.card_line || (charSum % 2 === 0 ? '4.5' : '5.5');
            const bestTip = primaryDetails.best_tip || (stableProb >= 66 ? 'Plus de' : 'Moins de');

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
                probability = ?
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
              matchId
            ]);

            console.log(`[Predictix On-Demand Background] ✓ Successfully enriched primary match ${matchId}!`);
            activeLinks = primaryDetails.historical_links || [];
          }
        }

        if (activeLinks.length > 0) {
          console.log(`[Predictix On-Demand Background] Starting background H2H deep crawl for ${activeLinks.length} past matches...`);
          const uncachedLinks = [];
          for (const link of activeLinks) {
            const cached = await dbQuery('SELECT match_id FROM scraped_predictions WHERE match_id = ?', [link]);
            if (cached.length === 0) {
              uncachedLinks.push(link);
            }
          }

          console.log(`[Predictix On-Demand Background] ${activeLinks.length - uncachedLinks.length} cached, ${uncachedLinks.length} new to crawl.`);
          
          const linksToScrape = uncachedLinks.slice(0, 12);
          const concurrency = 4;
          let importedCount = 0;

          for (let i = 0; i < linksToScrape.length; i += concurrency) {
            const chunk = linksToScrape.slice(i, i + concurrency);
            
            await Promise.all(chunk.map(async (link) => {
              console.log(`[Predictix On-Demand Background] Parallel crawling H2H link: ${link}`);
              const histMatch = await scrapeSingleMatch(scraperPath, link, true); // skipOdds = true for speed!

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

                await dbRun(sqlHist, [
                  link,
                  'Finished',
                  histMatch.date || new Date().toISOString().substring(0, 10),
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
