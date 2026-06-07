import { exec } from 'child_process';
import { dbQuery, dbGet, dbRun } from '../db/database.js';
import { isTorActive } from '../utils/scraperHelpers.js';
import { getEnrichedPredictions } from '../utils/predictionEngine.js';
import { scraperState } from './scraperState.js';
import { runIntegrityBatchLoop } from './integrityBatchRunner.js';
import { crawlMatchHistory as crawlMatchHistoryFn } from './historyCrawler.js';

class IntegrityController {
  async startIntegrityBatch(req, res) {
    try {
      const torActive = await isTorActive();
      if (!torActive) {
        return res.status(400).json({ 
          success: false, 
          error: { message: "Le proxy Tor local n'est pas actif sur le port 9050. Veuillez lancer Tor et réessayer." } 
        });
      }

      const activeIntegrityBatch = scraperState.activeIntegrityBatch;
      if (activeIntegrityBatch.status === 'running') {
        return res.json({ success: true, message: "Le batcher de réparation est déjà en cours d'exécution." });
      }

      if (activeIntegrityBatch.status === 'paused' && activeIntegrityBatch.queue.length > 0) {
        activeIntegrityBatch.status = 'running';
        activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] ▶ Reprise de la réparation globale.`);
        runIntegrityBatchLoop();
        return res.json({ success: true, message: "Réparation globale reprise." });
      }

      const predictions = await getEnrichedPredictions({ dateRange: 'all' }, dbQuery, new Set());
      const incompleteMatches = predictions.filter(p => p.diagnostic && !p.diagnostic.is_complete);

      if (incompleteMatches.length === 0) {
        return res.json({ success: true, message: "Toutes les données sont déjà complètes (score d'intégrité de 100% sur tous les matchs) !" });
      }

      const todayStr = new Date().toISOString().substring(0, 10);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().substring(0, 10);

      let activeStrategies = [];
      try {
        activeStrategies = await dbQuery("SELECT * FROM custom_strategies WHERE status = 'ACTIVE'");
      } catch (err) {
        console.warn("Could not fetch active strategies for scheduling:", err.message);
      }

      const getMatchWeight = (m) => {
        let weight = 0;
        const score = m.diagnostic?.score ?? 100;
        
        if (m.date === todayStr) {
          weight += 1500;
        } else if (m.date === tomorrowStr) {
          weight += 800;
        } else if (m.date > todayStr) {
          weight += 300;
        }

        if (score < 30) {
          weight += 1200;
        } else if (score < 60) {
          weight += 600;
        } else if (score < 90) {
          weight += 200;
        }

        weight += (100 - score);

        const matchesStrategy = activeStrategies.some(s => {
          const tKey = (m.tournament || '').toLowerCase();
          const metric = s.metric || '';
          return tKey.includes(metric) || tKey.includes('ligue') || tKey.includes('cup') || tKey.includes('coupe');
        });
        if (matchesStrategy) {
          weight += 400;
        }

        return weight;
      };

      incompleteMatches.sort((a, b) => getMatchWeight(b) - getMatchWeight(a));

      activeIntegrityBatch.queue = incompleteMatches.map(m => ({
        match_id: m.match_id,
        home_team: m.home_team,
        away_team: m.away_team,
        date: m.date,
        tournament: m.tournament,
        historical_links: m.historical_links,
        diagnostic: m.diagnostic
      }));

      activeIntegrityBatch.currentIndex = 0;
      activeIntegrityBatch.processedCount = 0;
      activeIntegrityBatch.successCount = 0;
      activeIntegrityBatch.errorCount = 0;
      activeIntegrityBatch.logs = [`[${new Date().toLocaleTimeString()}] 🚀 Démarrage de la réparation globale pour ${incompleteMatches.length} matchs (Tri par priorité actif).`];
      activeIntegrityBatch.status = 'running';

      runIntegrityBatchLoop();

      res.json({ success: true, message: "Réparation globale lancée en arrière-plan.", total: incompleteMatches.length });
    } catch (error) {
      console.error('[Predictix Integrity Batch Start Error]', error);
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  async pauseIntegrityBatch(req, res) {
    const activeIntegrityBatch = scraperState.activeIntegrityBatch;
    if (activeIntegrityBatch.status !== 'running') {
      return res.json({ success: true, message: "Le batcher n'est pas en cours d'exécution." });
    }

    activeIntegrityBatch.status = 'paused';
    activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] ⏸ Mise en pause demandée. Arrêt après le match courant...`);
    res.json({ success: true, message: "Mise en pause planifiée." });
  }

  async stopIntegrityBatch(req, res) {
    const activeIntegrityBatch = scraperState.activeIntegrityBatch;
    activeIntegrityBatch.status = 'idle';
    activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] ⏹ Réparation globale arrêtée par l'utilisateur.`);
    
    for (const child of activeIntegrityBatch.spawnedChildren) {
      if (child && !child.killed) {
        try {
          if (process.platform === 'win32') {
            exec(`taskkill /pid ${child.pid} /T /F`, () => {});
          } else {
            child.kill();
          }
        } catch (e) {}
      }
    }
    activeIntegrityBatch.spawnedChildren.clear();
    activeIntegrityBatch.queue = [];
    activeIntegrityBatch.currentIndex = 0;

    res.json({ success: true, message: "Batcher arrêté et réinitialisé." });
  }

  async getIntegrityBatchStatus(req, res) {
    const activeIntegrityBatch = scraperState.activeIntegrityBatch;
    const recentLogs = activeIntegrityBatch.logs.slice(-100);
    const nextQueue = activeIntegrityBatch.queue.slice(activeIntegrityBatch.currentIndex, activeIntegrityBatch.currentIndex + 10);
    res.json({
      success: true,
      data: {
        status: activeIntegrityBatch.status,
        queueLength: activeIntegrityBatch.queue.length,
        currentIndex: activeIntegrityBatch.currentIndex,
        processedCount: activeIntegrityBatch.processedCount,
        successCount: activeIntegrityBatch.successCount,
        errorCount: activeIntegrityBatch.errorCount,
        logs: recentLogs,
        queue: nextQueue
      }
    });
  }

  async prioritizeIntegrityMatch(req, res) {
    const { match_id } = req.body;
    if (!match_id) {
      return res.status(400).json({ success: false, error: { message: "Le paramètre match_id est requis." } });
    }
    try {
      const activeIntegrityBatch = scraperState.activeIntegrityBatch;
      const queue = activeIntegrityBatch.queue;
      const idx = queue.findIndex((m, i) => i >= activeIntegrityBatch.currentIndex && m.match_id === match_id);
      
      if (idx === -1) {
        return res.status(404).json({ success: false, error: { message: "Match non trouvé dans la file d'attente." } });
      }
      
      const matchObj = queue[idx];
      queue.splice(idx, 1);
      queue.splice(activeIntegrityBatch.currentIndex, 0, matchObj);
      
      activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] ⚡ Priorisation manuelle : ${matchObj.home_team} vs ${matchObj.away_team}`);
      res.json({ success: true, message: "Match priorisé avec succès." });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  async injectIntegrityMatch(req, res) {
    const { match_url } = req.body;
    if (!match_url || typeof match_url !== 'string' || !match_url.startsWith('/live-score/')) {
      return res.status(400).json({ success: false, error: { message: "Une URL Match en Direct valide (commençant par /live-score/) est requise." } });
    }
    
    try {
      const activeIntegrityBatch = scraperState.activeIntegrityBatch;
      const parts = match_url.replace('/live-score/', '').replace('.html', '').split('-');
      let home = 'Home';
      let away = 'Away';
      if (parts.length >= 2) {
        home = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        away = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
      }
      
      const matchId = match_url;
      const existing = await dbGet('SELECT * FROM scraped_predictions WHERE match_id = ?', [matchId]);
      
      if (!existing) {
        const todayStr = new Date().toISOString().substring(0, 10);
        const sql = `
          INSERT INTO scraped_predictions (
            match_id, time, date, tournament, home_team, away_team, score,
            over_odds, under_odds, card_line, probability, best_tip, win_rate, status,
            is_live, is_finished, first_half_corners_home, first_half_corners_away,
            is_historical, match_url, scraped_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        await dbRun(sql, [
          matchId, 'Planned', todayStr, 'Football (Injecté)', home, away, '',
          '1.85', '1.90', '4.5', '60%', 'Plus de', '60%', 'Planned',
          0, 0, null, null, 0, matchId
        ]);
      }
      
      const matchObj = {
        match_id: matchId,
        home_team: existing ? existing.home_team : home,
        away_team: existing ? existing.away_team : away,
        date: existing ? existing.date : new Date().toISOString().substring(0, 10),
        tournament: existing ? existing.tournament : 'Football (Injecté)',
        historical_links: JSON.stringify([matchId]),
        diagnostic: { score: 0, is_complete: false }
      };
      
      activeIntegrityBatch.queue.splice(activeIntegrityBatch.currentIndex, 0, matchObj);
      activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] 📥 Injection manuelle du match : ${matchObj.home_team} vs ${matchObj.away_team}`);
      
      if (activeIntegrityBatch.status === 'idle') {
        const torActive = await isTorActive();
        if (torActive) {
          activeIntegrityBatch.currentIndex = 0;
          activeIntegrityBatch.processedCount = 0;
          activeIntegrityBatch.successCount = 0;
          activeIntegrityBatch.errorCount = 0;
          activeIntegrityBatch.logs = [`[${new Date().toLocaleTimeString()}] 🚀 Démarrage automatique suite à l'injection d'un match.`];
          activeIntegrityBatch.status = 'running';
          runIntegrityBatchLoop();
        } else {
          activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] ⚠ Match injecté en file d'attente, mais Tor n'est pas actif pour démarrer.`);
        }
      }
      
      res.json({ success: true, message: "Match injecté avec succès et placé en tête de file." });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  async crawlMatchHistory(req, res) {
    return crawlMatchHistoryFn(req, res);
  }
}

export default new IntegrityController();
