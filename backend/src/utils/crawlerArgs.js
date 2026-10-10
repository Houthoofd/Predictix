import fs from 'fs';
import path from 'path';

export const isWindows = process.platform === 'win32';
export const exeName = isWindows ? 'predictix-crawler.exe' : 'predictix-crawler';

/**
 * Get absolute path to the crawler executable
 * @param {string} scraperPath
 * @returns {string}
 */
export function getCrawlerExecutablePath(scraperPath) {
  return path.join(scraperPath, 'cmd', 'predictix-crawler', exeName);
}

/**
 * Create a unique temporary JSON output file path in the scraper's data directory
 */
export function createTempOutputFile(scraperPath, prefix = 'tmp') {
  const dataDir = path.join(scraperPath, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);
}

/**
 * Remove temporary files safely without throwing errors
 */
export function cleanupFiles(...files) {
  for (const f of files) {
    if (f && fs.existsSync(f)) {
      try { fs.unlinkSync(f); } catch (e) {}
    }
  }
}

/**
 * Build CLI arguments for predictix-crawler
 * @param {object} options
 * @returns {Array<string>}
 */
export function buildCrawlerArgs(options = {}) {
  const {
    source,
    action = 'scrape',
    url,
    sport,
    date,
    networkMode,
    socksPort,
    torPort,
    targets,
    output,
    skipOdds
  } = options;

  const args = [];
  if (source) args.push('-source', source);
  if (action) args.push('-action', action);
  if (url) args.push('-url', url);
  if (networkMode) args.push('-network-mode', networkMode);
  if (socksPort !== undefined && socksPort !== null) args.push('-socks-port', String(socksPort));
  if (torPort !== undefined && torPort !== null) args.push('-tor-port', String(torPort));
  if (targets) args.push('-targets', targets);
  if (output) args.push('-output', output);
  if (date) args.push('-date', date);
  if (sport) args.push('-sport', sport);
  if (skipOdds) args.push('-skip-odds');
  return args;
}

/**
 * Build arguments specifically for single match scraping
 */
export function buildSingleMatchArgs(scraper, url, networkMode, socksPort, outputFile, sport = 'football', skipOdds = false) {
  const args = [
    '-source', scraper,
    '-action', 'scrape',
    '-url', url,
    '-network-mode', networkMode,
    '-socks-port', String(socksPort),
    '-tor-port', String(socksPort),
    '-output', outputFile
  ];
  if (scraper === 'flashscore') {
    args.push('-sport', sport);
  } else if (skipOdds) {
    args.push('-skip-odds');
  }
  return args;
}

/**
 * Formats and sanitizes spawn options, execution paths, and environment variables
 */
export function formatCrawlerSpawnOptions(options = {}) {
  const scraperPath = options.scraperPath || process.env.SCRAPER_PATH || 'E:\\Developpement\\scrapper-v3';
  const exePath = options.exePath || getCrawlerExecutablePath(scraperPath);

  const spawnOpts = {
    windowsHide: true,
    ...options,
    env: { ...process.env, ...(options.env || {}) }
  };

  const onSpawn = options.onSpawn || null;
  const sendEvent = options.sendEvent || null;
  delete spawnOpts.scraperPath;
  delete spawnOpts.exePath;
  delete spawnOpts.onSpawn;
  delete spawnOpts.sendEvent;

  return {
    scraperPath,
    exePath,
    spawnOpts,
    onSpawn,
    sendEvent
  };
}

/**
 * Checks whether the Go crawler binary needs to be recompiled
 */
export function isCrawlerBuildNeeded(scraperPath, exePath) {
  if (!fs.existsSync(exePath)) return true;
  if (process.env.NODE_ENV === 'production') return false;
  try {
    const exeMtime = fs.statSync(exePath).mtime;
    const goDir = path.join(scraperPath, 'cmd', 'predictix-crawler');
    const checkDir = (dir) => fs.readdirSync(dir).some((f) => {
      const p = path.join(dir, f);
      const s = fs.statSync(p);
      return s.isDirectory() ? (f !== 'node_modules' && f !== '.git' && checkDir(p))
                             : ((f.endsWith('.go') || f.endsWith('.json')) && s.mtime > exeMtime);
    });
    return checkDir(goDir);
  } catch (e) {
    return false;
  }
}
