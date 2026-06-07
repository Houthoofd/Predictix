import fs from 'fs';
import path from 'path';

// Re-export sub-helpers to maintain full compatibility across the codebase
export { 
  spawnedTorProcesses, 
  isTorActive, 
  renewTorSession, 
  bootstrapTorInstances, 
  cleanupSpawnedTor, 
  cleanupSpawnedTorSync,
  getActiveTorPorts,
  getTorPortFromPool,
  isTorRouting,
  healTorPort,
  healTorPool
} from './torSessionManager.js';

export { parseFrenchDate } from './dateParser.js';

export { 
  fetchSofaEventsForDate, 
  findSofaEventId, 
  fetchSofaStats, 
  mapSofaStatsToPredictix, 
  tryResolveSofaStatsFallback 
} from './sofaScoreResolver.js';

export { 
  cleanTeamName, 
  fuzzyMatch, 
  prioritizeDirectH2H, 
  fetchWikipediaLogoFallback 
} from './textMatcher.js';

// Re-export runner functions from scraperRunner.js
export {
  ensureScraperCompiled,
  scrapeSingleMatch,
  runDiscoveryProcess,
  crawlH2HLinksBatch
} from './scraperRunner.js';

/**
 * Scan scraper output directories and return path of the newest JSON file
 */
export function getNewestScrapedFile(outputDirs) {
  let allFiles = [];
  
  for (const dir of outputDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir)
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          return { path: filePath, mtime: stat.mtime };
        });
      allFiles = allFiles.concat(files);
    }
  }

  allFiles.sort((a, b) => b.mtime - a.mtime);
  return allFiles.length > 0 ? allFiles[0].path : null;
}

/**
 * Dynamic log line rewriter based on strategy metric target
 */
export function rewriteScraperLog(line, strategy) {
  if (!strategy) return line;
  
  const metricLabels = {
    fouls: 'Fautes commises',
    yellow_cards: 'Cartons Jaunes',
    possession: 'Possession de balle',
    shots_on_target: 'Tirs Cadrés',
    shots: 'Tirs',
    offsides: 'Hors-jeu',
    corners: 'Corners 1ère MT',
    total_rebounds: 'Rebonds',
    assists: 'Passes décisives',
    blocks: 'Contres',
    steals: 'Interceptions',
    field_goals: 'Paniers réussis',
    free_throws: 'Lancers francs',
    aces: 'Aces',
    double_faults: 'Doubles fautes',
    first_serve: '1er service (%)',
    break_points: 'Balles de break',
    tries: 'Essais',
    penalties: 'Pénalités',
    conversions: 'Transformations',
    goals: 'Buts',
    saves: 'Arrêts'
  };

  const metricLabel = metricLabels[strategy.metric] || strategy.metric;

  // 1. Title block rewrite
  if (line.includes('SCRAPER MATCH ENDIRECT PREMIUM - Corners 1ere Mi-Temps')) {
    return line.replace('SCRAPER MATCH ENDIRECT PREMIUM - Corners 1ere Mi-Temps', `SCRAPER MATCH ENDIRECT PREMIUM - Cible : ${metricLabel}`);
  }

  // 2. Metric extraction line rewrite
  if (line.includes('✓ Corners 1ère MT:')) {
    const matchData = line.match(/✓ Corners 1ère MT:\s*(\d+)\s*-\s*(\d+)\s*\((Historical links:\s*\d+)\)/);
    if (matchData) {
      return `✓ Statistiques cibles extraites avec succès pour la stratégie (Métrique: ${metricLabel}) (${matchData[3]})`;
    }
    return `✓ Statistiques cibles extraites avec succès (Cible: ${metricLabel})`;
  }

  return line;
}
