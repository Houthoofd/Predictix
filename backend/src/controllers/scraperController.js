import { exec } from 'child_process';
import { dbQuery, dbGet, dbRun } from '../db/database.js';
import { getEnrichedPredictions } from '../utils/predictionFetcher.js';
import { cleanupSpawnedTor, scrapeArbworldMoneyway, findBestMatch, fuzzyMatch, ensureScraperCompiled } from '../utils/scraperHelpers.js';
import { scraperState } from './scraperState.js';
import { runScrapeJob } from './scraperJob.js';

class ScraperController {
  /**
   * GET /predictions
   */
  async getPredictions(req, res) {
    try {
      const data = await getEnrichedPredictions(req.query, dbQuery, scraperState.activeCrawlHistoryMatches);
      const mappedData = data.map(pred => {
        const result = { ...pred };
        if (pred.home_matches && !pred.recent_home_matches) {
          result.recent_home_matches = pred.home_matches;
        }
        if (pred.away_matches && !pred.recent_away_matches) {
          result.recent_away_matches = pred.away_matches;
        }
        if (pred.h2h_matches && !pred.recent_h2h_matches) {
          result.recent_h2h_matches = pred.h2h_matches;
        }
        return result;
      });
      res.json({ success: true, data: mappedData });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  /**
   * POST /predictions/scrape
   */
  async startScraping(req, res) {
    scraperState.stopScraperRequested = false;
    
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

    const scraper = req.body.scraper || req.query.scraper || 'matchendirect';
    const sport = req.body.sport || req.query.sport || 'football';
    const limit = parseInt(req.body.limit || req.query.limit || 30, 10);
    const targetDate = req.body.date || req.query.date || null;

    try {
      await runScrapeJob({ limit, targetDate, scraper, sport, targetStrategy }, sendEvent);
    } catch (err) {
      console.error('Error during scraping execution:', err);
      sendEvent('error', { message: `Le scraper a rencontré une erreur : ${err.message}` });
      try {
        await cleanupSpawnedTor((msg) => sendEvent('log', { message: msg }));
      } catch (e) {}
    } finally {
      clearInterval(keepAliveInterval);
      res.end();
    }
  }

  /**
   * POST /predictions/scrape/stop
   */
  stopScraping(req, res) {
    scraperState.stopScraperRequested = true;
    
    if (scraperState.activeScraperProcess) {
      try {
        const pid = scraperState.activeScraperProcess.pid;
        console.log(`[Predictix] Stopping scraper process tree PID: ${pid}`);
        exec(`taskkill /pid ${pid} /T /F`, (err) => {
          if (err) {
            console.warn(`[Predictix] taskkill failed, fallback to process kill: ${err.message}`);
            scraperState.activeScraperProcess.kill();
          }
        });
        scraperState.activeScraperProcess = null;
        return res.json({ success: true, message: "Scraper arrêté avec succès." });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    } else {
      return res.json({ success: true, message: "Demande d'arrêt prise en compte." });
    }
  }

  /**
   * GET /predictions/betfair/update
   */
  async updateBetfairVolumes(req, res) {
    req.setTimeout(0);
    res.setTimeout(0);
    req.socket.setTimeout(0);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
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

    const scraperPath = process.env.SCRAPER_PATH || 'E:\\Developpement\\scrapper-v3';

    try {
      sendEvent('log', { message: "Vérification et compilation du scraper..." });
      await ensureScraperCompiled(scraperPath);

      sendEvent('log', { message: "Recherche des matchs en cours / à venir..." });
      const matches = await dbQuery(`
        SELECT match_id, home_team, away_team, sport 
        FROM scraped_predictions 
        WHERE is_finished = 0 AND is_historical = 0
          AND (sport = 'football' OR sport = 'soccer' OR sport = 'basketball')
      `);

      if (matches.length === 0) {
        sendEvent('log', { message: "Aucun match à venir trouvé pour le football ou le basketball." });
        sendEvent('complete', { updatedCount: 0 });
        return;
      }

      sendEvent('log', { message: `${matches.length} match(es) trouvé(s) pour la mise à jour.` });

      const soccerMatches = matches.filter(m => m.sport === 'football' || m.sport === 'soccer');
      const basketMatches = matches.filter(m => m.sport === 'basketball');

      const sportsToFetch = [];
      if (soccerMatches.length > 0) sportsToFetch.push('soccer');
      if (basketMatches.length > 0) sportsToFetch.push('basketball');

      let updatedCount = 0;

      for (let idx = 0; idx < sportsToFetch.length; idx++) {
        const sp = sportsToFetch[idx];
        const logSportName = sp === 'soccer' ? 'football' : 'basketball';
        sendEvent('log', { message: `[Arbworld] [${idx + 1}/${sportsToFetch.length}] Téléchargement des volumes Betfair pour le ${logSportName}...` });
        const arbEvents = await scrapeArbworldMoneyway(scraperPath, sp);
        const matchesOfSport = sp === 'soccer' ? soccerMatches : basketMatches;

        if (Array.isArray(arbEvents) && arbEvents.length > 0) {
          sendEvent('log', { message: `✓ ${arbEvents.length} événements trouvés sur Arbworld.` });
          for (const match of matchesOfSport) {
            const best = findBestMatch(match.home_team, match.away_team, arbEvents, c => c.home, c => c.away);
            const isFuzzyMatched = best && best.candidate && (
              best.score >= 0.6 || 
              (fuzzyMatch(match.home_team, best.candidate.home) && fuzzyMatch(match.away_team, best.candidate.away))
            );

            if (isFuzzyMatched) {
              const betfairJson = JSON.stringify(best.candidate);
              await dbRun('UPDATE scraped_predictions SET betfair_json = ? WHERE match_id = ?', [betfairJson, match.match_id]);
              updatedCount++;
              sendEvent('match_updated', { 
                match_id: match.match_id, 
                home_team: match.home_team, 
                away_team: match.away_team, 
                betfair: best.candidate 
              });
              sendEvent('log', { message: `[${logSportName}] ✓ Volumes Betfair mis à jour pour : ${match.home_team} vs ${match.away_team} (score: ${best.score.toFixed(2)})` });
            }
          }
        } else {
          sendEvent('log', { message: `Aucun volume récupéré pour le ${logSportName}.` });
        }
      }

      sendEvent('complete', { updatedCount });
    } catch (err) {
      console.error('Error during fast Betfair update:', err);
      sendEvent('error', { message: `Erreur lors de la mise à jour : ${err.message}` });
    } finally {
      clearInterval(keepAliveInterval);
      res.end();
    }
  }
}

export default new ScraperController();
