import { exec } from 'child_process';
import { dbGet } from '../db/database.js';
import { 
  isTorActive, 
  scrapeSingleMatch, 
  crawlH2HLinksBatch, 
  prioritizeDirectH2H 
} from '../utils/scraperHelpers.js';
import { 
  importHistoricalMatch, 
  importSkippedMatch, 
  enrichPrimaryMatch 
} from '../db/importer.js';
import { scraperState } from './scraperState.js';

export async function crawlMatchHistory(req, res) {
  const { matchId } = req.params;
  try {
    const match = await dbGet('SELECT * FROM scraped_predictions WHERE match_id = ?', [matchId]);
    if (!match) {
      return res.status(404).json({ success: false, error: { message: "Match introuvable." } });
    }

    let links = [];
    try {
      if (match.historical_links) {
        links = JSON.parse(match.historical_links);
      }
    } catch (e) {}

    const scraperPath = process.env.SCRAPER_PATH || 'E:\\Developpement\\scrapper-v3';

    if (scraperState.activeCrawlHistoryMatches.has(matchId)) {
      return res.json({
        success: true,
        message: "Analyse déjà en cours d'exécution pour ce match.",
        count: links.length
      });
    }

    const torActive = await isTorActive();
    if (!torActive) {
      return res.status(400).json({ 
        success: false, 
        error: { message: "Le proxy Tor local n'est pas actif sur le port 9050. Veuillez lancer Tor et réessayer." } 
      });
    }

    scraperState.activeCrawlHistoryMatches.add(matchId);

    const spawnedChildren = [];
    const onSpawn = (child) => spawnedChildren.push(child);

    const backgroundTimeout = setTimeout(() => {
      if (scraperState.activeCrawlHistoryMatches.has(matchId)) {
        console.warn(`[Predictix H2H Crawl] H2H crawl timed out globally (120s) for match: ${matchId}. Aborting background crawl.`);
        
        for (const child of spawnedChildren) {
          if (child && !child.killed) {
            try {
              const pid = child.pid;
              if (process.platform === 'win32') {
                exec(`taskkill /pid ${pid} /T /F`, (err) => {
                  if (err) console.error('Failed to taskkill H2H child process on timeout:', err.message);
                });
              } else {
                child.kill();
              }
            } catch (e) {}
          }
        }
        
        scraperState.activeCrawlHistoryMatches.delete(matchId);
      }
    }, 120000);

    res.json({
      success: true,
      message: "Analyse lancée en arrière-plan.",
      count: links.length
    });

    (async () => {
      try {
        const isFlashscore = match.sport !== 'football' || (match.match_url && !match.match_url.startsWith('/live-score/'));
        const scraperSource = isFlashscore ? 'flashscore' : 'matchendirect';
        const matchSport = match.sport || 'football';

        let activeLinks = [...links];

        const isLiveScoreLink = activeLinks.length === 1 && activeLinks[0].startsWith('/live-score/');
        const isFlashscoreLink = activeLinks.length === 1 && !activeLinks[0].startsWith('/live-score/');
        const canCrawlPrimary = activeLinks.length === 1 && (isLiveScoreLink || (isFlashscore && isFlashscoreLink));

        if (canCrawlPrimary) {
          let targetLink = activeLinks[0];
          if (isLiveScoreLink && (match.is_finished === 0 || match.time === 'Planned' || !match.score || match.score === '-' || match.score === '')) {
            if (!targetLink.includes('?p=')) {
              targetLink += '?p=face-a-face';
            }
          }

          console.log(`[Predictix On-Demand Background] Crawling primary match page: ${targetLink}`);
          const primaryDetails = await scrapeSingleMatch(scraperPath, targetLink, false, onSpawn, 9050, scraperSource, matchSport);

          if (primaryDetails) {
            await enrichPrimaryMatch(matchId, primaryDetails, targetLink, match);
            console.log(`[Predictix On-Demand Background] ✓ Successfully enriched primary match ${matchId}!`);
            activeLinks = primaryDetails.historical_links || [];
          }
        }

        if (activeLinks.length > 0) {
          console.log(`[Predictix On-Demand Background] Starting background H2H deep crawl for ${activeLinks.length} past matches...`);
          const prioritizedLinks = prioritizeDirectH2H(activeLinks, match.home_team, match.away_team);
          const uncachedLinks = [];
          for (const link of prioritizedLinks) {
            const cached = await dbGet('SELECT match_id, date, sport, first_half_corners_home, statistics_json FROM scraped_predictions WHERE match_id = ?', [link]);
            const isPlaceholder = cached && 
              (cached.date === '2026-05-30' || cached.date === '2026-05-31' || cached.date.includes(':'));
            
            const cachedSport = cached?.sport || matchSport;
            const isCachedFootball = cachedSport === 'football';
            const hasNoStats = cached && (isCachedFootball 
              ? (cached.first_half_corners_home === null) 
              : (!cached.statistics_json || cached.statistics_json === 'null' || cached.statistics_json === ''));

            if (!cached || isPlaceholder || hasNoStats) {
              uncachedLinks.push(link);
            }
          }

          console.log(`[Predictix On-Demand Background] ${activeLinks.length - uncachedLinks.length} cached, ${uncachedLinks.length} new to crawl.`);
          
          const linksToScrape = uncachedLinks.slice(0, 8);
          await crawlH2HLinksBatch(linksToScrape, scraperPath, {
            concurrency: 4,
            onSpawn: onSpawn,
            shouldStop: () => scraperState.stopScraperRequested || !scraperState.activeCrawlHistoryMatches.has(matchId),
            log: (msg) => console.log(`[Predictix On-Demand Background] ${msg}`),
            importHistoricalMatch,
            importSkippedMatch,
            scraper: scraperSource,
            sport: matchSport
          });
        }
        console.log(`[Predictix On-Demand Background] ✓ Finished background crawl of H2H matches for primary match ${matchId}!`);
      } catch (err) {
        console.error('[Predictix On-Demand Background Error]', err.message);
      } finally {
        clearTimeout(backgroundTimeout);
        scraperState.activeCrawlHistoryMatches.delete(matchId);
      }
    })();
  } catch (error) {
    console.error('[Predictix On-Demand Error]', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }
}
