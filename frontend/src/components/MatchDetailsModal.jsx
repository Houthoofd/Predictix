import React from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  poissonUnder,
  poissonOver,
  getMetricTitle as getPoissonMetricTitle,
  getAverage as getPoissonAverage,
  getOutcomeIndicator
} from '../utils/poissonUtils';

import MatchDetailsDashboard from './MatchDetailsDashboard';
import MatchDetailsStatsTab from './MatchDetailsStatsTab';
import MatchDetailsPoissonSimulator from './MatchDetailsPoissonSimulator';
import MatchDetailsHistoryList from './MatchDetailsHistoryList';

export default function MatchDetailsModal({
  selectedMatchDetails,
  setSelectedMatchDetails,
  crawlLoading,
  handleCrawlHistory,
  handleQuickPlaceBet
}) {
  React.useEffect(() => {
    if (selectedMatchDetails) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = originalStyle; };
    }
  }, [selectedMatchDetails]);

  const [activeMetric, setActiveMetric] = React.useState('dashboard');
  const [showValueBetsPanel, setShowValueBetsPanel] = React.useState(false);
  const tabsRef = React.useRef(null);

  const getMetricTitle = (key) => {
    const sport = selectedMatchDetails?.sport || 'football';
    return key === 'corners' ? 'Corners 1MT' : getPoissonMetricTitle(key, sport);
  };

  const getAverage = React.useCallback((matches, metric, isHomeOnly = false, isAwayOnly = false) => {
    return getPoissonAverage(
      matches,
      metric,
      isHomeOnly,
      isAwayOnly,
      selectedMatchDetails?.home_team || '',
      selectedMatchDetails?.away_team || ''
    );
  }, [selectedMatchDetails]);

  const scrollTabs = (direction) => {
    if (tabsRef.current) {
      tabsRef.current.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
    }
  };

  const availableMetrics = React.useMemo(() => {
    const isFootball = (selectedMatchDetails?.sport || 'football') === 'football';
    const metrics = new Set(['dashboard', 'goals']);
    if (isFootball) metrics.add('corners');
    if (!selectedMatchDetails) return Array.from(metrics);
    
    const allMatches = [
      selectedMatchDetails,
      ...(selectedMatchDetails.recent_h2h_matches || []),
      ...(selectedMatchDetails.recent_home_matches || []),
      ...(selectedMatchDetails.recent_away_matches || [])
    ];
    
    for (const m of allMatches) {
      if (m.statistics_json) {
        try {
          const stats = typeof m.statistics_json === 'string' ? JSON.parse(m.statistics_json) : m.statistics_json;
          if (stats && typeof stats === 'object') {
            Object.keys(stats).forEach(key => {
              if (stats[key] && (stats[key].home !== undefined || stats[key].away !== undefined)) {
                metrics.add(key);
              }
            });
          }
        } catch (e) {}
      }
    }
    
    const orderedKeys = [
      'dashboard', 'goals', 'corners', 'possession', 'xg_buts_attendus', 'shots_on_target', 'shots', 'fouls', 'yellow_cards', 'red_cards', 'passes', 'passes_reussis', 'tacles_reussis', 'dribbles_reussis', 'duels_reussis', 'duels_aeriens_reussis', 'ballons_touches_dans_la_surface_adverse', 'centres', 'centres_reussis', 'degagements', 'rentree_de_touche', 'occasions_manquees', 'poteau'
    ];
    
    return Array.from(metrics).sort((a, b) => {
      const idxA = orderedKeys.indexOf(a);
      const idxB = orderedKeys.indexOf(b);
      return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
    });
  }, [selectedMatchDetails]);

  const valueBetsList = React.useMemo(() => {
    if (!selectedMatchDetails) return [];
    const list = [];
    const popularMarkets = ['goals', 'corners', 'fouls', 'yellow_cards', 'red_cards', 'shots_on_target', 'shots', 'offsides'];
    const metricsToScan = availableMetrics.filter(m => popularMarkets.includes(m));
    
    for (const m of metricsToScan) {
      const homeAvg = getAverage(selectedMatchDetails.recent_home_matches, m, true);
      const awayAvg = getAverage(selectedMatchDetails.recent_away_matches, m, false, true);
      
      if (homeAvg !== null && awayAvg !== null) {
        const lambda = homeAvg + awayAvg;
        const startK = Math.max(0, Math.floor(lambda) - 4);
        const endK = Math.ceil(lambda) + 4;
        
        for (let k = startK; k <= endK; k++) {
          const line = k + 0.5;
          const overProb = poissonOver(lambda, line);
          const underProb = poissonUnder(lambda, line);
          
          if (overProb >= 0.53 && overProb <= 0.70) {
            list.push({ metric: m, metricTitle: getMetricTitle(m), line, tip: 'Plus de', probability: Math.round(overProb * 100), fairOdds: 1 / overProb });
          }
          if (underProb >= 0.53 && underProb <= 0.70) {
            list.push({ metric: m, metricTitle: getMetricTitle(m), line, tip: 'Moins de', probability: Math.round(underProb * 100), fairOdds: 1 / underProb });
          }
        }
      }
    }
    return list.sort((a, b) => b.probability - a.probability);
  }, [selectedMatchDetails, availableMetrics, getAverage]);

  React.useEffect(() => {
    if (selectedMatchDetails?.metric && availableMetrics.includes(selectedMatchDetails.metric)) {
      setActiveMetric(selectedMatchDetails.metric);
    } else {
      setActiveMetric('dashboard');
    }
  }, [selectedMatchDetails, availableMetrics]);

  if (!selectedMatchDetails) return null;

  const metricUnit = activeMetric === 'possession' ? '%' : '';
  const metricTitle = getMetricTitle(activeMetric);

  return (
    <div className="modal-overlay" onClick={() => setSelectedMatchDetails(null)}>
      <div className="modal-content glass-card" style={{ maxWidth: '650px', width: '90%', padding: '26px 32px', maxHeight: '85vh', overflowY: 'auto', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)' }} onClick={(e) => e.stopPropagation()}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '16px', position: 'relative', background: 'radial-gradient(circle at 35% 50%, rgba(9, 132, 227, 0.05) 0%, transparent 60%)' }}>
          <div>
            <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(255,255,255,0.03)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.02)' }}>
              {selectedMatchDetails.tournament || 'Football'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
              {selectedMatchDetails.home_logo ? (
                <img src={selectedMatchDetails.home_logo} alt="" referrerPolicy="no-referrer" style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'contain', background: 'rgba(255,255,255,0.02)', padding: '2px', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.06))', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--bg-tertiary)', flexShrink: 0 }} />
              )}
              <h3 style={{ fontSize: '19px', fontFamily: 'Outfit', color: 'var(--text-primary)', margin: 0, fontWeight: 800, letterSpacing: '-0.02em' }}>
                {selectedMatchDetails.home_team}
              </h3>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'Outfit', fontWeight: 800, background: 'rgba(255,255,255,0.04)', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>vs</span>
              {selectedMatchDetails.away_logo ? (
                <img src={selectedMatchDetails.away_logo} alt="" referrerPolicy="no-referrer" style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'contain', background: 'rgba(255,255,255,0.02)', padding: '2px', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.06))', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--bg-tertiary)', flexShrink: 0 }} />
              )}
              <h3 style={{ fontSize: '19px', fontFamily: 'Outfit', color: 'var(--text-primary)', margin: 0, fontWeight: 800, letterSpacing: '-0.02em' }}>
                {selectedMatchDetails.away_team}
              </h3>
            </div>
          </div>
          <button className="modal-close" onClick={() => setSelectedMatchDetails(null)} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
            <X size={15} />
          </button>
        </div>

        {valueBetsList.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
            <button 
              onClick={() => setShowValueBetsPanel(!showValueBetsPanel)}
              style={{
                background: showValueBetsPanel ? 'linear-gradient(135deg, #bf5af2 0%, var(--color-accent-solid) 100%)' : 'rgba(191, 90, 242, 0.08)',
                border: showValueBetsPanel ? '1px solid rgba(191, 90, 242, 0.3)' : '1px solid rgba(191, 90, 242, 0.25)',
                color: showValueBetsPanel ? '#fff' : '#bf5af2',
                padding: '8px 16px', borderRadius: '8px', fontSize: '11px', fontFamily: 'Outfit', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: showValueBetsPanel ? '0 4px 15px rgba(191, 90, 242, 0.25)' : 'none', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', textTransform: 'uppercase', letterSpacing: '0.04em'
              }}
            >
              <span>{showValueBetsPanel ? 'Masquer les Value Bets' : `Voir les Meilleurs Value Bets (${valueBetsList.length})`}</span>
            </button>
          </div>
        )}

        {showValueBetsPanel && valueBetsList.length > 0 && (
          <div style={{ background: 'linear-gradient(135deg, rgba(191, 90, 242, 0.08) 0%, rgba(9, 132, 227, 0.02) 100%)', border: '1px solid rgba(191, 90, 242, 0.2)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', boxShadow: '0 8px 32px rgba(191, 90, 242, 0.08)' }}>
            <h4 style={{ fontSize: '11.5px', fontFamily: 'Outfit', fontWeight: 800, color: '#bf5af2', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <span>MEILLEURES OPPORTUNITÉS DE VALUE BETS DÉTECTÉES</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {valueBetsList.map((bet, idx) => {
                const isOver = bet.tip === 'Plus de';
                return (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.03)', borderRadius: '8px', padding: '10px 14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>{bet.metricTitle}</span>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Seuil : <strong>{bet.line}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: isOver ? 'var(--color-success)' : '#bf5af2', background: isOver ? 'rgba(16, 185, 129, 0.1)' : 'rgba(191, 90, 242, 0.1)', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>{bet.tip} {bet.line}</span>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Probabilité : <strong>{bet.probability}%</strong></div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '90px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>Cote Juste : <span style={{ color: isOver ? 'var(--color-success)' : '#bf5af2' }}>{bet.fairOdds.toFixed(2)}</span></div>
                        <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginTop: '2px' }}>Cote min. : {(bet.fairOdds * 1.05).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {availableMetrics.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)', padding: '4px' }}>
            <button onClick={() => scrollTabs('left')} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', marginRight: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={14} />
            </button>
            <div ref={tabsRef} style={{ display: 'flex', gap: '4px', overflowX: 'auto', scrollBehavior: 'smooth', width: '100%', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {availableMetrics.map(m => {
                const labels = {
                  dashboard: 'Résumé', goals: 'Buts / Points', corners: 'Corners 1MT', fouls: 'Fautes Commises', yellow_cards: 'Jaunes', red_cards: 'Rouges', possession: 'Possession', shots_on_target: 'Tirs Cad.', shots: 'Tirs Glob.', offsides: 'Hors-jeu', xg_buts_attendus: 'xG', passes: 'Passes', passes_reussis: 'Passes %', tacles_reussis: 'Tacles', dribbles_reussis: 'Dribbles', duels_reussis: 'Duels', duels_aeriens_reussis: 'Duels Aériens', ballons_touches_dans_la_surface_adverse: 'Surf. Adverse', centres: 'Centres', centres_reussis: 'Centres %', degagements: 'Dégagements', rentree_de_touche: 'Touches', occasions_manquees: 'Occ. Manquées', poteau: 'Poteau'
                };
                const label = labels[m] || m.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                const isActive = activeMetric === m;
                return (
                  <button key={m} onClick={() => setActiveMetric(m)} style={{ flex: '0 0 auto', padding: '6px 12px', borderRadius: '6px', border: 'none', background: isActive ? 'var(--color-accent-solid)' : 'transparent', color: isActive ? '#fff' : 'var(--text-secondary)', fontSize: '10px', fontFamily: 'Outfit', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</button>
                );
              })}
            </div>
            <button onClick={() => scrollTabs('right')} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', marginLeft: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {activeMetric === 'dashboard' ? (
          <MatchDetailsDashboard selectedMatchDetails={selectedMatchDetails} availableMetrics={availableMetrics} getAverage={getAverage} getMetricTitle={getMetricTitle} />
        ) : (
          <MatchDetailsStatsTab selectedMatchDetails={selectedMatchDetails} activeMetric={activeMetric} metricTitle={metricTitle} metricUnit={metricUnit} getAverage={getAverage} />
        )}

        {activeMetric !== 'dashboard' && activeMetric !== 'possession' && activeMetric !== 'passes_reussis' && (
          <MatchDetailsPoissonSimulator selectedMatchDetails={selectedMatchDetails} activeMetric={activeMetric} metricTitle={metricTitle} handleQuickPlaceBet={handleQuickPlaceBet} setSelectedMatchDetails={setSelectedMatchDetails} getAverage={getAverage} getMetricTitle={getMetricTitle} />
        )}

        <MatchDetailsHistoryList selectedMatchDetails={selectedMatchDetails} crawlLoading={crawlLoading} handleCrawlHistory={handleCrawlHistory} activeMetric={activeMetric} getOutcomeIndicator={getOutcomeIndicator} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', marginTop: '24px', paddingTop: '16px' }}>
          <button className="btn btn-secondary" onClick={() => setSelectedMatchDetails(null)}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
