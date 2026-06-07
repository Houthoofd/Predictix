import path from 'path';
import fs from 'fs';
import { isTorActive, runDiscoveryProcess, ensureScraperCompiled } from '../utils/scraperHelpers.js';
import { scraperState } from './scraperState.js';

class DiscoveryController {
  /**
   * POST /predictions/scrape/discover
   */
  async discoverMatches(req, res) {
    if (scraperState.activeScraperProcess) {
      return res.status(400).json({ success: false, error: { message: "Un scraping ou une découverte est déjà en cours d'exécution." } });
    }

    const torActive = await isTorActive();
    if (!torActive) {
      return res.status(400).json({ 
        success: false, 
        error: { message: "Le proxy Tor local n'est pas actif sur le port 9050. Veuillez lancer Tor et réessayer." } 
      });
    }

    const targetDate = req.body.date || req.query.date || null;
    const scraper = req.body.scraper || req.query.scraper || 'matchendirect';
    const sport = req.body.sport || req.query.sport || 'football';
    
    let formattedDate = null;
    if (targetDate) {
      const ymdMatch = targetDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (ymdMatch) {
        formattedDate = `${ymdMatch[3]}-${ymdMatch[2]}-${ymdMatch[1]}`;
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(targetDate)) {
        formattedDate = targetDate;
      }
    }

    const scraperPath = process.env.SCRAPER_PATH || 'E:\\Developpement\\scrapper-v3';
    const outputDirs = [
      path.join(scraperPath, 'data', 'matchendirect'),
      path.join(scraperPath, 'data', 'flashscore'),
      path.join(scraperPath, 'data')
    ];

    if (!fs.existsSync(scraperPath)) {
      return res.status(404).json({ success: false, error: { message: `Dossier du scraper introuvable : ${scraperPath}` } });
    }

    try {
      await ensureScraperCompiled(scraperPath);
    } catch (compileErr) {
      return res.status(500).json({ success: false, error: { message: `Erreur de compilation du scraper Go : ${compileErr.message}` } });
    }

    const sportsToScrape = (sport === 'all' && scraper === 'flashscore')
      ? ['football', 'basketball', 'tennis', 'rugby', 'handball', 'volleyball', 'hockey', 'baseball', 'american-football', 'table-tennis', 'badminton', 'cricket', 'snooker', 'futsal']
      : [sport];

    try {
      let discoveredMatches = [];
      for (const sp of sportsToScrape) {
        console.log(`[Predictix Discovery] Discovering matches for: ${sp}`);
        const matches = await runDiscoveryProcess(scraperPath, null, outputDirs, formattedDate, (child) => {
          scraperState.activeScraperProcess = child;
        }, scraper, sp);
        
        const withSport = matches.map(m => ({ ...m, sport: sp }));
        discoveredMatches = discoveredMatches.concat(withSport);
      }

      scraperState.activeScraperProcess = null;

      return res.json({
        success: true,
        count: discoveredMatches.length,
        matches: discoveredMatches.map(m => ({
          match_id: m.match_id,
          time: m.time,
          tournament: m.tournament,
          home_team: m.home_team,
          away_team: m.away_team,
          home_logo: m.home_logo,
          away_logo: m.away_logo,
          score: m.score,
          href: m.historical_links?.[0] || m.href || '',
          sport: m.sport
        }))
      });
    } catch (err) {
      scraperState.activeScraperProcess = null;
      return res.status(500).json({ success: false, error: { message: err.message } });
    }
  }
}

export default new DiscoveryController();
