import path from 'path';
import fs from 'fs';
import os from 'os';
import { dbQuery, dbGet } from '../db/database.js';
import { 
  isTorActive, 
  scrapeSingleMatch, 
  runDiscoveryProcess, 
  crawlH2HLinksBatch, 
  prioritizeDirectH2H, 
  bootstrapTorInstances, 
  cleanupSpawnedTor, 
  tryResolveSofaStatsFallback,
  ensureScraperCompiled,
  parseFrenchDate
} from '../utils/scraperHelpers.js';
import { evaluateSmartScrapingFilter } from '../utils/predictionEngine.js';
import { importScrapedMatches, importHistoricalMatch, importSkippedMatch } from '../db/importer.js';
import { scraperState } from './scraperState.js';
import { orderMatchesRoundRobin } from '../utils/matchOrderer.js';

export async function runScrapeJob(options, sendEvent) {
  const { limit, targetDate, scraper, sport, targetStrategy } = options;
  
  const scraperPath = process.env.SCRAPER_PATH || 'E:\\Developpement\\scrapper-v3';
  const outputDirs = ['matchendirect', 'flashscore', 'ratingbet', ''].map(sub => path.join(scraperPath, 'data', sub));

  sendEvent('log', { message: `[Predictix] Initialisation du scraping (${scraper} - ${sport}) dans : ${scraperPath}` });
  
  if (!fs.existsSync(scraperPath)) return sendEvent('error', { message: `Dossier du scraper introuvable à l'emplacement configuré : ${scraperPath}` });
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
  const recommendedWorkers = Math.max(1, Math.min(12, Math.floor(Math.max(0, freeRAMMB - 1500) / 180)));
  sendEvent('log', { message: `[Predictix] Diagnostic RAM : ${Math.round(freeRAMMB)} Mo libres. Marge 1,5 Go réservée. Allocation ciblée : ${recommendedWorkers} instances Tor.` });
  await bootstrapTorInstances(recommendedWorkers, scraperPath, (msg) => sendEvent('log', { message: msg }));
  const possiblePorts = [9050, 9052, 9054, 9056, 9058, 9060, 9062, 9064, 9066, 9068, 9070, 9072].slice(0, recommendedWorkers);
  const activePorts = (await Promise.all(possiblePorts.map(async p => (await isTorActive(p)) ? p : null))).filter(Boolean);
  if (activePorts.length === 0) {
    sendEvent('error', { message: "Aucun port proxy Tor opérationnel détecté. Scraping annulé." });
    return;
  }
  sendEvent('log', { message: `[Predictix] Détection réseau : ${activePorts.length} proxy Tor actifs (Ports: ${activePorts.join(', ')}).` });

  const sourceName = scraper === 'flashscore' ? 'Flashscore' : 'Match en Direct';
  
  const sportsToScrape = (sport === 'all' && scraper === 'flashscore')
    ? ['football', 'basketball', 'tennis', 'rugby', 'handball', 'volleyball', 'hockey', 'baseball', 'american-football', 'table-tennis', 'badminton', 'cricket', 'snooker', 'futsal']
    : [sport];

  let discoveredMatches = [];
  for (const sp of sportsToScrape) {
    if (scraperState.stopScraperRequested) break;
    sendEvent('log', { message: `[Predictix] Phase 1/4 : Découverte des matchs du jour sur ${sourceName} (${sp})...` });
    try {
      const matches = await runDiscoveryProcess(scraperPath, scriptName, outputDirs, formattedDate, (child) => {
        scraperState.activeScraperProcess = child;
      }, scraper, sp);
      
      const withSport = matches.map(m => ({ ...m, sport: sp }));
      discoveredMatches = discoveredMatches.concat(withSport);
    } catch (err) {
      sendEvent('log', { message: `[Predictix] [Warning] Échec de la découverte pour ${sp} : ${err.message}` });
    }
  }

  scraperState.activeScraperProcess = null;

  if (discoveredMatches.length === 0) {
    sendEvent('log', { message: `[Predictix] Aucun match découvert sur le listing.` });
    sendEvent('complete', { count: 0, settledBets: [] });
    await cleanupSpawnedTor((msg) => sendEvent('log', { message: msg }));
    return;
  }

  sendEvent('log', { message: `[Predictix] ✓ Découverte réussie : ${discoveredMatches.length} matchs trouvés.` });

  // Reorder matches round-robin by sport to balance multi-sport scraping limits
  const orderedMatches = (sport === 'all' && scraper === 'flashscore')
    ? orderMatchesRoundRobin(discoveredMatches)
    : discoveredMatches;

  // Scrape all discovered matches by default (ignoring UI limit to enable full scraping)
  const matchesToScrape = orderedMatches;
  sendEvent('log', { message: `[Predictix] Phase 2/4 : Téléchargement des détails de ${matchesToScrape.length} matchs en parallèle sur ${activePorts.length} workers...` });

  const scrapedMatches = [];
  let currentIndex = 0;
  
  const worker = async (socksPort) => {
    while (currentIndex < matchesToScrape.length && !scraperState.stopScraperRequested) {
      const index = currentIndex++;
      if (index >= matchesToScrape.length) break;
      
      const m = matchesToScrape[index];
      const matchSport = m.sport || sport;
      
      // Fixed: unaccented "details" and added [X/Y] progress token for frontend regex match
      sendEvent('log', { 
        message: `[Tor Port ${socksPort}] [${index + 1}/${matchesToScrape.length}] Scraping details for [${matchSport}] : ${m.home_team} vs ${m.away_team}...` 
      });
      
      const details = await scrapeSingleMatch(scraperPath, m.href || m.match_url || m.match_id, false, (child) => {
        // Can be used to register child PID
      }, socksPort, scraper, matchSport);
      
      if (details) {
        const matchDateRaw = details.date || m.date || '';
        const matchDateNormalized = parseFrenchDate(matchDateRaw) || matchDateRaw;
        const expectedIsoDate = targetDate || new Date().toISOString().substring(0, 10);
        if (matchDateNormalized && expectedIsoDate && matchDateNormalized.substring(0, 10) !== expectedIsoDate) {
          sendEvent('log', { message: `[Tor Port ${socksPort}] [Date Filter] [Ignoré] Match ${details.home_team || m.home_team} vs ${details.away_team || m.away_team} ignoré car sa date (${matchDateNormalized.substring(0, 10)}) ne correspond pas à la date cible (${expectedIsoDate}).` });
          continue;
        }

        let finalFirstHalfCornersHome = details.first_half_corners_home;
        let finalFirstHalfCornersAway = details.first_half_corners_away;
        let finalStatistics = details.statistics;
        
        if (finalFirstHalfCornersHome === null || finalFirstHalfCornersHome === undefined || !finalStatistics) {
          sendEvent('log', { message: `[Tor Port ${socksPort}] [Tor Link] Match principal sans stats. Recherche SofaScore de secours...` });
          const sofaData = await tryResolveSofaStatsFallback(details.date || m.date, details.home_team || m.home_team, details.away_team || m.away_team);
          if (sofaData) {
            finalStatistics = sofaData;
            finalFirstHalfCornersHome = sofaData.first_half_corners ? sofaData.first_half_corners.home : null;
            finalFirstHalfCornersAway = sofaData.first_half_corners ? sofaData.first_half_corners.away : null;
            sendEvent('log', { message: `[Tor Port ${socksPort}] [SofaScore] ✓ Stats résolues via SofaScore pour ce match !` });
          }
        }

        const isFinished = details.is_finished === true || 
          (details.score && details.score.trim() !== '-' && details.score.trim() !== '' && details.score.includes('-')) ||
          (details.time && (details.time.toLowerCase().includes('fin') || details.time.toLowerCase().includes('terminé') || details.time.toLowerCase() === 'ter' || details.time.toLowerCase() === 'ter.'));

        const hasStats = finalStatistics && Object.keys(finalStatistics).some(k => k !== 'stats_source' && finalStatistics[k] !== null && finalStatistics[k] !== undefined);
        if (isFinished && !hasStats) {
          sendEvent('log', { message: `[Tor Port ${socksPort}] [Ignoré] Match terminé ${details.home_team || m.home_team} vs ${details.away_team || m.away_team} ignoré car aucune statistique n'est disponible.` });
          continue;
        }

        const enriched = {
          match_id: m.match_id || m.href || '',
          time: m.time || 'Finished',
          date: details.date || m.date || '',
          tournament: details.tournament || m.tournament || '',
          home_team: details.home_team || m.home_team,
          away_team: details.away_team || m.away_team,
          home_logo: details.home_logo || m.home_logo,
          away_logo: details.away_logo || m.away_logo,
          score: details.score || m.score || '',
          first_half_corners_home: finalFirstHalfCornersHome,
          first_half_corners_away: finalFirstHalfCornersAway,
          historical_links: details.historical_links,
          match_url: m.href || m.match_url || '',
          statistics: finalStatistics,
          sport: matchSport
        };
        
        scrapedMatches.push(enriched);
        sendEvent('match_scraped', { match: enriched });
        
        const scoreText = enriched.score ? ` (${enriched.score})` : '';
        sendEvent('log', { message: `[Tor Port ${socksPort}] ✓ Match enrichi [${matchSport}] : ${enriched.home_team} vs ${enriched.away_team}${scoreText}` });
      } else {
        sendEvent('log', { message: `[Tor Port ${socksPort}] [Erreur] Échec du crawl détails pour : ${m.home_team} vs ${m.away_team}` });
      }
      
      if (currentIndex < matchesToScrape.length && !scraperState.stopScraperRequested) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  };

  await Promise.all(activePorts.map(port => worker(port)));

  if (scraperState.stopScraperRequested) {
    sendEvent('log', { message: `[Predictix] Scraping annulé par l'utilisateur.` });
    await cleanupSpawnedTor((msg) => sendEvent('log', { message: msg }));
    return;
  }

  sendEvent('log', { message: `[Predictix] Phase 3/4 : Enregistrement de ${scrapedMatches.length} matchs dans SQLite...` });
  const { importedCount, settledBetsList } = await importScrapedMatches(scrapedMatches, new Date().toISOString());
  sendEvent('log', { message: `[Predictix] ✓ Importation réussie : ${importedCount} prédictions insérées.` });

  sendEvent('log', { message: `[Predictix] Phase 4/4 : Analyse et crawl des confrontations H2H en parallèle...` });
  
  const uncachedLinksSet = new Set();
  const linkSports = new Map();
  for (const match of scrapedMatches) {
    if (!match.home_team || !match.away_team) continue;

    let isMatchPromising = true;
    if (targetStrategy) {
      const h2hExisting = await dbQuery(`
        SELECT * FROM scraped_predictions 
        WHERE is_finished = 1 
          AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))
      `, [match.home_team, match.away_team, match.away_team, match.home_team]);
      
      isMatchPromising = evaluateSmartScrapingFilter(match, h2hExisting, targetStrategy);
    }

    if (!isMatchPromising) {
      sendEvent('log', { message: `[Smart-Scraping] Match ${match.home_team} vs ${match.away_team} écarté (stats H2H hors-cible).` });
      continue;
    }

    if (match.historical_links) {
      let linksList = [];
      try {
        linksList = typeof match.historical_links === 'string' 
          ? JSON.parse(match.historical_links) 
          : match.historical_links;
      } catch (e) {
        linksList = match.historical_links;
      }
      
      if (Array.isArray(linksList) && linksList.length > 1) {
        const prioritizedLinks = prioritizeDirectH2H(linksList, match.home_team, match.away_team);
        let matchAddedCount = 0;
        for (const link of prioritizedLinks) {
          if (matchAddedCount >= 10) break;
          
          const cached = await dbQuery('SELECT match_id, date, score, sport, first_half_corners_home, first_half_corners_away, statistics_json FROM scraped_predictions WHERE match_id = ?', [link]);
          const isPlaceholder = cached.length > 0 && 
            (cached[0].date === '2026-05-30' || cached[0].date === '2026-05-31' || cached[0].date.includes(':'));
          
          const cachedSport = cached.length > 0 ? (cached[0].sport || match.sport || sport) : (match.sport || sport);
          const isCachedFootball = cachedSport === 'football';
          const hasNoStats = cached.length > 0 && (isCachedFootball 
            ? (cached[0].first_half_corners_home === null) 
            : (!cached[0].statistics_json || cached[0].statistics_json === 'null' || cached[0].statistics_json === ''));
          
          if (cached.length === 0 || isPlaceholder || hasNoStats) {
            uncachedLinksSet.add(link);
            linkSports.set(link, match.sport || sport);
            matchAddedCount++;
          } else {
            const score = cached[0].score || '-';
            const corners = (cached[0].first_half_corners_home !== null && cached[0].first_half_corners_home !== undefined)
              ? `${cached[0].first_half_corners_home}-${cached[0].first_half_corners_away}`
              : 'N/A';
            sendEvent('log', { message: `[H2H Cache] Confrontation déjà en cache : ${match.home_team} vs ${match.away_team} (Score: ${score}) (Corners 1ère MT: ${corners})` });
            sendEvent('h2h_scraped', { h2h: {
              match_url: link,
              home_team: match.home_team,
              away_team: match.away_team,
              score: score,
              date: cached[0].date,
              first_half_corners_home: cached[0].first_half_corners_home,
              first_half_corners_away: cached[0].first_half_corners_away,
              sport: match.sport || sport
            }});
          }
        }
      }
    }
  }

  const linksToScrape = Array.from(uncachedLinksSet).slice(0, 400);
  
  if (linksToScrape.length > 0) {
    sendEvent('log', { message: `[Predictix] ${linksToScrape.length} nouvelles confrontations H2H à scrapper en parallèle...` });
    
    await crawlH2HLinksBatch(linksToScrape, scraperPath, {
      activePorts: activePorts,
      shouldStop: () => scraperState.stopScraperRequested,
      log: (msg) => sendEvent('log', { message: msg }),
      importHistoricalMatch,
      importSkippedMatch,
      onH2HScraped: (h2hData) => sendEvent('h2h_scraped', { h2h: h2hData }),
      scraper: scraper,
      sport: sport,
      linkSports: linkSports
    });
  }
  
  sendEvent('log', { message: `[Predictix] ✓ Scraping de l'historique H2H terminé avec succès.` });
  await cleanupSpawnedTor((msg) => sendEvent('log', { message: msg }));

  sendEvent('complete', { count: importedCount, settledBets: settledBetsList, magicPredictions: [] });
}
