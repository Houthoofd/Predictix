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
  RefreshCw,
  MoreVertical,
  ShoppingCart,
  Zap
} from 'lucide-react';

// Pure Poisson CDF calculations and helper functions
const poissonUnder = (lambda, line) => {
  if (lambda <= 0) return 1;
  let sum = 0;
  let term = Math.exp(-lambda);
  for (let i = 0; i < line; i++) {
    sum += term;
    term = (term * lambda) / (i + 1);
  }
  return sum;
};

const poissonOver = (lambda, line) => {
  return 1 - poissonUnder(lambda, line);
};

function getMetricExplanation(key) {
  const explanations = {
    corners: 'Corners cumulés des deux équipes tirés durant la première mi-temps uniquement. Exclut les corners accordés mais non tirés avant le coup de sifflet de l\'arbitre.',
    fouls: 'Nombre total de fautes commises et sifflées par l\'arbitre durant le temps réglementaire (hors prolongations). Cumule les fautes des deux équipes sur le terrain.',
    yellow_cards: 'Total des cartons jaunes attribués aux joueurs actifs sur le terrain pendant le temps réglementaire. Exclut les cartons distribués aux remplaçants ou au staff.',
    red_cards: 'Total des cartons rouges (directs ou par second jaune consécutif) distribués aux joueurs actifs sur le terrain durant le temps réglementaire de la rencontre.',
    shots_on_target: 'Tentatives de tirs de part et d\'autre qui entrent directement dans le but ou qui auraient franchi la ligne sans l\'intervention décisive du gardien ou du défenseur.',
    shots: 'Somme cumulée de toutes les tentatives de tirs des deux clubs durant le match : inclut les tirs cadrés, tirs non-cadrés (hors-cadre) et tirs bloqués ou contrés.',
    offsides: 'Total des positions de hors-jeu signalées par le corps arbitral durant la rencontre et ayant entraîné un coup franc indirect pour l\'équipe adverse.',
    possession: 'Pourcentage moyen du temps de contrôle effectif du ballon par l\'équipe à domicile durant la rencontre, calculé sur les phases actives de passes.'
  };
  return explanations[key] || 'Indicateur statistique officiel de la rencontre évalué pour cette opportunité.';
}

function getMetricTitle(key) {
  const titles = {
    corners: 'Corners 1MT',
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
    poteau: 'Tirs sur Poteau'
  };
  if (titles[key]) return titles[key];
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getAverage(matches, metric, isHomeOnly = false, isAwayOnly = false, homeTeam, awayTeam) {
  if (!matches || !Array.isArray(matches) || matches.length === 0) return null;
  
  let sum = 0;
  let count = 0;
  
  for (const m of matches) {
    if (metric === 'corners') {
      if (isHomeOnly) {
        const val = m.home_team === homeTeam ? m.first_half_corners_home : m.first_half_corners_away;
        if (val !== null && val !== undefined) {
          sum += val;
          count++;
        }
      } else if (isAwayOnly) {
        const val = m.away_team === awayTeam ? m.first_half_corners_away : m.first_half_corners_home;
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
        const val = (isHomeOnly || m.home_team === homeTeam)
          ? parseFloat(stats.possession.home)
          : parseFloat(stats.possession.away);
        sum += val;
        count++;
      }
    } else if (stats[metric].home !== undefined && stats[metric].away !== undefined) {
      if (isHomeOnly) {
        const val = m.home_team === homeTeam ? parseFloat(stats[metric].home) : parseFloat(stats[metric].away);
        sum += val;
        count++;
      } else if (isAwayOnly) {
        const val = m.away_team === awayTeam ? parseFloat(stats[metric].away) : parseFloat(stats[metric].home);
        sum += val;
        count++;
      } else {
        sum += (parseFloat(stats[metric].home) + parseFloat(stats[metric].away));
        count++;
      }
    }
  }
  
  return count > 0 ? parseFloat((sum / count).toFixed(1)) : null;
}

const getValueBetsForMatch = (matchDetails) => {
  if (!matchDetails) return [];
  const list = [];
  const popularMarkets = ['corners', 'fouls', 'yellow_cards', 'red_cards', 'shots_on_target', 'shots', 'offsides'];
  
  const availableMetricsSet = new Set(['corners']);
  const allMatches = [
    matchDetails,
    ...(matchDetails.recent_h2h_matches || []),
    ...(matchDetails.recent_home_matches || []),
    ...(matchDetails.recent_away_matches || [])
  ];
  for (const m of allMatches) {
    if (m.statistics_json) {
      try {
        const stats = typeof m.statistics_json === 'string' ? JSON.parse(m.statistics_json) : m.statistics_json;
        if (stats && typeof stats === 'object') {
          Object.keys(stats).forEach(key => {
            if (stats[key] && (stats[key].home !== undefined || stats[key].away !== undefined)) {
              availableMetricsSet.add(key);
            }
          });
        }
      } catch (e) {}
    }
  }
  
  const metricsToScan = Array.from(availableMetricsSet).filter(m => popularMarkets.includes(m));
  
  for (const m of metricsToScan) {
    const homeAvg = getAverage(matchDetails.recent_home_matches, m, true, false, matchDetails.home_team, matchDetails.away_team);
    const awayAvg = getAverage(matchDetails.recent_away_matches, m, false, true, matchDetails.home_team, matchDetails.away_team);
    
    if (homeAvg !== null && awayAvg !== null) {
      const lambda = homeAvg + awayAvg;
      
      const startK = Math.max(0, Math.floor(lambda) - 4);
      const endK = Math.ceil(lambda) + 4;
      
      for (let k = startK; k <= endK; k++) {
        const line = k + 0.5;
        const overProb = poissonOver(lambda, line);
        const underProb = poissonUnder(lambda, line);
        
        if (overProb >= 0.53 && overProb <= 0.70) {
          list.push({
            metric: m,
            metricTitle: getMetricTitle(m),
            line,
            tip: 'Plus de',
            probability: Math.round(overProb * 100),
            fairOdds: 1 / overProb
          });
        }
        if (underProb >= 0.53 && underProb <= 0.70) {
          list.push({
            metric: m,
            metricTitle: getMetricTitle(m),
            line,
            tip: 'Moins de',
            probability: Math.round(underProb * 100),
            fairOdds: 1 / underProb
          });
        }
      }
    }
  }
  
  return list.sort((a, b) => b.probability - a.probability);
};

const formatHumanDate = (dateStr) => {
  if (!dateStr) return "Date inconnue";
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    try {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      if (!isNaN(d.getTime())) {
        const formatted = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const shortFormat = `${parts[2]}/${parts[1]}/${parts[0]}`;
        const friendly = formatted.charAt(0).toUpperCase() + formatted.slice(1);
        return `${friendly} (${shortFormat})`;
      }
    } catch (e) {}
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export default function MagicPredictionsTab({ 
  predictions, 
  handleQuickPlaceBet, 
  setSelectedMatchDetails, 
  handleAddToBasket, 
  handleInstantPlaceBet,
  selectedPredIds,
  setSelectedPredIds
}) {
  const [signals, setSignals] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [filterMetric, setFilterMetric] = React.useState('all');
  const [selectedBets, setSelectedBets] = React.useState({});
  const [activeKebabId, setActiveKebabId] = React.useState(null);

  React.useEffect(() => {
    const handleOutsideClick = () => {
      setActiveKebabId(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  const toggleKebab = (e, sigId) => {
    e.stopPropagation();
    setActiveKebabId(prev => prev === sigId ? null : sigId);
  };

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
        (() => {
          const dateGroups = {};
          filteredSignals.forEach(sig => {
            const dateVal = sig.date || 'Date inconnue';
            if (!dateGroups[dateVal]) dateGroups[dateVal] = [];
            dateGroups[dateVal].push(sig);
          });

          const sortedDates = Object.keys(dateGroups).sort((a, b) => b.localeCompare(a));

          return sortedDates.map((dateStr, dIdx) => {
            const signalsInDate = dateGroups[dateStr];

            return (
              <div key={dIdx} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                {/* Date Section Header */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '8px 0', 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  fontFamily: 'Outfit',
                  fontSize: '15px',
                  fontWeight: 800,
                  color: 'var(--text-primary)'
                }}>
                  <Calendar size={16} style={{ color: '#bf5af2' }} />
                  <span>{formatHumanDate(dateStr)}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, background: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: '10px', marginLeft: '6px' }}>
                    {signalsInDate.length} signal{signalsInDate.length > 1 ? 'aux' : ''}
                  </span>
                </div>

                <div className="grid-3" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                  {signalsInDate.map((sig) => {
                    const isPossession = sig.metric === 'possession';
                    const isSelected = selectedPredIds && selectedPredIds.includes(sig.match_id);

                    // Find full prediction details from props predictions
                    const matchDetails = (predictions || []).find(p => p.match_id === sig.match_id);
                    const valueBets = getValueBetsForMatch(matchDetails);
                    
                    // Selected value bet for this card:
                    // 1. If manually selected, use it.
                    // 2. Otherwise, prefer the value bet corresponding to the strategy's target metric (sig.metric).
                    // 3. Otherwise, fallback to the top calculated value bet.
                    const defaultBet = valueBets.find(b => b.metric === sig.metric) || (valueBets.length > 0 ? valueBets[0] : null);
                    const currentBet = selectedBets[sig.id] || defaultBet;
                    const activeBetMetric = currentBet ? currentBet.metric : sig.metric;

                    // Adapt prediction format to match what AddBetModal/handleQuickPlaceBet expects
                    const mappedPred = currentBet ? {
                      match_id: sig.match_id,
                      date: sig.date,
                      time: sig.time,
                      tournament: sig.tournament,
                      home_team: sig.home_team,
                      away_team: sig.away_team,
                      best_tip: currentBet.tip === 'Plus de' ? 'Over' : 'Under',
                      card_line: String(currentBet.line),
                      probability: `${currentBet.probability}%`,
                      win_rate: `${currentBet.probability}%`,
                      over_odds: currentBet.fairOdds.toFixed(2),
                      under_odds: currentBet.fairOdds.toFixed(2),
                      notes: `Placé depuis les Pronostics Magiques. Marché: ${currentBet.metricTitle} (${currentBet.tip} ${currentBet.line})`,
                      match_url: sig.match_url || ''
                    } : {
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
                      under_odds: '1.80',
                      notes: `Placé depuis les Pronostics Magiques. Règle: ${sig.strategy_name}`,
                      match_url: sig.match_url || ''
                    };

                    return (
                      <div 
                        key={sig.id} 
                        className="glass-card magic-signal-card"
                        onClick={() => {
                          if (typeof setSelectedMatchDetails === 'function') {
                            setSelectedMatchDetails(matchDetails || mappedPred);
                          }
                        }}
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          justifyContent: 'space-between', 
                          gap: '20px',
                          position: 'relative',
                          overflow: 'visible',
                          border: isSelected 
                            ? '1.5px solid #bf5af2' 
                            : '1px solid var(--border-color)',
                          boxShadow: 'none',
                          transform: isSelected ? 'translateY(-2px)' : 'translateY(0)',
                          cursor: 'pointer',
                          borderRadius: '16px',
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = isSelected ? '#bf5af2' : 'rgba(191, 90, 242, 0.5)';
                          e.currentTarget.style.transform = 'translateY(-4px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = isSelected ? '#bf5af2' : 'var(--border-color)';
                          e.currentTarget.style.transform = isSelected ? 'translateY(-2px)' : 'translateY(0)';
                        }}
                      >

                        <div style={{ zIndex: 1 }}>
                          {/* Top line with Tournament & Metric Badge */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={isSelected}
                                onChange={() => {
                                  if (isSelected) {
                                    setSelectedPredIds(prev => prev.filter(id => id !== sig.match_id));
                                  } else {
                                    setSelectedPredIds(prev => [...prev, sig.match_id]);
                                  }
                                }}
                                style={{ 
                                  width: '16px', 
                                  height: '16px', 
                                  cursor: 'pointer',
                                  accentColor: '#bf5af2'
                                }}
                              />
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {sig.tournament}
                              </span>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span className="badge" style={getMetricBadgeStyle(activeBetMetric)}>
                                  {getMetricLabel(activeBetMetric)}
                                </span>
                                <div className="tooltip-container" onClick={(e) => e.stopPropagation()}>
                                  <Info 
                                    size={13} 
                                    style={{ color: '#bf5af2', opacity: 0.8, cursor: 'help' }} 
                                  />
                                  <div className="tooltip-content" style={{
                                    position: 'absolute',
                                    bottom: '100%',
                                    right: '0',
                                    marginBottom: '8px',
                                    background: 'rgba(20, 20, 22, 0.97)',
                                    border: '1px solid rgba(191, 90, 242, 0.35)',
                                    color: 'var(--text-primary)',
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    fontSize: '11.5px',
                                    fontFamily: 'Outfit',
                                    fontWeight: 500,
                                    whiteSpace: 'normal',
                                    width: '260px',
                                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                                    zIndex: 100,
                                    pointerEvents: 'none',
                                    opacity: 0,
                                    transform: 'translateY(6px)',
                                    transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                                    textAlign: 'left',
                                    lineHeight: '1.45'
                                  }}>
                                    <div style={{ fontWeight: 700, color: '#bf5af2', marginBottom: '4px', fontSize: '12px' }}>
                                      {getMetricLabel(activeBetMetric)}
                                    </div>
                                    {getMetricExplanation(activeBetMetric)}
                                  </div>
                                </div>
                              </div>
                            </div>
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
                        </div>

                        {/* Bottom section with statistics detail & Action button */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 1 }}>
                          
                          {/* Dynamic sweet-spot Value Bets Dropdown Selector */}
                          {valueBets.length > 0 && (() => {
                            const activeBet = currentBet || valueBets[0];
                            const activeBetMetric = activeBet.metric;
                            const homeAvg = matchDetails 
                              ? getAverage(matchDetails.recent_home_matches, activeBetMetric, true, false, matchDetails.home_team, matchDetails.away_team) 
                              : null;
                            const awayAvg = matchDetails 
                              ? getAverage(matchDetails.recent_away_matches, activeBetMetric, false, true, matchDetails.home_team, matchDetails.away_team) 
                              : null;
                            const lambda = (homeAvg !== null && awayAvg !== null) ? (homeAvg + awayAvg) : null;
                            const h2hAvg = matchDetails 
                              ? getAverage(matchDetails.recent_h2h_matches, activeBetMetric, false, false, matchDetails.home_team, matchDetails.away_team) 
                              : null;

                            return (
                              <div style={{ 
                                background: 'rgba(191, 90, 242, 0.05)',
                                border: '1px solid rgba(191, 90, 242, 0.22)',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                boxShadow: 'inset 0 1px 4px rgba(191, 90, 242, 0.01)'
                              }} onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '9px', fontWeight: 800, color: '#bf5af2', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>VALUE BETS CALIBRÉS</span>
                                  </span>
                                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600 }}>
                                    {valueBets.length} opportunité{valueBets.length > 1 ? 's' : ''}
                                  </span>
                                </div>
                                
                                {valueBets.length > 1 ? (
                                  <select
                                    value={JSON.stringify(activeBet)}
                                    onChange={(e) => {
                                      const chosen = JSON.parse(e.target.value);
                                      setSelectedBets(prev => ({ ...prev, [sig.id]: chosen }));
                                    }}
                                    style={{
                                      width: '100%',
                                      background: 'rgba(0, 0, 0, 0.25)',
                                      border: '1px solid rgba(255, 255, 255, 0.08)',
                                      color: 'var(--text-primary)',
                                      borderRadius: '6px',
                                      padding: '5px 8px',
                                      fontSize: '11.5px',
                                      fontFamily: 'Outfit',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      outline: 'none'
                                    }}
                                  >
                                    {valueBets.map((bet, idx) => (
                                      <option key={idx} value={JSON.stringify(bet)} style={{ background: '#1c1c1e', color: '#fff' }}>
                                        {bet.tip} {bet.line} {bet.metricTitle} @ {bet.fairOdds.toFixed(2)} ({bet.probability}%)
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <div style={{ 
                                    fontSize: '12px', 
                                    fontWeight: 700, 
                                    color: 'var(--text-primary)', 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    padding: '2px 0'
                                  }}>
                                    <span>{activeBet.tip} {activeBet.line} {activeBet.metricTitle}</span>
                                    <span style={{ color: 'var(--color-success)', fontSize: '11px', background: 'rgba(16, 185, 129, 0.08)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.12)' }}>
                                      @{activeBet.fairOdds.toFixed(2)}
                                    </span>
                                  </div>
                                )}

                                {/* Premium Poisson Statistical Explanation Box */}
                                {lambda !== null && (
                                  <div style={{
                                    fontSize: '11px',
                                    color: 'var(--text-secondary)',
                                    background: 'rgba(0, 0, 0, 0.2)',
                                    border: '1px solid rgba(255, 255, 255, 0.04)',
                                    borderRadius: '6px',
                                    padding: '8px 10px',
                                    marginTop: '4px',
                                    lineHeight: '1.45'
                                  }}>
                                    Loi de Poisson estime <strong style={{ color: 'var(--color-success)' }}>{activeBet.probability}%</strong> de probabilité de voir {activeBet.tip.toLowerCase()} {activeBet.line} {getMetricLabel(activeBetMetric).toLowerCase()}. 
                                    Moyenne cumulée de lambda: <strong style={{ color: '#bf5af2' }}>{lambda.toFixed(1)}</strong> ({homeAvg.toFixed(1)} Dom, {awayAvg.toFixed(1)} Ext). 
                                    {h2hAvg !== null && ` Confrontations directes H2H: ${h2hAvg.toFixed(1)} en moyenne.`}
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Detailed average metrics */}
                          {(() => {
                            const activeBetMetric = currentBet ? currentBet.metric : sig.metric;
                            const activeH2hAvg = matchDetails 
                              ? getAverage(matchDetails.recent_h2h_matches, activeBetMetric, false, false, matchDetails.home_team, matchDetails.away_team) 
                              : null;
                            const displayAvg = (activeBetMetric === sig.metric && sig.avg_value !== undefined)
                              ? sig.avg_value
                              : (activeH2hAvg !== null ? activeH2hAvg : 'N/A');
                            const activeIsPossession = activeBetMetric === 'possession';

                            return (
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
                                  Moyenne H2H ({getMetricLabel(activeBetMetric)}) :
                                </span>
                                <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                                  {displayAvg}{activeIsPossession ? '%' : ''}
                                </strong>
                              </div>
                            );
                          })()}

                          <div style={{ display: 'flex', gap: '10px' }}>
                            {/* View Details on click */}
                            <button 
                              className="btn btn-secondary"
                              style={{ padding: '0 12px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Inspecter le match"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (typeof setSelectedMatchDetails === 'function') {
                                  setSelectedMatchDetails(matchDetails || mappedPred);
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

                            {/* Kebab action dropdown */}
                            <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                              <button 
                                className="btn btn-secondary"
                                style={{ 
                                  padding: '0 8px', 
                                  height: '36px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  borderColor: activeKebabId === sig.id ? '#bf5af2' : undefined,
                                  background: activeKebabId === sig.id ? 'rgba(191, 90, 242, 0.15)' : undefined
                                }}
                                title="Plus d'actions"
                                onClick={(e) => toggleKebab(e, sig.id)}
                              >
                                <MoreVertical size={16} />
                              </button>

                              {activeKebabId === sig.id && (
                                <div style={{
                                  position: 'absolute',
                                  bottom: '100%',
                                  right: 0,
                                  marginBottom: '8px',
                                  background: 'rgba(20, 20, 22, 0.97)',
                                  backdropFilter: 'blur(10px)',
                                  border: '1px solid rgba(191, 90, 242, 0.35)',
                                  borderRadius: '10px',
                                  padding: '6px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '4px',
                                  width: '180px',
                                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                                  zIndex: 1000,
                                  animation: 'fadeIn 0.15s ease-out'
                                }}>
                                  <button
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      padding: '8px 12px',
                                      background: 'transparent',
                                      border: 'none',
                                      color: 'var(--text-primary)',
                                      textAlign: 'left',
                                      fontSize: '12.5px',
                                      fontFamily: 'Outfit',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      borderRadius: '6px',
                                      transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                      e.currentTarget.style.color = '#bf5af2';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'transparent';
                                      e.currentTarget.style.color = 'var(--text-primary)';
                                    }}
                                    onClick={() => {
                                      handleAddToBasket(mappedPred);
                                      setActiveKebabId(null);
                                    }}
                                  >
                                    <ShoppingCart size={14} />
                                    Ajouter au Panier
                                  </button>
                                  <button
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      padding: '8px 12px',
                                      background: 'transparent',
                                      border: 'none',
                                      color: 'var(--text-primary)',
                                      textAlign: 'left',
                                      fontSize: '12.5px',
                                      fontFamily: 'Outfit',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      borderRadius: '6px',
                                      transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                      e.currentTarget.style.color = '#bf5af2';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'transparent';
                                      e.currentTarget.style.color = 'var(--text-primary)';
                                    }}
                                    onClick={() => {
                                      handleInstantPlaceBet(mappedPred);
                                      setActiveKebabId(null);
                                    }}
                                  >
                                    <Zap size={14} style={{ color: '#ffb300' }} />
                                    Placement Direct
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            );
          });
        })()
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

      {/* Styled inline spin animation for Refresh icon and custom tooltip popover */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 1.2s linear infinite;
        }
        .tooltip-container {
          position: relative;
          display: inline-flex;
          align-items: center;
        }
        .tooltip-container:hover .tooltip-content {
          opacity: 1 !important;
          pointer-events: auto !important;
          transform: translateY(0) !important;
        }
      `}</style>

    </div>
  );
}
