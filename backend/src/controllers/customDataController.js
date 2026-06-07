import { dbQuery, dbGet, dbRun } from '../db/database.js';
import { scraperState } from './scraperState.js';

class CustomDataController {
  /**
   * GET /custom-logos
   */
  async getCustomLogos(req, res) {
    try {
      const rows = await dbQuery('SELECT * FROM custom_team_logos');
      res.json({ success: true, data: rows });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  /**
   * POST /custom-logos
   */
  async saveCustomLogo(req, res) {
    const { team_name, logo_url } = req.body;
    if (!team_name || !logo_url) {
      return res.status(400).json({ success: false, error: { message: "team_name and logo_url are required." } });
    }
    try {
      await dbRun('INSERT OR REPLACE INTO custom_team_logos (team_name, logo_url) VALUES (?, ?)', [team_name.trim(), logo_url.trim()]);
      res.json({ success: true, message: "Custom team logo saved successfully." });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  /**
   * DELETE /custom-logos/:teamName
   */
  async deleteCustomLogo(req, res) {
    const { teamName } = req.params;
    if (!teamName) {
      return res.status(400).json({ success: false, error: { message: "teamName parameter is required." } });
    }
    try {
      await dbRun('DELETE FROM custom_team_logos WHERE team_name = ?', [teamName]);
      res.json({ success: true, message: "Custom team logo deleted successfully." });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  /**
   * POST /predictions/historical/custom
   */
  async saveCustomHistoricalMatch(req, res) {
    const {
      match_id,
      date,
      time,
      tournament,
      home_team,
      away_team,
      score,
      first_half_corners_home,
      first_half_corners_away,
      statistics
    } = req.body;

    if (!match_id || !home_team || !away_team) {
      return res.status(400).json({ success: false, error: { message: "match_id, home_team, and away_team are required." } });
    }

    try {
      const sql = `
        INSERT OR REPLACE INTO scraped_predictions (
          match_id, time, date, tournament, home_team, away_team, score,
          over_odds, under_odds, card_line, probability, best_tip, win_rate, status,
          is_live, is_finished, first_half_corners_home, first_half_corners_away,
          is_historical, match_url, statistics_json, scraped_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      await dbRun(sql, [
        match_id,
        time || 'Finished',
        date || new Date().toISOString().substring(0, 10),
        tournament || 'Football',
        home_team.trim(),
        away_team.trim(),
        score || '',
        '1.85', '1.90', '4.5', '60%', 'Plus de', '60%', 'Finished',
        0, 1,
        first_half_corners_home !== undefined && first_half_corners_home !== null ? parseInt(first_half_corners_home, 10) : null,
        first_half_corners_away !== undefined && first_half_corners_away !== null ? parseInt(first_half_corners_away, 10) : null,
        1,
        match_id,
        statistics ? JSON.stringify(statistics) : null
      ]);

      res.json({ success: true, message: "Match historique enregistré avec succès." });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  /**
   * POST /api/scraper/integrity-batch/cleanup
   */
  async cleanupDatabaseIntegrity(req, res) {
    try {
      scraperState.activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] 🧹 Lancement du nettoyage de la base de données...`);
      
      const duplicates = await dbQuery(`
        SELECT date, home_team, away_team, COUNT(*) as cnt
        FROM scraped_predictions
        GROUP BY date, home_team, away_team
        HAVING cnt > 1
      `);
      
      let deletedDuplicates = 0;
      for (const group of duplicates) {
        const rows = await dbQuery(`
          SELECT match_id, is_historical, statistics_json, first_half_corners_home
          FROM scraped_predictions
          WHERE date = ? AND home_team = ? AND away_team = ?
        `, [group.date, group.home_team, group.away_team]);
        
        rows.sort((a, b) => {
          const hasStatsA = a.statistics_json && a.statistics_json !== 'null' ? 1 : 0;
          const hasStatsB = b.statistics_json && b.statistics_json !== 'null' ? 1 : 0;
          if (hasStatsA !== hasStatsB) return hasStatsB - hasStatsA;
          
          const hasCornersA = a.first_half_corners_home !== null ? 1 : 0;
          const hasCornersB = b.first_half_corners_home !== null ? 1 : 0;
          return hasCornersB - hasCornersA;
        });
        
        for (let i = 1; i < rows.length; i++) {
          await dbRun('DELETE FROM scraped_predictions WHERE match_id = ?', [rows[i].match_id]);
          deletedDuplicates++;
        }
      }
      
      const referencedIds = new Set();
      const mainMatches = await dbQuery("SELECT historical_links, match_id FROM scraped_predictions WHERE is_historical = 0");
      for (const m of mainMatches) {
        referencedIds.add(m.match_id);
        try {
          if (m.historical_links) {
            const links = JSON.parse(m.historical_links);
            if (Array.isArray(links)) {
              for (const l of links) {
                referencedIds.add(l);
              }
            }
          }
        } catch (e) {}
      }
      
      const historicalMatches = await dbQuery("SELECT match_id FROM scraped_predictions WHERE is_historical = 1");
      let purgedOrphans = 0;
      for (const hm of historicalMatches) {
        if (!referencedIds.has(hm.match_id)) {
          await dbRun("DELETE FROM scraped_predictions WHERE match_id = ?", [hm.match_id]);
          purgedOrphans++;
        }
      }
      
      const todayStr = new Date().toISOString().substring(0, 10);
      const resultHeal = await dbRun(`
        UPDATE scraped_predictions 
        SET is_finished = 0 
        WHERE date < ? 
          AND (score = '' OR score = '-' OR score IS NULL OR score LIKE '%:%')
          AND is_historical = 0
      `, [todayStr]);
      const healedCount = resultHeal.changes || 0;

      const logMsg = `[${new Date().toLocaleTimeString()}] ✓ Nettoyage terminé. Doublons supprimés: ${deletedDuplicates}, Historiques orphelins purgés: ${purgedOrphans}, Matchs guéris: ${healedCount}.`;
      scraperState.activeIntegrityBatch.logs.push(logMsg);

      res.json({
        success: true,
        message: "Nettoyage de la base de données effectué avec succès.",
        data: {
          deletedDuplicates,
          purgedOrphans,
          healedCount
        }
      });
    } catch (error) {
      console.error('[Predictix DB Cleanup Error]', error);
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }
}

export default new CustomDataController();
