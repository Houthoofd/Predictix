/**
 * Shared state for Predictix scrapers and integrity batchers
 */
export const scraperState = {
  activeScraperProcess: null,
  stopScraperRequested: false,
  activeCrawlHistoryMatches: new Set(),
  activeIntegrityBatch: {
    status: 'idle', // 'idle', 'running', 'paused'
    queue: [],
    currentIndex: 0,
    processedCount: 0,
    successCount: 0,
    errorCount: 0,
    logs: [],
    spawnedChildren: new Set()
  }
};
