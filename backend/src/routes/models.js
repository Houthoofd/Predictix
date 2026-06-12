import express from 'express';
import { dbQuery } from '../db/database.js';
import { getGBDTModelsStatus, trainGBDTModels } from '../utils/gbdtTrainer.js';
import { bivariatePoissonOver, bivariatePoissonUnder } from '../utils/gradientBoosting.js';

const router = express.Router();

// GET /api/models/status
router.get('/models/status', (req, res) => {
  try {
    const status = getGBDTModelsStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// POST /api/models/train
router.post('/models/train', async (req, res) => {
  try {
    console.log('[API Models] Triggering manual GBDT re-training (forced)...');
    await trainGBDTModels(dbQuery, true); // Force = true
    const status = getGBDTModelsStatus();
    res.json({ success: true, data: status, message: 'Modèles réentraînés avec succès via Go.' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// POST /api/models/evaluate
router.post('/models/evaluate', async (req, res) => {
  const { meanHome, meanAway, cov, line } = req.body;
  
  if (meanHome === undefined || meanAway === undefined) {
    return res.status(400).json({ success: false, error: { message: 'Missing meanHome or meanAway parameter' } });
  }

  try {
    const parsedMeanHome = parseFloat(meanHome);
    const parsedMeanAway = parseFloat(meanAway);
    const parsedCov = parseFloat(cov || 0);
    const parsedLine = parseFloat(line || 2.5);

    const overProb = bivariatePoissonOver(parsedMeanHome, parsedMeanAway, parsedCov, parsedLine);
    const underProb = bivariatePoissonUnder(parsedMeanHome, parsedMeanAway, parsedCov, parsedLine);

    res.json({
      success: true,
      data: {
        overProb: parseFloat(overProb.toFixed(4)),
        underProb: parseFloat(underProb.toFixed(4)),
        overOdds: parseFloat((1 / (overProb || 0.0001)).toFixed(2)),
        underOdds: parseFloat((1 / (underProb || 0.0001)).toFixed(2))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
