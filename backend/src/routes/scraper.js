import express from 'express';
import scraperController from '../controllers/scraperController.js';
import discoveryController from '../controllers/discoveryController.js';
import integrityController from '../controllers/integrityController.js';
import customDataController from '../controllers/customDataController.js';

const router = express.Router();

router.get('/predictions', scraperController.getPredictions);
router.post('/predictions/scrape/discover', discoveryController.discoverMatches);
router.post('/predictions/scrape', scraperController.startScraping);
router.post('/predictions/scrape/stop', scraperController.stopScraping);
router.post('/predictions/:matchId/crawl-history', integrityController.crawlMatchHistory);

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
