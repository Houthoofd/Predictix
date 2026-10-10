import fs from 'fs';
import path from 'path';
import { spawn, exec } from 'child_process';

const isWindows = process.platform === 'win32';
const exeName = isWindows ? 'predictix-crawler.exe' : 'predictix-crawler';

/**
 * Execute discovery of matches via Go scraper batch script
 */
export function runDiscoveryProcess(
  scraperPath,
  scriptName,
  outputDirs,
  targetDate = null,
  onSpawn = null,
  scraper = 'matchendirect',
  sport = 'football',
  networkMode = null,
  socksPort = 9050
) {
  return new Promise((resolve, reject) => {
    console.log(`[Predictix Discovery] Starting discovery in ${scraperPath} using ${scraper} for sport: ${sport}, date: ${targetDate || 'today'}...`);
    
    const dataDir = path.join(scraperPath, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const tmpOutFile = path.join(dataDir, `tmp_disc_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);
    
    const resolvedNetworkMode = networkMode || process.env.NETWORK_MODE || (scraper === 'flashscore' ? 'direct' : 'tor-fallback');
    const effectiveSocksPort = (resolvedNetworkMode === 'direct' || scraper === 'flashscore') ? 0 : socksPort;
    const args = [
      '-source', scraper,
      '-action', 'discover',
      '-sport', sport,
      '-network-mode', resolvedNetworkMode,
      '-socks-port', String(effectiveSocksPort),
      '-tor-port', String(effectiveSocksPort),
      '-output', tmpOutFile
    ];
    if (targetDate) {
      args.push('-date', targetDate);
    }
    
    const exePath = path.join(scraperPath, 'cmd', 'predictix-crawler', exeName);
    const child = spawn(exePath, args, {
      env: { ...process.env, FORCE_COLOR: '1' },
      windowsHide: true
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
