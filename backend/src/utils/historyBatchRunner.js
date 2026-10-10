import { scrapeSingleMatch } from './scraperRunner.js';

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
    linkSports = null,
    networkMode = null
  } = options;

  let currentIndex = 0;
  
  const worker = async (socksPort) => {
    while (currentIndex < linksToScrape.length) {
      if (shouldStop()) break;
      
      const index = currentIndex++;
      if (index >= linksToScrape.length) break;
      
      const link = linksToScrape[index];
      const matchSport = (linkSports && linkSports.get(link)) || sport;
      
      const histMatch = await scrapeSingleMatch(scraperPath, link, true, onSpawn, socksPort, scraper, matchSport, networkMode);

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

export const scrapeHistoricalMatches = crawlH2HLinksBatch;
