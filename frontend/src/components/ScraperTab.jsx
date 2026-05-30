import React from 'react';
import { 
  X, 
  RefreshCcw, 
  Terminal, 
  Search, 
  Calendar, 
  AlertCircle, 
  Plus 
} from 'lucide-react';

export default function ScraperTab({
  scraping,
  scrapeLimit,
  setScrapeLimit,
  matchesRemaining,
  scrapeProgress,
  scrapePhase,
  scrapeTimeRemaining,
  currentPrimary,
  totalPrimary,
  currentDeep,
  totalDeep,
  scraperLogs,
  predStatusFilter,
  setPredStatusFilter,
  predValueBetsOnly,
  setPredValueBetsOnly,
  predHighProbOnly,
  setPredHighProbOnly,
  predSearch,
  setPredSearch,
  filteredPredictions,
  selectedPredIds,
  setSelectedPredIds,
  setSelectedMatchDetails,
  handleStopScraping,
  handleTriggerScraping,
  handleQuickPlaceBet,
  consoleEndRef,
  stats
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Scraper Action Console Card */}
      <div className="glass-card accent-right" style={{ padding: '24px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', borderBottom: scraping ? '1px solid var(--border-color)' : 'none', paddingBottom: scraping ? '16px' : '0', transition: 'all 0.3s ease' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', fontWeight: 700 }}>
              Lancer le Scraper Go (MatchEnDirect.fr)
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Compile et démarre le serveur de workflow, navigue sur MatchEnDirect en direct pour extraire les statistiques et cotes.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 10px', height: '36px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Limite :
              </span>
              <input 
                type="number" 
                min="1" 
                max="200" 
                value={scrapeLimit}
                onChange={(e) => setScrapeLimit(Math.min(200, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                disabled={scraping}
                style={{ 
                  width: '45px', 
                  background: 'transparent', 
                  border: 'none', 
                  color: 'var(--color-accent-solid)', 
                  fontWeight: 700, 
                  fontSize: '13px', 
                  fontFamily: 'Outfit', 
                  outline: 'none', 
                  textAlign: 'center',
                  padding: 0
                }}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>matchs</span>
            </div>

            {scraping && (
              <button 
                className="btn btn-danger"
                onClick={handleStopScraping}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', fontSize: '13px', padding: '6px 14px', borderRadius: '6px' }}
              >
                <X size={15} />
                <span>Arrêter</span>
              </button>
            )}
            
            <button 
              className={`btn ${scraping ? 'btn-scraping-active' : 'btn-primary'}`}
              onClick={handleTriggerScraping}
              disabled={scraping}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', fontSize: '13px', padding: '6px 14px', borderRadius: '6px' }}
            >
              <RefreshCcw size={15} className={scraping ? 'animate-spin-slow' : ''} />
              <span>{scraping ? 'Scraping en cours...' : 'Démarrer le Scraping'}</span>
            </button>
          </div>
        </div>

        {/* Real-time Progress Bar */}
        {scraping && (
          <div style={{ width: '100%', marginTop: '16px', padding: '16px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '12.5px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: scrapePhase === 'importing' || scrapePhase === 'completed' ? 'var(--color-success)' : 'var(--color-accent-solid)',
                  display: 'inline-block',
                  boxShadow: scrapePhase === 'importing' || scrapePhase === 'completed' ? '0 0 8px var(--color-success)' : '0 0 8px var(--color-accent-solid)',
                  animation: 'pulse 1.5s infinite',
                  flexShrink: 0
                }}></span>
                <span>
                  {scrapePhase === 'discovering' && "Découverte des matchs de la journée..."}
                  {scrapePhase === 'scraping_primary' && "Scraping approfondi des détails (Tor headless)..."}
                  {scrapePhase === 'scraping_history' && "Récupération de l'historique H2H/Formes (Tor SOCKS)..."}
                  {scrapePhase === 'importing' && "Analyse & synchronisation SQLite..."}
                  {scrapePhase === 'completed' && "Scraping terminé avec succès !"}
                  {scrapePhase === 'stopped' && "Scraping arrêté."}
                </span>
              </span>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {matchesRemaining > 0 && (
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 8px' }}>
                    {matchesRemaining} match{matchesRemaining > 1 ? 's' : ''} restant{matchesRemaining > 1 ? 's' : ''}
                  </span>
                )}
                <span style={{ fontFamily: 'Outfit', fontWeight: 700, color: 'var(--color-accent-solid)' }}>
                  {scrapeProgress}%
                </span>
              </div>
            </div>
            
            {/* Track progress */}
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${scrapeProgress}%`, 
                height: '100%', 
                background: 'linear-gradient(90deg, var(--color-accent-solid), #00b894)', 
                borderRadius: '10px',
                transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
              }} />
            </div>

            {/* Detailed Scraper Info Dashboard Panel */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
              gap: '12px', 
              marginTop: '16px', 
              paddingTop: '16px', 
              borderTop: '1px solid rgba(255,255,255,0.05)' 
            }}>
              {/* Time Remaining Box */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', padding: '10px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', fontWeight: 600 }}>
                  Temps Restant
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
                  {scrapeTimeRemaining || "Calcul..."}
                </div>
              </div>

              {/* Scraped Matches Progress Box */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', padding: '10px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', fontWeight: 600 }}>
                  Matchs Principaux
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
                  {currentPrimary} / {totalPrimary || scrapeLimit}
                </div>
              </div>

              {/* Deep H2H Crawl Progress Box */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', padding: '10px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', fontWeight: 600 }}>
                  Profondeur H2H
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
                  {scrapePhase === 'scraping_history' ? `${currentDeep} / ${totalDeep}` : (totalDeep > 0 ? `${currentDeep} / ${totalDeep}` : 'En attente...')}
                </div>
              </div>

              {/* Tor Anonymous Routing proxy status */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', padding: '10px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', fontWeight: 600 }}>
                  Réseau Proxy
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: 'var(--color-success)', fontFamily: 'Outfit' }}>
                  <span style={{ 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    background: 'var(--color-success)',
                    boxShadow: '0 0 6px var(--color-success)',
                    display: 'inline-block'
                  }}></span>
                  <span>Tor SOCKS5 Actif</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scraper Monospace Log Output Terminal */}
        {(scraping || scraperLogs.length > 0) && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '12px', fontFamily: 'Outfit', fontWeight: 600, color: 'var(--text-secondary)' }}>
              <Terminal size={14} />
              <span>LOGS DU SERVEUR SCRAPPER-LITE</span>
            </div>
            <div className="scraper-console">
              {scraperLogs.map((log, idx) => (
                <div key={idx} className={`console-line ${log.type}`}>
                  {log.message}
                </div>
              ))}
              <div className="console-cursor" ref={consoleEndRef}></div>
            </div>
          </div>
        )}
      </div>

      {/* Filters Row */}
      <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        {/* Tabs selector */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {['all', 'live', 'planned', 'finished'].map((tab) => (
            <button
              key={tab}
              className={`btn ${predStatusFilter === tab ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '5px 12px', fontSize: '12.5px' }}
              onClick={() => setPredStatusFilter(tab)}
            >
              {tab === 'all' && 'Tous'}
              {tab === 'live' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="live-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
                  En Direct
                </span>
              )}
              {tab === 'planned' && 'À venir'}
              {tab === 'finished' && 'Terminés'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          {/* Toggle Value Bets Only */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
            <input 
              type="checkbox" 
              checked={predValueBetsOnly}
              onChange={(e) => setPredValueBetsOnly(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Value Bets uniquement
            </span>
          </label>

          {/* Toggle High Prob */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
            <input 
              type="checkbox" 
              checked={predHighProbOnly}
              onChange={(e) => setPredHighProbOnly(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span className="text-gradient-accent">Forte probabilité (≥60%)</span>
          </label>

          {/* Search bar */}
          <div style={{ position: 'relative', width: '250px' }}>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Rechercher un match, ligue..." 
              style={{ paddingLeft: '40px', paddingRight: '15px' }}
              value={predSearch}
              onChange={(e) => setPredSearch(e.target.value)}
            />
            <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        </div>
      </div>

      {/* Grid of Predictions matches */}
      {filteredPredictions.length > 0 ? (
        <div className="grid-3">
          {filteredPredictions.map((pred) => {
            const probVal = parseInt(pred.probability.replace('%', ''));
            const isHighProb = !isNaN(probVal) && probVal >= 60;
            
            // Calculate if this prediction itself is a Model-based Value Bet
            let isModelValueBet = false;
            let modelValueEdge = 0;
            let parsedProb = 0;
            let parsedOdds = 0;
            
            try {
              let rawProb = pred.win_rate || pred.probability || '';
              let cleanProb = String(rawProb).replace('%', '').trim();
              parsedProb = parseInt(cleanProb, 10);
              
              let rawOdds = '';
              const tipLower = String(pred.best_tip).toLowerCase();
              if (tipLower.includes('plus') || tipLower.includes('over')) {
                rawOdds = pred.over_odds;
              } else if (tipLower.includes('moins') || tipLower.includes('under')) {
                rawOdds = pred.under_odds;
              }
              parsedOdds = parseFloat(String(rawOdds).trim());
              
              if (!isNaN(parsedProb) && !isNaN(parsedOdds) && parsedProb > 0 && parsedOdds > 0) {
                const ev = (parsedProb / 100) * parsedOdds;
                if (ev >= 1.05) {
                  isModelValueBet = true;
                  modelValueEdge = Math.round((ev - 1) * 100);
                }
              }
            } catch (e) {}
            
            const isSelected = selectedPredIds.includes(pred.match_id);

            return (
              <div 
                key={pred.match_id} 
                className={`glass-card ${isHighProb ? 'accent-left' : ''}`}
                onClick={() => setSelectedMatchDetails(pred)}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between', 
                  gap: '20px',
                  border: isSelected 
                    ? '1.5px solid var(--color-accent-solid)' 
                    : isModelValueBet 
                      ? '1px dashed rgba(16, 185, 129, 0.4)' 
                      : '1px solid var(--border-color)',
                  boxShadow: isSelected
                    ? '0 0 15px rgba(0, 98, 255, 0.15)'
                    : isModelValueBet 
                      ? '0 0 15px rgba(16, 185, 129, 0.08)' 
                      : 'none',
                  cursor: 'pointer',
                  transform: isSelected ? 'scale(1.008)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Card Header Info */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) {
                            setSelectedPredIds(prev => prev.filter(id => id !== pred.match_id));
                          } else {
                            setSelectedPredIds(prev => [...prev, pred.match_id]);
                          }
                        }}
                        style={{ 
                          width: '16px', 
                          height: '16px', 
                          cursor: 'pointer',
                          accentColor: 'var(--color-accent-solid)'
                        }}
                      />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {pred.tournament || 'Football'}
                      </span>
                    </div>
                  
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {isModelValueBet && (
                        <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: 'var(--color-success)', fontWeight: 700, fontSize: '10.5px', display: 'flex', alignItems: 'center', gap: '3px' }} title={`Value Bet Modèle détecté ! (Probabilité: ${parsedProb}%, Cote: ${parsedOdds})`}>
                          Value Bet +{modelValueEdge}%
                        </span>
                      )}
                      
                      {/* Status Badge */}
                      <span className={`badge ${
                        pred.is_live === 1 || String(pred.status).toLowerCase() === 'live'
                          ? 'badge-pending'
                          : pred.is_finished === 1 || String(pred.status).toLowerCase() === 'finished'
                          ? 'badge-won'
                          : 'badge-refunded'
                      }`}>
                        {pred.is_live === 1 || String(pred.status).toLowerCase() === 'live' ? 'En Direct' : ''}
                        {pred.is_finished === 1 || String(pred.status).toLowerCase() === 'finished' ? 'Terminé' : ''}
                        {!(pred.is_live === 1 || String(pred.status).toLowerCase() === 'live') && !(pred.is_finished === 1 || String(pred.status).toLowerCase() === 'finished') ? 'À venir' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Teams and score */}
                  <h4 style={{ fontSize: '16px', fontFamily: 'Outfit', lineHeight: 1.3, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {pred.home_logo ? (
                      <img src={pred.home_logo} alt="" style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'contain', background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--bg-tertiary)', flexShrink: 0 }} />
                    )}
                    <span>{pred.home_team}</span>
                  </h4>
                  <h4 style={{ fontSize: '16px', fontFamily: 'Outfit', lineHeight: 1.3, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {pred.away_logo ? (
                      <img src={pred.away_logo} alt="" style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'contain', background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--bg-tertiary)', flexShrink: 0 }} />
                    )}
                    <span>{pred.away_team}</span>
                  </h4>

                  {/* Score & Corners */}
                  {(pred.score || (pred.first_half_corners_home !== null && pred.first_half_corners_away !== null)) && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '8px 0', flexWrap: 'wrap' }}>
                      {pred.score && (
                        <div style={{ background: 'var(--bg-tertiary)', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', fontWeight: 700 }}>
                          Score: {pred.score}
                        </div>
                      )}
                      {pred.first_half_corners_home !== null && pred.first_half_corners_away !== null && (
                        <div style={{ 
                          background: 'rgba(16, 185, 129, 0.08)', 
                          border: '1px solid rgba(16, 185, 129, 0.2)', 
                          padding: '6px 12px', 
                          borderRadius: '4px', 
                          fontSize: '12px', 
                          fontWeight: 700, 
                          color: 'var(--color-success)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 500 }}>Corners 1MT:</span>
                          {pred.first_half_corners_home} - {pred.first_half_corners_away}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Team Averages */}
                {((pred.home_avg_first_half_corners !== undefined && pred.home_avg_first_half_corners !== null) || 
                  (pred.away_avg_first_half_corners !== undefined && pred.away_avg_first_half_corners !== null) ||
                  (pred.h2h_avg_first_half_corners !== undefined && pred.h2h_avg_first_half_corners !== null)) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '8px 0 14px 0', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.015)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                      Statistiques Corners 1MT
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Moyennes Dom. / Ext. :</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        <strong style={{ color: 'var(--color-accent-solid)' }}>{pred.home_avg_first_half_corners !== null ? pred.home_avg_first_half_corners : '-'}</strong>
                        <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>/</span>
                        <strong style={{ color: 'var(--color-accent-solid)' }}>{pred.away_avg_first_half_corners !== null ? pred.away_avg_first_half_corners : '-'}</strong>
                      </span>
                    </div>

                    {pred.h2h_avg_first_half_corners !== null && pred.h2h_avg_first_half_corners !== undefined && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.02)', paddingTop: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Confrontations H2H (Moyenne) :</span>
                        <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                          {pred.h2h_avg_first_half_corners}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Odds & Value Bets */}
                {pred.odds_corners && pred.odds_corners.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '8px 0 14px 0', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.015)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Cotes & Value Bets Corners</span>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Oddschecker</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {pred.odds_corners.map((o, idx) => {
                        const hasOverValue = o.over_value_bet;
                        const hasUnderValue = o.under_value_bet;
                        
                        if (!o.over_decimal && !o.under_decimal) return null;
                        
                        return (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '3px', borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.03)' : 'none', paddingTop: idx > 0 ? '5px' : '0' }}>
                            {o.over_decimal && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', padding: '2px 6px', borderRadius: '4px', background: hasOverValue ? 'rgba(16, 185, 129, 0.06)' : 'transparent', border: hasOverValue ? '1px dashed rgba(16, 185, 129, 0.2)' : 'none' }}>
                                <span style={{ color: hasOverValue ? 'var(--color-success)' : 'var(--text-secondary)', fontWeight: hasOverValue ? 700 : 500 }}>
                                  Plus de {o.line} {o.market_type === '1st_half' ? '(1MT)' : '(Fin)'}
                                </span>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{o.over_decimal}</span>
                                  {hasOverValue && (
                                    <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: '10px' }} title={`Cote Juste : ${o.over_fair_odds} (${o.over_probability})`}>
                                      +{o.over_value_edge}%
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {o.under_decimal && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', padding: '2px 6px', borderRadius: '4px', background: hasUnderValue ? 'rgba(16, 185, 129, 0.06)' : 'transparent', border: hasUnderValue ? '1px dashed rgba(16, 185, 129, 0.2)' : 'none' }}>
                                <span style={{ color: hasUnderValue ? 'var(--color-success)' : 'var(--text-secondary)', fontWeight: hasUnderValue ? 700 : 500 }}>
                                  Moins de {o.line} {o.market_type === '1st_half' ? '(1MT)' : '(Fin)'}
                                </span>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{o.under_decimal}</span>
                                  {hasUnderValue && (
                                    <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: '10px' }} title={`Cote Juste : ${o.under_fair_odds} (${o.under_probability})`}>
                                      +{o.under_value_edge}%
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Match Metadata */}
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', alignItems: 'center' }}>
                  {pred.date && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} style={{ opacity: 0.6 }} />
                      {pred.date}
                    </span>
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-muted)', display: 'inline-block', opacity: 0.4 }}></span>
                    {pred.time}
                  </span>
                </div>


              {/* Recommendation card bottom */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Conseil:</span>
                  <span style={{ fontWeight: 700, fontFamily: 'Outfit', color: 'var(--text-primary)' }}>
                    {pred.best_tip} {pred.card_line}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Probabilité:</span>
                  <span className={isHighProb ? 'prob-high' : 'prob-medium'}>
                    {pred.probability}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Cotes (O/U):</span>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>
                    {pred.over_odds} / {pred.under_odds}
                  </span>
                </div>

                {pred.win_rate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Taux Réussite Hist:</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {pred.win_rate}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button 
                className="btn btn-primary" 
                style={{ width: '100%' }}
                onClick={(e) => { e.stopPropagation(); handleQuickPlaceBet(pred); }}
                disabled={pred.is_finished === 1}
              >
                <Plus size={16} />
                <span>Placer ce Pari</span>
              </button>
            </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <AlertCircle size={36} style={{ marginBottom: '12px' }} />
          <p>Aucune prédiction de cartons trouvée correspondante aux critères.</p>
          <p style={{ fontSize: '13px', marginTop: '8px' }}>Activez le scraper ci-dessus pour récupérer des matchs en direct depuis Match en Direct.</p>
        </div>
      )}
    </div>
  );
}
