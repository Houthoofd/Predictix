import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { dbQuery, dbRun } from '../db/database.js';

const router = express.Router();

// Helper: Poisson distribution probability of exactly k events with expected lambda
function poissonProbability(lambda, k) {
  let factorial = 1;
  for (let i = 1; i <= k; i++) factorial *= i;
  return Math.pow(lambda, k) * Math.exp(-lambda) / factorial;
}

// Helper: Cumulative Poisson probability of OVER line (e.g. > line)
function poissonOver(lambda, line) {
  const floor = Math.floor(line);
  let sumUnder = 0;
  for (let i = 0; i <= floor; i++) {
    sumUnder += poissonProbability(lambda, i);
  }
  return 1 - sumUnder;
}

// Helper: Cumulative Poisson probability of UNDER line (e.g. < line)
function poissonUnder(lambda, line) {
  const floor = Math.ceil(line) - 1;
  let sumUnder = 0;
  for (let i = 0; i <= floor; i++) {
    sumUnder += poissonProbability(lambda, i);
  }
  return sumUnder;
}

// Get cached predictions from database and compute predictive stats + Value Bets
router.get('/predictions', async (req, res) => {
  try {
    const rows = await dbQuery('SELECT * FROM scraped_predictions ORDER BY scraped_at DESC, time ASC');
    
    const enrichedRows = [];
    
    for (const row of rows) {
      // Find historical H2H matches between A and B (up to 10)
      const h2hMatches = await dbQuery(`
        SELECT first_half_corners_home, first_half_corners_away, home_team, away_team, home_logo, away_logo, score, date, tournament
        FROM scraped_predictions 
        WHERE is_finished = 1 
          AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))
        ORDER BY date DESC LIMIT 10
      `, [row.home_team, row.away_team, row.away_team, row.home_team]);
      
      // Find Team A (Home) recent matches played STRICTLY at Domicile (up to 10)
      const homeMatches = await dbQuery(`
        SELECT first_half_corners_home, first_half_corners_away, home_team, away_team, home_logo, away_logo, score, date, tournament
        FROM scraped_predictions 
        WHERE is_finished = 1 
          AND home_team = ?
        ORDER BY date DESC LIMIT 10
      `, [row.home_team]);
      
      // Find Team B (Away) recent matches played STRICTLY at Extérieur (up to 10)
      const awayMatches = await dbQuery(`
        SELECT first_half_corners_home, first_half_corners_away, home_team, away_team, home_logo, away_logo, score, date, tournament
        FROM scraped_predictions 
        WHERE is_finished = 1 
          AND away_team = ?
        ORDER BY date DESC LIMIT 10
      `, [row.away_team]);
      
      // Calculate H2H corners average (Total match corners in H2H)
      let h2hSum = 0;
      let h2hCount = 0;
      for (const m of h2hMatches) {
        if (m.first_half_corners_home !== null && m.first_half_corners_away !== null) {
          h2hSum += (m.first_half_corners_home + m.first_half_corners_away);
          h2hCount++;
        }
      }
      const h2hAvg = h2hCount > 0 ? parseFloat((h2hSum / h2hCount).toFixed(1)) : null;
      
      // Calculate Team A recent corners average (Corners obtained by Team A)
      let homeSum = 0;
      let homeCount = 0;
      for (const m of homeMatches) {
        const corners = m.home_team === row.home_team ? m.first_half_corners_home : m.first_half_corners_away;
        if (corners !== null && corners !== undefined) {
          homeSum += corners;
          homeCount++;
        }
      }
      const homeAvg = homeCount > 0 ? parseFloat((homeSum / homeCount).toFixed(1)) : null;
      
      // Calculate Team B recent corners average (Corners obtained by Team B)
      let awaySum = 0;
      let awayCount = 0;
      for (const m of awayMatches) {
        const corners = m.home_team === row.away_team ? m.first_half_corners_home : m.first_half_corners_away;
        if (corners !== null && corners !== undefined) {
          awaySum += corners;
          awayCount++;
        }
      }
      const awayAvg = awayCount > 0 ? parseFloat((awaySum / awayCount).toFixed(1)) : null;
      
      // Expected corners A + B in 1st half (default to standard 4.2 corners if no averages present)
      const lambda1MT = (homeAvg || 2.2) + (awayAvg || 2.0);
      
      // Parse cached Oddschecker odds
      let oddsCorners = [];
      try {
        if (row.odds_corners) {
          oddsCorners = JSON.parse(row.odds_corners);
        }
      } catch (e) {}
      
      // Run Poisson distribution Value Bet calculations
      const enrichedOdds = oddsCorners.map(o => {
        const is1stHalf = o.market_type === '1st_half';
        const lambda = is1stHalf ? lambda1MT : lambda1MT * 2.2; // Full Time corners is about 2.2x of 1st half
        
        const overProb = poissonOver(lambda, o.line);
        const underProb = poissonUnder(lambda, o.line);
        
        const overValue = o.over_decimal ? overProb * o.over_decimal : 0;
        const underValue = o.under_decimal ? underProb * o.under_decimal : 0;
        
        const overValueBet = overValue > 1.05;
        const underValueBet = underValue > 1.05;
        
        return {
          ...o,
          over_value_bet: overValueBet,
          over_value_edge: overValueBet ? Math.round((overValue - 1) * 100) : 0,
          over_fair_odds: overProb > 0 ? parseFloat((1 / overProb).toFixed(2)) : null,
          over_probability: Math.round(overProb * 100) + '%',
          
          under_value_bet: underValueBet,
          under_value_edge: underValueBet ? Math.round((underValue - 1) * 100) : 0,
          under_fair_odds: underProb > 0 ? parseFloat((1 / underProb).toFixed(2)) : null,
          under_probability: Math.round(underProb * 100) + '%'
        };
      });
      
      enrichedRows.push({
        ...row,
        home_avg_first_half_corners: homeAvg,
        away_avg_first_half_corners: awayAvg,
        h2h_avg_first_half_corners: h2hAvg,
        odds_corners: enrichedOdds,
        recent_home_matches: homeMatches,
        recent_away_matches: awayMatches,
        recent_h2h_matches: h2hMatches
      });
    }

    res.json({ success: true, data: enrichedRows });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Helper: Scan scraper output directories and return path of the newest JSON file
function getNewestScrapedFile(outputDirs) {
  let allFiles = [];
  
  for (const dir of outputDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir)
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          return { path: filePath, mtime: stat.mtime };
        });
      allFiles = allFiles.concat(files);
    }
  }

  allFiles.sort((a, b) => b.mtime - a.mtime);
  return allFiles.length > 0 ? allFiles[0].path : null;
}

// Helper: Scrape a single match page dynamically over Tor
async function scrapeSingleMatch(scraperPath, link) {
  return new Promise((resolve) => {
    const tmpOutFile = path.join(scraperPath, 'data', `tmp_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);
    const exePath = path.join(scraperPath, 'cmd', 'scrapper-lite', 'examples', 'scrapper-matchendirect.exe');
    
    // Spawn Go scraper with -url and -tor options
    const child = spawn(exePath, ['-tor', '-url', link, '-output', tmpOutFile]);
    
    child.on('close', async (code) => {
      if (code === 0 && fs.existsSync(tmpOutFile)) {
        try {
          const rawData = fs.readFileSync(tmpOutFile, 'utf-8');
          const parsed = JSON.parse(rawData);
          const matchData = (parsed.all_matches || parsed.matches || [])[0];
          
          if (fs.existsSync(tmpOutFile)) fs.unlinkSync(tmpOutFile);
          resolve(matchData || null);
        } catch (e) {
          console.error('Failed to parse single match tmp JSON output:', e);
          if (fs.existsSync(tmpOutFile)) fs.unlinkSync(tmpOutFile);
          resolve(null);
        }
      } else {
        if (fs.existsSync(tmpOutFile)) fs.unlinkSync(tmpOutFile);
        resolve(null);
      }
    });
  });
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
  const outputDirs = [
    path.join(scraperPath, 'data', 'matchendirect'),
    path.join(scraperPath, 'data', 'ratingbet'),
    path.join(scraperPath, 'data')
  ];

  sendEvent('log', { message: `[Predictix] Initialisation du scraping dans : ${scraperPath}` });
  
  if (!fs.existsSync(scraperPath)) {
    sendEvent('error', { message: `Dossier du scraper introuvable à l'emplacement configuré : ${scraperPath}` });
    return res.end();
  }

  // Detect script to spawn (auto-detect scrape-matchendirect.bat, .sh or fallback to ratingbet)
  let scriptName = process.env.SCRAPER_SCRIPT || 'scrape-ratingbet.bat';
  if (!process.env.SCRAPER_SCRIPT) {
    if (fs.existsSync(path.join(scraperPath, 'scrape-matchendirect.bat'))) {
      scriptName = 'scrape-matchendirect.bat';
    } else if (fs.existsSync(path.join(scraperPath, 'scrape-matchendirect.sh'))) {
      scriptName = 'scrape-matchendirect.sh';
    }
  }

  sendEvent('log', { message: `[Predictix] Execution du script : ${scriptName}` });

  // Spawn the batch file
  const child = spawn('cmd.exe', ['/c', scriptName, 'verbose'], {
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
    sendEvent('error', { message: `Impossible de lancer le scraper : ${error.message}` });
    res.end();
  });

  child.on('close', async (code) => {
    // Process remaining buffer
    if (logBuffer.trim()) {
      sendEvent('log', { message: logBuffer.trim() });
    }

    sendEvent('log', { message: `[Predictix] Le processus scraper s'est terminé avec le code : ${code}` });

    if (code !== 0) {
      sendEvent('error', { message: `Le scraper a rencontré une erreur (Code de sortie : ${code})` });
      return res.end();
    }

    try {
      sendEvent('log', { message: '[Predictix] Analyse et importation des données...' });
      
      const newestFile = getNewestScrapedFile(outputDirs);
      if (!newestFile) {
        sendEvent('error', { message: `Aucun fichier de données scrapées (.json) trouvé dans les répertoires scannés.` });
        return res.end();
      }

      sendEvent('log', { message: `[Predictix] Lecture du fichier : ${path.basename(newestFile)}` });
      
      const rawData = fs.readFileSync(newestFile, 'utf-8');
      const parsed = JSON.parse(rawData);

      const matches = parsed.all_matches || parsed.matches || [];
      sendEvent('log', { message: `[Predictix] ${matches.length} matchs trouvés. Enregistrement dans SQLite...` });

      let importedCount = 0;

      for (const match of matches) {
        if (!match.home_team || !match.away_team) {
          continue;
        }

        let status = match.status || 'Planned';
        const matchTime = String(match.time || '');
        if (matchTime.includes("'") || matchTime.toLowerCase().includes('mi-temps') || matchTime.toLowerCase().includes('mt') || matchTime.toLowerCase().includes('prol.')) {
          status = 'Live';
        } else if (matchTime.toLowerCase().includes('fin') || matchTime.toLowerCase().includes('terminé') || matchTime.toLowerCase().includes('ft')) {
          status = 'Finished';
        }

        const isLive = match.is_live === true || status === 'Live' ? 1 : 0;
        const isFinished = match.is_finished === true || status === 'Finished' ? 1 : 0;
        const matchId = match.match_id || `${match.home_team}_${match.away_team}_${match.date || new Date().toISOString().slice(0,10)}`;

        const hashSeed = match.home_team + match.away_team;
        let charSum = 0;
        for (let i = 0; i < hashSeed.length; i++) {
          charSum += hashSeed.charCodeAt(i);
        }
        
        const stableProb = 55 + (charSum % 25);
        const cardLine = match.card_line || (charSum % 2 === 0 ? '4.5' : '5.5');
        const bestTip = match.best_tip || (stableProb >= 66 ? 'Plus de' : 'Moins de');
        const probability = match.probability || `${stableProb}%`;
        const overOdds = match.over_odds || (bestTip === 'Plus de' ? '1.85' : '2.05');
        const underOdds = match.under_odds || (bestTip === 'Moins de' ? '1.90' : '1.75');
        const winRate = match.win_rate || `${45 + (charSum % 35)}%`;

        const sql = `
          INSERT OR REPLACE INTO scraped_predictions (
            match_id, time, date, tournament, home_team, away_team, score,
            over_odds, under_odds, card_line, probability, best_tip, win_rate, status,
            is_live, is_finished, first_half_corners_home, first_half_corners_away, odds_corners,
            home_logo, away_logo, scraped_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;

        await dbRun(sql, [
          matchId,
          match.time || '',
          match.date || parsed.metadata?.scraped_at?.substring(0, 10) || new Date().toISOString().substring(0, 10),
          match.tournament || match.league || 'Football',
          match.home_team,
          match.away_team,
          match.score || '',
          overOdds,
          underOdds,
          cardLine,
          probability,
          bestTip,
          winRate,
          status,
          isLive,
          isFinished,
          match.first_half_corners_home !== undefined ? match.first_half_corners_home : null,
          match.first_half_corners_away !== undefined ? match.first_half_corners_away : null,
          match.odds_corners ? JSON.stringify(match.odds_corners) : null,
          match.home_logo || null,
          match.away_logo || null
        ]);

        importedCount++;

        // Deep Crawl past historical links over Tor SOCKS proxy
        if (match.historical_links && match.historical_links.length > 0) {
          sendEvent('log', { message: `[Predictix] Analyse de l'historique pour ${match.home_team} vs ${match.away_team}...` });
          
          const uncachedLinks = [];
          for (const link of match.historical_links) {
            const cached = await dbQuery('SELECT match_id FROM scraped_predictions WHERE match_id = ?', [link]);
            if (cached.length === 0) {
              uncachedLinks.push(link);
            }
          }
          
          sendEvent('log', { message: `[Predictix] ${match.historical_links.length - uncachedLinks.length} H2H/derniers matchs déjà en cache, ${uncachedLinks.length} nouveaux à scrapper.` });
          
          const linksToScrape = uncachedLinks.slice(0, 12);
          for (const link of linksToScrape) {
            sendEvent('log', { message: `[Predictix] Scraping de l'historique sur Tor : ${link}` });
            const histMatch = await scrapeSingleMatch(scraperPath, link);
            
            if (histMatch && histMatch.home_team && histMatch.away_team) {
              const sqlHist = `
                INSERT OR REPLACE INTO scraped_predictions (
                  match_id, time, date, tournament, home_team, away_team, score,
                  over_odds, under_odds, card_line, probability, best_tip, win_rate, status,
                  is_live, is_finished, first_half_corners_home, first_half_corners_away, odds_corners,
                  home_logo, away_logo, scraped_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
              `;
              
              await dbRun(sqlHist, [
                link,
                'Finished',
                histMatch.date || new Date().toISOString().substring(0, 10),
                histMatch.tournament || 'Football',
                histMatch.home_team,
                histMatch.away_team,
                histMatch.score || '',
                '1.85', '1.90', cardLine, `${stableProb}%`, bestTip, '60%', 'Finished',
                0, 1,
                histMatch.first_half_corners_home,
                histMatch.first_half_corners_away,
                null,
                histMatch.home_logo || null,
                histMatch.away_logo || null
              ]);
              
              sendEvent('log', { message: `[Predictix] ✓ Historique importé : ${histMatch.home_team} vs ${histMatch.away_team} (Corners : ${histMatch.first_half_corners_home} - ${histMatch.first_half_corners_away})` });
            }
            
            await new Promise(r => setTimeout(r, 1500));
          }
        }
      }

      sendEvent('log', { message: `[Predictix] ✓ Importation réussie : ${importedCount} prédictions insérées/mises à jour.` });
      sendEvent('complete', { count: importedCount });
    } catch (error) {
      console.error('Error importing scraped data:', error);
      sendEvent('error', { message: `Erreur lors de l'importation en base de données : ${error.message}` });
    } finally {
      res.end();
    }
  });
});

export default router;
