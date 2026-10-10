import { importScrapedMatches } from '../db/importer.js';
import { scraperState } from './scraperState.js';
import {
  scrapeMatchDetailsBatch,
  enrichMatchAbsencesAndSquads,
  enrichMatchesWith1XBetOdds,
  enrichMatchesWithBetfairVolumes,
  crawlHistoricalH2HMatches
} from './scrapeJobExecution.js';

export {
  scrapeMatchDetailsBatch,
  enrichMatchAbsencesAndSquads,
  enrichMatchesWith1XBetOdds,
  enrichMatchesWithBetfairVolumes,
  crawlHistoricalH2HMatches
};

/**
 * Returns current status and telemetry of scrape jobs.
 *
 * @returns {object}
 */
export function getJobStatus() {
  return {
    isStopped: scraperState.stopScraperRequested,
    activeProcess: !!scraperState.activeScraperProcess,
    activeCrawlCount: scraperState.activeCrawlHistoryMatches?.size || 0,
    integrityStatus: scraperState.activeIntegrityBatch?.status || 'idle'
  };
}

/**
 * Executes the detail scraping, enrichment, database persistence, and H2H retrieval phases.
 * Acts as the controller facade coordinating execution between modular scraping subroutines.
 *
 * @param {Array<object>} matchesToScrape
 * @param {object} context Job context parameters
 * @param {function} sendEvent SSE event emitter
 * @returns {Promise<{ importedCount: number, settledBetsList: Array, scrapedMatches: Array }>}
 */
export async function executeDetailScrapeJob(matchesToScrape, context, sendEvent) {
  const { activePorts = [] } = context;

  // Phase 2/4 : Detail download in parallel across active ports
  sendEvent('log', { message: `[Predictix] Phase 2/4 : Téléchargement des détails de ${matchesToScrape.length} matchs en parallèle sur ${activePorts.length} workers...` });
  const scrapedMatches = await scrapeMatchDetailsBatch(matchesToScrape, context, sendEvent);

  if (scraperState.stopScraperRequested) {
    return { importedCount: 0, settledBetsList: [], scrapedMatches };
  }

  // Phase 2b/4 : Absences & squad stats retrieval
  sendEvent('log', { message: `[Predictix] Phase 2b/4 : Récupération des absences SofaScore pour les matchs à venir...` });
  await enrichMatchAbsencesAndSquads(scrapedMatches, context, sendEvent);

  // Phase 2c/4 : 1XBet odds retrieval
  if (!scraperState.stopScraperRequested) {
    sendEvent('log', { message: `[Predictix] Phase 2c/4 : Récupération des cotes 1XBet pour les matchs du jour...` });
    await enrichMatchesWith1XBetOdds(scrapedMatches, context, sendEvent);
  }

  // Phase 2d/4 : Betfair / Moneyway volume retrieval
  if (!scraperState.stopScraperRequested) {
    sendEvent('log', { message: `[Predictix] Phase 2d/4 : Récupération des volumes Betfair (Moneyway) via Arbworld...` });
    try {
      await enrichMatchesWithBetfairVolumes(scrapedMatches, context, sendEvent);
    } catch (arbErr) {
      sendEvent('log', { message: `[Predictix] [Warning] Échec de la récupération des volumes Betfair : ${arbErr.message}` });
    }
  }

  // Phase 3/4 : SQLite persistence
  sendEvent('log', { message: `[Predictix] Phase 3/4 : Enregistrement de ${scrapedMatches.length} matchs dans SQLite...` });
  const { importedCount, settledBetsList } = await importScrapedMatches(scrapedMatches, new Date().toISOString());
  sendEvent('log', { message: `[Predictix] ✓ Importation réussie : ${importedCount} prédictions insérées.` });

  // Phase 4/4 : Confrontations H2H
  sendEvent('log', { message: `[Predictix] Phase 4/4 : Analyse et crawl des confrontations H2H en parallèle...` });
  await crawlHistoricalH2HMatches(scrapedMatches, context, sendEvent);
  sendEvent('log', { message: `[Predictix] ✓ Scraping de l'historique H2H terminé avec succès.` });

  return { importedCount, settledBetsList, scrapedMatches };
}
