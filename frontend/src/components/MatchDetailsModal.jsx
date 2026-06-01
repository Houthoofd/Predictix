import React from 'react';
import { X, RefreshCcw } from 'lucide-react';

export default function MatchDetailsModal({
  selectedMatchDetails,
  setSelectedMatchDetails,
  crawlLoading,
  handleCrawlHistory
}) {
  // Lock/Unlock body scroll when modal is shown to avoid background scroll chaining
  React.useEffect(() => {
    if (selectedMatchDetails) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [selectedMatchDetails]);

  const [activeMetric, setActiveMetric] = React.useState('dashboard');
  const [expandedRowKey, setExpandedRowKey] = React.useState(null);

  const toggleExpandRow = (section, idx) => {
    const key = `${section}-${idx}`;
    setExpandedRowKey(expandedRowKey === key ? null : key);
  };

  const renderExpandedStats = (m) => {
    let stats = null;
    try {
      if (m.statistics_json) {
        stats = typeof m.statistics_json === 'string' ? JSON.parse(m.statistics_json) : m.statistics_json;
      }
    } catch (e) {}
    
    // Also include corners in the sub-grid if available
    const hasCorners = m.first_half_corners_home !== null && m.first_half_corners_away !== null;
    
    if ((!stats || Object.keys(stats).length === 0) && !hasCorners) {
      return (
        <div style={{ padding: '12px', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', width: '100%' }}>
          Aucune statistique détaillée disponible pour cette confrontation.
        </div>
      );
    }
    
    const formatKeyLabel = (key) => {
      const labels = {
        fouls: 'Fautes Commises',
        yellow_cards: 'Cartons Jaunes',
        possession: 'Possession de Balle',
        shots_on_target: 'Tirs Cadrés',
        shots: 'Tirs Globaux',
        offsides: 'Hors-jeu',
        red_cards: 'Cartons Rouges',
        xg_buts_attendus: 'Expected Goals (xG)',
        passes: 'Passes Totales',
        passes_reussis: 'Passes Réussies (%)',
        tacles_reussis: 'Tacles Réussis',
        dribbles_reussis: 'Dribbles Réussis',
        duels_reussis: 'Duels Gagnés',
        duels_aeriens_reussis: 'Duels Aériens Gagnés',
        ballons_touches_dans_la_surface_adverse: 'Touches Surface Adverse',
        centres: 'Centres Tentés',
        centres_reussis: 'Centres Réussis',
        degagements: 'Dégagements',
        rentree_de_touche: 'Touches',
        occasions_manquees: 'Occasions Manquées',
        poteau: 'Tirs sur Poteau'
      };
      if (labels[key]) return labels[key];
      return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };
    
    return (
      <div style={{
        background: 'rgba(0, 0, 0, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.03)',
        borderRadius: '8px',
        padding: '12px 14px',
        marginTop: '8px',
        width: '100%',
        boxSizing: 'border-box'
      }} onClick={(e) => e.stopPropagation()}>
        <h5 style={{ margin: '0 0 10px 0', fontSize: '10.5px', fontWeight: 800, color: 'var(--color-accent-solid)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          📊 STATISTIQUES DÉTAILLÉES DU MATCH
        </h5>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
          gap: '8px' 
        }}>
          {hasCorners && (
            <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.01)', padding: '5px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.02)' }}>
              <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Corners 1MT</span>
              <strong style={{ fontSize: '11px', color: 'var(--color-success)', marginTop: '2px' }}>
                {m.first_half_corners_home} - {m.first_half_corners_away}
              </strong>
            </div>
          )}
          {stats && Object.keys(stats).map(key => {
            const s = stats[key];
            if (s.home === undefined && s.away === undefined) return null;
            const isPoss = key === 'possession';
            const valH = s.home !== undefined ? (isPoss ? `${s.home}%` : s.home) : '-';
            const valA = s.away !== undefined ? (isPoss ? `${s.away}%` : s.away) : '-';
            return (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.01)', padding: '5px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.02)' }}>
                <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }} title={formatKeyLabel(key)}>
                  {formatKeyLabel(key)}
                </span>
                <strong style={{ fontSize: '11px', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {valH} - {valA}
                </strong>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const availableMetrics = React.useMemo(() => {
    const metrics = new Set(['dashboard', 'corners']);
    if (!selectedMatchDetails) return Array.from(metrics);
    const allMatches = [
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
              // Ensure that this key matches the structure { home: number, away: number }
              if (stats[key] && (stats[key].home !== undefined || stats[key].away !== undefined)) {
                metrics.add(key);
              }
            });
          }
        } catch (e) {}
      }
    }
    return Array.from(metrics);
  }, [selectedMatchDetails]);

  // Ensure activeMetric aligns with available metrics if dynamically changed
  React.useEffect(() => {
    if (selectedMatchDetails?.metric && availableMetrics.includes(selectedMatchDetails.metric)) {
      setActiveMetric(selectedMatchDetails.metric);
    } else {
      setActiveMetric('dashboard');
    }
  }, [selectedMatchDetails, availableMetrics]);

  const getAverage = (matches, metric, isHomeOnly = false, isAwayOnly = false) => {
    if (!matches || !Array.isArray(matches) || matches.length === 0) return null;
    
    let sum = 0;
    let count = 0;
    
    for (const m of matches) {
      if (metric === 'corners') {
        if (isHomeOnly) {
          const val = m.home_team === selectedMatchDetails.home_team ? m.first_half_corners_home : m.first_half_corners_away;
          if (val !== null && val !== undefined) {
            sum += val;
            count++;
          }
        } else if (isAwayOnly) {
          const val = m.away_team === selectedMatchDetails.away_team ? m.first_half_corners_away : m.first_half_corners_home;
          if (val !== null && val !== undefined) {
            sum += val;
            count++;
          }
        } else {
          if (m.first_half_corners_home !== null && m.first_half_corners_home !== undefined &&
              m.first_half_corners_away !== null && m.first_half_corners_away !== undefined) {
            sum += (m.first_half_corners_home + m.first_half_corners_away);
            count++;
          }
        }
        continue;
      }
      
      let stats = null;
      try {
        if (m.statistics_json) {
          stats = typeof m.statistics_json === 'string' ? JSON.parse(m.statistics_json) : m.statistics_json;
        }
      } catch (e) {}
      
      if (!stats || !stats[metric]) continue;
      
      if (metric === 'possession') {
        if (stats.possession.home !== undefined) {
          const val = (isHomeOnly || m.home_team === selectedMatchDetails.home_team)
            ? parseFloat(stats.possession.home)
            : parseFloat(stats.possession.away);
          sum += val;
          count++;
        }
      } else if (stats[metric].home !== undefined && stats[metric].away !== undefined) {
        if (isHomeOnly) {
          const val = m.home_team === selectedMatchDetails.home_team ? parseFloat(stats[metric].home) : parseFloat(stats[metric].away);
          sum += val;
          count++;
        } else if (isAwayOnly) {
          const val = m.away_team === selectedMatchDetails.away_team ? parseFloat(stats[metric].away) : parseFloat(stats[metric].home);
          sum += val;
          count++;
        } else {
          sum += (parseFloat(stats[metric].home) + parseFloat(stats[metric].away));
          count++;
        }
      }
    }
    
    return count > 0 ? parseFloat((sum / count).toFixed(1)) : null;
  };

  const renderMatchBadge = (m) => {
    if (activeMetric === 'dashboard') {
      return (
        <span style={{ fontWeight: 700, color: 'var(--color-accent-solid)', background: 'rgba(9, 132, 227, 0.08)', padding: '3px 8px', borderRadius: '4px', fontSize: '10.5px', marginLeft: '12px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
          Détails 📊
        </span>
      );
    }
    if (activeMetric === 'corners') {
      return (
        <span style={{ fontWeight: 700, color: 'var(--color-success)', background: 'rgba(16, 185, 129, 0.08)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', marginLeft: '12px', flexShrink: 0 }}>
          Corners: {m.first_half_corners_home} - {m.first_half_corners_away}
        </span>
      );
    }
    
    let stats = null;
    try {
      if (m.statistics_json) {
        stats = typeof m.statistics_json === 'string' ? JSON.parse(m.statistics_json) : m.statistics_json;
      }
    } catch (e) {}
    
    if (!stats || !stats[activeMetric]) {
      return (
        <span style={{ fontWeight: 600, color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.02)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', marginLeft: '12px', flexShrink: 0 }}>
          N/A
        </span>
      );
    }
    
    const valHome = stats[activeMetric].home;
    const valAway = stats[activeMetric].away;
    const formatted = activeMetric === 'possession' ? `${valHome}% - ${valAway}%` : `${valHome} - ${valAway}`;
    
    const getMetricShortLabel = (key) => {
      const labels = {
        corners: 'Corners 1MT',
        fouls: 'Fautes',
        yellow_cards: 'Cartons',
        possession: 'Poss.',
        shots_on_target: 'Tirs Cad',
        shots: 'Tirs',
        offsides: 'Hors-jeu',
        red_cards: 'Cartons R.'
      };
      if (labels[key]) return labels[key];
      return key
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };
    
    const label = getMetricShortLabel(activeMetric);
    
    return (
      <span style={{ fontWeight: 700, color: 'var(--color-accent-solid)', background: 'rgba(9, 132, 227, 0.08)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', marginLeft: '12px', flexShrink: 0 }}>
        {label}: {formatted}
      </span>
    );
  };

  if (!selectedMatchDetails) return null;

  const h2hAvg = getAverage(selectedMatchDetails.recent_h2h_matches, activeMetric);
  const homeAvg = getAverage(selectedMatchDetails.recent_home_matches, activeMetric, true);
  const awayAvg = getAverage(selectedMatchDetails.recent_away_matches, activeMetric, false, true);
  
  const metricUnit = activeMetric === 'possession' ? '%' : '';
  
  const getMetricTitle = (key) => {
    const titles = {
      corners: 'Corners 1MT',
      fouls: 'Fautes Commises',
      yellow_cards: 'Cartons Jaunes',
      possession: 'Possession de Balle',
      shots_on_target: 'Tirs Cadrés',
      shots: 'Tirs Globaux',
      offsides: 'Hors-jeu',
      red_cards: 'Cartons Rouges',
      xg_buts_attendus: 'Expected Goals (xG)',
      passes: 'Passes Totales',
      passes_reussis: 'Passes Réussies (%)',
      tacles_reussis: 'Tacles Réussis',
      dribbles_reussis: 'Dribbles Réussis',
      duels_reussis: 'Duels Gagnés',
      duels_aeriens_reussis: 'Duels Aériens Gagnés',
      ballons_touches_dans_la_surface_adverse: 'Touches Surface Adverse',
      centres: 'Centres Tentés',
      centres_reussis: 'Centres Réussis',
      degagements: 'Dégagements',
      rentree_de_touche: 'Touches',
      occasions_manquees: 'Occasions Manquées',
      poteau: 'Tirs sur Poteau'
    };
    if (titles[key]) return titles[key];
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  const metricTitle = getMetricTitle(activeMetric);

  return (
    <div className="modal-overlay" onClick={() => setSelectedMatchDetails(null)}>
      <div className="modal-content glass-card" style={{ maxWidth: '650px', width: '90%', padding: '24px 30px', maxHeight: '85vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {selectedMatchDetails.tournament || 'Football'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
              {selectedMatchDetails.home_logo ? (
                <img src={selectedMatchDetails.home_logo} alt="" referrerPolicy="no-referrer" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'contain', background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', flexShrink: 0 }} />
              )}
              <h3 style={{ fontSize: '20px', fontFamily: 'Outfit', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                {selectedMatchDetails.home_team}
              </h3>
              <span style={{ color: 'var(--text-muted)', fontSize: '15px', fontWeight: 600 }}>vs</span>
              {selectedMatchDetails.away_logo ? (
                <img src={selectedMatchDetails.away_logo} alt="" referrerPolicy="no-referrer" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'contain', background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', flexShrink: 0 }} />
              )}
              <h3 style={{ fontSize: '20px', fontFamily: 'Outfit', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                {selectedMatchDetails.away_team}
              </h3>
            </div>
          </div>
          <button className="modal-close" onClick={() => setSelectedMatchDetails(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Stats Summary Grid */}
        <div className="grid-3" style={{ gap: '12px', marginBottom: '14px' }}>
          <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Conseil Modèle</span>
            <p style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>
              {selectedMatchDetails.best_tip} {selectedMatchDetails.card_line}
            </p>
          </div>
          <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Confiance / Win Rate</span>
            <p style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: 'var(--color-accent-solid)' }}>
              {selectedMatchDetails.win_rate || selectedMatchDetails.probability || 'N/A'}
            </p>
          </div>
          <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Cotes de Base (O/U)</span>
            <p style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>
              {selectedMatchDetails.over_odds} / {selectedMatchDetails.under_odds}
            </p>
          </div>
        </div>

        {/* Metric Selector Tabs */}
        {availableMetrics.length > 1 && (
          <div style={{ display: 'flex', gap: '4px', marginBottom: '14px', background: 'var(--bg-secondary)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {availableMetrics.map(m => {
              const labels = {
                corners: 'Corners 1MT',
                fouls: 'Fautes',
                yellow_cards: 'Cartons',
                possession: 'Possession',
                shots_on_target: 'Tirs Cad.',
                shots: 'Tirs Glob.',
                offsides: 'Hors-jeu',
                red_cards: 'Cartons R.'
              };
              const label = labels[m] || m.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              const isActive = activeMetric === m;
              return (
                <button
                  key={m}
                  onClick={() => setActiveMetric(m)}
                  style={{
                    flex: '1 0 auto',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: isActive ? 'var(--color-accent-solid)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    fontSize: '10.5px',
                    fontFamily: 'Outfit',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em'
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Dynamic Averages Section */}
        {activeMetric === 'dashboard' ? (
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.02)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '10px', 
            padding: '16px 20px', 
            marginBottom: '24px' 
          }}>
            <h4 style={{ fontSize: '13.5px', fontFamily: 'Outfit', fontWeight: 800, color: 'var(--color-accent-solid)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📊 BILAN COMPARATIF DES MOYENNES</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {/* Header Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span style={{ width: '40%', minWidth: '150px' }}>Statistique</span>
                <span style={{ width: '20%', textAlign: 'center' }}>{selectedMatchDetails.home_team} (Dom)</span>
                <span style={{ width: '20%', textAlign: 'center', color: 'var(--color-accent-solid)' }}>Moy. H2H</span>
                <span style={{ width: '20%', textAlign: 'center' }}>{selectedMatchDetails.away_team} (Ext)</span>
              </div>
              
              {/* Data Rows */}
              <div style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '4px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                {availableMetrics.filter(m => m !== 'dashboard').map((m) => {
                  const h2hAvg = getAverage(selectedMatchDetails.recent_h2h_matches, m);
                  const homeAvg = getAverage(selectedMatchDetails.recent_home_matches, m, true);
                  const awayAvg = getAverage(selectedMatchDetails.recent_away_matches, m, false, true);
                  const unit = m === 'possession' ? '%' : '';
                  
                  // Skip keys that have no cached values at all to prevent empty clutter rows
                  if (h2hAvg === null && homeAvg === null && awayAvg === null) return null;

                  return (
                    <div key={m} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.02)', alignItems: 'center' }}>
                      <span style={{ width: '40%', minWidth: '150px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {getMetricTitle(m)}
                      </span>
                      <span style={{ width: '20%', textAlign: 'center', fontWeight: 700, color: 'var(--color-success)' }}>
                        {homeAvg !== null ? `${homeAvg}${unit}` : 'N/A'}
                      </span>
                      <span style={{ width: '20%', textAlign: 'center', fontWeight: 800, color: 'var(--color-accent-solid)' }}>
                        {h2hAvg !== null ? `${h2hAvg}${unit}` : 'N/A'}
                      </span>
                      <span style={{ width: '20%', textAlign: 'center', fontWeight: 700, color: 'var(--color-danger)' }}>
                        {awayAvg !== null ? `${awayAvg}${unit}` : 'N/A'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Dynamic Averages Grid */
          <div className="grid-3" style={{ gap: '12px', marginBottom: '24px' }}>
            <div style={{ background: 'rgba(9, 132, 227, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(9, 132, 227, 0.15)', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Moy. {metricTitle} H2H</span>
              <p style={{ fontSize: '17px', fontWeight: 800, marginTop: '4px', color: 'var(--color-accent-solid)' }}>
                {h2hAvg !== null ? `${h2hAvg}${metricUnit}` : 'N/A'}
              </p>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.15)', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Moy. {selectedMatchDetails.home_team}</span>
              <p style={{ fontSize: '17px', fontWeight: 800, marginTop: '4px', color: 'var(--color-success)' }}>
                {homeAvg !== null ? `${homeAvg}${metricUnit}` : 'N/A'}
              </p>
            </div>
            <div style={{ background: 'rgba(235, 94, 40, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(235, 94, 40, 0.15)', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Moy. {selectedMatchDetails.away_team}</span>
              <p style={{ fontSize: '17px', fontWeight: 800, marginTop: '4px', color: 'var(--color-danger)' }}>
                {awayAvg !== null ? `${awayAvg}${metricUnit}` : 'N/A'}
              </p>
            </div>
          </div>
        )}

        {/* Historical Lists */}
        {(crawlLoading || selectedMatchDetails?.isCrawling) ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.015)', border: '1.5px dashed var(--border-color)', borderRadius: '12px', gap: '16px', margin: '20px 0' }}>
            <div style={{ width: '36px', height: '36px', border: '3.5px solid rgba(255,255,255,0.08)', borderTop: '3.5px solid var(--color-accent-solid)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ fontSize: '14.5px', fontFamily: 'Outfit', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Analyse de l'Historique en cours...
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '6px 0 0 0', maxWidth: '380px', lineHeight: '1.4' }}>
                Récupération des confrontations et corners 1MT depuis Matchendirect via Tor SOCKS5. Cette opération prend environ 10 à 15 secondes.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Call to action if stats are empty */}
            {(!selectedMatchDetails.recent_h2h_matches?.length && 
              !selectedMatchDetails.recent_home_matches?.length && 
              !selectedMatchDetails.recent_away_matches?.length) && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: 'rgba(9, 132, 227, 0.03)', border: '1px dashed rgba(9, 132, 227, 0.25)', borderRadius: '12px', gap: '12px', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent-solid)' }}>
                  <RefreshCcw size={16} />
                  <span style={{ fontSize: '14px', fontFamily: 'Outfit', fontWeight: 700 }}>Statistiques Vides</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, maxWidth: '400px', lineHeight: '1.4' }}>
                  Les confrontations directes et les moyennes de corners ne sont pas encore disponibles pour ce match.
                </p>
                <button 
                  className="btn btn-primary" 
                  style={{ padding: '8px 20px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontFamily: 'Outfit' }}
                  onClick={() => handleCrawlHistory(selectedMatchDetails.match_id)}
                >
                  <RefreshCcw size={13} />
                  Analyser l'historique du match
                </button>
              </div>
            )}

            {/* Section 1: H2H */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px' }}>
                <h4 style={{ fontSize: '13px', fontFamily: 'Outfit', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', margin: 0 }}>
                  Confrontations Directes (H2H)
                </h4>
                {selectedMatchDetails.recent_h2h_matches?.length > 0 && (
                  <button 
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-accent-solid)', fontSize: '11.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
                    onClick={() => handleCrawlHistory(selectedMatchDetails.match_id)}
                  >
                    <RefreshCcw size={11} /> Mettre à jour
                  </button>
                )}
              </div>
              {selectedMatchDetails.recent_h2h_matches && selectedMatchDetails.recent_h2h_matches.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                  {selectedMatchDetails.recent_h2h_matches.map((m, idx) => {
                    const isExpanded = expandedRowKey === `h2h-${idx}`;
                    return (
                      <div 
                        key={idx} 
                        onClick={() => toggleExpandRow('h2h', idx)}
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          padding: '8px 12px', 
                          background: 'rgba(255,255,255,0.015)', 
                          border: isExpanded ? '1px solid var(--color-accent-solid)' : '1px solid var(--border-color)', 
                          borderRadius: '6px', 
                          fontSize: '12.5px', 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: isExpanded ? '0 0 10px rgba(0, 130, 255, 0.05)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', width: '85px', flexShrink: 0 }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600 }}>{m.date}</span>
                            {m.time && m.time !== 'Finished' && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '9.5px', fontFamily: 'Outfit' }}>{m.time}</span>
                            )}
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexGrow: 1, justifyContent: 'center', padding: '0 8px' }}>
                            {m.home_logo ? (
                              <img src={m.home_logo} alt="" referrerPolicy="no-referrer" style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'contain', background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--bg-tertiary)', flexShrink: 0 }} />
                            )}
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{m.home_team}</span>
                            
                            <strong style={{ color: 'var(--text-muted)', margin: '0 4px', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', flexShrink: 0 }}>{m.score}</strong>
                            
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{m.away_team}</span>
                            {m.away_logo ? (
                              <img src={m.away_logo} alt="" referrerPolicy="no-referrer" style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'contain', background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--bg-tertiary)', flexShrink: 0 }} />
                            )}
                          </div>
                          
                          {renderMatchBadge(m)}
                        </div>
                        {isExpanded && renderExpandedStats(m)}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Aucune confrontation H2H en cache dans l'historique.</p>
              )}
            </div>

            {/* Section 2: Recent Home */}
            <div>
              <h4 style={{ fontSize: '13px', fontFamily: 'Outfit', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px' }}>
                Derniers matchs de {selectedMatchDetails.home_team} (à domicile)
              </h4>
              {selectedMatchDetails.recent_home_matches && selectedMatchDetails.recent_home_matches.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                  {selectedMatchDetails.recent_home_matches.map((m, idx) => {
                    const isExpanded = expandedRowKey === `home-${idx}`;
                    return (
                      <div 
                        key={idx} 
                        onClick={() => toggleExpandRow('home', idx)}
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          padding: '8px 12px', 
                          background: 'rgba(255,255,255,0.015)', 
                          border: isExpanded ? '1px solid var(--color-accent-solid)' : '1px solid var(--border-color)', 
                          borderRadius: '6px', 
                          fontSize: '12.5px', 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: isExpanded ? '0 0 10px rgba(0, 130, 255, 0.05)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', width: '85px', flexShrink: 0 }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600 }}>{m.date}</span>
                            {m.time && m.time !== 'Finished' && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '9.5px', fontFamily: 'Outfit' }}>{m.time}</span>
                            )}
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexGrow: 1, justifyContent: 'center', padding: '0 8px' }}>
                            {m.home_logo ? (
                              <img src={m.home_logo} alt="" referrerPolicy="no-referrer" style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'contain', background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--bg-tertiary)', flexShrink: 0 }} />
                            )}
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{m.home_team}</span>
                            
                            <strong style={{ color: 'var(--text-muted)', margin: '0 4px', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', flexShrink: 0 }}>{m.score}</strong>
                            
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{m.away_team}</span>
                            {m.away_logo ? (
                              <img src={m.away_logo} alt="" referrerPolicy="no-referrer" style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'contain', background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--bg-tertiary)', flexShrink: 0 }} />
                            )}
                          </div>
                          
                          {renderMatchBadge(m)}
                        </div>
                        {isExpanded && renderExpandedStats(m)}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Aucun match récent en cache.</p>
              )}
            </div>

            {/* Section 3: Recent Away */}
            <div>
              <h4 style={{ fontSize: '13px', fontFamily: 'Outfit', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px' }}>
                Derniers matchs de {selectedMatchDetails.away_team} (à l'extérieur)
              </h4>
              {selectedMatchDetails.recent_away_matches && selectedMatchDetails.recent_away_matches.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                  {selectedMatchDetails.recent_away_matches.map((m, idx) => {
                    const isExpanded = expandedRowKey === `away-${idx}`;
                    return (
                      <div 
                        key={idx} 
                        onClick={() => toggleExpandRow('away', idx)}
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          padding: '8px 12px', 
                          background: 'rgba(255,255,255,0.015)', 
                          border: isExpanded ? '1px solid var(--color-accent-solid)' : '1px solid var(--border-color)', 
                          borderRadius: '6px', 
                          fontSize: '12.5px', 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: isExpanded ? '0 0 10px rgba(0, 130, 255, 0.05)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', width: '85px', flexShrink: 0 }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600 }}>{m.date}</span>
                            {m.time && m.time !== 'Finished' && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '9.5px', fontFamily: 'Outfit' }}>{m.time}</span>
                            )}
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexGrow: 1, justifyContent: 'center', padding: '0 8px' }}>
                            {m.home_logo ? (
                              <img src={m.home_logo} alt="" referrerPolicy="no-referrer" style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'contain', background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--bg-tertiary)', flexShrink: 0 }} />
                            )}
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{m.home_team}</span>
                            
                            <strong style={{ color: 'var(--text-muted)', margin: '0 4px', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', flexShrink: 0 }}>{m.score}</strong>
                            
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{m.away_team}</span>
                            {m.away_logo ? (
                              <img src={m.away_logo} alt="" referrerPolicy="no-referrer" style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'contain', background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--bg-tertiary)', flexShrink: 0 }} />
                            )}
                          </div>
                          
                          {renderMatchBadge(m)}
                        </div>
                        {isExpanded && renderExpandedStats(m)}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Aucun match récent en cache.</p>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', marginTop: '24px', paddingTop: '16px' }}>
          <button className="btn btn-secondary" onClick={() => setSelectedMatchDetails(null)}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
