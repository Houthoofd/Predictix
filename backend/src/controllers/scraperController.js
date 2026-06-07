import { exec } from 'child_process';
import { dbQuery, dbGet } from '../db/database.js';
import { getEnrichedPredictions } from '../utils/predictionFetcher.js';
import { cleanupSpawnedTor } from '../utils/scraperHelpers.js';
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
}

export default new ScraperController();
