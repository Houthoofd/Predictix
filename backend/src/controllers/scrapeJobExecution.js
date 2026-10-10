import { scrapeSingleMatch } from '../utils/scraperHelpers.js';
import { scraperState } from './scraperState.js';
import { attachCrawlerEventListener } from '../utils/crawlerRunnerProcess.js';
import {
  buildEnrichedMatchDetails,
  enrichMatchAbsencesAndSquads,
  enrichMatchesWith1XBetOdds,
  enrichMatchesWithBetfairVolumes,
  crawlHistoricalH2HMatches
} from './scrapeJobEnrichment.js';

// Re-export enrichment and crawl subroutines for facade and consumer backwards compatibility
export {
  buildEnrichedMatchDetails,
  enrichMatchAbsencesAndSquads,
  enrichMatchesWith1XBetOdds,
  enrichMatchesWithBetfairVolumes,
  crawlHistoricalH2HMatches
};

/**
 * Scrapes detailed match statistics in parallel across allocated network workers.
 * Coordinates execution flow, worker distribution, cancellation handling, and SSE logging.
 *
 * @param {Array<object>} matchesToScrape
 * @param {object} context Job execution parameters
 * @param {function} sendEvent SSE event emitter
 * @returns {Promise<Array<object>>}
 */
export async function scrapeMatchDetailsBatch(matchesToScrape, context, sendEvent) {
  const {
    scraperPath,
    activePorts = [0],
    scraper,
    sport,
    jobNetworkMode
  } = context;

  const scrapedMatches = [];
  let currentIndex = 0;

  const worker = async (socksPort) => {
    while (currentIndex < matchesToScrape.length && !scraperState.stopScraperRequested) {
      const index = currentIndex++;
      if (index >= matchesToScrape.length) break;

      const m = matchesToScrape[index];
      const matchSport = m.sport || sport;

      sendEvent('log', {
        message: `[Tor Port ${socksPort}] [${index + 1}/${matchesToScrape.length}] Scraping details for [${matchSport}] : ${m.home_team} vs ${m.away_team}...`
      });

      const details = await scrapeSingleMatch(
        scraperPath,
        m.href || m.match_url || m.match_id,
        false,
        (child) => {
          scraperState.activeScraperProcess = child;
          attachCrawlerEventListener(child, sendEvent);
        },
        socksPort,
        scraper,
        matchSport,
        jobNetworkMode
      );

      if (details) {
        const enriched = await buildEnrichedMatchDetails(details, m, context, socksPort, sendEvent);
        if (enriched) {
          scrapedMatches.push(enriched);
          sendEvent('match_scraped', { match: enriched });

          const scoreText = enriched.score ? ` (${enriched.score})` : '';
          sendEvent('log', {
            message: `[Tor Port ${socksPort}] ✓ Match enrichi [${matchSport}] : ${enriched.home_team} vs ${enriched.away_team}${scoreText}`
          });
        }
      } else {
        sendEvent('log', {
          message: `[Tor Port ${socksPort}] [Erreur] Échec du crawl détails pour : ${m.home_team} vs ${m.away_team}`
        });
      }

      if (currentIndex < matchesToScrape.length && !scraperState.stopScraperRequested) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  };

  await Promise.all(activePorts.map((port) => worker(port)));
  return scrapedMatches;
}
