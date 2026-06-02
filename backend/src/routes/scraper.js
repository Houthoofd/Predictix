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

export default router;
