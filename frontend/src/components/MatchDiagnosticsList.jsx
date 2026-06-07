import React from 'react';
import { Database, MoreVertical, Sparkles } from 'lucide-react';

export default function MatchDiagnosticsList({
  predictions,
  selectedMatchId,
  setSelectedMatchId,
  activeKebabMatchId,
  setActiveKebabMatchId,
  handleInjectAndPrioritize
}) {
  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      <h3 style={{ fontSize: '16px', fontFamily: 'Outfit', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Database size={18} style={{ color: '#bf5af2' }} />
        Diagnostic de la Base des Matchs
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {predictions && predictions.length > 0 ? (
          predictions.map((match) => {
            const diag = match.diagnostic || { score: 100, is_complete: true };
            const isSelected = selectedMatchId === match.match_id;

            return (
              <div 
                key={match.match_id}
                onClick={() => setSelectedMatchId(match.match_id)}
                style={{
                  padding: '12px 16px',
                  background: isSelected ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.15)',
                  border: isSelected ? '1px solid #bf5af2' : '1px solid var(--border-color)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                    {match.tournament}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {match.home_team} - {match.away_team}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <div style={{ display: 'flex', gap: '4px' }} title="Matrice de santé (Logo Dom, Logo Ext, H2H, Histo Dom, Histo Ext)">
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: diag.missing_home_logo ? '#ff3b30' : '#2ecc71' }} />
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: diag.missing_away_logo ? '#ff3b30' : '#2ecc71' }} />
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: (diag.h2h_matches_count || 0) >= 10 ? '#2ecc71' : (diag.h2h_matches_count || 0) > 0 ? '#ff9500' : '#ff3b30' }} />
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: (diag.home_matches_count || 0) >= 10 ? '#2ecc71' : (diag.home_matches_count || 0) > 0 ? '#ff9500' : '#ff3b30' }} />
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: (diag.away_matches_count || 0) >= 10 ? '#2ecc71' : (diag.away_matches_count || 0) > 0 ? '#ff9500' : '#ff3b30' }} />
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      H2H: {diag.h2h_matches_count || 0}/10 • Dom: {diag.home_matches_count || 0}/10 • Ext: {diag.away_matches_count || 0}/10
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    {diag.is_complete ? (
                      <span style={{ fontSize: '10px', background: 'rgba(46, 204, 113, 0.15)', color: '#2ecc71', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                        Complet
                      </span>
                    ) : (
                      <span style={{ fontSize: '10px', background: diag.score < 60 ? 'rgba(231, 76, 60, 0.15)' : 'rgba(241, 196, 15, 0.15)', color: diag.score < 60 ? '#e74c3c' : '#f1c40f', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                        {diag.score < 60 ? 'Critique' : 'Alerte'}
                      </span>
                    )}
                    <span style={{ fontSize: '12px', fontWeight: 800, color: diag.score < 60 ? '#e74c3c' : diag.score < 90 ? '#f1c40f' : '#2ecc71' }}>
                      Score : {diag.score}%
                    </span>
                  </div>

                  {/* Kebab Menu */}
                  <div style={{ position: 'relative', zIndex: activeKebabMatchId === match.match_id ? 999 : 1 }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveKebabMatchId(activeKebabMatchId === match.match_id ? null : match.match_id);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <MoreVertical size={16} />
                    </button>

                    {activeKebabMatchId === match.match_id && (
                      <>
                        {/* Backdrop overlay */}
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveKebabMatchId(null);
                          }}
                          style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 998,
                            background: 'transparent',
                            cursor: 'default'
                          }}
                        />
                        {/* Dropdown Menu contents */}
                        <div
                          style={{
                            position: 'absolute',
                            right: 0,
                            top: '28px',
                            background: '#121829',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.6)',
                            zIndex: 999,
                            minWidth: '170px',
                            padding: '4px 0'
                          }}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInjectAndPrioritize(match.match_id);
                              setActiveKebabMatchId(null);
                            }}
                            style={{
                              width: '100%',
                              background: 'transparent',
                              border: 'none',
                              color: '#fff',
                              padding: '8px 12px',
                              textAlign: 'left',
                              fontSize: '12.5px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <Sparkles size={13} style={{ color: '#bf5af2' }} />
                            <span style={{ fontWeight: 600 }}>Réparer en priorité</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ padding: '40px 0', textTransform: 'center', color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center' }}>
            Aucune prédiction disponible. Lancez le scraper pour découvrir des matchs.
          </div>
        )}
      </div>
    </div>
  );
}
