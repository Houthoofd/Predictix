import React from 'react';
import { 
  RefreshCcw, 
  Terminal,
  Search, 
  Calendar, 
  AlertCircle, 
  Plus,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

const countryToFlagCode = {
  'belgique': 'be',
  'espagne': 'es',
  'france': 'fr',
  'suède': 'se',
  'suede': 'se',
  'angleterre': 'gb-eng',
  'italie': 'it',
  'allemagne': 'de',
  'norvège': 'no',
  'norvege': 'no',
  'finlande': 'fi',
  'portugal': 'pt',
  'turquie': 'tr',
  'congo': 'cd',
  'tunisie': 'tn',
  'algérie': 'dz',
  'algerie': 'dz',
  'maroc': 'ma',
  'brésil': 'br',
  'bresil': 'br',
  'mexique': 'mx',
  'pays-bas': 'nl',
  'pays bas': 'nl',
  'argentine': 'ar',
  'autriche': 'at',
  'suisse': 'ch',
  'danemark': 'dk',
  'ecosse': 'gb-sct',
  'grèce': 'gr',
  'grece': 'gr',
  'croatie': 'hr',
  'hongrie': 'hu',
  'irlande': 'ie',
  'pologne': 'pl',
  'roumanie': 'ro',
  'ukraine': 'ua',
  'uruguay': 'uy',
  'colombie': 'co',
  'chili': 'cl',
  'usa': 'us',
  'états-unis': 'us',
  'etats-unis': 'us',
  'japon': 'jp',
  'chine': 'cn',
  'corée': 'kr',
  'australie': 'au',
  'monde': 'un',
  'europe': 'eu',
  'international': 'un'
};

const getFlagUrl = (tour) => {
  if (!tour) return null;
  const normalized = tour.toLowerCase();
  
  let country = '';
  if (tour.includes(':')) {
    country = tour.split(':')[0].trim().toLowerCase();
  }
  
  let code = null;
  if (country && countryToFlagCode[country]) {
    code = countryToFlagCode[country];
  } else {
    const match = Object.keys(countryToFlagCode).find(k => normalized.includes(k));
    if (match) {
      code = countryToFlagCode[match];
    }
  }
  
  if (code) {
    return `https://flagcdn.com/w40/${code}.png`;
  }
  return `https://flagcdn.com/w40/un.png`;
};

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
  handleStopScraping,
  handleTriggerScraping,
  handleStartDetailedScraping,
  consoleEndRef,

  // Predictions-related props
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
  handleQuickPlaceBet,
  stats
}) {
  const [collapsedLeagues, setCollapsedLeagues] = React.useState({});

  const toggleLeague = (leagueName) => {
    setCollapsedLeagues(prev => ({
      ...prev,
      [leagueName]: !prev[leagueName]
    }));
  };

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
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Limite :</span>
              <input 
                type="number" 
                min="1" 
                max="100" 
                style={{ width: '45px', border: 'none', background: 'transparent', color: 'var(--text-primary)', fontWeight: 700, textAlign: 'center', outline: 'none', padding: '0' }} 
                value={scrapeLimit}
                onChange={(e) => setScrapeLimit(Math.max(1, parseInt(e.target.value) || 30))}
                disabled={scraping}
              />
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>matchs</span>
            </div>
            
            {!scraping ? (
              <>
                <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px' }} onClick={handleStartDetailedScraping}>
                  <RefreshCcw size={15} />
                  <span>Crawl Profond H2H (Tor)</span>
                </button>
                
                <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px' }} onClick={handleTriggerScraping}>
                  <RefreshCcw size={15} />
                  <span>Démarrer Scraper Rapide</span>
                </button>
              </>
            ) : (
              <button className="btn btn-danger" style={{ height: '36px' }} onClick={handleStopScraping}>
                Arrêter le Scraper
              </button>
            )}
          </div>
        </div>

        {/* Live Scraper Progress Bar */}
        {scraping && (
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-accent-solid)' }}>
                {scrapePhase}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                {scrapeTimeRemaining ? `Temps restant estimé : ${scrapeTimeRemaining}` : 'Calcul du temps...'}
              </span>
            </div>
            
            {/* Main Progress Bar */}
            <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${scrapeProgress}%`, height: '100%', background: 'var(--grad-accent)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              <span>Scraping en cours : {scrapeProgress}% effectué</span>
              {matchesRemaining !== null && (
                <span>{matchesRemaining} matchs restants</span>
              )}
            </div>

            {/* Deep crawl sub-progress */}
            {totalPrimary > 0 && (
              <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: 'var(--text-secondary)', padding: '8px 12px', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)', marginTop: '8px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>Découverte :</span> {currentPrimary} / {totalPrimary}
                </div>
                {totalDeep > 0 && (
                  <div>
                    <span style={{ fontWeight: 600 }}>Crawl H2H Tor :</span> {currentDeep} / {totalDeep}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Live Console Output Log Streamer */}
        {scraperLogs.length > 0 && (
          <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
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

      {/* ========================================================================
         PRONOSTICS / MATCHS DECOUVERTS SECTION
         ======================================================================== */}
      <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', fontWeight: 700 }}>
              Pronostics Corners de la Session
            </h3>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              {filteredPredictions.length} match{filteredPredictions.length > 1 ? 's' : ''} analysé{filteredPredictions.length > 1 ? 's' : ''}
            </span>
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

              {/* Toggle High Probability Only */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                <input 
                  type="checkbox" 
                  checked={predHighProbOnly}
                  onChange={(e) => setPredHighProbOnly(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ color: 'var(--color-accent-solid)' }}>
                  Haute Confiance (≥60%)
                </span>
              </label>

              {/* Search bar */}
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Rechercher une équipe..." 
                  className="form-control"
                  style={{ paddingLeft: '32px', height: '36px', fontSize: '13px', width: '100%' }}
                  value={predSearch}
                  onChange={(e) => setPredSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Grouped Predictions matches */}
          {filteredPredictions.length > 0 ? (
            (() => {
              // Group predictions by tournament
              const groups = {};
              filteredPredictions.forEach(pred => {
                const league = pred.tournament || 'Football';
                if (!groups[league]) groups[league] = [];
                groups[league].push(pred);
              });

              return Object.keys(groups).map((leagueName, lIdx) => {
                const leaguePredictions = groups[leagueName];
                const groupFlagUrl = getFlagUrl(leagueName);
                const isCollapsed = !!collapsedLeagues[leagueName];

                return (
                  <div key={lIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: isCollapsed ? '2px' : '8px' }}>
                    
                    {/* Collapsible League Header */}
                    <div 
                      onClick={() => toggleLeague(leagueName)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        padding: '6px 12px', 
                        background: isCollapsed ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.025)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '4px',
                        fontFamily: 'Outfit',
                        fontWeight: 700,
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isCollapsed ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.025)';
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                      }}
                    >
                      {isCollapsed ? (
                        <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                      ) : (
                        <ChevronDown size={18} style={{ color: 'var(--color-accent-solid)' }} />
                      )}
                      
                      {groupFlagUrl && (
                        <img 
                          src={groupFlagUrl} 
                          alt="" 
                          style={{ width: '18px', height: '13px', objectFit: 'cover', borderRadius: '1.5px', border: '1px solid rgba(255,255,255,0.1)' }} 
                        />
                      )}
                      <span>{leagueName}</span>
                      
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, marginLeft: 'auto', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '10px' }}>
                        {leaguePredictions.length} match{leaguePredictions.length > 1 ? 'es' : ''}
                      </span>
                    </div>

                    {/* Matches Grid for this League (hidden if collapsed) */}
                    {!isCollapsed && (
                      <div className="grid-3" style={{ animation: 'fadeIn 0.25s ease-out' }}>
                        {leaguePredictions.map((pred) => {
                          const probVal = parseInt(pred.probability.replace('%', ''));
                          const isHighProb = !isNaN(probVal) && probVal >= 60;
                          
                          // Calculate if this prediction itself is a Model-based Value Bet
                          let isModelValueBet = false;
                          let modelValueEdge = 0;
                          let parsedProb = 0;
                          let parsedOdds = 0;
                          
                          const tipLower = String(pred.best_tip).toLowerCase();
                          const isOver = tipLower.includes('plus') || tipLower.includes('over');
                          const isUnder = tipLower.includes('moins') || tipLower.includes('under');
                          
                          // Find the estimated odds for the card_line (e.g. 4.5)
                          const cardLineVal = parseFloat(pred.card_line);
                          const matchingRow = pred.odds_corners ? pred.odds_corners.find(o => 
                            o.market_type === '1st_half' && parseFloat(o.line) === cardLineVal
                          ) : null;
                          const estimatedOddsVal = matchingRow 
                            ? (isOver ? matchingRow.over_decimal : matchingRow.under_decimal) 
                            : null;
                          
                          if (matchingRow) {
                            if (isOver) {
                              isModelValueBet = matchingRow.over_value_bet;
                              modelValueEdge = matchingRow.over_value_edge;
                              parsedProb = parseInt(String(matchingRow.over_probability).replace('%', ''), 10);
                              parsedOdds = matchingRow.over_decimal;
                            } else if (isUnder) {
                              isModelValueBet = matchingRow.under_value_bet;
                              modelValueEdge = matchingRow.under_value_edge;
                              parsedProb = parseInt(String(matchingRow.under_probability).replace('%', ''), 10);
                              parsedOdds = matchingRow.under_decimal;
                            }
                          }
                          
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
                                    ? '1px solid rgba(16, 185, 129, 0.35)' 
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
                              <div>
                                {/* Header metadata */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
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
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      {groupFlagUrl && (
                                        <img 
                                          src={groupFlagUrl} 
                                          alt="" 
                                          style={{ width: '16px', height: '12px', objectFit: 'cover', borderRadius: '1.5px', border: '1px solid rgba(255,255,255,0.08)' }} 
                                        />
                                      )}
                                      <span>{pred.tournament || 'Football'}</span>
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
                                    <img src={pred.home_logo} alt="" referrerPolicy="no-referrer" style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'contain', background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />
                                  ) : (
                                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--bg-tertiary)', flexShrink: 0 }} />
                                  )}
                                  <span>{pred.home_team}</span>
                                </h4>
                                <h4 style={{ fontSize: '16px', fontFamily: 'Outfit', lineHeight: 1.3, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {pred.away_logo ? (
                                    <img src={pred.away_logo} alt="" referrerPolicy="no-referrer" style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'contain', background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />
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

                                {/* Team Averages */}
                                {((pred.home_avg_first_half_corners !== undefined && pred.home_avg_first_half_corners !== null) || 
                                  (pred.away_avg_first_half_corners !== undefined && pred.away_avg_first_half_corners !== null) ||
                                  (pred.h2h_avg_first_half_corners !== undefined && pred.h2h_avg_first_half_corners !== null)) && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '8px 0 14px 0', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.015)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                                      Statistiques Corners 1MT
                                    </div>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center' }}>
                                      <span style={{ color: 'var(--text-secondary)' }}>Moyennes Dom. / Ext. (Ajustées) :</span>
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
                                      {(() => {
                                        const wantOver = tipLower.includes('plus') || tipLower.includes('over');
                                        const wantUnder = tipLower.includes('moins') || tipLower.includes('under');
                                        const predLine = parseFloat(pred.card_line);

                                        let filtered = pred.odds_corners.filter(o => 
                                          o.market_type === '1st_half' && parseFloat(o.line) === predLine
                                        );

                                        if (filtered.length === 0) {
                                          filtered = pred.odds_corners.filter(o => o.market_type === '1st_half');
                                        }

                                        if (filtered.length === 0) {
                                          filtered = pred.odds_corners.filter(o => parseFloat(o.line) === predLine);
                                        }

                                        if (filtered.length === 0) {
                                          filtered = pred.odds_corners;
                                        }

                                        const displayable = filtered.filter(o => 
                                          (wantOver && o.over_decimal) || (wantUnder && o.under_decimal)
                                        );

                                        if (displayable.length === 0) {
                                          return (
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '4px 0' }}>
                                              Cote non ouverte sur Oddschecker
                                            </div>
                                          );
                                        }

                                        return displayable.map((o, idx) => {
                                          const hasOverValue = o.over_value_bet;
                                          const hasUnderValue = o.under_value_bet;

                                          return (
                                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '3px', borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.03)' : 'none', paddingTop: idx > 0 ? '5px' : '0' }}>
                                              {wantOver && o.over_decimal && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', padding: '4px 6px', borderRadius: '4px', background: hasOverValue ? 'rgba(16, 185, 129, 0.06)' : 'transparent', border: hasOverValue ? '1px dashed rgba(16, 185, 129, 0.2)' : 'none' }}>
                                                  <span style={{ color: hasOverValue ? 'var(--color-success)' : 'var(--text-secondary)', fontWeight: hasOverValue ? 700 : 500, display: 'flex', alignItems: 'center' }}>
                                                    Plus de {o.line} {o.market_type === '1st_half' ? '(1MT)' : '(Fin)'}
                                                    {o.is_estimated && (
                                                      <span style={{ fontSize: '9.5px', color: 'var(--color-accent-solid)', marginLeft: '4px', opacity: 0.8, cursor: 'help', textDecoration: 'underline dotted' }} title="Cote estimee via loi de Poisson a partir des cotes Temps Complet d'Oddschecker">
                                                        (est.)
                                                      </span>
                                                    )}
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

                                              {wantUnder && o.under_decimal && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', padding: '4px 6px', borderRadius: '4px', background: hasUnderValue ? 'rgba(16, 185, 129, 0.06)' : 'transparent', border: hasUnderValue ? '1px dashed rgba(16, 185, 129, 0.2)' : 'none' }}>
                                                  <span style={{ color: hasUnderValue ? 'var(--color-success)' : 'var(--text-secondary)', fontWeight: hasUnderValue ? 700 : 500, display: 'flex', alignItems: 'center' }}>
                                                    Moins de {o.line} {o.market_type === '1st_half' ? '(1MT)' : '(Fin)'}
                                                    {o.is_estimated && (
                                                      <span style={{ fontSize: '9.5px', color: 'var(--color-accent-solid)', marginLeft: '4px', opacity: 0.8, cursor: 'help', textDecoration: 'underline dotted' }} title="Cote estimee via loi de Poisson a partir des cotes Temps Complet d'Oddschecker">
                                                        (est.)
                                                      </span>
                                                    )}
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
                                        });
                                      })()}
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
                              </div>

                              {/* Recommendation card bottom */}
                              <div style={{ 
                                background: isModelValueBet 
                                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.015) 100%)' 
                                  : 'var(--bg-tertiary)', 
                                padding: '16px', 
                                borderRadius: '10px', 
                                border: isModelValueBet 
                                  ? '1px solid rgba(16, 185, 129, 0.25)' 
                                  : '1px solid var(--border-color)',
                                boxShadow: isModelValueBet 
                                  ? '0 4px 12px rgba(16, 185, 129, 0.04)' 
                                  : 'none',
                                position: 'relative',
                                overflow: 'hidden'
                              }}>
                                {isModelValueBet && (
                                  <div style={{ 
                                    fontSize: '9.5px', 
                                    color: 'var(--color-success)', 
                                    fontWeight: 800, 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '0.08em', 
                                    marginBottom: '10px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '5px' 
                                  }}>
                                    <span style={{ 
                                      width: '6px', 
                                      height: '6px', 
                                      borderRadius: '50%', 
                                      background: 'var(--color-success)', 
                                      display: 'inline-block',
                                      boxShadow: '0 0 8px var(--color-success)'
                                    }}></span>
                                    VALUE BET DÉTECTÉ (+{modelValueEdge}% EDGE)
                                  </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Conseil:</span>
                                  <span style={{ 
                                    fontWeight: 800, 
                                    fontFamily: 'Outfit', 
                                    color: isModelValueBet ? 'var(--color-success)' : 'var(--text-primary)' 
                                  }}>
                                    {pred.best_tip} {pred.card_line}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Probabilité:</span>
                                  <span className={isHighProb ? 'prob-high' : 'prob-medium'} style={{ 
                                    fontWeight: isModelValueBet ? 800 : 600,
                                    color: isModelValueBet ? 'var(--color-success)' : undefined
                                  }}>
                                    {pred.probability}
                                  </span>
                                </div>

                                {/* Highly-visual Cote Bookmaker vs Cote Estimee comparison sub-card for Value Bets */}
                                {isModelValueBet && estimatedOddsVal ? (
                                  <div style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '6px', 
                                    padding: '10px 12px', 
                                    background: 'rgba(255, 255, 255, 0.015)', 
                                    borderRadius: '8px', 
                                    border: '1px solid rgba(16, 185, 129, 0.15)', 
                                    margin: '10px 0' 
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Cote Bookmaker :</span>
                                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-success)' }}>
                                        {isOver ? pred.over_odds : pred.under_odds}
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '5px' }}>
                                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Cote Estimée (Modèle) :</span>
                                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-accent-solid)' }}>
                                        {estimatedOddsVal} <span style={{ fontSize: '9px', opacity: 0.8, fontWeight: 500 }}>(est.)</span>
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Cotes (O/U):</span>
                                    <span style={{ fontSize: '12px', fontWeight: 600 }}>
                                      <span style={{ 
                                        color: isOver && isModelValueBet ? 'var(--color-success)' : 'var(--text-primary)', 
                                        fontWeight: isOver && isModelValueBet ? 800 : 600 
                                      }}>
                                        {pred.over_odds}
                                      </span>
                                      <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>/</span>
                                      <span style={{ 
                                        color: isUnder && isModelValueBet ? 'var(--color-success)' : 'var(--text-primary)', 
                                        fontWeight: isUnder && isModelValueBet ? 800 : 600 
                                      }}>
                                        {pred.under_odds}
                                      </span>
                                    </span>
                                  </div>
                                )}

                                {pred.win_rate && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Taux Réussite Hist:</span>
                                    <span style={{ 
                                      fontSize: '12px', 
                                      fontWeight: isModelValueBet ? 700 : 600, 
                                      color: isModelValueBet ? 'var(--color-success)' : 'var(--text-muted)' 
                                    }}>
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
                    )}
                  </div>
                );
              });
            })()
          ) : (
            <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <AlertCircle size={36} style={{ marginBottom: '12px' }} />
              <p>Aucune prédiction de corners trouvée correspondante aux critères.</p>
              <p style={{ fontSize: '13px', marginTop: '8px' }}>Activez le scraper ci-dessus pour récupérer et analyser en temps réel de nouvelles prédictions corners.</p>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
