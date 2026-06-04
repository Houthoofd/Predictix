import net from 'net';
import fs from 'fs';
import path from 'path';
import https from 'https';
import os from 'os';
import { spawn, exec, execSync } from 'child_process';

/**
 * Check if Tor SOCKS5 proxy port is active
 */
export function isTorActive(socksPort = 9050) {
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
    
    socket.connect(socksPort, '127.0.0.1');
  });
}

/**
 * Send a SIGNAL NEWNYM to Tor control port (default 9051) to rotate IP
 */
export function renewTorSession(controlPort = 9051) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2500);

    socket.on('connect', () => {
      // Authenticate with empty password (default configuration)
      socket.write('AUTHENTICATE ""\r\n');
    });

    let authenticated = false;
    socket.on('data', (data) => {
      const response = data.toString().trim();
      if (response.startsWith('250')) {
        if (!authenticated) {
          authenticated = true;
          socket.write('SIGNAL NEWNYM\r\n');
        } else {
          socket.destroy();
          resolve(true); // IP rotation signal accepted successfully
        }
      } else {
        socket.destroy();
        resolve(false); // Authentication or signal error
      }
    });

    const onError = () => {
      socket.destroy();
      resolve(false); // Connection or protocol error
    };

    socket.on('error', onError);
    socket.on('timeout', onError);

    socket.connect(controlPort, '127.0.0.1');
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
 * Acts as a generic child-process spawner guard.
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
      
      // Spawn Go scraper
      const child = spawn(exePath, args);
      
      if (onSpawn && typeof onSpawn === 'function') {
        onSpawn(child);
      }
      
      // Security timeout guard: 50 seconds max execution
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
      return result; // Success!
    }

    if (attempt < maxAttempts) {
      console.log(`[Predictix Scraper] Attempt ${attempt} failed for link: ${link}. Rotating Tor IP on SOCKS port ${socksPort} (Control: ${socksPort + 1}) and retrying...`);
      await renewTorSession(socksPort + 1);
      await new Promise(r => setTimeout(r, 2500)); // wait for Tor circuit to build and stabilize
    }
  }

  return null; // All attempts failed
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

    // Discovery timeout guard: 80 seconds max execution (allows 3 Tor retries)
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
    sport = 'football'
  } = options;

  let currentIndex = 0;
  
  const worker = async (socksPort) => {
    while (currentIndex < linksToScrape.length) {
      if (shouldStop()) break;
      
      const index = currentIndex++;
      if (index >= linksToScrape.length) break;
      
      const link = linksToScrape[index];
      
      const histMatch = await scrapeSingleMatch(scraperPath, link, true, onSpawn, socksPort, scraper, sport);
 
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
        log(`[Tor Port ${socksPort}] ⚠ H2H sauté (échec du crawl) : ${link}`);
      }

      // Small polite delay between links on the same port
      if (currentIndex < linksToScrape.length && !shouldStop()) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  };

  // Launch workers in parallel matching our active Tor ports
  await Promise.all(activePorts.map(port => worker(port)));
}

/**
 * Sorts and prioritizes direct H2H matches between the two teams to the front of the queue
 */
export function prioritizeDirectH2H(links, homeTeam, awayTeam) {
  if (!links || !Array.isArray(links)) return [];
  if (!homeTeam || !awayTeam) return links;

  const normalize = (name) => {
    return name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacritics
      .replace(/[^a-z0-9]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
  };

  const homeKeywords = normalize(homeTeam);
  const awayKeywords = normalize(awayTeam);

  const direct = [];
  const others = [];

  for (const link of links) {
    const lLower = link.toLowerCase().replace(/[^a-z0-9]/g, ' ');
    
    // Check if the link contains at least one significant keyword from BOTH teams
    const matchesHome = homeKeywords.some(kw => lLower.includes(kw));
    const matchesAway = awayKeywords.some(kw => lLower.includes(kw));

    if (matchesHome && matchesAway) {
      direct.push(link);
    } else {
      others.push(link);
    }
  }

  return [...direct, ...others];
}

/**
 * Fallback to query Wikipedia Pageimages API to resolve missing team logos
 */
export function fetchWikipediaLogoFallback(teamName) {
  return new Promise((resolve) => {
    if (!teamName) return resolve(null);
    
    // Strip accent flags and clean key team keywords
    const cleanedName = teamName.replace(/[▲▼]/g, '').trim();
    const query = encodeURIComponent(`${cleanedName} football`);
    const url = `https://fr.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&generator=search&gsrsearch=${query}&gsrlimit=1&pithumbsize=150`;

    const req = https.get(url, {
      headers: {
        'User-Agent': 'PredictixLogoFetcher/1.0 (benoit@predictix.local)'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.query && json.query.pages) {
            const pages = Object.values(json.query.pages);
            if (pages.length > 0 && pages[0].thumbnail) {
              return resolve(pages[0].thumbnail.source);
            }
          }
          resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.setTimeout(2500, () => {
      req.destroy();
      resolve(null);
    });
  });
}

// Map to track spawned Tor instances: Port -> ChildProcess
export const spawnedTorProcesses = new Map();

/**
 * Dynamically launch Tor instances based on RAM recommendations.
 * Launches Tor on ports that are not already running.
 */
export async function bootstrapTorInstances(neededWorkers, scraperPath, log = console.log) {
  const possiblePorts = [9050, 9052, 9054, 9056, 9058, 9060, 9062, 9064, 9066, 9068, 9070, 9072];
  const portsToActivate = possiblePorts.slice(0, neededWorkers);

  log(`[Tor Bootstrap] Allocation demandée : ${neededWorkers} instances. Analyse des ports : ${portsToActivate.join(', ')}...`);

  const torExe = path.join(scraperPath, 'tor', 'tor', 'tor.exe');
  if (!fs.existsSync(torExe)) {
    log(`[Tor Bootstrap] ❌ Erreur : tor.exe introuvable à l'adresse : ${torExe}. Démarrage manuel requis.`);
    return;
  }

  for (const port of portsToActivate) {
    const active = await isTorActive(port);
    if (active) {
      log(`[Tor Bootstrap] Port ${port} : Déjà actif. Réutilisation de l'instance existante.`);
      continue;
    }

    log(`[Tor Bootstrap] Port ${port} : Inactif. Lancement automatique d'une nouvelle instance Tor...`);
    const tempDir = path.join(process.cwd(), `temp_tor_data_${port}`);
    
    try {
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const child = spawn(torExe, [
        '--SocksPort', String(port),
        '--ControlPort', String(port + 1),
        '--CookieAuthentication', '0',
        '--DataDirectory', tempDir
      ], {
        windowsHide: true
      });

      spawnedTorProcesses.set(port, child);

      // Wait for Tor to bootstrap and listen on the port (timeout 10s)
      let bootstrapSuccessful = false;
      for (let poll = 0; poll < 40; poll++) {
        await new Promise(r => setTimeout(r, 250));
        const isUp = await isTorActive(port);
        if (isUp) {
          bootstrapSuccessful = true;
          break;
        }
      }

      if (bootstrapSuccessful) {
        log(`[Tor Bootstrap] Port ${port} : ✓ Instance Tor lancée et opérationnelle avec succès (Contrôle: ${port + 1}).`);
      } else {
        log(`[Tor Bootstrap] Port ${port} : ❌ Échec de l'initialisation dans le délai imparti. Fermeture.`);
        try {
          if (process.platform === 'win32') {
            execSync(`taskkill /pid ${child.pid} /T /F`);
          } else {
            child.kill();
          }
        } catch (e) {}
        spawnedTorProcesses.delete(port);
        // Clean up data dir
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
      }
    } catch (err) {
      log(`[Tor Bootstrap] Port ${port} : ❌ Erreur lors du lancement : ${err.message}`);
    }
  }
}

/**
 * Terminate all dynamically spawned Tor instances and clean up directories
 */
export async function cleanupSpawnedTor(log = console.log) {
  if (spawnedTorProcesses.size === 0) return;

  log(`[Tor Cleanup] Fermeture propre de ${spawnedTorProcesses.size} instances Tor dynamiques...`);

  for (const [port, child] of spawnedTorProcesses.entries()) {
    try {
      log(`[Tor Cleanup] Port ${port} : Arrêt du processus enfant (PID: ${child.pid})...`);
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${child.pid} /T /F`);
      } else {
        child.kill();
      }
    } catch (e) {
      try { child.kill(); } catch (err) {}
    }

    const tempDir = path.join(process.cwd(), `temp_tor_data_${port}`);
    // Wait slightly for file locks to release, then delete dir
    await new Promise(r => setTimeout(r, 300));
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      setTimeout(() => {
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (err) {}
      }, 1000);
    }
  }

  spawnedTorProcesses.clear();
  log(`[Tor Cleanup] ✓ Toutes les instances Tor dynamiques ont été libérées.`);
}

/**
 * Synchronous cleanup for process exit events to avoid zombie processes
 */
export function cleanupSpawnedTorSync() {
  if (spawnedTorProcesses.size === 0) return;
  console.log(`[Tor Cleanup Sync] Arrêt forcé de sécurité pour ${spawnedTorProcesses.size} instances Tor avant arrêt serveur...`);

  for (const [port, child] of spawnedTorProcesses.entries()) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
      } else {
        process.kill(child.pid, 'SIGKILL');
      }
    } catch (e) {}

    const tempDir = path.join(process.cwd(), `temp_tor_data_${port}`);
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}
  }
  spawnedTorProcesses.clear();
}

// Register process hooks to prevent zombie Tor processes
process.on('exit', () => {
  cleanupSpawnedTorSync();
});
process.on('SIGINT', () => {
  cleanupSpawnedTorSync();
  process.exit();
});
process.on('SIGTERM', () => {
  cleanupSpawnedTorSync();
  process.exit();
});
process.on('uncaughtException', (err) => {
  cleanupSpawnedTorSync();
  console.error('[Uncaught Exception Tor Cleanup]', err);
  process.exit(1);
});

/**
 * Clean and split a team name for fuzzy keyword matching
 */
function cleanTeamName(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, ' ') // alphanumeric only
    .replace(/\b(fc|club|real|atletico|kaa|cd|gv|ladies|reserve|u23|sd|sc|ud|fk|ca)\b/g, '') // strip common prefixes
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 1);
}

/**
 * Fuzzy match helper comparing two team names
 */
export function fuzzyMatch(n1, n2) {
  const clean1 = (n1 || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const clean2 = (n2 || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  
  if (clean1.includes(clean2) || clean2.includes(clean1)) return true;
  
  const w1 = cleanTeamName(n1);
  const w2 = cleanTeamName(n2);
  if (w1.length === 0 || w2.length === 0) return false;
  
  const common = w1.filter(w => w.length >= 3 && w2.includes(w));
  return common.length > 0;
}

/**
 * Call SofaScore API using Windows curl.exe to retrieve daily events
 */
export function fetchSofaEventsForDate(dateStr) {
  return new Promise((resolve) => {
    const cmd = `curl.exe -s -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" "https://api.sofascore.com/api/v1/sport/football/scheduled-events/${dateStr}"`;
    exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        console.error("[SofaScore API] curl.exe failed to get scheduled events:", error.message);
        return resolve(null);
      }
      try {
        const json = JSON.parse(stdout);
        resolve(json.events || null);
      } catch (err) {
        console.error("[SofaScore API] Failed to parse events JSON output:", err.message);
        resolve(null);
      }
    });
  });
}

/**
 * Match a specific game inside SofaScore event list using home/away names
 */
export function findSofaEventId(events, homeTeam, awayTeam) {
  if (!events || !Array.isArray(events)) return null;
  
  for (const e of events) {
    const sHome = e.homeTeam?.name;
    const sAway = e.awayTeam?.name;
    if (!sHome || !sAway) continue;
    
    if (
      (fuzzyMatch(homeTeam, sHome) && fuzzyMatch(awayTeam, sAway)) ||
      (fuzzyMatch(homeTeam, sAway) && fuzzyMatch(awayTeam, sHome))
    ) {
      return e.id;
    }
  }
  return null;
}

/**
 * Call SofaScore API using Windows curl.exe to retrieve detailed statistics for a specific event
 */
export function fetchSofaStats(eventId) {
  return new Promise((resolve) => {
    const cmd = `curl.exe -s -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" "https://api.sofascore.com/api/v1/event/${eventId}/statistics"`;
    exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[SofaScore API] Failed to fetch stats for event ${eventId}:`, error.message);
        return resolve(null);
      }
      try {
        const json = JSON.parse(stdout);
        resolve(json.statistics || null);
      } catch (err) {
        console.error(`[SofaScore API] Failed to parse stats JSON for event ${eventId}:`, err.message);
        resolve(null);
      }
    });
  });
}

/**
 * Translate SofaScore raw statistics items into Predictix format
 */
export function mapSofaStatsToPredictix(sofaStats) {
  if (!sofaStats || !Array.isArray(sofaStats)) return null;

  const fullTime = sofaStats.find(s => s.period === 'ALL');
  const firstHalf = sofaStats.find(s => s.period === '1ST');

  const result = {
    possession: null,
    corners: null,
    shots: null,
    shots_on_target: null,
    fouls: null,
    yellow_cards: null,
    offsides: null,
    first_half_corners: null
  };

  const findItem = (periodData, itemName) => {
    if (!periodData || !periodData.groups) return null;
    for (const group of periodData.groups) {
      const item = group.statisticsItems.find(i => i.name.toLowerCase() === itemName.toLowerCase());
      if (item) return item;
    }
    return null;
  };

  const parseVal = (valStr) => {
    if (valStr === null || valStr === undefined) return 0;
    const parsed = parseFloat(String(valStr).replace('%', ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  if (fullTime) {
    // Possession
    const possessionItem = findItem(fullTime, 'Ball possession');
    if (possessionItem) {
      result.possession = {
        home: parseVal(possessionItem.home),
        away: parseVal(possessionItem.away)
      };
    }

    // Corners
    const cornersItem = findItem(fullTime, 'Corner kicks');
    if (cornersItem) {
      result.corners = {
        home: parseVal(cornersItem.home),
        away: parseVal(cornersItem.away)
      };
    }

    // Total shots
    const shotsItem = findItem(fullTime, 'Total shots');
    if (shotsItem) {
      result.shots = {
        home: parseVal(shotsItem.home),
        away: parseVal(shotsItem.away)
      };
    }

    // Shots on target
    const shotsOnTargetItem = findItem(fullTime, 'Shots on target');
    if (shotsOnTargetItem) {
      result.shots_on_target = {
        home: parseVal(shotsOnTargetItem.home),
        away: parseVal(shotsOnTargetItem.away)
      };
    }

    // Fouls
    const foulsItem = findItem(fullTime, 'Fouls');
    if (foulsItem) {
      result.fouls = {
        home: parseVal(foulsItem.home),
        away: parseVal(foulsItem.away)
      };
    }

    // Yellow cards
    const yellowCardsItem = findItem(fullTime, 'Yellow cards');
    if (yellowCardsItem) {
      result.yellow_cards = {
        home: parseVal(yellowCardsItem.home),
        away: parseVal(yellowCardsItem.away)
      };
    }

    // Offsides
    const offsidesItem = findItem(fullTime, 'Offsides');
    if (offsidesItem) {
      result.offsides = {
        home: parseVal(offsidesItem.home),
        away: parseVal(offsidesItem.away)
      };
    }
  }

  if (firstHalf) {
    const cornersItem1H = findItem(firstHalf, 'Corner kicks');
    if (cornersItem1H) {
      result.first_half_corners = {
        home: parseVal(cornersItem1H.home),
        away: parseVal(cornersItem1H.away)
      };
    }
  }

  return result;
}

/**
 * Global SofaScore orchestrator fallback search
 */
export async function tryResolveSofaStatsFallback(dateStr, homeTeam, awayTeam) {
  const parsedDate = parseFrenchDate(dateStr);
  if (!parsedDate) return null;

  console.log(`[SofaScore Fallback] Searching for event on ${parsedDate}: ${homeTeam} vs ${awayTeam}`);
  const events = await fetchSofaEventsForDate(parsedDate);
  if (!events) {
    console.log(`[SofaScore Fallback] No events found for date ${parsedDate}`);
    return null;
  }

  const eventId = findSofaEventId(events, homeTeam, awayTeam);
  if (!eventId) {
    console.log(`[SofaScore Fallback] Event not found for ${homeTeam} vs ${awayTeam}`);
    return null;
  }

  console.log(`[SofaScore Fallback] Event found! SofaScore Event ID: ${eventId}. Fetching statistics...`);
  const stats = await fetchSofaStats(eventId);
  if (!stats) {
    console.log(`[SofaScore Fallback] No statistics found for event ID ${eventId}`);
    return null;
  }

  const mapped = mapSofaStatsToPredictix(stats);
  if (mapped) {
    console.log(`[SofaScore Fallback] Successfully mapped statistics for event ID ${eventId}`);
    return {
      stats_source: 'sofascore',
      ...mapped
    };
  }

  return null;
}





