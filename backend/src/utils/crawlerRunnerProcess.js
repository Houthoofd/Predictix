export {
  isWindows,
  exeName,
  getCrawlerExecutablePath,
  createTempOutputFile,
  cleanupFiles,
  killProcessTree,
  buildCrawlerArgs,
  buildSingleMatchArgs,
  executeCrawlerCommand,
  spawnCrawlerProcess,
  attachCrawlerEventListener,
  processCrawlerOutputLine,
  ensureScraperCompiled
} from './crawlerProcess.js';
