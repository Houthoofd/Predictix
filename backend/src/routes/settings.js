import express from 'express';
import { dbQuery, dbRun } from '../db/database.js';
import { isKeepAwakeActive, reevaluateKeepAwake } from '../utils/keepAwake.js';
import { loadCronSettings } from '../services/cronService.js';

const router = express.Router();

// Get all settings
router.get('/settings', async (req, res) => {
  try {
    const rows = await dbQuery('SELECT * FROM settings');
    const settingsObj = {};
    rows.forEach(r => {
      settingsObj[r.key] = r.value;
    });
    res.json({ success: true, data: settingsObj });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Update settings
router.put('/settings', async (req, res) => {
  const updates = req.body;
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ success: false, error: { message: 'Invalid settings payload' } });
  }

  try {
    for (const [key, val] of Object.entries(updates)) {
      await dbRun('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(val)]);
    }

    // Trigger settings re-evaluation
    await reevaluateKeepAwake();
    await loadCronSettings();

    // Fetch and return fresh settings
    const rows = await dbQuery('SELECT * FROM settings');
    const settingsObj = {};
    rows.forEach(r => {
      settingsObj[r.key] = r.value;
    });

    res.json({ success: true, data: settingsObj });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Get real-time Keep-Awake lock status
router.get('/settings/keepawake/status', (req, res) => {
  res.json({ success: true, data: { active: isKeepAwakeActive() } });
});

export default router;
