import React from 'react';
import { 
  ShieldAlert, 
  Check, 
  X, 
  AlertTriangle, 
  Image, 
  RefreshCcw 
} from 'lucide-react';

export default function MatchDiagnosticsDetails({
  selectedMatch,
  handleOpenLogoModal,
  onCrawlMatchHistory,
  handleOpenStatsModal
}) {
  if (!selectedMatch) {
    return (
      <div className="glass-card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <ShieldAlert size={40} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: '12px' }} />
        <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Aucun Match Sélectionné</h4>
        <p style={{ fontSize: '12.5px', maxWidth: '340px', margin: '0 auto', lineHeight: 1.5 }}>
          Cliquez sur un match dans la liste de gauche pour auditer son intégrité, forcer son crawling ou définir des logos personnalisés.
        </p>
      </div>
    );
  }

  let links = [];
  try {
    if (selectedMatch.historical_links) {
      links = typeof selectedMatch.historical_links === 'string' 
        ? JSON.parse(selectedMatch.historical_links) 
        : selectedMatch.historical_links;
    }
  } catch (e) {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      {/* Diagnostic Checklist Panel */}
      <div className="glass-card" style={{ padding: '20px', borderLeft: selectedMatch.diagnostic?.is_complete ? '4px solid #2ecc71' : selectedMatch.diagnostic?.score < 60 ? '4px solid #e74c3c' : '4px solid #f1c40f' }}>
        <h3 style={{ fontSize: '15px', fontFamily: 'Outfit', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={18} style={{ color: selectedMatch.diagnostic?.is_complete ? '#2ecc71' : selectedMatch.diagnostic?.score < 60 ? '#e74c3c' : '#f1c40f' }} />
          Inspecteur de Diagnostic
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Checkpoint 1: Logo Domicile */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {selectedMatch.diagnostic?.missing_home_logo ? (
                <X size={14} style={{ color: '#e74c3c' }} />
              ) : (
                <Check size={14} style={{ color: '#2ecc71' }} />
              )}
              <span>Logo Domicile : {selectedMatch.home_team}</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {selectedMatch.diagnostic?.missing_home_logo ? 'Manquant/Générique' : 'Valide'}
            </span>
          </div>
          
          {/* Checkpoint 2: Logo Extérieur */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {selectedMatch.diagnostic?.missing_away_logo ? (
                <X size={14} style={{ color: '#e74c3c' }} />
              ) : (
                <Check size={14} style={{ color: '#2ecc71' }} />
              )}
              <span>Logo Extérieur : {selectedMatch.away_team}</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {selectedMatch.diagnostic?.missing_away_logo ? 'Manquant/Générique' : 'Valide'}
            </span>
          </div>
          
          {/* Checkpoint 3: Historique H2H */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {selectedMatch.diagnostic?.missing_h2h ? (
                <X size={14} style={{ color: '#e74c3c' }} />
              ) : (
                <Check size={14} style={{ color: '#2ecc71' }} />
              )}
              <span>Confrontations Directes (H2H)</span>
            </div>
            <span style={{ fontSize: '11px', color: selectedMatch.diagnostic?.missing_h2h ? '#e74c3c' : 'var(--text-primary)', fontWeight: 600 }}>
              {selectedMatch.diagnostic?.h2h_matches_count || 0} match(s) en base
            </span>
          </div>

          {/* Checkpoint 4: Historique Domicile */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {selectedMatch.diagnostic?.home_matches_count < 5 ? (
                <AlertTriangle size={14} style={{ color: '#f1c40f' }} />
              ) : (
                <Check size={14} style={{ color: '#2ecc71' }} />
              )}
              <span>Historique Domicile : {selectedMatch.home_team}</span>
            </div>
            <span style={{ fontSize: '11px', color: selectedMatch.diagnostic?.home_matches_count < 5 ? '#f1c40f' : 'var(--text-primary)', fontWeight: 600 }}>
              {selectedMatch.diagnostic?.home_matches_count || 0}/5 recommandés
            </span>
          </div>

          {/* Checkpoint 5: Historique Extérieur */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {selectedMatch.diagnostic?.away_matches_count < 5 ? (
                <AlertTriangle size={14} style={{ color: '#f1c40f' }} />
              ) : (
                <Check size={14} style={{ color: '#2ecc71' }} />
              )}
              <span>Historique Extérieur : {selectedMatch.away_team}</span>
            </div>
            <span style={{ fontSize: '11px', color: selectedMatch.diagnostic?.away_matches_count < 5 ? '#f1c40f' : 'var(--text-primary)', fontWeight: 600 }}>
              {selectedMatch.diagnostic?.away_matches_count || 0}/5 recommandés
            </span>
          </div>
        </div>
      </div>

      {/* Match Header Details & Logo triggers */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '16px', fontFamily: 'Outfit', fontWeight: 800, marginBottom: '16px' }}>
          Statut du Match Sélectionné
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Home Team Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.1)', padding: '10px 14px', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {selectedMatch.home_logo ? (
                <img src={selectedMatch.home_logo} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'contain' }} />
              ) : (
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Image size={14} /></div>
              )}
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>{selectedMatch.home_team} (Domicile)</div>
                <div style={{ fontSize: '11px', color: selectedMatch.diagnostic?.missing_home_logo ? 'var(--color-warning)' : 'var(--color-success)' }}>
                  {selectedMatch.diagnostic?.missing_home_logo ? 'Logo manquant ou générique' : 'Logo valide'}
                </div>
              </div>
            </div>
            <button 
              className="btn btn-secondary" 
              style={{ fontSize: '11px', padding: '4px 10px', height: '28px' }}
              onClick={() => handleOpenLogoModal(selectedMatch.home_team)}
            >
              Définir Logo
            </button>
          </div>

          {/* Away Team Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.1)', padding: '10px 14px', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {selectedMatch.away_logo ? (
                <img src={selectedMatch.away_logo} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'contain' }} />
              ) : (
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Image size={14} /></div>
              )}
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>{selectedMatch.away_team} (Extérieur)</div>
                <div style={{ fontSize: '11px', color: selectedMatch.diagnostic?.missing_away_logo ? 'var(--color-warning)' : 'var(--color-success)' }}>
                  {selectedMatch.diagnostic?.missing_away_logo ? 'Logo manquant ou générique' : 'Logo valide'}
                </div>
              </div>
            </div>
            <button 
              className="btn btn-secondary" 
              style={{ fontSize: '11px', padding: '4px 10px', height: '28px' }}
              onClick={() => handleOpenLogoModal(selectedMatch.away_team)}
            >
              Définir Logo
            </button>
          </div>

          {/* Scraper / Crawl History status & button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '6px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>Historique de Statistiques</div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                H2H: {selectedMatch.diagnostic?.h2h_matches_count || 0}/10 • Dom: {selectedMatch.diagnostic?.home_matches_count || 0}/10 • Ext: {selectedMatch.diagnostic?.away_matches_count || 0}/10
              </div>
            </div>
            
            <button 
              className="btn btn-primary"
              style={{ 
                fontSize: '11.5px', 
                padding: '6px 14px', 
                height: '32px',
                background: 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              disabled={selectedMatch.isCrawling}
              onClick={() => onCrawlMatchHistory(selectedMatch.match_id)}
            >
              <RefreshCcw size={13} className={selectedMatch.isCrawling ? 'animate-spin' : ''} />
              <span>{selectedMatch.isCrawling ? 'Crawling...' : 'Forcer Crawl'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* H2H Links checklist panel */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '16px', fontFamily: 'Outfit', fontWeight: 800, marginBottom: '12px' }}>
          Confrontations Directes (H2H Links)
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Ces confrontations déterminent les moyennes H2H pour la simulation de Poisson.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {links.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
              Aucun lien historique trouvé. Crawlez d'abord ce match.
            </div>
          ) : (
            links.map((link, idx) => {
              const cached = selectedMatch.recent_h2h_matches?.find(m => m.match_url === link);
              const isCached = !!cached;

              return (
                <div key={idx} style={{
                  padding: '10px 12px',
                  background: 'rgba(0, 0, 0, 0.12)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                      #{idx + 1} {link}
                    </span>
                    {isCached ? (
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {cached.date} : {cached.home_team} {cached.score} {cached.away_team}
                      </span>
                    ) : (
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertTriangle size={12} /> Données manquantes
                      </span>
                    )}
                  </div>

                  <div>
                    {isCached ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11.5px', color: '#2ecc71', background: 'rgba(46, 204, 113, 0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(46, 204, 113, 0.2)', fontWeight: 600 }}>
                          Corners: {cached.first_half_corners_home}-{cached.first_half_corners_away} (1MT)
                        </span>
                        <button 
                          className="btn btn-secondary"
                          style={{ padding: '0 6px', height: '24px', fontSize: '10px' }}
                          onClick={() => handleOpenStatsModal(link, cached.home_team, cached.away_team, cached.tournament)}
                          title="Modifier les statistiques"
                        >
                          Modifier
                        </button>
                      </div>
                    ) : (
                      <button 
                        className="btn btn-primary"
                        style={{ 
                          fontSize: '11px', 
                          padding: '4px 10px', 
                          height: '26px',
                          background: 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)',
                          border: 'none'
                        }}
                        onClick={() => handleOpenStatsModal(link)}
                      >
                        Saisir Stats
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
