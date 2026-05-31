import express from 'express';
import scraperController from '../controllers/scraperController.js';

const router = express.Router();

router.get('/predictions', scraperController.getPredictions);
router.post('/predictions/scrape/discover', scraperController.discoverMatches);
router.post('/predictions/scrape', scraperController.startScraping);
router.post('/predictions/scrape/stop', scraperController.stopScraping);
router.post('/predictions/:matchId/crawl-history', scraperController.crawlMatchHistory);

export default router;
