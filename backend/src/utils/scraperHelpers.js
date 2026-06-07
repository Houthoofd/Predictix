import fs from 'fs';
import path from 'path';
import { spawn, exec } from 'child_process';

// Re-export sub-helpers to maintain full compatibility across the codebase
export { 
  spawnedTorProcesses, 
  isTorActive, 
  renewTorSession, 
  bootstrapTorInstances, 
  cleanupSpawnedTor, 
  cleanupSpawnedTorSync 
} from './torSessionManager.js';

export { parseFrenchDate } from './dateParser.js';

export { 
  fetchSofaEventsForDate, 
  findSofaEventId, 
  fetchSofaStats, 
  mapSofaStatsToPredictix, 
  tryResolveSofaStatsFallback 
} from './sofaScoreResolver.js';

export { 
  cleanTeamName, 
  fuzzyMatch, 
  prioritizeDirectH2H, 
  fetchWikipediaLogoFallback 
} from './textMatcher.js';

// Import Tor helper needed locally in scraperHelpers
import { isTorActive, renewTorSession } from './torSessionManager.js';

/**
 * Scan scraper output directories and return path of the newest JSON file
 */
export function getNewestScrapedFile(outputDirs) {
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

/**
 * Dynamic log line rewriter based on strategy metric target
 */
export function rewriteScraperLog(line, strategy) {
  if (!strategy) return line;
  
  const metricLabels = {
    fouls: 'Fautes commises',
    yellow_cards: 'Cartons Jaunes',
    possession: 'Possession de balle',
    shots_on_target: 'Tirs Cadrés',
    shots: 'Tirs',
    offsides: 'Hors-jeu',
    corners: 'Corners 1ère MT',
    total_rebounds: 'Rebonds',
    assists: 'Passes décisives',
    blocks: 'Contres',
    steals: 'Interceptions',
    field_goals: 'Paniers réussis',
    free_throws: 'Lancers francs',
    aces: 'Aces',
    double_faults: 'Doubles fautes',
    first_serve: '1er service (%)',
    break_points: 'Balles de break',
    tries: 'Essais',
    penalties: 'Pénalités',
    conversions: 'Transformations',
    goals: 'Buts',
    saves: 'Arrêts'
  };

  const metricLabel = metricLabels[strategy.metric] || strategy.metric;

  // 1. Title block rewrite
  if (line.includes('SCRAPER MATCH ENDIRECT PREMIUM - Corners 1ere Mi-Temps')) {
    return line.replace('SCRAPER MATCH ENDIRECT PREMIUM - Corners 1ere Mi-Temps', `SCRAPER MATCH ENDIRECT PREMIUM - Cible : ${metricLabel}`);
  }

  // 2. Metric extraction line rewrite
  if (line.includes('✓ Corners 1ère MT:')) {
    const matchData = line.match(/✓ Corners 1ère MT:\s*(\d+)\s*-\s*(\d+)\s*\((Historical links:\s*\d+)\)/);
    if (matchData) {
      return `✓ Statistiques cibles extraites avec succès pour la stratégie (Métrique: ${metricLabel}) (${matchData[3]})`;
    }
    return `✓ Statistiques cibles extraites avec succès (Cible: ${metricLabel})`;
  }

  return line;
}

/**
 * Spawn Go scraper to retrieve details for a single specific match page.
 */
export async function scrapeSingleMatch(scraperPath, link, skipOdds = false, onSpawn = null, socksPort = 9050, scraper = 'matchendirect', sport = 'football') {
  const maxAttempts = 2;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const torActive = await isTorActive(socksPort);
    if (!torActive) {
      console.warn(`[Predictix Scraper] Tor is inactive on port ${socksPort}. Skipping scrape for: ${link}`);
      return null;
    }

    const result = await new Promise((resolve) => {
      let resolved = false;
      const tmpOutFile = path.join(scraperPath, 'data', `tmp_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);
      
      let exeName = 'scrapper-matchendirect.exe';
      let args = [];
      
      if (scraper === 'flashscore') {
        exeName = 'scrapper-flashscore.exe';
        args = ['-tor', '-socks-port', String(socksPort), '-sport', sport, '-url', link, '-output', tmpOutFile];
      } else {
        exeName = 'scrapper-matchendirect.exe';
        args = ['-tor', '-socks-port', String(socksPort), '-url', link, '-output', tmpOutFile];
        if (skipOdds) {
          args.push('-skip-odds');
        }
      }
      
      const exePath = path.join(scraperPath, 'cmd', 'scrapper-lite', 'examples', exeName);
      const child = spawn(exePath, args);
      
      if (onSpawn && typeof onSpawn === 'function') {
        onSpawn(child);
      }
      
      const timeout = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        console.warn(`[Predictix Scraper] Single match scraper timed out (50s) for: ${link}. Terminating process.`);
        try {
          if (process.platform === 'win32') {
            exec(`taskkill /pid ${child.pid} /T /F`, (err) => {
              if (err) console.error('Failed to taskkill timed-out child process tree:', err.message);
            });
          } else {
            child.kill();
          }
        } catch (err) {
          console.error('Failed to kill timed-out scraper child process:', err.message);
          try { child.kill(); } catch (e) {}
        }
        if (fs.existsSync(tmpOutFile)) {
          try { fs.unlinkSync(tmpOutFile); } catch (e) {}
        }
        resolve(null);
      }, 50000);
      
      child.on('error', (err) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        console.error('[Predictix Scraper] Failed to spawn single match scraper:', err.message);
        resolve(null);
      });
      
      child.on('close', async (code) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        
        if (code === 0 && fs.existsSync(tmpOutFile)) {
          try {
            const rawData = fs.readFileSync(tmpOutFile, 'utf-8');
            const parsed = JSON.parse(rawData);
            const matchData = (parsed.all_matches || parsed.matches || [])[0];
            if (matchData) {
              matchData.sport = sport;
            }
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

    if (result) {
      return result;
    }

    if (attempt < maxAttempts) {
      console.log(`[Predictix Scraper] Attempt ${attempt} failed for link: ${link}. Rotating Tor IP on SOCKS port ${socksPort} (Control: ${socksPort + 1}) and retrying...`);
      await renewTorSession(socksPort + 1);
      await new Promise(r => setTimeout(r, 2500));
    }
  }

  return null;
}

/**
 * Execute discovery of matches via Go scraper batch script
 */
export function runDiscoveryProcess(scraperPath, scriptName, outputDirs, targetDate = null, onSpawn = null, scraper = 'matchendirect', sport = 'football') {
  return new Promise((resolve, reject) => {
    console.log(`[Predictix Discovery] Starting discovery in ${scraperPath} using ${scraper} for sport: ${sport}, date: ${targetDate || 'today'}...`);
    
    let args = [];
    if (scraper === 'flashscore') {
      let batScript = 'scrape-flashscore.bat';
      if (process.platform !== 'win32') {
        batScript = 'scrape-flashscore.sh';
      }
      args = ['/c', batScript, sport, '0', targetDate || '', 'discover'];
    } else {
      args = ['/c', scriptName, 'verbose', '0', 'discover'];
      if (targetDate) {
        args.push(targetDate);
      }
    }
    
    const child = spawn('cmd.exe', args, {
      cwd: scraperPath,
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    if (onSpawn && typeof onSpawn === 'function') {
      onSpawn(child);
    }

    const timeoutGuard = setTimeout(() => {
      console.warn(`[Predictix Discovery] Process timed out (80s). Killing process tree.`);
      const pid = child.pid;
      if (process.platform === 'win32') {
        exec(`taskkill /pid ${pid} /T /F`, (err) => {
          if (err) console.error('Failed to taskkill timed-out discovery:', err.message);
        });
      } else {
        child.kill();
      }
      reject(new Error("La découverte a expiré (timeout de 80 secondes)."));
    }, 80000);

    let logOutput = '';
    child.stdout.on('data', (data) => logOutput += data.toString());
    child.stderr.on('data', (data) => logOutput += data.toString());

    child.on('error', (err) => {
      clearTimeout(timeoutGuard);
      reject(err);
    });

    child.on('close', async (code) => {
      clearTimeout(timeoutGuard);
      console.log(`[Predictix Discovery] Process closed with code: ${code}`);

      if (code !== 0) {
        return reject(new Error(`Le scraper a échoué (Code : ${code}). Logs: ${logOutput}`));
      }

      try {
        const newestFile = getNewestScrapedFile(outputDirs);
        if (!newestFile) {
          return reject(new Error("Aucun fichier de résultats de découverte trouvé."));
        }

        console.log(`[Predictix Discovery] Parsing newest file: ${newestFile}`);
        const rawData = fs.readFileSync(newestFile, 'utf-8');
        const parsed = JSON.parse(rawData);
        const matches = parsed.all_matches || parsed.matches || [];

        try {
          if (fs.existsSync(newestFile)) fs.unlinkSync(newestFile);
        } catch (e) {}

        resolve(matches);
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * Perform a parallel batch H2H crawl over Tor proxy using active ports worker pool
 */
export async function crawlH2HLinksBatch(linksToScrape, scraperPath, options = {}) {
  const { 
    activePorts = [9050],
    onSpawn = null, 
    shouldStop = () => false, 
    log = console.log,
    importHistoricalMatch,
    importSkippedMatch,
    onH2HScraped,
    scraper = 'matchendirect',
    sport = 'football',
    linkSports = null
  } = options;

  let currentIndex = 0;
  
  const worker = async (socksPort) => {
    while (currentIndex < linksToScrape.length) {
      if (shouldStop()) break;
      
      const index = currentIndex++;
      if (index >= linksToScrape.length) break;
      
      const link = linksToScrape[index];
      const matchSport = (linkSports && linkSports.get(link)) || sport;
      
      const histMatch = await scrapeSingleMatch(scraperPath, link, true, onSpawn, socksPort, scraper, matchSport);
 
      if (histMatch && histMatch.home_team && histMatch.away_team) {
        if (importHistoricalMatch) await importHistoricalMatch(link, histMatch);
        if (onH2HScraped) {
          onH2HScraped({ ...histMatch, match_url: histMatch.match_url || link });
        }
        const homeClean = histMatch.home_team.replace(/[▲▼]/g, '').trim();
        const awayClean = histMatch.away_team.replace(/[▲▼]/g, '').trim();
        const scoreText = histMatch.score ? ` (Score: ${histMatch.score})` : '';
        const dateText = histMatch.date ? ` (Date: ${histMatch.date})` : '';
        const cornersText = (histMatch.first_half_corners_home !== null && histMatch.first_half_corners_home !== undefined) 
          ? ` (Corners 1ère MT: ${histMatch.first_half_corners_home} - ${histMatch.first_half_corners_away})` 
          : '';
        log(`[Tor Port ${socksPort}] ✓ H2H importé : ${homeClean} vs ${awayClean}${dateText}${scoreText}${cornersText}`);
      } else {
        if (importSkippedMatch) await importSkippedMatch(link);
        log(`[Tor Port ${socksPort}] [Warning] H2H sauté (échec du crawl) : ${link}`);
      }

      if (currentIndex < linksToScrape.length && !shouldStop()) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  };

  await Promise.all(activePorts.map(port => worker(port)));
}
