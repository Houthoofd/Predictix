import express from 'express';
import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { dbQuery, dbGet } from '../db/database.js';
import { isTorActive, getNewestScrapedFile, rewriteScraperLog, scrapeSingleMatch, runDiscoveryProcess } from '../utils/scraperHelpers.js';
import { enrichMatchPredictions, computeLeagueAverages, evaluateSmartScrapingFilter } from '../utils/predictionEngine.js';
import { importScrapedMatches, importHistoricalMatch, importSkippedMatch, enrichPrimaryMatch } from '../db/importer.js';

const router = express.Router();

let activeScraperProcess = null;
let stopScraperRequested = false;
const activeCrawlHistoryMatches = new Set();


/**
 * GET /api/predictions
 * Fetches cached predictions from the database and enriches them with regressed averages and Value Bets
 */
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
    
    // Dynamic League Averages learning: fetch completed historical matches to dynamically compute league baselines
    const allHistoricalMatches = await dbQuery(`
      SELECT tournament, home_team, away_team, first_half_corners_home, first_half_corners_away 
      FROM scraped_predictions 
      WHERE is_historical = 1 AND first_half_corners_home IS NOT NULL
    `);

    const leagueAverages = computeLeagueAverages(allHistoricalMatches);
    const enrichedRows = [];
    
    for (const row of rows) {
      // Find historical H2H matches between A and B (up to 10)
      const h2hMatches = await dbQuery(`
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

      const normalizedH2H = h2hMatches.map(normalizeMatchRow);
      
      // Find Team A (Home) recent matches played STRICTLY at Domicile (up to 10)
      const homeMatches = await dbQuery(`
        SELECT first_half_corners_home, first_half_corners_away, home_team, away_team, home_logo, away_logo, score, date, time, tournament
        FROM scraped_predictions 
        WHERE is_finished = 1 
          AND home_team = ?
        ORDER BY date DESC LIMIT 10
      `, [row.home_team]);
      
      const normalizedHome = homeMatches.map(normalizeMatchRow);
      
      // Find Team B (Away) recent matches played STRICTLY at Extérieur (up to 10)
      const awayMatches = await dbQuery(`
        SELECT first_half_corners_home, first_half_corners_away, home_team, away_team, home_logo, away_logo, score, date, time, tournament
        FROM scraped_predictions 
        WHERE is_finished = 1 
          AND away_team = ?
        ORDER BY date DESC LIMIT 10
      `, [row.away_team]);

      const normalizedAway = awayMatches.map(normalizeMatchRow);
      
      // Enrich prediction data using the modularized prediction engine
      const enriched = enrichMatchPredictions(row, leagueAverages, normalizedH2H, normalizedHome, normalizedAway, activeCrawlHistoryMatches);
      enrichedRows.push(enriched);
    }

    res.json({ success: true, data: enrichedRows });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /predictions/scrape/discover
 * Discovers matches on homepage listing
 */
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

  try {
    const matches = await runDiscoveryProcess(scraperPath, scriptName, outputDirs, (child) => {
      activeScraperProcess = child;
    });

    activeScraperProcess = null;

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
    activeScraperProcess = null;
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});


/**
 * POST /predictions/scrape
 * Trigger scraper execution and stream progress via Server-Sent Events (SSE)
 */
router.post('/predictions/scrape', async (req, res) => {
  stopScraperRequested = false;
  
  const strategyId = req.body.strategyId || req.query.strategyId || null;
  let targetStrategy = null;
  if (strategyId) {
    try {
      targetStrategy = await dbGet('SELECT * FROM custom_strategies WHERE id = ?', [strategyId]);
    } catch (e) {
      console.error("Failed to load target strategy in scraper:", e);
    }
  }
  
  // Disable timeouts for long streaming SSE scraper logs
  req.setTimeout(0);
  res.setTimeout(0);
  req.socket.setTimeout(0);
  
  // Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send keep-alive comment every 5 seconds to prevent idle timeout
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
    clearInterval(keepAliveInterval);
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

  // Inactivity timeout guard: 90 seconds of silence = kill!
  let inactivityTimer = null;
  const INACTIVITY_TIMEOUT_MS = 90000;

  const resetInactivityTimer = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      if (activeScraperProcess && activeScraperProcess.pid === child.pid) {
        console.warn(`[Predictix Scraper] Inactivity timeout (90s of silence). Killing process tree.`);
        sendEvent('log', { message: `[Predictix] Le scraper est inactif depuis 90s (aucun log). Arrêt forcé...` });
        sendEvent('error', { message: `Scraper arrêté automatiquement pour inactivité (90s de silence).` });
        
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
      let cleanLine = line.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').trim();
      if (cleanLine) {
        cleanLine = rewriteScraperLog(cleanLine, targetStrategy);
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

      // Run bulk SQLite import using the modular DB importer
      const { importedCount, settledBetsList } = await importScrapedMatches(matches, parsed.metadata?.scraped_at);

      sendEvent('log', { message: `[Predictix] ✓ Importation réussie : ${importedCount} prédictions insérées.` });
      sendEvent('log', { message: `[Predictix] Analyse de l'historique des opposants...` });

      try {
        // Collect all historical links from newly imported matches that are not already cached
        const uncachedLinksSet = new Set();
        for (const match of matches) {
          if (!match.home_team || !match.away_team) continue;

          // Smart-Scraping filter evaluation
          let isMatchPromising = true;
          if (targetStrategy) {
            const h2hExisting = await dbQuery(`
              SELECT * FROM scraped_predictions 
              WHERE is_finished = 1 
                AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))
            `, [match.home_team, match.away_team, match.away_team, match.home_team]);
            
            isMatchPromising = evaluateSmartScrapingFilter(match, h2hExisting, targetStrategy);
          }


          if (!isMatchPromising) {
            sendEvent('log', { message: `[Smart-Scraping] Match ${match.home_team} vs ${match.away_team} écarté (stats H2H hors-cible). Gain de temps Tor appréciable.` });
            continue;
          }

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
                await importHistoricalMatch(link, histMatch);
                const scoreText = histMatch.score ? ` (Score: ${histMatch.score})` : '';
                const dateText = histMatch.date ? ` (Date: ${histMatch.date})` : '';
                sendEvent('log', { message: `[Predictix] ✓ Confrontation importée : ${histMatch.home_team.replace(/[▲▼]/g, '').trim()} vs ${histMatch.away_team.replace(/[▲▼]/g, '').trim()}${dateText}${scoreText}` });
              } else {
                await importSkippedMatch(link);
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

/**
 * POST /predictions/scrape/stop
 * Stop active scraper run
 */
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

/**
 * POST /predictions/:matchId/crawl-history
 * Enriches a single match by crawling its page and past confrontations in the background
 */
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
            await enrichPrimaryMatch(matchId, primaryDetails, targetLink, match);
            console.log(`[Predictix On-Demand Background] ✓ Successfully enriched primary match ${matchId}!`);
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
                await importHistoricalMatch(link, histMatch);
                console.log(`[Predictix On-Demand Background] ✓ Parallel H2H imported: ${histMatch.home_team.replace(/[▲▼]/g, '').trim()} vs ${histMatch.away_team.replace(/[▲▼]/g, '').trim()}`);
              } else {
                await importSkippedMatch(link);
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
