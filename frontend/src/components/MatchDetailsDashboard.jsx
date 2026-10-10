import React from 'react';

export default function MatchDetailsDashboard({
  selectedMatchDetails,
  availableMetrics,
  getAverage,
  getMetricTitle
}) {
  return (
    <>
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.015)', 
        border: '1px solid rgba(255, 255, 255, 0.03)', 
        borderRadius: '10px', 
        padding: '16px 20px', 
        marginBottom: '16px',
        boxShadow: 'inset 0 1px 4px rgba(255,255,255,0.01)'
      }}>
        <h4 style={{ 
          fontSize: '11px', 
          fontFamily: 'Outfit', 
          fontWeight: 800, 
          color: 'var(--color-accent-solid)', 
          marginBottom: '14px', 
          textTransform: 'uppercase', 
          letterSpacing: '0.08em', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px' 
        }}>
          <span>BILAN COMPARATIF DES MOYENNES</span>
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {/* Header Row */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: '9px', 
            fontWeight: 800, 
            color: 'var(--text-muted)', 
            borderBottom: '1px solid rgba(255,255,255,0.04)', 
            paddingBottom: '8px', 
            textTransform: 'uppercase', 
            letterSpacing: '0.08em' 
          }}>
            <span style={{ width: '40%', minWidth: '110px' }}>Statistique</span>
            <span style={{ width: '20%', textAlign: 'center' }}>{selectedMatchDetails.home_team}</span>
            <span style={{ width: '20%', textAlign: 'center', color: 'var(--color-accent-solid)' }}>Moy. H2H</span>
            <span style={{ width: '20%', textAlign: 'center' }}>{selectedMatchDetails.away_team}</span>
          </div>
          
          {/* Data Rows */}
          <div style={{ 
            maxHeight: '280px', 
            overflowY: 'auto', 
            paddingRight: '4px', 
            scrollbarWidth: 'thin', 
            scrollbarColor: 'rgba(255,255,255,0.1) transparent' 
          }}>
            {availableMetrics.filter(m => m !== 'dashboard').map((m) => {
              const h2hAvg = getAverage(selectedMatchDetails.recent_h2h_matches, m);
              const homeAvg = getAverage(selectedMatchDetails.recent_home_matches, m, true);
              const awayAvg = getAverage(selectedMatchDetails.recent_away_matches, m, false, true);
              const unit = m === 'possession' ? '%' : '';
              
              if (h2hAvg === null && homeAvg === null && awayAvg === null) return null;
              
              const totalVal = (homeAvg || 0) + (awayAvg || 0);
              const pctH = totalVal > 0 ? ((homeAvg || 0) / totalVal) * 100 : 50;
              const pctA = 100 - pctH;
  
              return (
                <div key={m} style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  padding: '8px 0', 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.02)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', alignItems: 'center' }}>
                    <span style={{ width: '40%', minWidth: '110px', fontWeight: 700, color: 'var(--text-secondary)' }}>
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
                  
                  {/* Mini inline split progress line */}
                  {homeAvg !== null && awayAvg !== null && (
                    <div style={{ height: '2px', width: '100%', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '1px', overflow: 'hidden', display: 'flex', marginTop: '5px' }}>
                      <div style={{ width: `${pctH}%`, background: 'var(--color-success)', opacity: 0.6, height: '100%' }} />
                      <div style={{ width: `${pctA}%`, background: 'var(--color-danger)', opacity: 0.6, height: '100%' }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* BetFirst Bookmaker Odds Section */}
      {(() => {
        if (!selectedMatchDetails.odds_corners) return null;
        let oddsList = [];
        try {
          oddsList = typeof selectedMatchDetails.odds_corners === 'string'
            ? JSON.parse(selectedMatchDetails.odds_corners)
            : selectedMatchDetails.odds_corners;
        } catch (e) {}
        if (!Array.isArray(oddsList) || oddsList.length === 0) return null;

        const winnerOdds = oddsList.find(o => o.market_type === 'winner' || o.market_type === 'full_time');
        const totalsOdds = oddsList.filter(o => o.market_type === 'totals');
        const handicapsOdds = oddsList.filter(o => o.market_type === 'handicaps');

        return (
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.015)', 
            border: '1px solid rgba(255, 255, 255, 0.03)', 
            borderRadius: '10px', 
            padding: '16px 20px',
            boxShadow: 'inset 0 1px 4px rgba(255,255,255,0.01)'
          }}>
            <h4 style={{ 
              fontSize: '11px', 
              fontFamily: 'Outfit', 
              fontWeight: 800, 
              color: 'var(--color-accent-solid)', 
              marginBottom: '14px', 
              textTransform: 'uppercase', 
              letterSpacing: '0.08em'
            }}>
              COTES BOOKMAKER (1XBET)
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Winner Odds Card */}
              {winnerOdds && (
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px solid rgba(255, 255, 255, 0.03)', 
                  borderRadius: '8px', 
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>Résultat du Match</span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '70%' }}>
                    <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.02)' }}>
                      {selectedMatchDetails.home_team} : <strong style={{ color: 'var(--color-success)' }}>{winnerOdds.home_odds ? winnerOdds.home_odds.toFixed(2) : '-'}</strong>
                    </span>
                    {winnerOdds.draw_odds && (
                      <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.02)' }}>
                        Nul : <strong style={{ color: '#fff' }}>{winnerOdds.draw_odds.toFixed(2)}</strong>
                      </span>
                    )}
                    <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.02)' }}>
                      {selectedMatchDetails.away_team} : <strong style={{ color: 'var(--color-danger)' }}>{winnerOdds.away_odds ? winnerOdds.away_odds.toFixed(2) : '-'}</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* Point Totals Odds (grouped by period) */}
              {totalsOdds.length > 0 && (() => {
                const periodsMap = {};
                totalsOdds.forEach(t => {
                  if (!periodsMap[t.period]) periodsMap[t.period] = [];
                  periodsMap[t.period].push(t);
                });

                const periodLabels = {
                  full_time: 'Temps Réglementaire',
                  first_half: '1ère Mi-temps',
                  second_half: '2ème Mi-temps',
                  quarter_1: '1er Quart-temps',
                  quarter_2: '2ème Quart-temps',
                  quarter_3: '3ème Quart-temps',
                  quarter_4: '4ème Quart-temps'
                };

                return Object.keys(periodsMap).map(p => {
                  const sortedTotals = periodsMap[p].sort((a, b) => a.line - b.line);
                  const visibleTotals = sortedTotals.slice(0, 4);
                  
                  return (
                    <div key={p} style={{ 
                      background: 'rgba(255, 255, 255, 0.01)', 
                      border: '1px solid rgba(255, 255, 255, 0.02)', 
                      borderRadius: '8px', 
                      padding: '12px 14px'
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {periodLabels[p] || p}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {visibleTotals.map((t, idx) => (
                          <div key={idx} style={{ 
                            background: 'rgba(0,0,0,0.15)', 
                            border: '1px solid rgba(255,255,255,0.02)', 
                            borderRadius: '6px', 
                            padding: '6px 10px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span style={{ fontSize: '11px', fontWeight: 700 }}>Total : <strong style={{ color: 'var(--color-accent-solid)' }}>{t.line}</strong></span>
                            <div style={{ display: 'flex', gap: '6px', fontSize: '10px' }}>
                              <span>+ : <strong style={{ color: 'var(--color-success)' }}>{t.over_odds.toFixed(2)}</strong></span>
                              <span>- : <strong style={{ color: 'var(--color-danger)' }}>{t.under_odds.toFixed(2)}</strong></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}

              {/* Point Handicaps Odds (grouped by period) */}
              {handicapsOdds.length > 0 && (() => {
                const periodsMap = {};
                handicapsOdds.forEach(h => {
                  if (!periodsMap[h.period]) periodsMap[h.period] = [];
                  periodsMap[h.period].push(h);
                });

                const periodLabels = {
                  full_time: 'Temps Réglementaire',
                  first_half: '1ère Mi-temps',
                  second_half: '2ème Mi-temps',
                  quarter_1: '1er Quart-temps',
                  quarter_2: '2ème Quart-temps',
                  quarter_3: '3ème Quart-temps',
                  quarter_4: '4ème Quart-temps'
                };

                return (
                  <div style={{ marginTop: '6px', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Handicaps
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {Object.keys(periodsMap).map(p => {
                        const sortedHandicaps = periodsMap[p].sort((a, b) => Math.abs(a.line) - Math.abs(b.line));
                        const visibleHandicaps = sortedHandicaps.slice(0, 3);
                        
                        return (
                          <div key={p} style={{ 
                            background: 'rgba(255, 255, 255, 0.01)', 
                            border: '1px solid rgba(255, 255, 255, 0.02)', 
                            borderRadius: '8px', 
                            padding: '10px 12px'
                          }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                              {periodLabels[p] || p}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                              {visibleHandicaps.map((h, idx) => (
                                <div key={idx} style={{ 
                                  background: 'rgba(0,0,0,0.15)', 
                                  border: '1px solid rgba(255,255,255,0.02)', 
                                  borderRadius: '6px', 
                                  padding: '5px 8px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '3px'
                                }}>
                                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-accent-solid)' }}>
                                    H: {h.line > 0 ? `+${h.line}` : h.line}
                                  </span>
                                  <div style={{ display: 'flex', gap: '8px', fontSize: '9.5px' }}>
                                    <span>H: <strong style={{ color: 'var(--color-success)' }}>{h.home_odds ? h.home_odds.toFixed(2) : '-'}</strong></span>
                                    <span>A: <strong style={{ color: 'var(--color-danger)' }}>{h.away_odds ? h.away_odds.toFixed(2) : '-'}</strong></span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })()}
    </>
  );
}
