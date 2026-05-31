import React from 'react';
import { 
  Sparkles, 
  Calendar, 
  AlertCircle, 
  Plus, 
  TrendingUp, 
  Eye, 
  ShieldCheck, 
  Info,
  RefreshCw
} from 'lucide-react';

export default function MagicPredictionsTab({ handleQuickPlaceBet, setSelectedMatchDetails }) {
  const [signals, setSignals] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [filterMetric, setFilterMetric] = React.useState('all');

  const fetchSignals = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/predictions/magic');
      const json = await res.json();
      if (json.success) {
        setSignals(json.data || []);
      } else {
        setError(json.error?.message || 'Impossible de charger les pronostics magiques.');
      }
    } catch (err) {
      setError('Erreur réseau lors de la récupération des signaux.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchSignals();
  }, []);

  const getMetricBadgeStyle = (metric) => {
    switch (metric) {
      case 'fouls':
        return { background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' };
      case 'yellow_cards':
        return { background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', color: '#eab308' };
      case 'possession':
        return { background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#3b82f6' };
      case 'shots_on_target':
      case 'shots':
        return { background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981' };
      default:
        return { background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#8b5cf6' };
    }
  };

  const getMetricLabel = (metric) => {
    const labels = {
      fouls: 'Fautes',
      yellow_cards: 'Cartons Jaunes',
      possession: 'Possession',
      shots_on_target: 'Tirs Cadrés',
      shots: 'Tirs',
      offsides: 'Hors-jeu',
      corners: 'Corners'
    };
    return labels[metric] || metric;
  };

  // Extract unique metrics in active signals for filtering
  const availableMetrics = ['all', ...new Set(signals.map(s => s.metric))];

  const filteredSignals = filterMetric === 'all' 
    ? signals 
    : signals.filter(s => s.metric === filterMetric);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Header and explanation */}
      <div className="glass-card accent-left" style={{
        background: 'linear-gradient(135deg, rgba(127, 0, 255, 0.08) 0%, rgba(0, 98, 255, 0.02) 100%)',
        borderLeft: '4px solid #7f00ff',
        boxShadow: '0 8px 32px rgba(127, 0, 255, 0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '22px', fontFamily: 'Outfit', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={22} style={{ color: '#bf5af2' }} />
              Pronostics Magiques
            </h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '900px' }}>
              Découvrez les opportunités de paris sportifs basées sur vos **stratégies sur-mesure**. 
              Notre Screener réactif scrute en continu les statistiques des confrontations directes H2H pour repérer 
              automatiquement les prochains matchs remplissant rigoureusement vos critères personnalisés (fautes, cartons, possession, tirs).
            </p>
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={fetchSignals} 
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px', alignSelf: 'center' }}
          >
            <RefreshCw size={16} className={loading ? 'spin-animation' : ''} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Filter and stats row */}
      {signals.length > 0 && (
        <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {availableMetrics.map((met) => (
              <button
                key={met}
                className={`btn ${filterMetric === met ? 'btn-primary' : 'btn-secondary'}`}
                style={{ 
                  padding: '6px 14px', 
                  fontSize: '12.5px', 
                  borderRadius: '20px',
                  background: filterMetric === met ? 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)' : undefined,
                  border: filterMetric === met ? 'none' : undefined,
                }}
                onClick={() => setFilterMetric(met)}
              >
                {met === 'all' ? 'Tous les signaux' : getMetricLabel(met)}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Signaux détectés : <strong style={{ color: '#bf5af2' }}>{filteredSignals.length}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Main content grid */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', gap: '15px' }}>
          <div className="loading-spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(127, 0, 255, 0.1)', borderTopColor: '#bf5af2', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Screening en cours des cibles statistiques...</span>
        </div>
      ) : error ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px', borderColor: 'rgba(244, 63, 94, 0.2)' }}>
          <AlertCircle size={36} style={{ marginBottom: '12px', color: 'var(--color-danger)' }} />
          <p style={{ fontWeight: 600 }}>{error}</p>
          <button className="btn btn-primary" onClick={fetchSignals} style={{ marginTop: '16px' }}>Réessayer</button>
        </div>
      ) : filteredSignals.length > 0 ? (
        <div className="grid-3" style={{ animation: 'fadeIn 0.3s ease-out' }}>
          {filteredSignals.map((sig) => {
            const dateStr = sig.date || '';
            const isPossession = sig.metric === 'possession';

            // Adapt prediction format to match what AddBetModal/handleQuickPlaceBet expects
            const mappedPred = {
              match_id: sig.match_id,
              date: sig.date,
              time: sig.time,
              tournament: sig.tournament,
              home_team: sig.home_team,
              away_team: sig.away_team,
              best_tip: isPossession ? 'Possession' : `Plus de`,
              card_line: isPossession ? `${sig.threshold}%` : `${sig.threshold}`,
              odds_corners: [],
              probability: '75%',
              win_rate: '65%',
              over_odds: isPossession ? '1.85' : '1.90',
              under_odds: '1.80'
            };

            return (
              <div 
                key={sig.id} 
                className="glass-card magic-signal-card"
                onClick={() => {
                  if (typeof setSelectedMatchDetails === 'function') {
                    setSelectedMatchDetails(mappedPred);
                  }
                }}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between', 
                  gap: '20px',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid rgba(127, 0, 255, 0.15)',
                  boxShadow: '0 8px 30px rgba(127, 0, 255, 0.04)',
                  cursor: 'pointer',
                  borderRadius: '16px',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#bf5af2';
                  e.currentTarget.style.boxShadow = '0 12px 35px rgba(127, 0, 255, 0.12)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(127, 0, 255, 0.15)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(127, 0, 255, 0.04)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                
                {/* Visual Magic Gradient Background Glow */}
                <div style={{
                  position: 'absolute',
                  top: '-50px',
                  right: '-50px',
                  width: '120px',
                  height: '120px',
                  background: 'radial-gradient(circle, rgba(127, 0, 255, 0.15) 0%, rgba(127, 0, 255, 0) 70%)',
                  pointerEvents: 'none',
                  zIndex: 0
                }}></div>

                <div style={{ zIndex: 1 }}>
                  {/* Top line with Tournament & Metric Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {sig.tournament}
                    </span>
                    
                    <span className="badge" style={getMetricBadgeStyle(sig.metric)}>
                      {getMetricLabel(sig.metric)}
                    </span>
                  </div>

                  {/* Teams info */}
                  <h4 style={{ fontSize: '16px', fontFamily: 'Outfit', lineHeight: 1.3, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {sig.home_logo ? (
                      <img src={sig.home_logo} alt="" referrerPolicy="no-referrer" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--bg-tertiary)' }} />
                    )}
                    <span>{sig.home_team}</span>
                  </h4>
                  <h4 style={{ fontSize: '16px', fontFamily: 'Outfit', lineHeight: 1.3, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {sig.away_logo ? (
                      <img src={sig.away_logo} alt="" referrerPolicy="no-referrer" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--bg-tertiary)' }} />
                    )}
                    <span>{sig.away_team}</span>
                  </h4>

                  {/* Date & Time metadata */}
                  <div style={{ display: 'flex', gap: '12px', fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '16px', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} style={{ opacity: 0.6 }} />
                      {dateStr}
                    </span>
                    <span>•</span>
                    <span>{sig.time}</span>
                  </div>

                  {/* Dynamic justification box (Rationale) */}
                  <div style={{ 
                    background: 'rgba(127, 0, 255, 0.03)', 
                    border: '1px dashed rgba(127, 0, 255, 0.15)', 
                    padding: '12px 14px', 
                    borderRadius: '10px',
                    fontSize: '12.5px',
                    lineHeight: 1.5,
                    color: 'var(--text-primary)',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'flex-start',
                    marginBottom: '10px'
                  }}>
                    <Info size={16} style={{ color: '#bf5af2', flexShrink: 0, marginTop: '2px' }} />
                    <span>{sig.rationale}</span>
                  </div>
                </div>

                {/* Bottom section with statistics detail & Action button */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 1 }}>
                  
                  {/* Detailed average metrics */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    background: 'var(--bg-tertiary)', 
                    padding: '10px 14px', 
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '12.5px',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <TrendingUp size={13} style={{ color: 'var(--color-success)' }} />
                      Moyenne H2H calculée :
                    </span>
                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                      {sig.avg_value}{isPossession ? '%' : ''}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    {/* View Details on click */}
                    <button 
                      className="btn btn-secondary"
                      style={{ padding: '0 12px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Inspecter le match"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (typeof setSelectedMatchDetails === 'function') {
                          setSelectedMatchDetails(mappedPred);
                        }
                      }}
                    >
                      <Eye size={16} />
                    </button>

                    {/* Quick Place Bet button */}
                    <button 
                      className="btn btn-primary" 
                      style={{ 
                        flexGrow: 1, 
                        height: '36px',
                        background: 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickPlaceBet(mappedPred);
                      }}
                    >
                      <Plus size={16} />
                      <span style={{ fontSize: '12.5px', fontWeight: 600 }}>Placer ce Pari</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card" style={{ textAlign: 'center', padding: '70px 20px', color: 'var(--text-muted)' }}>
          <Sparkles size={40} style={{ marginBottom: '12px', color: 'var(--text-muted)', opacity: 0.5 }} />
          <p style={{ fontWeight: 600, fontSize: '16px' }}>Aucun signal magique détecté pour le moment.</p>
          <p style={{ fontSize: '13px', marginTop: '6px', maxWidth: '500px', margin: '6px auto 0 auto', lineHeight: 1.5 }}>
            Créez ou activez des stratégies magiques en langage naturel dans l'onglet **Stratégies**, 
            puis lancez le scraper dans **Match en Direct** pour découvrir des matchs et évaluer leurs H2H !
          </p>
        </div>
      )}

      {/* Styled inline spin animation for Refresh icon */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 1.2s linear infinite;
        }
      `}</style>

    </div>
  );
}
