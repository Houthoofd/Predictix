import React from 'react';
import { ChevronDown, ChevronUp, Layers, RefreshCcw } from 'lucide-react';

export default function ScraperLiveMatchesGrid({
  liveScrapedMatches,
  expandedMatches,
  toggleMatchExpand,
  scrapePhase
}) {
  const renderStatRow = (label, statObj) => {
    if (!statObj) return null;
    const homeVal = statObj.home !== undefined ? statObj.home : '-';
    const awayVal = statObj.away !== undefined ? statObj.away : '-';
    
    const homeLabel = label.toLowerCase().includes('possession') ? `${homeVal}%` : homeVal;
    const awayLabel = label.toLowerCase().includes('possession') ? `${awayVal}%` : awayVal;
    
    const total = (parseFloat(homeVal) || 0) + (parseFloat(awayVal) || 0);
    const homePct = total > 0 ? (parseFloat(homeVal) || 0) / total * 100 : 50;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
          <span style={{ fontWeight: 600 }}>{homeLabel}</span>
          <span style={{ color: 'var(--text-muted)' }}>{label}</span>
          <span style={{ fontWeight: 600 }}>{awayLabel}</span>
        </div>
        <div style={{ width: '100%', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', display: 'flex' }}>
          <div style={{ width: `${homePct}%`, height: '100%', background: '#0082ff', borderTopLeftRadius: '2px', borderBottomLeftRadius: '2px' }} />
          <div style={{ width: `${100 - homePct}%`, height: '100%', background: '#bf5af2', borderTopRightRadius: '2px', borderBottomRightRadius: '2px' }} />
        </div>
      </div>
    );
  };

  return (
    <div className="glass-card" style={{ padding: '24px 30px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h3 style={{ fontSize: '16px', fontFamily: 'Outfit', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} style={{ color: '#0082ff' }} />
          <span>Détails des matchs extraits en temps réel ({liveScrapedMatches.length})</span>
        </h3>
        <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Cliquez sur un match pour inspecter ses statistiques et les confrontations H2H en cours de traitement.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
        {liveScrapedMatches.map((m) => {
          const isExpanded = !!expandedMatches[m.match_id];
          const hasStats = m.statistics && Object.keys(m.statistics).length > 0;
          const h2hCount = m.h2hList ? m.h2hList.length : 0;
          
          return (
            <div key={m.match_id} style={{ 
              background: 'rgba(255, 255, 255, 0.01)', 
              border: isExpanded ? '1px solid rgba(0, 130, 255, 0.2)' : '1px solid var(--border-color)',
              borderRadius: '8px', 
              padding: '12px 16px',
              transition: 'all 0.25s ease',
              boxShadow: isExpanded ? '0 4px 15px rgba(0,130,255,0.02)' : 'none'
            }}>
              {/* Summary Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', cursor: 'pointer' }} onClick={() => toggleMatchExpand(m.match_id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '250px' }}>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {m.home_logo ? (
                      <img src={m.home_logo} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} onError={(e) => { e.target.style.display='none'; }} />
                    ) : (
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '9px', fontWeight: 700 }}>H</div>
                    )}
                    {m.away_logo ? (
                      <img src={m.away_logo} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain', marginLeft: '2px' }} onError={(e) => { e.target.style.display='none'; }} />
                    ) : (
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '9px', fontWeight: 700, marginLeft: '2px' }}>A</div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#ffffff' }}>
                      {m.home_team} vs {m.away_team}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {m.tournament} • {m.date || ''} {m.time ? `• ${m.time}` : ''}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Statistiques</div>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: hasStats ? '#34c759' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginTop: '2px' }}>
                      {hasStats ? `${Object.keys(m.statistics).length} métriques` : 'N/A'}
                    </div>
                  </div>

                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </div>

              {/* Expanded Content Panel */}
              {isExpanded && (
                <div style={{ 
                  marginTop: '16px', 
                  paddingTop: '16px', 
                  borderTop: '1px dashed rgba(255,255,255,0.05)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '24px'
                }}>
                  {/* Advanced Stats */}
                  <div>
                    <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#0082ff', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Statistiques de la rencontre
                    </h4>
                    {hasStats ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {m.statistics.possession && renderStatRow('Possession', m.statistics.possession)}
                        {m.statistics.shots && renderStatRow('Tirs Totaux', m.statistics.shots)}
                        {m.statistics.shots_on_target && renderStatRow('Tirs Cadrés', m.statistics.shots_on_target)}
                        {m.statistics.yellow_cards && renderStatRow('Cartons Jaunes', m.statistics.yellow_cards)}
                        {m.statistics.fouls && renderStatRow('Fautes Commises', m.statistics.fouls)}
                        {m.statistics.offsides && renderStatRow('Hors-jeu', m.statistics.offsides)}
                      </div>
                    ) : (
                      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', background: 'rgba(255,255,255,0.01)', borderRadius: '6px' }}>
                        Aucune statistique détaillée disponible pour ce match.
                      </div>
                    )}
                  </div>

                  {/* H2H History */}
                  <div>
                    <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#bf5af2', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Confrontations H2H traitées ({h2hCount})
                    </h4>
                    
                    {m.h2hList && m.h2hList.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                        {m.h2hList.map((h, idx) => {
                          const hHasCorners = h.first_half_corners_home !== null && h.first_half_corners_away !== null && h.first_half_corners_home !== undefined && h.first_half_corners_away !== undefined;
                          return (
                            <div key={idx} style={{ 
                              padding: '8px 10px', 
                              background: 'rgba(255,255,255,0.02)', 
                              borderRadius: '6px', 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '11.5px',
                              border: '1px solid rgba(255,255,255,0.02)'
                            }}>
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '10px' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '10.5px' }}>{h.date ? (h.date.includes('-') && h.date.includes('T') ? h.date.substring(0, 10) : h.date) : ''} • </span>
                                <strong style={{ color: 'var(--text-primary)' }}>{h.home_team} {h.score} {h.away_team}</strong>
                              </div>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: hHasCorners ? '#34c759' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>MT:</span>
                                <span>{hHasCorners ? `${h.first_half_corners_home}-${h.first_half_corners_away}` : 'N/A'}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ 
                        padding: '24px 16px', 
                        textAlign: 'center', 
                        color: 'var(--text-muted)', 
                        fontSize: '12px', 
                        background: 'rgba(255,255,255,0.01)', 
                        borderRadius: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {scrapePhase === 'scraping_history' ? (
                          <>
                            <RefreshCcw size={14} className="animate-spin" style={{ color: '#bf5af2' }} />
                            <span>Recherche de l'historique H2H en cours...</span>
                          </>
                        ) : (
                          <span>Aucune confrontation H2H dans cette session.</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
