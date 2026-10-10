import path from 'path';
import fs from 'fs';
import { 
  runDiscoveryProcess, 
  scrape1XBetOdds, 
  findBestMatch,
  ensureScraperCompiled,
  isTorActive,
  bootstrapTorInstances,
  cleanupSpawnedTor
} from '../utils/scraperHelpers.js';
import { scraperState } from './scraperState.js';
import { orderMatchesRoundRobin } from '../utils/matchOrderer.js';
import { attachCrawlerEventListener } from '../utils/crawlerRunnerProcess.js';

export const ALL_SPORTS = [
  'football', 'basketball', 'tennis', 'rugby', 'handball', 'volleyball', 
  'hockey', 'baseball', 'american-football', 'table-tennis', 'badminton', 
  'cricket', 'snooker', 'futsal'
];

/**
 * Executes the discovery phase: finds matches on the specified provider/sport,
 * reorders them, and runs initial odds screening (e.g., 1XBet for basketball).
 *
 * @param {object} params
 * @param {function} sendEvent
 * @returns {Promise<{ discoveredMatches: Array, matchesToScrape: Array, basketballOddsMap: Map }>}
 */
export async function executeDiscoveryPhase(params, sendEvent) {
  const { 
    scraperPath, 
    scriptName, 
    outputDirs, 
    formattedDate, 
    scraper, 
    sport, 
    jobNetworkMode, 
    activePorts 
  } = params;

  const sourceName = scraper === 'flashscore' ? 'Flashscore' : 'Match en Direct';
  const sportsToScrape = (sport === 'all' && scraper === 'flashscore')
    ? ALL_SPORTS
    : [sport];

  let discoveredMatches = [];
  for (const sp of sportsToScrape) {
    if (scraperState.stopScraperRequested) break;
    sendEvent('log', { message: `[Predictix] Phase 1/4 : Découverte des matchs du jour sur ${sourceName} (${sp})...` });
    try {
      const matches = await runDiscoveryProcess(scraperPath, scriptName, outputDirs, formattedDate, (child) => {
        scraperState.activeScraperProcess = child;
        attachCrawlerEventListener(child, sendEvent);
      }, scraper, sp, jobNetworkMode, activePorts[0] || 9050);
      
      const withSport = matches.map(m => ({ ...m, sport: sp }));
      discoveredMatches = discoveredMatches.concat(withSport);
    } catch (err) {
      sendEvent('log', { message: `[Predictix] [Warning] Échec de la découverte pour ${sp} : ${err.message}` });
    }
  }

  scraperState.activeScraperProcess = null;

  if (discoveredMatches.length === 0) {
    return { discoveredMatches: [], matchesToScrape: [], basketballOddsMap: new Map() };
  }

  sendEvent('log', { message: `[Predictix] ✓ Découverte réussie : ${discoveredMatches.length} matchs trouvés.` });

  // Reorder matches round-robin by sport to balance multi-sport scraping limits
  const orderedMatches = (sport === 'all' && scraper === 'flashscore')
    ? orderMatchesRoundRobin(discoveredMatches)
    : discoveredMatches;

  let matchesToScrape = orderedMatches;
  const basketballOddsMap = new Map();

  if (sport === 'basketball') {
    sendEvent('log', { message: `[Predictix] [Mode Basket-Ball] Scan initial 1XBet des cotes avant le crawl détaillé...` });
    try {
      const activePort = activePorts.length > 0 ? activePorts[0] : 0;
      const oneXBetOdds = await scrape1XBetOdds(scraperPath, orderedMatches, 'basketball', activePort);
      const filteredMatches = [];
      if (Array.isArray(oneXBetOdds) && oneXBetOdds.length > 0) {
        for (const m of orderedMatches) {
          const { candidate: matchedOdds, score } = findBestMatch(m.home_team, m.away_team, oneXBetOdds);
          if (matchedOdds && score >= 0.48) {
            filteredMatches.push(m);
            basketballOddsMap.set(`${m.home_team} vs ${m.away_team}`, matchedOdds);
            sendEvent('log', { message: `[1XBet Odds Match] Match retenu (cotes disponibles, score ${score.toFixed(2)}) : ${m.home_team} vs ${m.away_team} <-> 1XBet: ${matchedOdds.home_team} vs ${matchedOdds.away_team}` });
          } else {
            sendEvent('log', { message: `[1XBet Odds Match] Match écarté (aucune cote sur 1XBet, meilleur score ${score ? score.toFixed(2) : '0.00'}) : ${m.home_team} vs ${m.away_team}` });
          }
        }
      }
      matchesToScrape = filteredMatches;
      sendEvent('log', { message: `[Predictix] [Mode Basket-Ball] Filtrage terminé. ${matchesToScrape.length} / ${orderedMatches.length} matchs conservés.` });
    } catch (err) {
      sendEvent('log', { message: `[1XBet Odds Scan] [Warning] Échec du scan initial des cotes : ${err.message}` });
    }
  }

  return { discoveredMatches, matchesToScrape, basketballOddsMap };
}

/**
 * Standalone discovery job lifecycle handler.
 *
 * @param {object} options
 * @param {function} sendEvent
 * @returns {Promise<Array>} Discovered matches
 */
export async function runDiscoveryJob(options, sendEvent) {
  const { targetDate, scraper = 'matchendirect', sport = 'football', networkMode: explicitNetworkMode } = options;
  const jobNetworkMode = explicitNetworkMode || process.env.NETWORK_MODE || 'tor-fallback';
  const scraperPath = process.env.SCRAPER_PATH || 'E:\\Developpement\\scrapper-v3';
  const outputDirs = ['matchendirect', 'flashscore', 'ratingbet', ''].map(sub => path.join(scraperPath, 'data', sub));
  const scriptName = process.platform === 'win32' ? 'scrape-matchendirect.bat' : 'scrape-matchendirect.sh';

  if (!fs.existsSync(scraperPath)) {
    sendEvent('error', { message: `Dossier du scraper introuvable : ${scraperPath}` });
    return [];
  }

  try {
    await ensureScraperCompiled(scraperPath);
  } catch (compileErr) {
    sendEvent('error', { message: `Erreur de compilation du scraper Go : ${compileErr.message}` });
    return [];
  }

  let formattedDate = null;
  if (targetDate) {
    const ymd = targetDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    formattedDate = ymd ? `${ymd[3]}-${ymd[2]}-${ymd[1]}` : (/^\d{2}-\d{2}-\d{4}$/.test(targetDate) ? targetDate : null);
  }

  let activePorts = [0];
  if (jobNetworkMode !== 'direct') {
    const torActive = await isTorActive(9050);
    if (torActive) activePorts = [9050];
  }

  const { discoveredMatches } = await executeDiscoveryPhase({
    scraperPath,
    scriptName,
    outputDirs,
    formattedDate,
    scraper,
    sport,
    jobNetworkMode,
    activePorts
  }, sendEvent);

  sendEvent('complete', { count: discoveredMatches.length, matches: discoveredMatches });
  return discoveredMatches;
}
