import express from 'express';
import scraperController from '../controllers/scraperController.js';
import discoveryController from '../controllers/discoveryController.js';
import integrityController from '../controllers/integrityController.js';
import customDataController from '../controllers/customDataController.js';
import { getScheduledCrons, reScrapeMatch, cancelScheduledReScrape, getCronLogs } from '../services/cronService.js';
import { dbQuery, dbRun } from '../db/database.js';

const router = express.Router();

router.get('/predictions', scraperController.getPredictions);
router.post('/predictions/scrape/discover', discoveryController.discoverMatches);
router.post('/predictions/scrape', scraperController.startScraping);
router.post('/predictions/scrape/stop', scraperController.stopScraping);
router.post('/predictions/:matchId/crawl-history', integrityController.crawlMatchHistory);

// Cron/scheduler endpoints
router.get('/scraper/crons', async (req, res) => {
  try {
    const crons = await getScheduledCrons();
    res.json({ success: true, data: crons });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/scraper/crons/:matchId/run', async (req, res) => {
  const { matchId } = req.params;
  try {
    await reScrapeMatch(matchId);
    res.json({ success: true, message: `Match ${matchId} re-scrappé avec succès.` });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/scraper/crons/:matchId', async (req, res) => {
  const { matchId } = req.params;
  try {
    const cancelled = cancelScheduledReScrape(matchId);
    res.json({ success: true, cancelled, message: `Planification annulée pour le match ${matchId}.` });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/scraper/crons/logs', (req, res) => {
  try {
    const logs = getCronLogs();
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Notifications endpoints
router.get('/notifications', async (req, res) => {
  try {
    const notifications = await dbQuery('SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 100');
    const formatted = notifications.map(n => {
      const date = new Date(n.timestamp);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        ...n,
        timestamp: timeStr
      };
    });
    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/notifications', async (req, res) => {
  try {
    await dbRun('DELETE FROM notifications');
    res.json({ success: true, message: 'Toutes les notifications ont été supprimées.' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Custom logo override endpoints
router.get('/custom-logos', customDataController.getCustomLogos);
router.post('/custom-logos', customDataController.saveCustomLogo);
router.delete('/custom-logos/:teamName', customDataController.deleteCustomLogo);

// Manual historical/H2H match stats input endpoint
router.post('/predictions/historical/custom', customDataController.saveCustomHistoricalMatch);

// Data integrity batcher endpoints
router.post('/predictions/integrity-batch/start', integrityController.startIntegrityBatch);
router.post('/predictions/integrity-batch/pause', integrityController.pauseIntegrityBatch);
router.post('/predictions/integrity-batch/stop', integrityController.stopIntegrityBatch);
router.get('/predictions/integrity-batch/status', integrityController.getIntegrityBatchStatus);
router.post('/predictions/integrity-batch/prioritize', integrityController.prioritizeIntegrityMatch);
router.post('/predictions/integrity-batch/inject', integrityController.injectIntegrityMatch);
router.post('/predictions/integrity-batch/cleanup', customDataController.cleanupDatabaseIntegrity);

export default router;
