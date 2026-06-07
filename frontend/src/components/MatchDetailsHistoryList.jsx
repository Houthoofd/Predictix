import React, { useState } from 'react';
import { RefreshCcw } from 'lucide-react';

export default function MatchDetailsHistoryList({
  selectedMatchDetails,
  crawlLoading,
  handleCrawlHistory,
  activeMetric,
  getOutcomeIndicator
}) {
  const [expandedRowKey, setExpandedRowKey] = useState(null);

  const toggleExpandRow = (section, idx) => {
    const key = `${section}-${idx}`;
    setExpandedRowKey(prev => (prev === key ? null : key));
  };

  const renderMatchBadge = (m) => {
    if (activeMetric === 'dashboard') {
      return (
        <span style={{ fontWeight: 700, color: 'var(--color-accent-solid)', background: 'rgba(9, 132, 227, 0.08)', padding: '3px 8px', borderRadius: '4px', fontSize: '10.5px', marginLeft: '12px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
          Détails
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

  const renderExpandedStats = (m) => {
    let stats = null;
    try {
      if (m.statistics_json) {
        stats = typeof m.statistics_json === 'string' ? JSON.parse(m.statistics_json) : m.statistics_json;
      }
    } catch (e) {}
    
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
        shots: 'Tirs',
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
        poteau: 'Tirs sur Poteau',
        total_rebounds: 'Rebonds',
        assists: 'Passes Décisives',
        blocks: 'Contres',
        steals: 'Interceptions',
        field_goals: 'Paniers Réussis',
        free_throws: 'Lancers Francs',
        aces: 'Aces',
        double_faults: 'Doubles Fautes',
        first_serve: '1er Service (%)',
        break_points: 'Balles de Break',
        tries: 'Essais',
        penalties: 'Pénalités',
        conversions: 'Transformations',
        goals: 'Buts',
        saves: 'Arrêts'
      };
      if (labels[key]) return labels[key];
      return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };
    
    const renderStatGauge = (label, hVal, aVal, key) => {
      const hNum = parseFloat(String(hVal).replace('%', ''));
      const aNum = parseFloat(String(aVal).replace('%', ''));
      
      let pctH = 50;
      let pctA = 50;
      if (!isNaN(hNum) && !isNaN(aNum) && (hNum + aNum) > 0) {
        pctH = (hNum / (hNum + aNum)) * 100;
        pctA = 100 - pctH;
      }
      
      const isPoss = key === 'possession';
      const isPassesReussis = key === 'passes_reussis';
      const formattedH = hVal !== undefined ? (isPoss || isPassesReussis ? `${hVal}%` : hVal) : '-';
      const formattedA = aVal !== undefined ? (isPoss || isPassesReussis ? `${aVal}%` : aVal) : '-';
      
      return (
        <div key={key} style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          background: 'rgba(255, 255, 255, 0.015)', 
          padding: '8px 12px', 
          borderRadius: '6px', 
          border: '1px solid rgba(255, 255, 255, 0.03)',
          gap: '5px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-success)' }}>{formattedH}</span>
            <span style={{ fontSize: '9px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center', width: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>
              {label}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-danger)' }}>{formattedA}</span>
          </div>
          
          <div style={{ height: '3px', width: '100%', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '1.5px', overflow: 'hidden', display: 'flex' }}>
            <div style={{ 
              width: `${pctH}%`, 
              background: 'linear-gradient(90deg, var(--color-success) 0%, #10b981 100%)', 
              height: '100%',
              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }} />
            <div style={{ 
              width: `${pctA}%`, 
              background: 'linear-gradient(90deg, #f97316 0%, var(--color-danger) 100%)', 
              height: '100%',
              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }} />
          </div>
        </div>
      );
    };
    
    return (
      <div style={{
        background: 'rgba(0, 0, 0, 0.35)',
        border: '1px solid rgba(255, 255, 255, 0.04)',
        borderRadius: '8px',
        padding: '12px 14px',
        marginTop: '8px',
        width: '100%',
        boxSizing: 'border-box',
        boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.2)'
      }} onClick={(e) => e.stopPropagation()}>
        <h5 style={{ margin: '0 0 10px 0', fontSize: '10px', fontWeight: 800, color: 'var(--color-accent-solid)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span>STATISTIQUES COMPARATIVES DE LA CONFRONTATION</span>
        </h5>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', 
          gap: '8px' 
        }}>
          {hasCorners && renderStatGauge('Corners 1MT', m.first_half_corners_home, m.first_half_corners_away, 'corners')}
          {stats && Object.keys(stats).filter(k => k !== 'corners').map(key => {
            const s = stats[key];
            if (s.home === undefined && s.away === undefined) return null;
            return renderStatGauge(formatKeyLabel(key), s.home, s.away, key);
          })}
        </div>
      </div>
    );
  };

  const renderSection = (title, matches, type, targetTeam) => {
    return (
      <div>
        <h4 style={{ fontSize: '13px', fontFamily: 'Outfit', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px' }}>
          {title}
        </h4>
        {matches && matches.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
            {matches.map((m, idx) => {
              const isExpanded = expandedRowKey === `${type}-${idx}`;
              const outcome = getOutcomeIndicator(m, targetTeam);
              return (
                <div 
                  key={idx} 
                  onClick={() => toggleExpandRow(type, idx)}
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
                    <div style={{ display: 'flex', alignItems: 'center', width: '115px', flexShrink: 0 }}>
                      {outcome && (
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          width: '18px', 
                          height: '18px', 
                          borderRadius: '4px', 
                          fontSize: '10px', 
                          fontWeight: 800, 
                          color: outcome.color, 
                          background: outcome.bg, 
                          border: outcome.border, 
                          marginRight: '8px', 
                          flexShrink: 0 
                        }}>
                          {outcome.label}
                        </span>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600 }}>{m.date}</span>
                        {m.time && m.time !== 'Finished' && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '9.5px', fontFamily: 'Outfit' }}>{m.time}</span>
                        )}
                      </div>
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
    );
  };

  if (crawlLoading || selectedMatchDetails?.isCrawling) {
    return (
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
    );
  }

  const hasNoMatches = !selectedMatchDetails.recent_h2h_matches?.length && 
                       !selectedMatchDetails.recent_home_matches?.length && 
                       !selectedMatchDetails.recent_away_matches?.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {hasNoMatches && (
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

      {selectedMatchDetails.recent_h2h_matches && selectedMatchDetails.recent_h2h_matches.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px' }}>
            <h4 style={{ fontSize: '13px', fontFamily: 'Outfit', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', margin: 0 }}>
              Confrontations Directes (H2H)
            </h4>
            <button 
              style={{ background: 'transparent', border: 'none', color: 'var(--color-accent-solid)', fontSize: '11.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
              onClick={() => handleCrawlHistory(selectedMatchDetails.match_id)}
            >
              <RefreshCcw size={11} /> Mettre à jour
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
            {selectedMatchDetails.recent_h2h_matches.map((m, idx) => {
              const isExpanded = expandedRowKey === `h2h-${idx}`;
              const outcome = getOutcomeIndicator(m, selectedMatchDetails.home_team);
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
                    <div style={{ display: 'flex', alignItems: 'center', width: '115px', flexShrink: 0 }}>
                      {outcome && (
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          width: '18px', 
                          height: '18px', 
                          borderRadius: '4px', 
                          fontSize: '10px', 
                          fontWeight: 800, 
                          color: outcome.color, 
                          background: outcome.bg, 
                          border: outcome.border, 
                          marginRight: '8px', 
                          flexShrink: 0 
                        }}>
                          {outcome.label}
                        </span>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600 }}>{m.date}</span>
                        {m.time && m.time !== 'Finished' && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '9.5px', fontFamily: 'Outfit' }}>{m.time}</span>
                        )}
                      </div>
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
        </div>
      )}

      {renderSection(
        `Derniers matchs de ${selectedMatchDetails.home_team} (à domicile)`,
        selectedMatchDetails.recent_home_matches,
        'home',
        selectedMatchDetails.home_team
      )}

      {renderSection(
        `Derniers matchs de ${selectedMatchDetails.away_team} (à l'extérieur)`,
        selectedMatchDetails.recent_away_matches,
        'away',
        selectedMatchDetails.away_team
      )}
    </div>
  );
}
