import fs from 'fs';
import path from 'path';
import { spawn, exec } from 'child_process';
import { isTorActive, renewTorSession } from './torSessionManager.js';

const isWindows = process.platform === 'win32';
const exeName = isWindows ? 'predictix-crawler.exe' : 'predictix-crawler';

/**
 * Automatically compile predictix-crawler if missing (only in development)
 */
export function ensureScraperCompiled(scraperPath) {
  return new Promise((resolve, reject) => {
    const exePath = path.join(scraperPath, 'cmd', 'predictix-crawler', exeName);
    const goDir = path.join(scraperPath, 'cmd', 'predictix-crawler');
    
    let needsCompile = !fs.existsSync(exePath);
    
    if (!needsCompile && process.env.NODE_ENV !== 'production') {
      try {
        const exeStat = fs.statSync(exePath);
        const checkNewer = (dir) => {
          if (!fs.existsSync(dir)) return false;
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
              if (file !== 'node_modules' && file !== '.git' && checkNewer(filePath)) {
                return true;
              }
            } else if (file.endsWith('.go') || file.endsWith('.json')) {
              if (stat.mtime > exeStat.mtime) {
                console.log(`[Predictix Crawler] Source file changed: ${file} (mtime: ${stat.mtime} > exe: ${exeStat.mtime}). Recompiling...`);
                return true;
              }
            }
          }
          return false;
        };
        needsCompile = checkNewer(goDir);
      } catch (err) {
        console.warn(`[Predictix Crawler] Error checking modification times: ${err.message}`);
      }
    }

    if (!needsCompile) {
      return resolve();
    }
    
    if (process.env.NODE_ENV === 'production') {
      const errorMsg = `[Predictix Crawler] Precompiled binary not found at ${exePath} for production mode. Please cross-compile and copy the binary first.`;
      console.error(errorMsg);
      return reject(new Error(errorMsg));
    }
    
    console.log(`[Predictix Crawler] Executable not found or outdated. Compiling at: ${scraperPath}`);
    const buildCmd = `go build -o ${exeName}`;
    const buildCwd = path.join(scraperPath, 'cmd', 'predictix-crawler');
    
    exec(buildCmd, { cwd: buildCwd }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[Predictix Crawler] Compilation failed:`, stderr || error.message);
        return reject(new Error(`Failed to compile predictix-crawler: ${stderr || error.message}`));
      }
      console.log(`[Predictix Crawler] ✓ Consolidated crawler compiled successfully!`);
      resolve();
    });
  });
}

/**
 * Spawn Go scraper to retrieve details for a single specific match page.
 */
export async function scrapeSingleMatch(scraperPath, link, skipOdds = false, onSpawn = null, socksPort = 9050, scraper = 'matchendirect', sport = 'football') {
  const maxAttempts = 2;
  const useTor = scraper !== 'flashscore';
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (useTor) {
      const torActive = await isTorActive(socksPort);
      if (!torActive) {
        console.warn(`[Predictix Scraper] Tor is inactive on port ${socksPort}. Skipping scrape for: ${link}`);
        return null;
      }
    }

    const result = await new Promise((resolve) => {
      let resolved = false;
      const dataDir = path.join(scraperPath, 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const tmpOutFile = path.join(dataDir, `tmp_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);
      
      const currentSocksPort = useTor ? socksPort : 0;
      let args = ['-source', scraper, '-action', 'scrape', '-url', link, '-socks-port', String(currentSocksPort), '-output', tmpOutFile];
      if (scraper === 'flashscore') {
        args.push('-sport', sport);
      } else if (skipOdds) {
        args.push('-skip-odds');
      }
      
      const exePath = path.join(scraperPath, 'cmd', 'predictix-crawler', exeName);
      const child = spawn(exePath, args);
      
      if (onSpawn && typeof onSpawn === 'function') {
        onSpawn(child);
      }
      
      const timeout = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        console.warn(`[Predictix Scraper] Single match scraper timed out (50s) for: ${link}. Terminating process.`);
        try {
          if (isWindows) {
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
    
    const dataDir = path.join(scraperPath, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const tmpOutFile = path.join(dataDir, `tmp_disc_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);
    
    const args = ['-source', scraper, '-action', 'discover', '-sport', sport, '-output', tmpOutFile];
    if (scraper === 'flashscore') {
      args.push('-socks-port', '0');
    }
    if (targetDate) {
      args.push('-date', targetDate);
    }
    
    const exePath = path.join(scraperPath, 'cmd', 'predictix-crawler', exeName);
    const child = spawn(exePath, args, {
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    if (onSpawn && typeof onSpawn === 'function') {
      onSpawn(child);
    }

    const timeoutGuard = setTimeout(() => {
      console.warn(`[Predictix Discovery] Process timed out (80s). Killing process tree.`);
      const pid = child.pid;
      if (isWindows) {
        exec(`taskkill /pid ${pid} /T /F`, (err) => {
          if (err) console.error('Failed to taskkill timed-out discovery:', err.message);
        });
      } else {
        child.kill();
      }
      if (fs.existsSync(tmpOutFile)) {
        try { fs.unlinkSync(tmpOutFile); } catch (e) {}
      }
      reject(new Error("La découverte a expiré (timeout de 80 secondes)."));
    }, 80000);

    let logOutput = '';
    child.stdout.on('data', (data) => logOutput += data.toString());
    child.stderr.on('data', (data) => logOutput += data.toString());

    child.on('error', (err) => {
      clearTimeout(timeoutGuard);
      if (fs.existsSync(tmpOutFile)) {
        try { fs.unlinkSync(tmpOutFile); } catch (e) {}
      }
      reject(err);
    });

    child.on('close', async (code) => {
      clearTimeout(timeoutGuard);
      console.log(`[Predictix Discovery] Process closed with code: ${code}`);

      if (code !== 0) {
        if (fs.existsSync(tmpOutFile)) {
          try { fs.unlinkSync(tmpOutFile); } catch (e) {}
        }
        return reject(new Error(`Le scraper a échoué (Code : ${code}). Logs: ${logOutput}`));
      }

      try {
        if (!fs.existsSync(tmpOutFile)) {
          return reject(new Error("Aucun fichier de résultats de découverte trouvé."));
        }

        console.log(`[Predictix Discovery] Parsing file: ${tmpOutFile}`);
        const rawData = fs.readFileSync(tmpOutFile, 'utf-8');
        const parsed = JSON.parse(rawData);
        const matches = parsed.all_matches || parsed.matches || [];

        try {
          if (fs.existsSync(tmpOutFile)) fs.unlinkSync(tmpOutFile);
        } catch (e) {}

        resolve(matches);
      } catch (err) {
        if (fs.existsSync(tmpOutFile)) {
          try { fs.unlinkSync(tmpOutFile); } catch (e) {}
        }
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
