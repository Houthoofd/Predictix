import express from 'express';
import scraperController from '../controllers/scraperController.js';

const router = express.Router();

router.get('/predictions', scraperController.getPredictions);
router.post('/predictions/scrape/discover', scraperController.discoverMatches);
router.post('/predictions/scrape', scraperController.startScraping);
router.post('/predictions/scrape/stop', scraperController.stopScraping);
router.post('/predictions/:matchId/crawl-history', scraperController.crawlMatchHistory);

// Custom logo override endpoints
router.get('/custom-logos', scraperController.getCustomLogos);
router.post('/custom-logos', scraperController.saveCustomLogo);
router.delete('/custom-logos/:teamName', scraperController.deleteCustomLogo);

// Manual historical/H2H match stats input endpoint
router.post('/predictions/historical/custom', scraperController.saveCustomHistoricalMatch);

// Data integrity batcher endpoints
router.post('/predictions/integrity-batch/start', scraperController.startIntegrityBatch);
router.post('/predictions/integrity-batch/pause', scraperController.pauseIntegrityBatch);
router.post('/predictions/integrity-batch/stop', scraperController.stopIntegrityBatch);
router.get('/predictions/integrity-batch/status', scraperController.getIntegrityBatchStatus);
router.post('/predictions/integrity-batch/prioritize', scraperController.prioritizeIntegrityMatch);
router.post('/predictions/integrity-batch/inject', scraperController.injectIntegrityMatch);
router.post('/predictions/integrity-batch/cleanup', scraperController.cleanupDatabaseIntegrity);

export default router;
