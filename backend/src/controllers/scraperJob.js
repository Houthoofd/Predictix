import path from 'path';
import fs from 'fs';
import os from 'os';
import { 
  isTorActive, 
  bootstrapTorInstances, 
  cleanupSpawnedTor, 
  ensureScraperCompiled 
} from '../utils/scraperHelpers.js';
import { scraperState } from './scraperState.js';
import { 
  attachCrawlerEventListener, 
  spawnCrawlerProcess, 
  processCrawlerOutputLine 
} from '../utils/crawlerRunnerProcess.js';
import { executeDiscoveryPhase, runDiscoveryJob } from './discoveryJobHandler.js';
import { executeDetailScrapeJob } from './scrapeJobHandler.js';

export { 
  attachCrawlerEventListener, 
  spawnCrawlerProcess, 
  processCrawlerOutputLine,
  runDiscoveryJob
};

/**
 * Controller entry point for running a complete scrape job:
 * 1. Prepares environment and network workers (Tor or direct).
 * 2. Runs discovery phase.
 * 3. Runs detail scraping, enrichment (odds, absences, Betfair) and H2H batch crawls.
 * 4. Cleans up network workers and notifies clients.
 *
 * @param {object} options Job configuration parameters
 * @param {function} sendEvent SSE event emitter callback
 */
export async function runScrapeJob(options, sendEvent) {
  const { limit, targetDate, scraper, sport, targetStrategy, networkMode: explicitNetworkMode } = options;
  const jobNetworkMode = explicitNetworkMode || process.env.NETWORK_MODE || 'tor-fallback';
  
  const scraperPath = process.env.SCRAPER_PATH || 'E:\\Developpement\\scrapper-v3';
  const outputDirs = ['matchendirect', 'flashscore', 'ratingbet', ''].map(sub => path.join(scraperPath, 'data', sub));

  sendEvent('log', { message: `[Predictix] Initialisation du scraping (${scraper} - ${sport}, mode réseau: ${jobNetworkMode}) dans : ${scraperPath}` });
  
  if (!fs.existsSync(scraperPath)) {
    return sendEvent('error', { message: `Dossier du scraper introuvable à l'emplacement configuré : ${scraperPath}` });
  }

  try {
    await ensureScraperCompiled(scraperPath);
  } catch (compileErr) {
    return sendEvent('error', { message: `Erreur de compilation du scraper Go : ${compileErr.message}` });
  }

  const scriptName = process.platform === 'win32' ? 'scrape-matchendirect.bat' : 'scrape-matchendirect.sh';

  let formattedDate = null;
  if (targetDate) {
    const ymd = targetDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    formattedDate = ymd ? `${ymd[3]}-${ymd[2]}-${ymd[1]}` : (/^\d{2}-\d{2}-\d{4}$/.test(targetDate) ? targetDate : null);
  }

  const freeRAMMB = os.freemem() / (1024 * 1024);
  const recommendedWorkers = process.env.SCRAPER_WORKERS
    ? parseInt(process.env.SCRAPER_WORKERS)
    : Math.max(1, Math.min(12, Math.floor(Math.max(0, freeRAMMB - 1500) / 180)));
  sendEvent('log', { message: `[Predictix] Diagnostic RAM : ${Math.round(freeRAMMB)} Mo libres. Marge 1,5 Go réservée. Allocation ciblée : ${recommendedWorkers} instances Tor.` });

  let activePorts = [];
  if (jobNetworkMode === 'direct') {
    activePorts = [0];
    sendEvent('log', { message: `[Predictix] Mode réseau 'direct' actif : instances Tor ignorées.` });
  } else {
    await bootstrapTorInstances(recommendedWorkers, scraperPath, (msg) => sendEvent('log', { message: msg }));
    const possiblePorts = [9050, 9052, 9054, 9056, 9058, 9060, 9062, 9064, 9066, 9068, 9070, 9072].slice(0, recommendedWorkers);
    activePorts = (await Promise.all(possiblePorts.map(async p => (await isTorActive(p)) ? p : null))).filter(Boolean);
    if (activePorts.length === 0) {
      if (jobNetworkMode === 'tor-required') {
        sendEvent('error', { message: "[Predictix] Mode réseau 'tor-required' : aucun port proxy Tor opérationnel détecté. Scraping annulé sans repli direct." });
        return;
      }
      sendEvent('log', { message: "[Predictix] Aucun proxy Tor actif détecté en mode tor-fallback. Repli sur connexion directe." });
      activePorts = [0];
    } else {
      sendEvent('log', { message: `[Predictix] Détection réseau : ${activePorts.length} proxy Tor actifs (Ports: ${activePorts.join(', ')}). Mode: ${jobNetworkMode}.` });
    }
  }

  // Phase 1: Discovery
  const { discoveredMatches, matchesToScrape, basketballOddsMap } = await executeDiscoveryPhase({
    scraperPath,
    scriptName,
    outputDirs,
    formattedDate,
    scraper,
    sport,
    jobNetworkMode,
    activePorts
  }, sendEvent);

  if (discoveredMatches.length === 0) {
    sendEvent('log', { message: `[Predictix] Aucun match découvert sur le listing.` });
    sendEvent('complete', { count: 0, settledBets: [] });
    await cleanupSpawnedTor((msg) => sendEvent('log', { message: msg }));
    return;
  }

  // Phase 2-4: Details, Enrichment, Storage, H2H
  const { importedCount, settledBetsList } = await executeDetailScrapeJob(matchesToScrape, {
    scraperPath,
    activePorts,
    scraper,
    sport,
    jobNetworkMode,
    targetDate,
    formattedDate,
    targetStrategy,
    basketballOddsMap
  }, sendEvent);

  if (scraperState.stopScraperRequested) {
    sendEvent('log', { message: `[Predictix] Scraping annulé par l'utilisateur.` });
  }

  await cleanupSpawnedTor((msg) => sendEvent('log', { message: msg }));
  sendEvent('complete', { count: importedCount, settledBets: settledBetsList, magicPredictions: [] });
}
