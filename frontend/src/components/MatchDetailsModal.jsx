import React from 'react';
import { X, RefreshCcw } from 'lucide-react';

export default function MatchDetailsModal({
  selectedMatchDetails,
  setSelectedMatchDetails,
  crawlLoading,
  handleCrawlHistory
}) {
  if (!selectedMatchDetails) return null;

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

        {/* Corners Averages Grid */}
        <div className="grid-3" style={{ gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(9, 132, 227, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(9, 132, 227, 0.15)', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Moy. Corners H2H (1MT)</span>
            <p style={{ fontSize: '17px', fontWeight: 800, marginTop: '4px', color: 'var(--color-accent-solid)' }}>
              {selectedMatchDetails.h2h_avg_first_half_corners !== null && selectedMatchDetails.h2h_avg_first_half_corners !== undefined
                ? `${selectedMatchDetails.h2h_avg_first_half_corners} corners`
                : 'N/A'}
            </p>
          </div>
          <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.15)', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Moy. {selectedMatchDetails.home_team} (Dom.)</span>
            <p style={{ fontSize: '17px', fontWeight: 800, marginTop: '4px', color: 'var(--color-success)' }}>
              {selectedMatchDetails.home_avg_first_half_corners !== null && selectedMatchDetails.home_avg_first_half_corners !== undefined
                ? `${selectedMatchDetails.home_avg_first_half_corners} corners`
                : 'N/A'}
            </p>
          </div>
          <div style={{ background: 'rgba(235, 94, 40, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(235, 94, 40, 0.15)', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Moy. {selectedMatchDetails.away_team} (Ext.)</span>
            <p style={{ fontSize: '17px', fontWeight: 800, marginTop: '4px', color: 'var(--color-danger)' }}>
              {selectedMatchDetails.away_avg_first_half_corners !== null && selectedMatchDetails.away_avg_first_half_corners !== undefined
                ? `${selectedMatchDetails.away_avg_first_half_corners} corners`
                : 'N/A'}
            </p>
          </div>
        </div>

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
                  {selectedMatchDetails.recent_h2h_matches.map((m, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12.5px', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '11px', width: '70px', flexShrink: 0 }}>{m.date}</span>
                      
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
                      
                      <span style={{ fontWeight: 700, color: 'var(--color-success)', background: 'rgba(16, 185, 129, 0.08)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', marginLeft: '12px', flexShrink: 0 }}>
                        Corners: {m.first_half_corners_home} - {m.first_half_corners_away}
                      </span>
                    </div>
                  ))}
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
                    const obtained = m.home_team === selectedMatchDetails.home_team ? m.first_half_corners_home : m.first_half_corners_away;
                    const conceded = m.home_team === selectedMatchDetails.home_team ? m.first_half_corners_away : m.first_half_corners_home;
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12.5px', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '11px', width: '70px', flexShrink: 0 }}>{m.date}</span>
                        
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
                        
                        <span style={{ fontWeight: 600, color: 'var(--color-accent-solid)', background: 'rgba(9, 132, 227, 0.08)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', marginLeft: '12px', flexShrink: 0 }} title="Corners obtenus / concédés en 1ère mi-temps">
                          Corners: {obtained} - {conceded}
                        </span>
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
                    const obtained = m.home_team === selectedMatchDetails.away_team ? m.first_half_corners_home : m.first_half_corners_away;
                    const conceded = m.home_team === selectedMatchDetails.away_team ? m.first_half_corners_away : m.first_half_corners_home;
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12.5px', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '11px', width: '70px', flexShrink: 0 }}>{m.date}</span>
                        
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
                        
                        <span style={{ fontWeight: 600, color: 'var(--color-accent-solid)', background: 'rgba(9, 132, 227, 0.08)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', marginLeft: '12px', flexShrink: 0 }} title="Corners obtenus / concédés en 1ère mi-temps">
                          Corners: {obtained} - {conceded}
                        </span>
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
