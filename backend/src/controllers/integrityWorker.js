import { dbQuery, dbGet, dbRun } from '../db/database.js';
import { renewTorSession, scrapeSingleMatch, prioritizeDirectH2H, fetchWikipediaLogoFallback, tryResolveSofaStatsFallback } from '../utils/scraperHelpers.js';
import { importHistoricalMatch, importSkippedMatch, enrichPrimaryMatch } from '../db/importer.js';

export async function processQueueItem(socksPort, indexToProcess, scraperPath, activeIntegrityBatch) {
  const matchObj = activeIntegrityBatch.queue[indexToProcess];
  try {
    const match = await dbGet('SELECT * FROM scraped_predictions WHERE match_id = ?', [matchObj.match_id]);
    if (!match) {
      throw new Error("Match introuvable dans la base de données.");
    }

    // 1. Pre-inspect missing items and calculate diagnostics immediately
    const isHomeLogoMissing = !match.home_logo || match.home_logo.trim() === '' || match.home_logo.toLowerCase().includes('placeholder') || match.home_logo.toLowerCase().includes('logo_default') || match.home_logo.toLowerCase().includes('logo-default');
    const isAwayLogoMissing = !match.away_logo || match.away_logo.trim() === '' || match.away_logo.toLowerCase().includes('placeholder') || match.away_logo.toLowerCase().includes('logo_default') || match.away_logo.toLowerCase().includes('logo-default');
    
    const isFootball = (match.sport || 'football') === 'football';
    const isStatsMissing = isFootball
      ? (match.first_half_corners_home === null || match.first_half_corners_away === null)
      : (!match.statistics_json || match.statistics_json === 'null' || match.statistics_json === '');

    const h2hMatches = await dbQuery(`
      SELECT match_id FROM scraped_predictions 
      WHERE is_finished = 1 AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))
    `, [match.home_team, match.away_team, match.away_team, match.home_team]);

    const homeMatches = await dbQuery('SELECT match_id FROM scraped_predictions WHERE is_finished = 1 AND home_team = ?', [match.home_team]);
    const awayMatches = await dbQuery('SELECT match_id FROM scraped_predictions WHERE is_finished = 1 AND away_team = ?', [match.away_team]);

    const needsH2H = h2hMatches.length === 0;
    const needsTeamHistory = homeMatches.length < 5 || awayMatches.length < 5;
    const needsH2HCrawl = needsH2H || needsTeamHistory;

    // 2. If the match is already 100% healthy and complete, skip it instantly without delay
    if (!isHomeLogoMissing && !isAwayLogoMissing && !isStatsMissing && !needsH2HCrawl) {
      activeIntegrityBatch.successCount++;
      activeIntegrityBatch.processedCount++;
      activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] ✓ Match [${match.home_team} vs ${match.away_team}] déjà complet (Diagnostic 100%).`);
      return;
    }

    let links = [];
    try {
      if (match.historical_links) {
        links = JSON.parse(match.historical_links);
      }
    } catch (e) {}

    let activeLinks = [...links];

    const isFlashscore = match.sport !== 'football' || (match.match_url && !match.match_url.startsWith('/live-score/'));
    const scraperSource = isFlashscore ? 'flashscore' : 'matchendirect';
    const matchSport = match.sport || 'football';

    // 3. Primary page crawl condition: we need details (logos/stats) OR we need history but only have the single match URL (links.length === 1)
    const needsPrimaryCrawl = isHomeLogoMissing || isAwayLogoMissing || isStatsMissing || (needsH2HCrawl && links.length === 1);

    const isLiveScoreLink = links.length === 1 && links[0].startsWith('/live-score/');
    const isFlashscoreLink = links.length === 1 && !links[0].startsWith('/live-score/');
    const canCrawlPrimary = needsPrimaryCrawl && links.length === 1 && (isLiveScoreLink || (isFlashscore && isFlashscoreLink));

    if (canCrawlPrimary) {
      let targetLink = links[0];
      if (isLiveScoreLink && (match.is_finished === 0 || match.time === 'Planned' || !match.score || match.score === '-' || match.score === '')) {
        if (!targetLink.includes('?p=')) {
          targetLink += '?p=face-a-face';
        }
      }
      
      activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] -> Crawl de la page principale : ${targetLink}`);
      
      const primaryDetails = await scrapeSingleMatch(scraperPath, targetLink, false, (child) => {
        activeIntegrityBatch.spawnedChildren.add(child);
      }, socksPort, scraperSource, matchSport);

      if (primaryDetails) {
        await enrichPrimaryMatch(match.match_id, primaryDetails, targetLink, match);
        activeLinks = primaryDetails.historical_links || [];
        activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] ✓ Page principale actualisée (logos/stats)`);
      }
    }

    // 4. Self-Healing fallback Wikipedia logo search if logos are still missing/placeholder
    const updatedMatchForLogos = await dbGet('SELECT * FROM scraped_predictions WHERE match_id = ?', [matchObj.match_id]);
    if (updatedMatchForLogos) {
      const homeLogoNow = updatedMatchForLogos.home_logo;
      const awayLogoNow = updatedMatchForLogos.away_logo;
      
      const homeLogoMissingNow = !homeLogoNow || homeLogoNow.trim() === '' || homeLogoNow.toLowerCase().includes('placeholder') || homeLogoNow.toLowerCase().includes('logo_default') || homeLogoNow.toLowerCase().includes('logo-default');
      const awayLogoMissingNow = !awayLogoNow || awayLogoNow.trim() === '' || awayLogoNow.toLowerCase().includes('placeholder') || awayLogoNow.toLowerCase().includes('logo_default') || awayLogoNow.toLowerCase().includes('logo-default');
      
      if (homeLogoMissingNow) {
        activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] -> Logo domicile manquant. Recherche Wikipédia pour : ${matchObj.home_team}...`);
        const fallbackLogo = await fetchWikipediaLogoFallback(matchObj.home_team);
        if (fallbackLogo) {
          await dbRun('INSERT OR REPLACE INTO custom_team_logos (team_name, logo_url) VALUES (?, ?)', [matchObj.home_team.toLowerCase().trim(), fallbackLogo]);
          activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] ✓ Logo domicile résolu via Wikipédia : ${matchObj.home_team}`);
        }
      }
      
      if (awayLogoMissingNow) {
        activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] -> Logo extérieur manquant. Recherche Wikipédia pour : ${matchObj.away_team}...`);
        const fallbackLogo = await fetchWikipediaLogoFallback(matchObj.away_team);
        if (fallbackLogo) {
          await dbRun('INSERT OR REPLACE INTO custom_team_logos (team_name, logo_url) VALUES (?, ?)', [matchObj.away_team.toLowerCase().trim(), fallbackLogo]);
          activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] ✓ Logo extérieur résolu via Wikipédia : ${matchObj.away_team}`);
        }
      }
    }

    // 4b. SofaScore fallback check for missing statistics / corners on main match
    const checkMatch = await dbGet('SELECT * FROM scraped_predictions WHERE match_id = ?', [matchObj.match_id]);
    const checkMatchFootball = (checkMatch?.sport || 'football') === 'football';
    const checkMatchStatsMissing = checkMatchFootball 
      ? (checkMatch.first_half_corners_home === null || !checkMatch.statistics_json || checkMatch.statistics_json === 'null')
      : (!checkMatch.statistics_json || checkMatch.statistics_json === 'null' || checkMatch.statistics_json === '');

    if (checkMatch && checkMatchStatsMissing) {
      activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] -> Stats manquantes pour le match principal. Tentative de secours via SofaScore...`);
      const sofaData = await tryResolveSofaStatsFallback(checkMatch.date, checkMatch.home_team, checkMatch.away_team);
      if (sofaData) {
        const statsJson = JSON.stringify(sofaData);
        const cornersHome = sofaData.first_half_corners ? sofaData.first_half_corners.home : null;
        const cornersAway = sofaData.first_half_corners ? sofaData.first_half_corners.away : null;
        await dbRun(`
          UPDATE scraped_predictions 
          SET statistics_json = ?, 
              first_half_corners_home = ?, 
              first_half_corners_away = ? 
          WHERE match_id = ?
        `, [statsJson, cornersHome, cornersAway, matchObj.match_id]);
        activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] [SofaScore] ✓ Stats et corners résolus via SofaScore pour le match principal !`);
      } else {
        activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] [Erreur] SofaScore n'a renvoyé aucune statistique pour ce match.`);
      }
    }

    // 5. Deep H2H / History crawl
    if (needsH2HCrawl && activeLinks.length > 0) {
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

      if (uncachedLinks.length > 0) {
        let newlyCrawledHome = 0;
        let newlyCrawledAway = 0;
        let newlyCrawledH2H = 0;

        const existingHomeCount = homeMatches.length;
        const existingAwayCount = awayMatches.length;
        const existingH2HCount = h2hMatches.length;

        activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] -> ${uncachedLinks.length} confrontations manquantes.`);
        
        let crawlCount = 0;
        for (const link of uncachedLinks) {
          if (activeIntegrityBatch.status !== 'running') break;

          const currentHomeTotal = existingHomeCount + newlyCrawledHome;
          const currentAwayTotal = existingAwayCount + newlyCrawledAway;
          const currentH2HTotal = existingH2HCount + newlyCrawledH2H;

          if (currentHomeTotal >= 5 && currentAwayTotal >= 5 && currentH2HTotal >= 1) {
            activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] ✓ Objectif d'intégrité atteint (5 H/5 A/1 H2H). Arrêt du crawl historique.`);
            break;
          }

          if (crawlCount >= 10) {
            activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] [Warning] Limite de sécurité atteinte (10 crawls).`);
            break;
          }

          crawlCount++;

          const histMatch = await scrapeSingleMatch(scraperPath, link, true, (child) => {
            activeIntegrityBatch.spawnedChildren.add(child);
          }, socksPort, scraperSource, matchSport);

          if (histMatch && histMatch.home_team && histMatch.away_team) {
            await importHistoricalMatch(link, histMatch);
            
            const isHistFootball = (histMatch.sport || matchSport) === 'football';
            const histStatsMissing = isHistFootball
              ? (histMatch.first_half_corners_home === null || histMatch.first_half_corners_home === undefined || !histMatch.statistics)
              : (!histMatch.statistics || Object.keys(histMatch.statistics).length === 0);

            if (histStatsMissing) {
              activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}]   [Tor Link] H2H sans statistiques. Recherche SofaScore de secours...`);
              const sofaHistData = await tryResolveSofaStatsFallback(histMatch.date || match.date, histMatch.home_team, histMatch.away_team);
              if (sofaHistData) {
                const statsJson = JSON.stringify(sofaHistData);
                const cornersHome = sofaHistData.first_half_corners ? sofaHistData.first_half_corners.home : null;
                const cornersAway = sofaHistData.first_half_corners ? sofaHistData.first_half_corners.away : null;
                await dbRun(`
                  UPDATE scraped_predictions 
                  SET statistics_json = ?, 
                      first_half_corners_home = ?, 
                      first_half_corners_away = ? 
                  WHERE match_id = ?
                `, [statsJson, cornersHome, cornersAway, link]);
                activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}]   [SofaScore] ✓ Confrontation H2H complétée via SofaScore !`);
              }
            }

            const homeClean = histMatch.home_team.replace(/[▲▼]/g, '').trim();
            const awayClean = histMatch.away_team.replace(/[▲▼]/g, '').trim();
            activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}]   ✓ H2H importé : ${homeClean} vs ${awayClean}`);

            const matchHomeClean = match.home_team.toLowerCase().trim();
            const matchAwayClean = match.away_team.toLowerCase().trim();
            const histHomeClean = homeClean.toLowerCase().trim();
            const histAwayClean = awayClean.toLowerCase().trim();

            const isDirectH2H = (histHomeClean === matchHomeClean && histAwayClean === matchAwayClean) ||
                                (histHomeClean === matchAwayClean && histAwayClean === matchHomeClean);

            if (isDirectH2H) {
              newlyCrawledH2H++;
            }

            if (histHomeClean === matchHomeClean || histAwayClean === matchHomeClean) {
              newlyCrawledHome++;
            }
            if (histHomeClean === matchAwayClean || histAwayClean === matchAwayClean) {
              newlyCrawledAway++;
            }
          } else {
            await importSkippedMatch(link);
            activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}]   [Warning] H2H sauté (échec) : ${link}`);
            activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}]   [Rotation IP] Rotation d'IP de secours...`);
            await renewTorSession(socksPort + 1);
          }

          await new Promise(r => setTimeout(r, 2500));
        }
      }
    }

    activeIntegrityBatch.successCount++;
    activeIntegrityBatch.processedCount++;
    activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] ✓ Match [${matchObj.home_team} vs ${matchObj.away_team}] réparé.`);
  } catch (err) {
    activeIntegrityBatch.errorCount++;
    activeIntegrityBatch.processedCount++;
    activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] [Erreur] Erreur pour ${matchObj.home_team} vs ${matchObj.away_team} : ${err.message}`);
    activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] [Rotation IP] Rotation d'IP de secours...`);
    await renewTorSession(socksPort + 1);
  }
}
