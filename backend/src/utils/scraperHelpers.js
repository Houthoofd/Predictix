import net from 'net';
import fs from 'fs';
import path from 'path';
import { spawn, exec } from 'child_process';

/**
 * Check if Tor SOCKS5 proxy port is active
 */
export function isTorActive() {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1500);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    const onError = () => {
      socket.destroy();
      resolve(false);
    };
    
    socket.on('error', onError);
    socket.on('timeout', onError);
    
    socket.connect(9050, '127.0.0.1');
  });
}

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
 * Robustly parse French date string (e.g. "17 mai 2026", "1er juin 2026", "20/05/2026") into YYYY-MM-DD format
 */
export function parseFrenchDate(dateStr) {
  if (!dateStr) return null;
  dateStr = dateStr.trim().toLowerCase();
  
  // Try YYYY-MM-DD first
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Try DD/MM/YYYY or D/M/YYYY
  const dmRef = dateStr.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (dmRef) {
    const day = dmRef[1].padStart(2, '0');
    const month = dmRef[2].padStart(2, '0');
    const year = dmRef[3];
    return `${year}-${month}-${day}`;
  }
  
  // Try French text month, e.g. "17 mai 2026" or "1er juin 2026"
  const frenchMonths = {
    'janvier': '01', 'janv.': '01', 'janv': '01',
    'février': '02', 'févr.': '02', 'févr': '02', 'fevrier': '02',
    'mars': '03',
    'avril': '04', 'avr.': '04', 'avr': '04',
    'mai': '05',
    'juin': '06',
    'juillet': '07', 'juil.': '07', 'juil': '07',
    'août': '08', 'aout': '08',
    'septembre': '09', 'sept.': '09', 'sept': '09',
    'octobre': '10', 'oct.': '10', 'oct': '10',
    'novembre': '11', 'nov.': '11', 'nov': '11',
    'décembre': '12', 'déc.': '12', 'déc': '12', 'decembre': '12'
  };
  
  // Replace "1er" with "1" to simplify parsing
  dateStr = dateStr.replace(/^1er\b/, '1');
  
  const textMatch = dateStr.match(/^(\d{1,2})\s+([a-zéûûöäêèéàç\.]+)\s+(\d{4})$/);
  if (textMatch) {
    const day = textMatch[1].padStart(2, '0');
    const monthName = textMatch[2];
    const year = textMatch[3];
    const month = frenchMonths[monthName];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }
  
  return null;
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
    shots: 'Tirs globaux',
    offsides: 'Hors-jeu',
    corners: 'Corners 1ère MT'
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
 * Acts as a generic child-process spawner guard.
 */
export async function scrapeSingleMatch(scraperPath, link, skipOdds = false, onSpawn = null) {
  const torActive = await isTorActive();
  if (!torActive) {
    console.warn(`[Predictix Scraper] Tor is inactive. Skipping scrape for: ${link}`);
    return null;
  }

  return new Promise((resolve) => {
    let resolved = false;
    const tmpOutFile = path.join(scraperPath, 'data', `tmp_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);
    const exePath = path.join(scraperPath, 'cmd', 'scrapper-lite', 'examples', 'scrapper-matchendirect.exe');
    
    const args = ['-tor', '-url', link, '-output', tmpOutFile];
    if (skipOdds) {
      args.push('-skip-odds');
    }

    // Spawn Go scraper with -url and -tor options
    const child = spawn(exePath, args);
    
    if (onSpawn && typeof onSpawn === 'function') {
      onSpawn(child);
    }
    
    // Security timeout guard: 20 seconds max execution
    const timeout = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      console.warn(`[Predictix Scraper] Single match scraper timed out (20s) for: ${link}. Terminating process.`);
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
    }, 20000);
    
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

/**
 * Execute discovery of matches via Go scraper batch script
 */
export function runDiscoveryProcess(scraperPath, scriptName, outputDirs, onSpawn = null) {
  return new Promise((resolve, reject) => {
    console.log(`[Predictix Discovery] Starting discovery in ${scraperPath}...`);
    
    const child = spawn('cmd.exe', ['/c', scriptName, 'verbose', '0', 'discover'], {
      cwd: scraperPath,
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    if (onSpawn && typeof onSpawn === 'function') {
      onSpawn(child);
    }

    // Discovery timeout guard: 50 seconds max execution
    const timeoutGuard = setTimeout(() => {
      console.warn(`[Predictix Discovery] Process timed out (50s). Killing process tree.`);
      const pid = child.pid;
      if (process.platform === 'win32') {
        exec(`taskkill /pid ${pid} /T /F`, (err) => {
          if (err) console.error('Failed to taskkill timed-out discovery:', err.message);
        });
      } else {
        child.kill();
      }
      reject(new Error("La découverte a expiré (timeout de 50 secondes)."));
    }, 50000);

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

        // Clean up the temporary discovery file
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
 * Perform a parallel batch H2H crawl over Tor proxy
 */
export async function crawlH2HLinksBatch(linksToScrape, scraperPath, options = {}) {
  const { 
    concurrency = 4, 
    onSpawn = null, 
    shouldStop = () => false, 
    log = console.log,
    importHistoricalMatch,
    importSkippedMatch
  } = options;
  
  for (let i = 0; i < linksToScrape.length; i += concurrency) {
    if (shouldStop()) break;
    const chunk = linksToScrape.slice(i, i + concurrency);
    
    await Promise.all(chunk.map(async (link) => {
      if (shouldStop()) return;
      
      const histMatch = await scrapeSingleMatch(scraperPath, link, true, onSpawn);

      if (histMatch && histMatch.home_team && histMatch.away_team) {
        if (importHistoricalMatch) await importHistoricalMatch(link, histMatch);
        const homeClean = histMatch.home_team.replace(/[▲▼]/g, '').trim();
        const awayClean = histMatch.away_team.replace(/[▲▼]/g, '').trim();
        const scoreText = histMatch.score ? ` (Score: ${histMatch.score})` : '';
        const dateText = histMatch.date ? ` (Date: ${histMatch.date})` : '';
        log(`✓ Confrontation importée : ${homeClean} vs ${awayClean}${dateText}${scoreText}`);
      } else {
        if (importSkippedMatch) await importSkippedMatch(link);
        log(`✓ Confrontation sautée (échec du crawl) : ${link}`);
      }
    }));

    if (i + concurrency < linksToScrape.length) {
      await new Promise(r => setTimeout(r, 1200));
    }
  }
}


