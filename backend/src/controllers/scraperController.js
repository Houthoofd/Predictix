import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { dbQuery, dbGet } from '../db/database.js';
import { isTorActive, getNewestScrapedFile, rewriteScraperLog, scrapeSingleMatch, runDiscoveryProcess, crawlH2HLinksBatch, prioritizeDirectH2H } from '../utils/scraperHelpers.js';
import { enrichMatchPredictions, computeLeagueAverages, evaluateSmartScrapingFilter, getEnrichedPredictions } from '../utils/predictionEngine.js';
import { importScrapedMatches, importHistoricalMatch, importSkippedMatch, enrichPrimaryMatch } from '../db/importer.js';

let activeScraperProcess = null;
let stopScraperRequested = false;
const activeCrawlHistoryMatches = new Set();

/**
 * Controller to handle scraper operations, state, and HTTP endpoints
 */
class ScraperController {
  /**
   * GET /predictions
   */
  async getPredictions(req, res) {
    try {
      const data = await getEnrichedPredictions(req.query, dbQuery, activeCrawlHistoryMatches);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  /**
   * POST /predictions/scrape/discover
   */
  async discoverMatches(req, res) {
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

    const targetDate = req.body.date || req.query.date || null;
    let formattedDate = null;
    if (targetDate) {
      const ymdMatch = targetDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (ymdMatch) {
        formattedDate = `${ymdMatch[3]}-${ymdMatch[2]}-${ymdMatch[1]}`;
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(targetDate)) {
        formattedDate = targetDate;
      }
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
      const matches = await runDiscoveryProcess(scraperPath, scriptName, outputDirs, formattedDate, (child) => {
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
          href: m.historical_links?.[0] || ''
        }))
      });
    } catch (err) {
      activeScraperProcess = null;
      return res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  /**
   * POST /predictions/scrape
   */
  async startScraping(req, res) {
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
    
    req.setTimeout(0);
    res.setTimeout(0);
    req.socket.setTimeout(0);
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

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

    let scriptName = process.env.SCRAPER_SCRIPT || 'scrape-ratingbet.bat';
    if (!process.env.SCRAPER_SCRIPT) {
      if (fs.existsSync(path.join(scraperPath, 'scrape-matchendirect.bat'))) {
        scriptName = 'scrape-matchendirect.bat';
      } else if (fs.existsSync(path.join(scraperPath, 'scrape-matchendirect.sh'))) {
        scriptName = 'scrape-matchendirect.sh';
      }
    }

    const limit = req.body.limit || req.query.limit || 30;
    const targetDate = req.body.date || req.query.date || null;
    let formattedDate = null;
    if (targetDate) {
      const ymdMatch = targetDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (ymdMatch) {
        formattedDate = `${ymdMatch[3]}-${ymdMatch[2]}-${ymdMatch[1]}`;
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(targetDate)) {
        formattedDate = targetDate;
      }
    }

    sendEvent('log', { message: `[Predictix] Execution du script : ${scriptName} (limite : ${limit} matchs, date : ${formattedDate || 'aujourd\'hui'})` });

    const args = ['/c', scriptName, 'verbose', limit];
    if (formattedDate) {
      args.push('');
      args.push(formattedDate);
    }

    const child = spawn('cmd.exe', args, {
      cwd: scraperPath,
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    activeScraperProcess = child;

    const timeoutMs = (parseInt(limit, 10) * 75 * 1000) + 120000;
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

    resetInactivityTimer();

    let logBuffer = '';

    const handleOutput = (data) => {
      resetInactivityTimer();

      logBuffer += data.toString();
      const lines = logBuffer.split('\n');
      logBuffer = lines.pop();

      for (const line of lines) {
        let cleanLine = line.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').trim();
        if (cleanLine.startsWith('[STRUCT_MATCH_DATA]')) {
          try {
            const matchJsonStr = cleanLine.replace('[STRUCT_MATCH_DATA]', '').trim();
            const matchData = JSON.parse(matchJsonStr);
            sendEvent('match_scraped', { match: matchData });
          } catch(e) {
            console.error("Failed to parse STRUCT_MATCH_DATA:", e);
          }
          continue;
        }
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

        const { importedCount, settledBetsList } = await importScrapedMatches(matches, parsed.metadata?.scraped_at);

        sendEvent('log', { message: `[Predictix] ✓ Importation réussie : ${importedCount} prédictions insérées.` });
        sendEvent('log', { message: `[Predictix] Analyse de l'historique des opposants...` });

        try {
          const uncachedLinksSet = new Set();
          for (const match of matches) {
            if (!match.home_team || !match.away_team) continue;

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
                const prioritizedLinks = prioritizeDirectH2H(linksList, match.home_team, match.away_team);
                let matchAddedCount = 0;
                for (const link of prioritizedLinks) {
                  if (matchAddedCount >= 10) break;
                  
                  const cached = await dbQuery('SELECT match_id, date, score, first_half_corners_home, first_half_corners_away FROM scraped_predictions WHERE match_id = ?', [link]);
                  const isPlaceholder = cached.length > 0 && 
                    (cached[0].date === '2026-05-30' || cached[0].date === '2026-05-31' || cached[0].date.includes(':'));
                  const hasNoStats = cached.length > 0 && cached[0].first_half_corners_home === null;
                  if (cached.length === 0 || isPlaceholder || hasNoStats) {
                    uncachedLinksSet.add(link);
                    matchAddedCount++;
                  } else {
                    const score = cached[0].score || '-';
                    const corners = (cached[0].first_half_corners_home !== null && cached[0].first_half_corners_home !== undefined)
                      ? `${cached[0].first_half_corners_home}-${cached[0].first_half_corners_away}`
                      : 'N/A';
                    sendEvent('log', { message: `[H2H Cache] Confrontation déjà en cache : ${match.home_team} vs ${match.away_team} (Score: ${score}) (Corners 1ère MT: ${corners})` });
                    sendEvent('h2h_scraped', { h2h: {
                      match_url: link,
                      home_team: match.home_team,
                      away_team: match.away_team,
                      score: score,
                      date: cached[0].date,
                      first_half_corners_home: cached[0].first_half_corners_home,
                      first_half_corners_away: cached[0].first_half_corners_away
                    }});
                  }
                }
              }
            }
          }

          const linksToScrape = Array.from(uncachedLinksSet).slice(0, 80);
          
          if (linksToScrape.length > 0) {
            sendEvent('log', { message: `[Predictix] ${linksToScrape.length} nouvelles confrontations à scrapper` });
            
            await crawlH2HLinksBatch(linksToScrape, scraperPath, {
              concurrency: 4,
              shouldStop: () => stopScraperRequested,
              log: (msg) => sendEvent('log', { message: msg }),
              importHistoricalMatch,
              importSkippedMatch,
              onH2HScraped: (h2hData) => sendEvent('h2h_scraped', { h2h: h2hData })
            });
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
  }

  /**
   * POST /predictions/scrape/stop
   */
  stopScraping(req, res) {
    stopScraperRequested = true;
    
    if (activeScraperProcess) {
      try {
        const pid = activeScraperProcess.pid;
        console.log(`[Predictix] Stopping scraper process tree PID: ${pid}`);
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
  }

  /**
   * POST /predictions/:matchId/crawl-history
   */
  async crawlMatchHistory(req, res) {
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

      activeCrawlHistoryMatches.add(matchId);

      const spawnedChildren = [];
      const onSpawn = (child) => spawnedChildren.push(child);

      const backgroundTimeout = setTimeout(() => {
        if (activeCrawlHistoryMatches.has(matchId)) {
          console.warn(`[Predictix H2H Crawl] H2H crawl timed out globally (120s) for match: ${matchId}. Aborting background crawl.`);
          
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
      }, 120000);

      res.json({
        success: true,
        message: "Analyse lancée en arrière-plan.",
        count: links.length
      });

      (async () => {
        try {
          let activeLinks = [...links];

          if (activeLinks.length === 1 && activeLinks[0].startsWith('/live-score/')) {
            let targetLink = activeLinks[0];
            if (match.is_finished === 0 || match.time === 'Planned' || !match.score || match.score === '-' || match.score === '') {
              if (!targetLink.includes('?p=')) {
                targetLink += '?p=face-a-face';
              }
            }

            console.log(`[Predictix On-Demand Background] Crawling primary match page: ${targetLink}`);
            const primaryDetails = await scrapeSingleMatch(scraperPath, targetLink, false, onSpawn);

            if (primaryDetails) {
              await enrichPrimaryMatch(matchId, primaryDetails, targetLink, match);
              console.log(`[Predictix On-Demand Background] ✓ Successfully enriched primary match ${matchId}!`);
              activeLinks = primaryDetails.historical_links || [];
            }
          }

          if (activeLinks.length > 0) {
            console.log(`[Predictix On-Demand Background] Starting background H2H deep crawl for ${activeLinks.length} past matches...`);
            const prioritizedLinks = prioritizeDirectH2H(activeLinks, match.home_team, match.away_team);
            const uncachedLinks = [];
            for (const link of prioritizedLinks) {
              const cached = await dbQuery('SELECT match_id, date, first_half_corners_home FROM scraped_predictions WHERE match_id = ?', [link]);
              const isPlaceholder = cached.length > 0 && 
                (cached[0].date === '2026-05-30' || cached[0].date === '2026-05-31' || cached[0].date.includes(':'));
              const hasNoStats = cached.length > 0 && cached[0].first_half_corners_home === null;
              if (cached.length === 0 || isPlaceholder || hasNoStats) {
                uncachedLinks.push(link);
              }
            }

            console.log(`[Predictix On-Demand Background] ${activeLinks.length - uncachedLinks.length} cached, ${uncachedLinks.length} new to crawl.`);
            
            const linksToScrape = uncachedLinks.slice(0, 8);
            await crawlH2HLinksBatch(linksToScrape, scraperPath, {
              concurrency: 4,
              onSpawn: onSpawn,
              shouldStop: () => stopScraperRequested || !activeCrawlHistoryMatches.has(matchId),
              log: (msg) => console.log(`[Predictix On-Demand Background] ${msg}`),
              importHistoricalMatch,
              importSkippedMatch
            });
          }
          console.log(`[Predictix On-Demand Background] ✓ Finished background crawl of H2H matches for primary match ${matchId}!`);
        } catch (err) {
          console.error('[Predictix On-Demand Background Error]', err.message);
        } finally {
          clearTimeout(backgroundTimeout);
          activeCrawlHistoryMatches.delete(matchId);
        }
      })();
    } catch (error) {
      console.error('[Predictix On-Demand Error]', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: { message: error.message } });
      }
    }
  }
}

export default new ScraperController();
