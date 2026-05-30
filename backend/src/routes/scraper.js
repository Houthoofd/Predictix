import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { dbQuery, dbRun } from '../db/database.js';

const router = express.Router();

// Get cached predictions from database
router.get('/predictions', async (req, res) => {
  try {
    const rows = await dbQuery('SELECT * FROM scraped_predictions ORDER BY scraped_at DESC, time ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Helper: Scan scraper output directory and return path of the newest JSON file
function getNewestScrapedFile(outputDir) {
  if (!fs.existsSync(outputDir)) {
    return null;
  }

  const files = fs.readdirSync(outputDir)
    .filter(file => file.startsWith('ratingbet_') && file.endsWith('.json'))
    .map(file => {
      const filePath = path.join(outputDir, file);
      const stat = fs.statSync(filePath);
      return { path: filePath, mtime: stat.mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);

  return files.length > 0 ? files[0].path : null;
}

// Trigger scraper execution and stream progress via Server-Sent Events (SSE)
router.post('/predictions/scrape', (req, res) => {
  // Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  const scraperPath = process.env.SCRAPER_PATH || 'E:\\Developpement\\scrapper-v3';
  const outputDir = path.join(scraperPath, 'data', 'ratingbet');

  sendEvent('log', { message: `[Predictix] Initialisation du scraping dans: ${scraperPath}` });
  
  if (!fs.existsSync(scraperPath)) {
    sendEvent('error', { message: `Dossier du scraper introuvable à l'emplacement configuré: ${scraperPath}` });
    return res.end();
  }

  // Spawn the batch file
  const child = spawn('cmd.exe', ['/c', 'scrape-ratingbet.bat', 'verbose'], {
    cwd: scraperPath,
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  let logBuffer = '';

  const handleOutput = (data) => {
    logBuffer += data.toString();
    const lines = logBuffer.split('\n');
    logBuffer = lines.pop(); // Keep incomplete line in buffer

    for (const line of lines) {
      const cleanLine = line.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').trim();
      if (cleanLine) {
        sendEvent('log', { message: cleanLine });
      }
    }
  };

  child.stdout.on('data', handleOutput);
  child.stderr.on('data', handleOutput);

  child.on('error', (error) => {
    console.error('Failed to start scraper process:', error);
    sendEvent('error', { message: `Impossible de lancer le scraper: ${error.message}` });
    res.end();
  });

  child.on('close', async (code) => {
    // Process remaining buffer
    if (logBuffer.trim()) {
      sendEvent('log', { message: logBuffer.trim() });
    }

    sendEvent('log', { message: `[Predictix] Le processus scraper s'est terminé avec le code: ${code}` });

    if (code !== 0) {
      sendEvent('error', { message: `Le scraper a rencontré une erreur (Code de sortie: ${code})` });
      return res.end();
    }

    try {
      sendEvent('log', { message: '[Predictix] Analyse et importation des données...' });
      
      const newestFile = getNewestScrapedFile(outputDir);
      if (!newestFile) {
        sendEvent('error', { message: `Aucun fichier de données scrapées trouvé dans ${outputDir}` });
        return res.end();
      }

      sendEvent('log', { message: `[Predictix] Lecture du fichier: ${path.basename(newestFile)}` });
      
      const rawData = fs.readFileSync(newestFile, 'utf-8');
      const parsed = JSON.parse(rawData);

      // Extract matches from JSON structure (all_matches or matches array)
      const matches = parsed.all_matches || parsed.matches || [];
      sendEvent('log', { message: `[Predictix] ${matches.length} matchs trouvés. Enregistrement dans SQLite...` });

      let importedCount = 0;

      for (const match of matches) {
        const isLive = match.is_live === true || String(match.status).toLowerCase() === 'live' ? 1 : 0;
        const isFinished = match.is_finished === true || String(match.status).toLowerCase() === 'finished' ? 1 : 0;
        
        // Clean match ID or generate one
        const matchId = match.match_id || `${match.home_team}_${match.away_team}_${match.date || new Date().toISOString().slice(0,10)}`;

        const sql = `
          INSERT OR REPLACE INTO scraped_predictions (
            match_id, time, date, tournament, home_team, away_team, score,
            over_odds, under_odds, card_line, probability, best_tip, win_rate, status,
            is_live, is_finished, scraped_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;

        await dbRun(sql, [
          matchId,
          match.time || '',
          match.date || parsed.metadata?.scraped_at?.substring(0, 10) || new Date().toISOString().substring(0, 10),
          match.tournament || match.league || 'Football',
          match.home_team || '',
          match.away_team || '',
          match.score || '',
          match.over_odds || '',
          match.under_odds || '',
          match.card_line || '',
          match.probability || '',
          match.best_tip || '',
          match.win_rate || '',
          match.status || 'Planned',
          isLive,
          isFinished
        ]);

        importedCount++;
      }

      sendEvent('log', { message: `[Predictix] ✓ Importation réussie: ${importedCount} prédictions insérées/mises à jour.` });
      sendEvent('complete', { count: importedCount });
    } catch (error) {
      console.error('Error importing scraped data:', error);
      sendEvent('error', { message: `Erreur lors de l'importation en base de données: ${error.message}` });
    } finally {
      res.end();
    }
  });
});

export default router;
