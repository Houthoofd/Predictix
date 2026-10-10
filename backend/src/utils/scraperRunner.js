import fs from 'fs';
import path from 'path';
import { isTorActive, renewTorSession } from './torSessionManager.js';
import {
  createTempOutputFile,
  cleanupFiles,
  buildCrawlerArgs,
  buildSingleMatchArgs,
  executeCrawlerCommand,
  ensureScraperCompiled
} from './crawlerProcess.js';

// Re-export modularized discovery and history batch runners for backward compatibility
export { runDiscoveryProcess } from './discoveryRunner.js';
export { crawlH2HLinksBatch, scrapeHistoricalMatches } from './historyBatchRunner.js';
export { ensureScraperCompiled, cleanupFiles } from './crawlerProcess.js';

/**
 * Spawn Go scraper to retrieve details for a single specific match page.
 */
export async function scrapeSingleMatch(
  scraperPath,
  link,
  skipOdds = false,
  onSpawn = null,
  socksPort = 9050,
  scraper = 'matchendirect',
  sport = 'football',
  networkMode = null
) {
  let effectiveSkipOdds = skipOdds;
  let effectiveOnSpawn = onSpawn;
  let effectiveSocksPort = socksPort;
  let effectiveScraper = scraper;
  let effectiveSport = sport;
  let effectiveNetworkMode = networkMode;

  if (typeof skipOdds === 'object' && skipOdds !== null) {
    effectiveSkipOdds = skipOdds.skipOdds ?? false;
    effectiveOnSpawn = skipOdds.onSpawn ?? onSpawn;
    effectiveSocksPort = skipOdds.socksPort ?? socksPort ?? 9050;
    effectiveScraper = skipOdds.scraper ?? scraper ?? 'matchendirect';
    effectiveSport = skipOdds.sport ?? sport ?? 'football';
    effectiveNetworkMode = skipOdds.networkMode ?? networkMode ?? null;
  }

  const resolvedNetworkMode = effectiveNetworkMode || process.env.NETWORK_MODE || (effectiveSocksPort > 0 ? (effectiveScraper === 'flashscore' ? 'direct' : 'tor-fallback') : 'direct');

  // If networkMode === 'tor-required', verify Tor is reachable before running; if unreachable, abort with clear error instead of falling back to direct!
  if (resolvedNetworkMode === 'tor-required') {
    const torActive = await isTorActive(effectiveSocksPort || 9050);
    if (!torActive) {
      console.error(`[Predictix Scraper] Tor proxy is unreachable on port ${effectiveSocksPort || 9050} while networkMode is 'tor-required'. Aborting scrape for ${link} without direct fallback.`);
      return null;
    }
  }

  const maxAttempts = 2;
  const useTor = resolvedNetworkMode === 'tor-required' || (resolvedNetworkMode === 'tor-fallback' && effectiveScraper !== 'flashscore' && effectiveSocksPort > 0);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (useTor) {
      const torActive = await isTorActive(effectiveSocksPort);
      if (!torActive) {
        if (resolvedNetworkMode === 'tor-required') {
          console.error(`[Predictix Scraper] Tor is inactive on port ${effectiveSocksPort} in tor-required mode. Aborting scrape for: ${link} without direct fallback.`);
          return null;
        }
        console.warn(`[Predictix Scraper] Tor is inactive on port ${effectiveSocksPort}. Skipping scrape for: ${link}`);
        return null;
      }
    }

    const currentSocksPort = (resolvedNetworkMode === 'direct') ? 0 : (useTor ? effectiveSocksPort : (effectiveSocksPort || 0));
    const tmpOutFile = createTempOutputFile(scraperPath, 'tmp');
    const args = buildSingleMatchArgs(
      effectiveScraper,
      link,
      resolvedNetworkMode,
      currentSocksPort,
      tmpOutFile,
      effectiveSport,
      effectiveSkipOdds
    );

    const result = await executeCrawlerCommand({
      scraperPath,
      args,
      tmpOutFile,
      timeoutMs: 50000,
      onSpawn: effectiveOnSpawn,
      logPrefix: 'Predictix Scraper'
    });

    if (result.success && result.data) {
      const matchData = (result.data.all_matches || result.data.matches || [])[0];
      if (matchData) {
        matchData.sport = effectiveSport;
      }
      return matchData || null;
    }

    if (attempt < maxAttempts) {
      if (useTor && effectiveSocksPort > 0) {
        console.log(`[Predictix Scraper] Attempt ${attempt} failed for link: ${link}. Rotating Tor IP on SOCKS port ${effectiveSocksPort} (Control: ${effectiveSocksPort + 1}) and retrying...`);
        await renewTorSession(effectiveSocksPort + 1);
        await new Promise(r => setTimeout(r, 2500));
      }
    }
  }

  return null;
}

/**
 * Spawn Go scraper to retrieve odds from 1XBet.
 */
export async function scrape1XBetOdds(scraperPath, targetMatches, sport, socksPort = 0) {
  const dataDir = path.join(scraperPath, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const rand = Math.random().toString(36).substring(7);
  const tmpTargetsFile = path.join(dataDir, `tmp_targets_${Date.now()}_${rand}.json`);
  const tmpOutFile = path.join(dataDir, `tmp_1xbet_${Date.now()}_${rand}.json`);

  try {
    const targets = targetMatches.map(m => ({
      home_team: m.home_team,
      away_team: m.away_team,
      sport: m.sport || sport
    }));
    fs.writeFileSync(tmpTargetsFile, JSON.stringify(targets, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Predictix Scraper] Failed to write temporary 1XBet targets file:', err.message);
    return [];
  }

  const args = buildCrawlerArgs({
    source: '1xbet',
    action: 'scrape',
    sport,
    socksPort,
    targets: tmpTargetsFile,
    output: tmpOutFile
  });

  const result = await executeCrawlerCommand({
    scraperPath,
    args,
    tmpOutFile,
    timeoutMs: 300000,
    logPrefix: '1XBet Go',
    streamStdout: true,
    streamStderr: true,
    extraCleanupFiles: [tmpTargetsFile]
  });

  return (result.success && Array.isArray(result.data)) ? result.data : [];
}

/**
 * Spawn Go scraper to retrieve absences from SofaScore for a specific match.
 */
export async function scrapeSofaScoreAbsences(scraperPath, sport, targetDate, targetQuery) {
  const tmpOutFile = createTempOutputFile(scraperPath, 'tmp_absences');
  const args = buildCrawlerArgs({
    source: 'sofascore-absences',
    action: 'scrape',
    sport: sport || 'football',
    date: targetDate || '',
    url: targetQuery,
    socksPort: 0,
    output: tmpOutFile
  });

  const result = await executeCrawlerCommand({
    scraperPath,
    args,
    tmpOutFile,
    timeoutMs: 90000,
    logPrefix: 'SofaScore absences'
  });

  return (result.success && result.data) ? result.data : { home_team_url: '', away_team_url: '', absences: [] };
}

/**
 * Spawn Go scraper to retrieve squad statistics from SofaScore for a specific team page URL.
 */
export async function scrapeSofaScoreSquad(scraperPath, teamURL) {
  const tmpOutFile = createTempOutputFile(scraperPath, 'tmp_squad');
  const args = buildCrawlerArgs({
    source: 'sofascore-squad',
    action: 'scrape',
    url: teamURL,
    socksPort: 0,
    output: tmpOutFile
  });

  const result = await executeCrawlerCommand({
    scraperPath,
    args,
    tmpOutFile,
    timeoutMs: 90000,
    logPrefix: 'SofaScore squad'
  });

  return (result.success && Array.isArray(result.data)) ? result.data : [];
}

/**
 * Spawn Go scraper to retrieve Moneyway volumes from Arbworld.
 */
export async function scrapeArbworldMoneyway(scraperPath, sport) {
  const tmpOutFile = createTempOutputFile(scraperPath, 'tmp_arbworld');
  const args = buildCrawlerArgs({
    source: 'arbworld',
    action: 'scrape',
    sport,
    socksPort: 0,
    output: tmpOutFile
  });

  const result = await executeCrawlerCommand({
    scraperPath,
    args,
    tmpOutFile,
    timeoutMs: 120000,
    logPrefix: 'Arbworld'
  });

  return (result.success && Array.isArray(result.data)) ? result.data : [];
}
