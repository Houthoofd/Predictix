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
import { getConfidenceBadge } from '../utils/labels';

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

  const lookupOdds = (match) => {
    if (!match?.odds_corners) return null;
    try {
      const oddsList = typeof match.odds_corners === 'string'
        ? JSON.parse(match.odds_corners)
        : match.odds_corners;
      if (!Array.isArray(oddsList)) return null;

      const isBasket = match.sport === 'basketball';
      
      const getPeriodFromMetricLocal = (metric) => {
        const m = metric || '';
        const lineStr = (match.card_line || '').toLowerCase();
        
        if (isBasket) {
          if (m === 'first_half_points' || lineStr.includes('1ère mt') || lineStr.includes('mi-temps')) return 'first_half';
          if (m === 'goals' || lineStr.includes('match') || lineStr.includes('complet') || lineStr.includes('full')) return 'full_time';
          if (m === 'first_quarter_points' || lineStr.includes('1er qt') || lineStr.includes('quarter_1')) return 'quarter_1';
        }
        if (m === 'corners' || lineStr.includes('1mt') || lineStr.includes('1ère mt')) return 'first_half';
        return 'full_time';
      };

      const period = getPeriodFromMetricLocal(match.metric);
      const tip = match.best_tip;
      const line = match.card_line;

      if (tip === '1' || tip === '2' || tip === 'N') {
        const winner = oddsList.find(o => o.market_type === 'winner' || o.market_type === 'full_time');
        if (!winner) return null;
        if (tip === '1') return winner.home_odds;
        if (tip === '2') return winner.away_odds;
        if (tip === 'N') return winner.draw_odds;
      } else {
        const lineVal = typeof line === 'string' ? parseFloat(line) : line;
        const total = oddsList.find(o => o.market_type === 'totals' && o.period === period && parseFloat(o.line) === lineVal);
        if (!total) return null;
        if (tip === 'Plus de' || tip === 'Over') return total.over_odds;
        if (tip === 'Moins de' || tip === 'Under') return total.under_odds;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  };

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

    const absencesData = selectedMatchDetails?.absences || selectedMatchDetails?.absences_json;
    if (absencesData) {
      try {
        const absences = typeof absencesData === 'string'
          ? JSON.parse(absencesData)
          : absencesData;
        if (Array.isArray(absences) && absences.length > 0) {
          metrics.add('absences');
        }
      } catch (e) {}
    }

    const betfairData = selectedMatchDetails?.betfair_json;
    if (betfairData) {
      metrics.add('betfair');
    }
    
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
      'dashboard', 'betfair', 'absences', 'goals', 'corners', 'possession', 'xg_buts_attendus', 'shots_on_target', 'shots', 'fouls', 'yellow_cards', 'red_cards', 'passes', 'passes_reussis', 'tacles_reussis', 'dribbles_reussis', 'duels_reussis', 'duels_aeriens_reussis', 'ballons_touches_dans_la_surface_adverse', 'centres', 'centres_reussis', 'degagements', 'rentree_de_touche', 'occasions_manquees', 'poteau'
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

    // For basketball, scan 1XBet odds_corners for totals value bets
    if (selectedMatchDetails.sport === 'basketball') {
      const oddsList = selectedMatchDetails.odds_corners || [];
      const totalsOdds = oddsList.filter(o => o.market_type === 'totals');

      const q1Lambda = (selectedMatchDetails.home_avg_first_quarter_points || 0) + (selectedMatchDetails.away_avg_first_quarter_points || 0);
      const h1Lambda = (selectedMatchDetails.home_avg_first_half_points || 0) + (selectedMatchDetails.away_avg_first_half_points || 0);

      const periodLabels = {
        quarter_1: '1er Qt.',
        quarter_2: '2ème Qt.',
        quarter_3: '3ème Qt.',
        quarter_4: '4ème Qt.',
        first_half: '1ère MT',
        second_half: '2ème MT',
        full_time: 'Temps Réglementaire'
      };

      totalsOdds.forEach(t => {
        let lambda = 0;
        if (t.period === 'quarter_1' && q1Lambda > 0) {
          lambda = q1Lambda;
        } else if (t.period === 'first_half' && h1Lambda > 0) {
          lambda = h1Lambda;
        } else if (t.period === 'full_time' && h1Lambda > 0) {
          lambda = h1Lambda / 0.49;
        }

        if (lambda > 0) {
          const lineVal = parseFloat(t.line);
          const overProb = poissonOver(lambda, lineVal);
          const underProb = 1 - overProb;

          const overEV = t.over_odds * overProb - 1;
          const underEV = t.under_odds * underProb - 1;

          const pLabel = periodLabels[t.period] || t.period;

          if (overEV > 0.02) {
            list.push({
              metric: 'goals',
              metricTitle: `Total Points (${pLabel})`,
              line: lineVal,
              tip: 'Plus de',
              probability: Math.round(overProb * 100),
              fairOdds: 1 / (overProb || 0.01),
              bookmakerOdds: t.over_odds,
              ev: overEV
            });
          }
          if (underEV > 0.02) {
            list.push({
              metric: 'goals',
              metricTitle: `Total Points (${pLabel})`,
              line: lineVal,
              tip: 'Moins de',
              probability: Math.round(underProb * 100),
              fairOdds: 1 / (underProb || 0.01),
              bookmakerOdds: t.under_odds,
              ev: underEV
            });
          }
        }
      });

      return list.sort((a, b) => b.ev - a.ev);
    }

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

  const handlePlaceValueBet = (bet) => {
    if (!handleQuickPlaceBet || !selectedMatchDetails) return;
    
    const isOver = bet.tip === 'Plus de';
    const cleanLine = typeof bet.line === 'string' ? parseFloat(bet.line) : bet.line;
    const finalTip = isOver ? 'Plus de' : 'Moins de';
    
    const sport = selectedMatchDetails.sport || 'football';
    const lineSuffix = sport === 'basketball' ? ' Points' : '';
    const displayLine = `${cleanLine}${lineSuffix}`;

    let oddsVal = bet.bookmakerOdds;
    if (!oddsVal) {
      oddsVal = lookupOdds({
        ...selectedMatchDetails,
        metric: bet.metric,
        best_tip: finalTip,
        card_line: cleanLine
      });
    }
    const selectedOdds = oddsVal || 1.85;

    const pred = {
      match_id: selectedMatchDetails.match_id,
      date: selectedMatchDetails.date,
      time: selectedMatchDetails.time,
      tournament: selectedMatchDetails.tournament,
      home_team: selectedMatchDetails.home_team,
      away_team: selectedMatchDetails.away_team,
      best_tip: finalTip,
      card_line: displayLine,
      probability: `${bet.probability}%`,
      win_rate: 'N/A',
      over_odds: isOver ? selectedOdds : 1.85,
      under_odds: !isOver ? selectedOdds : 1.85,
      match_url: selectedMatchDetails.match_url || '',
      notes: `Value Bet Détecté - ${bet.metricTitle} : ${finalTip} ${cleanLine} (Cote 1XBet: ${selectedOdds ? parseFloat(selectedOdds).toFixed(2) : '-'}, Cote Juste: ${bet.fairOdds.toFixed(2)}${bet.ev !== undefined ? `, EV: +${(bet.ev * 100).toFixed(1)}%` : ''})`,
      sport: sport
    };

    handleQuickPlaceBet(pred);
    setSelectedMatchDetails(null);
  };

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

        {selectedMatchDetails?.best_tip && (() => {
          const conf = getConfidenceBadge(selectedMatchDetails.probability);
          return (
            <div style={{ 
              background: 'rgba(191, 90, 242, 0.05)', 
              border: '1px solid rgba(191, 90, 242, 0.22)',
              padding: '14px 18px', 
              borderRadius: '12px', 
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              boxShadow: '0 4px 20px rgba(191, 90, 242, 0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#bf5af2', textTransform: 'uppercase', letterSpacing: '0.08em' }}>CONSEIL DE L'ALGORITHME</span>
                  <span style={{ color: conf.color, fontSize: '8px', fontWeight: 800, background: conf.bg, padding: '2px 5px', borderRadius: '4px', border: conf.border, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {conf.label}
                  </span>
                </div>
                <span style={{ color: 'var(--color-success)', fontSize: '11px', fontWeight: 800, background: 'rgba(16, 185, 129, 0.08)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                  {selectedMatchDetails.probability || 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>
                  {selectedMatchDetails.best_tip} {selectedMatchDetails.card_line}
                </div>
                {(() => {
                  const oddsVal = lookupOdds(selectedMatchDetails);
                  if (!oddsVal) return null;
                  return (
                    <span style={{ color: 'var(--color-success)', fontSize: '11px', fontWeight: 800, background: 'rgba(16, 185, 129, 0.08)', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.15)' }} title="Cote Bookmaker 1XBet">
                      1XBet : {oddsVal}
                    </span>
                  );
                })()}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                L'algorithme Predictix estime une probabilité de <strong style={{ color: 'var(--color-success)' }}>{selectedMatchDetails.probability || 'N/A'}</strong> de voir <strong style={{ color: '#bf5af2' }}>{selectedMatchDetails.best_tip.toLowerCase()} {selectedMatchDetails.card_line}</strong>.
              </div>
            </div>
          );
        })()}

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
                  <div 
                    key={idx} 
                    onClick={() => handlePlaceValueBet(bet)}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      background: 'rgba(255, 255, 255, 0.02)', 
                      border: '1px solid rgba(255, 255, 255, 0.03)', 
                      borderRadius: '8px', 
                      padding: '10px 14px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s, border-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(191, 90, 242, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(191, 90, 242, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.03)';
                    }}
                    title="Cliquer pour ajouter ce Value Bet au panier de paris"
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>{bet.metricTitle}</span>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Seuil : <strong>{bet.line}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: isOver ? 'var(--color-success)' : '#bf5af2', background: isOver ? 'rgba(16, 185, 129, 0.1)' : 'rgba(191, 90, 242, 0.1)', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>{bet.tip} {bet.line}</span>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Probabilité : <strong>{bet.probability}%</strong></div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '105px' }}>
                        {bet.bookmakerOdds ? (
                          <>
                            <div style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--text-primary)' }}>1XBet : <span style={{ color: 'var(--color-success)' }}>{bet.bookmakerOdds.toFixed(2)}</span></div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '1px' }}>Cote Juste : {bet.fairOdds.toFixed(2)}</div>
                            {bet.ev !== undefined && (
                              <div style={{ fontSize: '10px', color: 'var(--color-success)', fontWeight: 800, marginTop: '2px' }}>EV : +{(bet.ev * 100).toFixed(1)}%</div>
                            )}
                          </>
                        ) : (
                          <>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>Cote Juste : <span style={{ color: isOver ? 'var(--color-success)' : '#bf5af2' }}>{bet.fairOdds.toFixed(2)}</span></div>
                            <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginTop: '2px' }}>Cote min. : {(bet.fairOdds * 1.05).toFixed(2)}</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedMatchDetails.sport === 'basketball' ? (
          <MatchDetailsDashboard selectedMatchDetails={selectedMatchDetails} availableMetrics={['goals']} getAverage={getAverage} getMetricTitle={getMetricTitle} />
        ) : (
          <>
            {availableMetrics.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)', padding: '4px' }}>
                <button onClick={() => scrollTabs('left')} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', marginRight: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronLeft size={14} />
                </button>
                <div ref={tabsRef} style={{ display: 'flex', gap: '4px', overflowX: 'auto', scrollBehavior: 'smooth', width: '100%', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {availableMetrics.map(m => {
                    const labels = {
                      dashboard: 'Résumé', betfair: 'Moneyway', absences: 'Absences', goals: 'Buts / Points', corners: 'Corners 1MT', fouls: 'Fautes Commises', yellow_cards: 'Jaunes', red_cards: 'Rouges', possession: 'Possession', shots_on_target: 'Tirs Cad.', shots: 'Tirs Glob.', offsides: 'Hors-jeu', xg_buts_attendus: 'xG', passes: 'Passes', passes_reussis: 'Passes %', tacles_reussis: 'Tacles', dribbles_reussis: 'Dribbles', duels_reussis: 'Duels', duels_aeriens_reussis: 'Duels Aériens', ballons_touches_dans_la_surface_adverse: 'Surf. Adverse', centres: 'Centres', centres_reussis: 'Centres %', degagements: 'Dégagements', rentree_de_touche: 'Touches', occasions_manquees: 'Occ. Manquées', poteau: 'Poteau'
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
            ) : activeMetric === 'betfair' ? (
              <MatchDetailsBetfairTab selectedMatchDetails={selectedMatchDetails} />
            ) : activeMetric === 'absences' ? (
              <MatchDetailsAbsencesTab selectedMatchDetails={selectedMatchDetails} />
            ) : (
              <MatchDetailsStatsTab selectedMatchDetails={selectedMatchDetails} activeMetric={activeMetric} metricTitle={metricTitle} metricUnit={metricUnit} getAverage={getAverage} />
            )}

            {activeMetric !== 'dashboard' && activeMetric !== 'betfair' && activeMetric !== 'absences' && activeMetric !== 'possession' && activeMetric !== 'passes_reussis' && (
              <MatchDetailsPoissonSimulator selectedMatchDetails={selectedMatchDetails} activeMetric={activeMetric} metricTitle={metricTitle} handleQuickPlaceBet={handleQuickPlaceBet} setSelectedMatchDetails={setSelectedMatchDetails} getAverage={getAverage} getMetricTitle={getMetricTitle} />
            )}
          </>
        )}

        <MatchDetailsHistoryList selectedMatchDetails={selectedMatchDetails} crawlLoading={crawlLoading} handleCrawlHistory={handleCrawlHistory} activeMetric={activeMetric} getOutcomeIndicator={getOutcomeIndicator} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', marginTop: '24px', paddingTop: '16px' }}>
          <button className="btn btn-secondary" onClick={() => setSelectedMatchDetails(null)}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

function MatchDetailsAbsencesTab({ selectedMatchDetails }) {
  const absences = React.useMemo(() => {
    if (selectedMatchDetails?.absences) return selectedMatchDetails.absences;
    if (!selectedMatchDetails?.absences_json) return [];
    try {
      return typeof selectedMatchDetails.absences_json === 'string'
        ? JSON.parse(selectedMatchDetails.absences_json)
        : selectedMatchDetails.absences_json;
    } catch (e) {
      return [];
    }
  }, [selectedMatchDetails]);

  const homeAbsences = absences.filter(a => a.team === 'home');
  const awayAbsences = absences.filter(a => a.team === 'away');

  const getPositionStyle = (pos) => {
    switch (pos) {
      case 'G':
        return { color: '#8e8e93', background: 'rgba(142, 142, 147, 0.15)', border: '1px solid rgba(142, 142, 147, 0.25)' };
      case 'D':
        return { color: '#0a84ff', background: 'rgba(10, 132, 255, 0.15)', border: '1px solid rgba(10, 132, 255, 0.25)' };
      case 'M':
        return { color: '#30d158', background: 'rgba(48, 209, 88, 0.15)', border: '1px solid rgba(48, 209, 88, 0.25)' };
      case 'A':
        return { color: '#bf5af2', background: 'rgba(191, 90, 242, 0.15)', border: '1px solid rgba(191, 90, 242, 0.25)' };
      default:
        return { color: '#8e8e93', background: 'rgba(142, 142, 147, 0.15)', border: '1px solid rgba(142, 142, 147, 0.25)' };
    }
  };

  const getImportanceBadge = (importance, label) => {
    let color = '#8e8e93';
    let bg = 'rgba(142, 142, 147, 0.12)';
    let border = '1px solid rgba(142, 142, 147, 0.2)';
    let icon = '';

    if (importance === 'key') {
      color = '#ffd60a';
      bg = 'rgba(255, 214, 10, 0.12)';
      border = '1px solid rgba(255, 214, 10, 0.25)';
      icon = '🌟 ';
    } else if (importance === 'starter') {
      color = '#30d158';
      bg = 'rgba(48, 209, 88, 0.12)';
      border = '1px solid rgba(48, 209, 88, 0.25)';
      icon = '🏃 ';
    } else if (importance === 'rotation') {
      color = '#ff9f0a';
      bg = 'rgba(255, 159, 10, 0.12)';
      border = '1px solid rgba(255, 159, 10, 0.25)';
      icon = '🔄 ';
    } else if (importance === 'reserve') {
      color = '#8e8e93';
      bg = 'rgba(142, 142, 147, 0.12)';
      border = '1px solid rgba(142, 142, 147, 0.2)';
      icon = '🪑 ';
    }

    return (
      <span style={{ 
        padding: '2px 6px', 
        borderRadius: '4px', 
        fontSize: '9px', 
        fontWeight: 800, 
        color: color, 
        background: bg, 
        border: border, 
        textTransform: 'uppercase', 
        letterSpacing: '0.05em',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px'
      }}>
        {icon}{label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'suspended':
        return <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 800, color: '#ff453a', background: 'rgba(255, 69, 58, 0.12)', border: '1px solid rgba(255, 69, 58, 0.2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Suspendu</span>;
      case 'doubtful':
        return <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 800, color: '#ffd60a', background: 'rgba(255, 214, 10, 0.12)', border: '1px solid rgba(255, 214, 10, 0.2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Incertain</span>;
      default:
        return <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 800, color: '#ff9f0a', background: 'rgba(255, 159, 10, 0.12)', border: '1px solid rgba(255, 159, 10, 0.2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Blessé</span>;
    }
  };

  const renderAbsenceList = (list) => {
    if (list.length === 0) {
      return (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.04)' }}>
          Aucun joueur absent signalé.
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {list.map((abs, idx) => (
          <div key={idx} className="absence-card" style={{ 
            padding: '12px 14px', 
            borderRadius: '12px', 
            background: 'rgba(255,255,255,0.02)', 
            border: '1px solid rgba(255,255,255,0.04)', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px',
            transition: 'background 0.2s ease, border-color 0.2s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {abs.has_stats && (
                  <span style={{ 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    fontSize: '9px', 
                    fontWeight: 800,
                    fontFamily: 'Outfit',
                    ...getPositionStyle(abs.position)
                  }}>
                    {abs.position === 'G' ? 'GDB' : abs.position === 'D' ? 'DEF' : abs.position === 'M' ? 'MIL' : 'ATT'}
                  </span>
                )}
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#fff', fontFamily: 'Outfit' }}>{abs.player_name}</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {abs.has_stats && getImportanceBadge(abs.importance, abs.importanceLabel)}
                {getStatusBadge(abs.status)}
              </div>
            </div>

            {abs.has_stats && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                flexWrap: 'wrap',
                gap: '8px', 
                fontSize: '11px', 
                color: 'var(--text-muted)',
                background: 'rgba(255,255,255,0.02)',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.02)'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700, color: '#ffd60a' }}>
                  {abs.rating > 0 ? `${abs.rating.toFixed(2)} ★` : 'N/A ★'}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                <span>
                  {abs.appearances} {abs.appearances > 1 ? 'matchs' : 'match'} {abs.starts > 0 ? `(${abs.starts} tit.)` : ''}
                </span>
                {(abs.goals > 0 || abs.assists > 0) && <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>}
                {abs.goals > 0 && (
                  <span style={{ color: '#ff453a', fontWeight: 600 }}>{abs.goals} {abs.goals > 1 ? 'buts' : 'but'}</span>
                )}
                {abs.goals > 0 && abs.assists > 0 && <span style={{ color: 'rgba(255,255,255,0.1)' }}>+</span>}
                {abs.assists > 0 && (
                  <span style={{ color: '#30d158', fontWeight: 600 }}>{abs.assists} {abs.assists > 1 ? 'passes' : 'passe'}</span>
                )}
              </div>
            )}

            {(abs.reason || abs.info) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '2px' }}>
                {abs.reason && (
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Motif : <strong style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 550 }}>{abs.reason}</strong>
                  </div>
                )}
                {abs.info && (
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    {abs.info}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px', marginBottom: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h4 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#bf5af2' }} />
            <span>{selectedMatchDetails.home_team}</span>
          </h4>
          {renderAbsenceList(homeAbsences)}
        </div>
        <div>
          <h4 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0984e3' }} />
            <span>{selectedMatchDetails.away_team}</span>
          </h4>
          {renderAbsenceList(awayAbsences)}
        </div>
      </div>
    </div>
  );
}

function MatchDetailsBetfairTab({ selectedMatchDetails }) {
  const data = React.useMemo(() => {
    if (!selectedMatchDetails?.betfair_json) return null;
    try {
      return typeof selectedMatchDetails.betfair_json === 'string'
        ? JSON.parse(selectedMatchDetails.betfair_json)
        : selectedMatchDetails.betfair_json;
    } catch (e) {
      console.error("Failed to parse betfair_json:", e);
      return null;
    }
  }, [selectedMatchDetails]);

  if (!data) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Aucune donnée Betfair disponible pour ce match.
      </div>
    );
  }

  const isBasket = selectedMatchDetails.sport === 'basketball' || data.sport === 7522;
  const vol1 = data.volume_1 || 0;
  const volX = isBasket ? 0 : (data.volume_x || 0);
  const vol2 = data.volume_2 || 0;
  
  const totalVol = vol1 + volX + vol2;
  
  const pct1 = totalVol > 0 ? (vol1 / totalVol * 100) : 0;
  const pctX = totalVol > 0 ? (volX / totalVol * 100) : 0;
  const pct2 = totalVol > 0 ? (vol2 / totalVol * 100) : 0;

  const getImpliedProb = (odds) => odds > 1 ? (1 / odds * 100) : 0;
  const ip1 = getImpliedProb(data.coef_1_new);
  const ipX = getImpliedProb(data.coef_x_new);
  const ip2 = getImpliedProb(data.coef_2_new);

  const anomalies = [];
  if (totalVol > 100) {
    if (pct1 - ip1 > 20) {
      anomalies.push({ outcome: data.home, diff: pct1 - ip1, vol: vol1, pct: pct1 });
    }
    if (!isBasket && pctX - ipX > 20) {
      anomalies.push({ outcome: 'Nul', diff: pctX - ipX, vol: volX, pct: pctX });
    }
    if (pct2 - ip2 > 20) {
      anomalies.push({ outcome: data.away, diff: pct2 - ip2, vol: vol2, pct: pct2 });
    }
  }

  const renderVariation = (init, current) => {
    if (!init || !current || init <= 1 || current <= 1) return <span style={{ color: 'var(--text-muted)' }}>N/A</span>;
    const diff = ((current - init) / init * 100);
    const color = diff < -5 ? 'var(--color-success)' : diff > 5 ? '#ff453a' : 'var(--text-secondary)';
    const sign = diff > 0 ? '+' : '';
    return (
      <span style={{ color, fontWeight: 700 }}>
        {sign}{diff.toFixed(1)}%
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px', marginBottom: '24px' }}>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MISES TOTALES MATCHÉES</span>
          <span style={{ fontSize: '20px', fontWeight: 800, color: '#fff', fontFamily: 'Outfit' }}>
            € {totalVol.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MARCHÉ BETFAIR</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '4px' }}>
            ID : <code style={{ color: '#bf5af2', background: 'rgba(191, 90, 242, 0.08)', padding: '2px 6px', borderRadius: '4px' }}>{data.market_id || 'N/A'}</code>
          </span>
        </div>
      </div>

      <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '18px 20px' }}>
        <h4 style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 14px 0' }}>
          DISTRIBUTION DU VOLUME D'ARGENT
        </h4>
        
        {totalVol === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
            Aucun argent n'a encore été misé sur ce marché.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ height: '24px', borderRadius: '12px', overflow: 'hidden', display: 'flex', background: 'var(--bg-tertiary)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              {vol1 > 0 && (
                <div style={{
                  width: `${pct1}%`,
                  background: 'linear-gradient(90deg, #0984e3 0%, #00cec9 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '10px', fontWeight: 800, transition: 'width 0.5s ease'
                }} title={`Domicile: ${pct1.toFixed(1)}%`}>
                  {pct1 > 15 && `${pct1.toFixed(0)}%`}
                </div>
              )}
              {volX > 0 && (
                <div style={{
                  width: `${pctX}%`,
                  background: 'linear-gradient(90deg, #636e72 0%, #b2bec3 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '10px', fontWeight: 800, transition: 'width 0.5s ease'
                }} title={`Nul: ${pctX.toFixed(1)}%`}>
                  {pctX > 15 && `${pctX.toFixed(0)}%`}
                </div>
              )}
              {vol2 > 0 && (
                <div style={{
                  width: `${pct2}%`,
                  background: 'linear-gradient(90deg, var(--color-accent-solid) 0%, #bf5af2 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '10px', fontWeight: 800, transition: 'width 0.5s ease'
                }} title={`Extérieur: ${pct2.toFixed(1)}%`}>
                  {pct2 > 15 && `${pct2.toFixed(0)}%`}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isBasket ? '1fr 1fr' : '1fr 1fr 1fr', gap: '10px', fontSize: '11.5px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontWeight: 650 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0984e3', display: 'inline-block' }} />
                  <span>{data.home}</span>
                </span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', paddingLeft: '14px' }}>
                  {pct1.toFixed(1)}% <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 550 }}>({vol1.toLocaleString()} €)</span>
                </span>
              </div>
              
              {!isBasket && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontWeight: 650 }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#636e72', display: 'inline-block' }} />
                    <span>Nul</span>
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', paddingLeft: '14px' }}>
                    {pctX.toFixed(1)}% <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 550 }}>({volX.toLocaleString()} €)</span>
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontWeight: 650 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#bf5af2', display: 'inline-block' }} />
                  <span>{data.away}</span>
                </span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', paddingLeft: '14px' }}>
                  {pct2.toFixed(1)}% <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 550 }}>({vol2.toLocaleString()} €)</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '18px 20px', overflowX: 'auto' }}>
        <h4 style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 14px 0' }}>
          VARIATION DES COTES DE MUNICIPALITÉ (BETFAIR)
        </h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', color: 'var(--text-muted)', textAlign: 'left' }}>
              <th style={{ padding: '8px 0', fontWeight: 700 }}>Résultat</th>
              <th style={{ padding: '8px 0', fontWeight: 700 }}>Cote Initiale</th>
              <th style={{ padding: '8px 0', fontWeight: 700 }}>Cote Actuelle</th>
              <th style={{ padding: '8px 0', fontWeight: 700 }}>Variation</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
              <td style={{ padding: '10px 0', fontWeight: 700, color: '#fff' }}>{data.home} (1)</td>
              <td style={{ padding: '10px 0', color: 'var(--text-secondary)' }}>{data.coef_1 > 1 ? data.coef_1.toFixed(2) : '-'}</td>
              <td style={{ padding: '10px 0', color: '#fff', fontWeight: 700 }}>{data.coef_1_new > 1 ? data.coef_1_new.toFixed(2) : '-'}</td>
              <td style={{ padding: '10px 0' }}>{renderVariation(data.coef_1, data.coef_1_new)}</td>
            </tr>
            {!isBasket && data.coef_x > 0 && (
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                <td style={{ padding: '10px 0', fontWeight: 700, color: '#fff' }}>Nul (X)</td>
                <td style={{ padding: '10px 0', color: 'var(--text-secondary)' }}>{data.coef_x > 1 ? data.coef_x.toFixed(2) : '-'}</td>
                <td style={{ padding: '10px 0', color: '#fff', fontWeight: 700 }}>{data.coef_x_new > 1 ? data.coef_x_new.toFixed(2) : '-'}</td>
                <td style={{ padding: '10px 0' }}>{renderVariation(data.coef_x, data.coef_x_new)}</td>
              </tr>
            )}
            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
              <td style={{ padding: '10px 0', fontWeight: 700, color: '#fff' }}>{data.away} (2)</td>
              <td style={{ padding: '10px 0', color: 'var(--text-secondary)' }}>{data.coef_2 > 1 ? data.coef_2.toFixed(2) : '-'}</td>
              <td style={{ padding: '10px 0', color: '#fff', fontWeight: 700 }}>{data.coef_2_new > 1 ? data.coef_2_new.toFixed(2) : '-'}</td>
              <td style={{ padding: '10px 0' }}>{renderVariation(data.coef_2, data.coef_2_new)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {anomalies.length > 0 && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.05)',
          border: '1px solid rgba(16, 185, 129, 0.22)',
          padding: '14px 18px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            🌟 CONVERGENCE D'ARGENT INTELLIGENT (SMART MONEY) DÉTECTÉE
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {anomalies.map((anom, idx) => (
              <div key={idx} style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                Le marché présente une anomalie positive pour <strong style={{ color: '#fff' }}>{anom.outcome}</strong>.
                Il concentre <strong style={{ color: 'var(--color-success)' }}>{anom.pct.toFixed(1)}%</strong> du volume total d'argent 
                (<strong style={{ color: '#fff' }}>{anom.vol.toLocaleString()} €</strong>) alors que sa cote bookmaker actuelle n'implique que 
                <strong> {getImpliedProb(anom.outcome === data.home ? data.coef_1_new : anom.outcome === 'Nul' ? data.coef_x_new : data.coef_2_new).toFixed(0)}%</strong> de probabilité de victoire. 
                Cela indique une forte pression de mises d'initiés ou de gros parieurs (Value Moneyway).
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

