import net from 'net';
import fs from 'fs';
import path from 'path';

/**
 * Check if Tor SOCKS5 proxy port is active
 */
export function isTorActive() {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1500);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    const onError = () => {
      socket.destroy();
      resolve(false);
    };
    
    socket.on('error', onError);
    socket.on('timeout', onError);
    
    socket.connect(9050, '127.0.0.1');
  });
}

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
 * Robustly parse French date string (e.g. "17 mai 2026", "1er juin 2026", "20/05/2026") into YYYY-MM-DD format
 */
export function parseFrenchDate(dateStr) {
  if (!dateStr) return null;
  dateStr = dateStr.trim().toLowerCase();
  
  // Try YYYY-MM-DD first
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Try DD/MM/YYYY or D/M/YYYY
  const dmRef = dateStr.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (dmRef) {
    const day = dmRef[1].padStart(2, '0');
    const month = dmRef[2].padStart(2, '0');
    const year = dmRef[3];
    return `${year}-${month}-${day}`;
  }
  
  // Try French text month, e.g. "17 mai 2026" or "1er juin 2026"
  const frenchMonths = {
    'janvier': '01', 'janv.': '01', 'janv': '01',
    'février': '02', 'févr.': '02', 'févr': '02', 'fevrier': '02',
    'mars': '03',
    'avril': '04', 'avr.': '04', 'avr': '04',
    'mai': '05',
    'juin': '06',
    'juillet': '07', 'juil.': '07', 'juil': '07',
    'août': '08', 'aout': '08',
    'septembre': '09', 'sept.': '09', 'sept': '09',
    'octobre': '10', 'oct.': '10', 'oct': '10',
    'novembre': '11', 'nov.': '11', 'nov': '11',
    'décembre': '12', 'déc.': '12', 'déc': '12', 'decembre': '12'
  };
  
  // Replace "1er" with "1" to simplify parsing
  dateStr = dateStr.replace(/^1er\b/, '1');
  
  const textMatch = dateStr.match(/^(\d{1,2})\s+([a-zéûûöäêèéàç\.]+)\s+(\d{4})$/);
  if (textMatch) {
    const day = textMatch[1].padStart(2, '0');
    const monthName = textMatch[2];
    const year = textMatch[3];
    const month = frenchMonths[monthName];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }
  
  return null;
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
    shots: 'Tirs globaux',
    offsides: 'Hors-jeu',
    corners: 'Corners 1ère MT'
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
