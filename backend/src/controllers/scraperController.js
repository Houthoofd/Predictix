import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { dbQuery, dbGet, dbRun } from '../db/database.js';
import { isTorActive, renewTorSession, getNewestScrapedFile, rewriteScraperLog, scrapeSingleMatch, runDiscoveryProcess, crawlH2HLinksBatch, prioritizeDirectH2H, fetchWikipediaLogoFallback } from '../utils/scraperHelpers.js';
import { enrichMatchPredictions, computeLeagueAverages, evaluateSmartScrapingFilter, getEnrichedPredictions } from '../utils/predictionEngine.js';
import { importScrapedMatches, importHistoricalMatch, importSkippedMatch, enrichPrimaryMatch } from '../db/importer.js';

let activeScraperProcess = null;
let stopScraperRequested = false;
const activeCrawlHistoryMatches = new Set();

const activeIntegrityBatch = {
  status: 'idle', // 'idle', 'running', 'paused'
  queue: [],
  currentIndex: 0,
  processedCount: 0,
  successCount: 0,
  errorCount: 0,
  logs: [],
  spawnedChildren: new Set()
};

async function runIntegrityBatchLoop() {
  const scraperPath = process.env.SCRAPER_PATH || 'E:\\Developpement\\scrapper-v3';

  // Proposal B: Check all possible Tor SOCKS ports to detect running Tor instances
  const possiblePorts = [9050, 9052, 9054];
  const activePorts = [];
  for (const port of possiblePorts) {
    const active = await isTorActive(port);
    if (active) {
      activePorts.push(port);
    }
  }

  if (activePorts.length === 0) {
    activeIntegrityBatch.status = 'idle';
    activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] ❌ Erreur : Aucun port proxy Tor actif détecté (vérifié sur 9050, 9052, 9054). Réparation annulée.`);
    return;
  }

  activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] ℹ Détection réseau : ${activePorts.length} proxy Tor actifs détectés (Ports: ${activePorts.join(', ')}).`);
  if (activePorts.length > 1) {
    activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] 🚀 Mode Parallèle activé (traitement sur ${activePorts.length} circuits en même temps).`);
  } else {
    activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] ℹ Mode Séquentiel activé (un seul proxy Tor actif).`);
  }

  const worker = async (socksPort) => {
    let workerProcessedCount = 0;

    while (activeIntegrityBatch.status === 'running') {
      let indexToProcess = -1;
      
      // Atomic index allocation
      if (activeIntegrityBatch.currentIndex < activeIntegrityBatch.queue.length) {
        indexToProcess = activeIntegrityBatch.currentIndex;
        activeIntegrityBatch.currentIndex++;
      } else {
        break; // Queue empty
      }

      const matchObj = activeIntegrityBatch.queue[indexToProcess];
      const timeStr = new Date().toLocaleTimeString();

      // Proposal A: Periodic IP rotation every 3 matches processed by this specific worker
      if (workerProcessedCount > 0 && workerProcessedCount % 3 === 0) {
        activeIntegrityBatch.logs.push(`[${timeStr}] [Tor Port ${socksPort}] 🔄 Rotation d'IP Tor périodique...`);
        const rotated = await renewTorSession(socksPort + 1); // SOCKS port + 1 is Control Port
        if (rotated) {
          activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] ✓ Nouvelle IP obtenue. Stabilisation de 1.5s...`);
          await new Promise(r => setTimeout(r, 1500));
        }
      }

      workerProcessedCount++;

      activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] [${indexToProcess + 1}/${activeIntegrityBatch.queue.length}] Analyse : ${matchObj.home_team} vs ${matchObj.away_team}...`);

      try {
        const match = await dbGet('SELECT * FROM scraped_predictions WHERE match_id = ?', [matchObj.match_id]);
        if (!match) {
          throw new Error("Match introuvable dans la base de données.");
        }

        // 1. Pre-inspect missing items and calculate diagnostics immediately
        const isHomeLogoMissing = !match.home_logo || match.home_logo.trim() === '' || match.home_logo.toLowerCase().includes('placeholder') || match.home_logo.toLowerCase().includes('logo_default') || match.home_logo.toLowerCase().includes('logo-default');
        const isAwayLogoMissing = !match.away_logo || match.away_logo.trim() === '' || match.away_logo.toLowerCase().includes('placeholder') || match.away_logo.toLowerCase().includes('logo_default') || match.away_logo.toLowerCase().includes('logo-default');
        const isCornersMissing = match.first_half_corners_home === null || match.first_half_corners_away === null;

        const h2hMatches = await dbQuery(`
          SELECT match_id FROM scraped_predictions 
          WHERE is_finished = 1 AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))
        `, [match.home_team, match.away_team, match.away_team, match.home_team]);

        const homeMatches = await dbQuery('SELECT match_id FROM scraped_predictions WHERE is_finished = 1 AND home_team = ?', [match.home_team]);
        const awayMatches = await dbQuery('SELECT match_id FROM scraped_predictions WHERE is_finished = 1 AND away_team = ?', [match.away_team]);

        const needsH2H = h2hMatches.length === 0;
        const needsTeamHistory = homeMatches.length < 5 || awayMatches.length < 5;
        const needsH2HCrawl = needsH2H || needsTeamHistory;

        // 2. If the match is already 100% healthy and complete, skip it instantly without delay
        if (!isHomeLogoMissing && !isAwayLogoMissing && !isCornersMissing && !needsH2HCrawl) {
          activeIntegrityBatch.successCount++;
          activeIntegrityBatch.processedCount++;
          activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] ✓ Match [${match.home_team} vs ${match.away_team}] déjà complet (Diagnostic 100%).`);
          continue; // Skip the cooloff delay and proceed immediately to the next match
        }

        let links = [];
        try {
          if (match.historical_links) {
            links = JSON.parse(match.historical_links);
          }
        } catch (e) {}

        let activeLinks = [...links];

        // 3. Primary page crawl condition: we need details (logos/corners) OR we need history but only have the single match URL (links.length === 1)
        const needsPrimaryCrawl = isHomeLogoMissing || isAwayLogoMissing || isCornersMissing || (needsH2HCrawl && links.length === 1);

        if (needsPrimaryCrawl && links.length === 1 && links[0].startsWith('/live-score/')) {
          let targetLink = links[0];
          if (match.is_finished === 0 || match.time === 'Planned' || !match.score || match.score === '-' || match.score === '') {
            if (!targetLink.includes('?p=')) {
              targetLink += '?p=face-a-face';
            }
          }
          
          activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] -> Crawl de la page principale : ${targetLink}`);
          
          const primaryDetails = await scrapeSingleMatch(scraperPath, targetLink, false, (child) => {
            activeIntegrityBatch.spawnedChildren.add(child);
          }, socksPort);

          if (primaryDetails) {
            await enrichPrimaryMatch(match.match_id, primaryDetails, targetLink, match);
            activeLinks = primaryDetails.historical_links || [];
            activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] ✓ Page principale actualisée (logos/stats)`);
          }
        }

        // 4. Self-Healing fallback Wikipedia logo search if logos are still missing/placeholder
        const updatedMatchForLogos = await dbGet('SELECT * FROM scraped_predictions WHERE match_id = ?', [matchObj.match_id]);
        if (updatedMatchForLogos) {
          const homeLogoNow = updatedMatchForLogos.home_logo;
          const awayLogoNow = updatedMatchForLogos.away_logo;
          
          const homeLogoMissingNow = !homeLogoNow || homeLogoNow.trim() === '' || homeLogoNow.toLowerCase().includes('placeholder') || homeLogoNow.toLowerCase().includes('logo_default') || homeLogoNow.toLowerCase().includes('logo-default');
          const awayLogoMissingNow = !awayLogoNow || awayLogoNow.trim() === '' || awayLogoNow.toLowerCase().includes('placeholder') || awayLogoNow.toLowerCase().includes('logo_default') || awayLogoNow.toLowerCase().includes('logo-default');
          
          if (homeLogoMissingNow) {
            activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] -> Logo domicile manquant. Recherche Wikipédia pour : ${matchObj.home_team}...`);
            const fallbackLogo = await fetchWikipediaLogoFallback(matchObj.home_team);
            if (fallbackLogo) {
              await dbRun('INSERT OR REPLACE INTO custom_team_logos (team_name, logo_url) VALUES (?, ?)', [matchObj.home_team.toLowerCase().trim(), fallbackLogo]);
              activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] ✓ Logo domicile résolu via Wikipédia : ${matchObj.home_team}`);
            }
          }
          
          if (awayLogoMissingNow) {
            activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] -> Logo extérieur manquant. Recherche Wikipédia pour : ${matchObj.away_team}...`);
            const fallbackLogo = await fetchWikipediaLogoFallback(matchObj.away_team);
            if (fallbackLogo) {
              await dbRun('INSERT OR REPLACE INTO custom_team_logos (team_name, logo_url) VALUES (?, ?)', [matchObj.away_team.toLowerCase().trim(), fallbackLogo]);
              activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] ✓ Logo extérieur résolu via Wikipédia : ${matchObj.away_team}`);
            }
          }
        }

        // 5. Deep H2H / History crawl
        if (needsH2HCrawl && activeLinks.length > 0) {
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

          if (uncachedLinks.length > 0) {
            let newlyCrawledHome = 0;
            let newlyCrawledAway = 0;
            let newlyCrawledH2H = 0;

            const existingHomeCount = homeMatches.length;
            const existingAwayCount = awayMatches.length;
            const existingH2HCount = h2hMatches.length;

            activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] -> ${uncachedLinks.length} confrontations manquantes.`);
            
            let crawlCount = 0;
            for (const link of uncachedLinks) {
              if (activeIntegrityBatch.status !== 'running') break;

              // Check if we have met the required count to reach 100% diagnostic score:
              // - 5 home matches
              // - 5 away matches
              // - 1 H2H match
              const currentHomeTotal = existingHomeCount + newlyCrawledHome;
              const currentAwayTotal = existingAwayCount + newlyCrawledAway;
              const currentH2HTotal = existingH2HCount + newlyCrawledH2H;

              if (currentHomeTotal >= 5 && currentAwayTotal >= 5 && currentH2HTotal >= 1) {
                activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] ✓ Objectif d'intégrité atteint (5 H/5 A/1 H2H). Arrêt du crawl historique.`);
                break;
              }

              // Hard safety cap: max 10 crawls per match to avoid long Tor hangs
              if (crawlCount >= 10) {
                activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] ⚠ Limite de sécurité atteinte (10 crawls).`);
                break;
              }

              crawlCount++;

              const histMatch = await scrapeSingleMatch(scraperPath, link, true, (child) => {
                activeIntegrityBatch.spawnedChildren.add(child);
              }, socksPort);

              if (histMatch && histMatch.home_team && histMatch.away_team) {
                await importHistoricalMatch(link, histMatch);
                const homeClean = histMatch.home_team.replace(/[▲▼]/g, '').trim();
                const awayClean = histMatch.away_team.replace(/[▲▼]/g, '').trim();
                activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}]   ✓ H2H importé : ${homeClean} vs ${awayClean}`);

                // Update dynamic counts based on the imported match
                const matchHomeClean = match.home_team.toLowerCase().trim();
                const matchAwayClean = match.away_team.toLowerCase().trim();
                const histHomeClean = homeClean.toLowerCase().trim();
                const histAwayClean = awayClean.toLowerCase().trim();

                const isDirectH2H = (histHomeClean === matchHomeClean && histAwayClean === matchAwayClean) ||
                                    (histHomeClean === matchAwayClean && histAwayClean === matchHomeClean);

                if (isDirectH2H) {
                  newlyCrawledH2H++;
                }

                if (histHomeClean === matchHomeClean || histAwayClean === matchHomeClean) {
                  newlyCrawledHome++;
                }
                if (histHomeClean === matchAwayClean || histAwayClean === matchAwayClean) {
                  newlyCrawledAway++;
                }
              } else {
                await importSkippedMatch(link);
                activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}]   ⚠ H2H sauté (échec) : ${link}`);
                
                // Emergency IP rotation inside loop on failure
                activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}]   🔄 Rotation d'IP de secours...`);
                await renewTorSession(socksPort + 1);
              }

              await new Promise(r => setTimeout(r, 2500));
            }
          }
        }

        activeIntegrityBatch.successCount++;
        activeIntegrityBatch.processedCount++;
        activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] ✓ Match [${matchObj.home_team} vs ${matchObj.away_team}] réparé.`);
      } catch (err) {
        activeIntegrityBatch.errorCount++;
        activeIntegrityBatch.processedCount++;
        activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] ❌ Erreur pour ${matchObj.home_team} vs ${matchObj.away_team} : ${err.message}`);
        
        // Emergency IP rotation on failure
        activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] 🔄 Rotation d'IP de secours...`);
        await renewTorSession(socksPort + 1);
      }

      // Cleanup finished child processes
      for (const child of activeIntegrityBatch.spawnedChildren) {
        if (child.killed || child.exitCode !== null) {
          activeIntegrityBatch.spawnedChildren.delete(child);
        }
      }

      // Polite cooloff delay between matches
      if (activeIntegrityBatch.status === 'running') {
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  };

  // Launch workers in parallel
  try {
    await Promise.all(activePorts.map(port => worker(port)));
  } catch (err) {
    console.error('[Integrity Parallel Workers Error]', err);
  }

  // Finished queue or paused
  if (activeIntegrityBatch.currentIndex >= activeIntegrityBatch.queue.length) {
    activeIntegrityBatch.status = 'idle';
    activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] 🏁 Réparation globale terminée. Succès: ${activeIntegrityBatch.successCount}, Erreurs: ${activeIntegrityBatch.errorCount}.`);
  } else if (activeIntegrityBatch.status === 'paused') {
    activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] ⏸ Réparation globale mise en pause.`);
  }
}

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

  /**
   * GET /custom-logos
   */
  async getCustomLogos(req, res) {
    try {
      const rows = await dbQuery('SELECT * FROM custom_team_logos');
      res.json({ success: true, data: rows });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  /**
   * POST /custom-logos
   */
  async saveCustomLogo(req, res) {
    const { team_name, logo_url } = req.body;
    if (!team_name || !logo_url) {
      return res.status(400).json({ success: false, error: { message: "team_name and logo_url are required." } });
    }
    try {
      await dbRun('INSERT OR REPLACE INTO custom_team_logos (team_name, logo_url) VALUES (?, ?)', [team_name.trim(), logo_url.trim()]);
      res.json({ success: true, message: "Custom team logo saved successfully." });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  /**
   * DELETE /custom-logos/:teamName
   */
  async deleteCustomLogo(req, res) {
    const { teamName } = req.params;
    if (!teamName) {
      return res.status(400).json({ success: false, error: { message: "teamName parameter is required." } });
    }
    try {
      await dbRun('DELETE FROM custom_team_logos WHERE team_name = ?', [teamName]);
      res.json({ success: true, message: "Custom team logo deleted successfully." });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  /**
   * POST /predictions/historical/custom
   */
  async saveCustomHistoricalMatch(req, res) {
    const {
      match_id,
      date,
      time,
      tournament,
      home_team,
      away_team,
      score,
      first_half_corners_home,
      first_half_corners_away,
      statistics
    } = req.body;

    if (!match_id || !home_team || !away_team) {
      return res.status(400).json({ success: false, error: { message: "match_id, home_team, and away_team are required." } });
    }

    try {
      const sql = `
        INSERT OR REPLACE INTO scraped_predictions (
          match_id, time, date, tournament, home_team, away_team, score,
          over_odds, under_odds, card_line, probability, best_tip, win_rate, status,
          is_live, is_finished, first_half_corners_home, first_half_corners_away,
          is_historical, match_url, statistics_json, scraped_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      await dbRun(sql, [
        match_id,
        time || 'Finished',
        date || new Date().toISOString().substring(0, 10),
        tournament || 'Football',
        home_team.trim(),
        away_team.trim(),
        score || '',
        '1.85', '1.90', '4.5', '60%', 'Plus de', '60%', 'Finished',
        0, 1, // finished
        first_half_corners_home !== undefined && first_half_corners_home !== null ? parseInt(first_half_corners_home, 10) : null,
        first_half_corners_away !== undefined && first_half_corners_away !== null ? parseInt(first_half_corners_away, 10) : null,
        1, // is_historical = 1
        match_id,
        statistics ? JSON.stringify(statistics) : null
      ]);

      res.json({ success: true, message: "Match historique enregistré avec succès." });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  /**
   * POST /api/scraper/integrity-batch/start
   */
  async startIntegrityBatch(req, res) {
    try {
      const torActive = await isTorActive();
      if (!torActive) {
        return res.status(400).json({ 
          success: false, 
          error: { message: "Le proxy Tor local n'est pas actif sur le port 9050. Veuillez lancer Tor et réessayer." } 
        });
      }

      if (activeIntegrityBatch.status === 'running') {
        return res.json({ success: true, message: "Le batcher de réparation est déjà en cours d'exécution." });
      }

      if (activeIntegrityBatch.status === 'paused' && activeIntegrityBatch.queue.length > 0) {
        activeIntegrityBatch.status = 'running';
        activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] ▶ Reprise de la réparation globale.`);
        runIntegrityBatchLoop();
        return res.json({ success: true, message: "Réparation globale reprise." });
      }

      const predictions = await getEnrichedPredictions({ dateRange: 'all' }, dbQuery, new Set());
      const incompleteMatches = predictions.filter(p => p.diagnostic && !p.diagnostic.is_complete);

      if (incompleteMatches.length === 0) {
        return res.json({ success: true, message: "Toutes les données sont déjà complètes (score d'intégrité de 100% sur tous les matchs) !" });
      }

      incompleteMatches.sort((a, b) => a.diagnostic.score - b.diagnostic.score);

      activeIntegrityBatch.queue = incompleteMatches.map(m => ({
        match_id: m.match_id,
        home_team: m.home_team,
        away_team: m.away_team,
        date: m.date,
        historical_links: m.historical_links,
        diagnostic: m.diagnostic
      }));

      activeIntegrityBatch.currentIndex = 0;
      activeIntegrityBatch.processedCount = 0;
      activeIntegrityBatch.successCount = 0;
      activeIntegrityBatch.errorCount = 0;
      activeIntegrityBatch.logs = [`[${new Date().toLocaleTimeString()}] 🚀 Démarrage de la réparation globale pour ${incompleteMatches.length} matchs.`];
      activeIntegrityBatch.status = 'running';

      runIntegrityBatchLoop();

      res.json({ success: true, message: "Réparation globale lancée en arrière-plan.", total: incompleteMatches.length });
    } catch (error) {
      console.error('[Predictix Integrity Batch Start Error]', error);
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  /**
   * POST /api/scraper/integrity-batch/pause
   */
  async pauseIntegrityBatch(req, res) {
    if (activeIntegrityBatch.status !== 'running') {
      return res.json({ success: true, message: "Le batcher n'est pas en cours d'exécution." });
    }

    activeIntegrityBatch.status = 'paused';
    activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] ⏸ Mise en pause demandée. Arrêt après le match courant...`);
    res.json({ success: true, message: "Mise en pause planifiée." });
  }

  /**
   * POST /api/scraper/integrity-batch/stop
   */
  async stopIntegrityBatch(req, res) {
    activeIntegrityBatch.status = 'idle';
    activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] ⏹ Réparation globale arrêtée par l'utilisateur.`);
    
    for (const child of activeIntegrityBatch.spawnedChildren) {
      if (child && !child.killed) {
        try {
          if (process.platform === 'win32') {
            exec(`taskkill /pid ${child.pid} /T /F`, () => {});
          } else {
            child.kill();
          }
        } catch (e) {}
      }
    }
    activeIntegrityBatch.spawnedChildren.clear();
    activeIntegrityBatch.queue = [];
    activeIntegrityBatch.currentIndex = 0;

    res.json({ success: true, message: "Batcher arrêté et réinitialisé." });
  }

  /**
   * GET /api/scraper/integrity-batch/status
   */
  async getIntegrityBatchStatus(req, res) {
    const recentLogs = activeIntegrityBatch.logs.slice(-100);
    res.json({
      success: true,
      data: {
        status: activeIntegrityBatch.status,
        queueLength: activeIntegrityBatch.queue.length,
        currentIndex: activeIntegrityBatch.currentIndex,
        processedCount: activeIntegrityBatch.processedCount,
        successCount: activeIntegrityBatch.successCount,
        errorCount: activeIntegrityBatch.errorCount,
        logs: recentLogs
      }
    });
  }
}

export default new ScraperController();
