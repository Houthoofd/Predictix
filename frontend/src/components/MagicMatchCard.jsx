import React, { useState } from 'react';
import { Calendar, Info, Sparkles, Plus, ShoppingCart, Eye, MoreVertical, Zap, TrendingUp } from 'lucide-react';
import {
  poissonUnder,
  bivariatePoissonUnder,
  getMetricPeriodRatio,
  getMetricExplanation,
  getAverage
} from '../utils/poissonUtils';

export default function MagicMatchCard({
  sig,
  predictions,
  selectedPredIds,
  setSelectedPredIds,
  setSelectedMatchDetails,
  handleAddToBasket,
  handleQuickPlaceBet,
  handleInstantPlaceBet,
  getValueBetsForMatch
}) {
  const [selectedBet, setSelectedBet] = useState(null);
  const [showKebab, setShowKebab] = useState(false);

  // Close kebab when clicking outside (using local state per card)
  React.useEffect(() => {
    if (!showKebab) return;
    const handleClose = () => setShowKebab(false);
    document.addEventListener('click', handleClose);
    return () => document.removeEventListener('click', handleClose);
  }, [showKebab]);

  const isPossession = sig.metric === 'possession';
  const isSelected = selectedPredIds && selectedPredIds.includes(sig.match_id);

  const matchDetails = (predictions || []).find(p => p.match_id === sig.match_id);
  const valueBets = getValueBetsForMatch(matchDetails);
  
  const defaultBet = valueBets.find(b => b.metric === sig.metric) || (valueBets.length > 0 ? valueBets[0] : null);
  const currentBet = selectedBet || defaultBet;
  const activeBetMetric = currentBet ? currentBet.metric : sig.metric;

  const simulatedOddsStr = currentBet ? (currentBet.fairOdds * 0.93).toFixed(2) : '1.90';

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
    over_odds: simulatedOddsStr,
    under_odds: simulatedOddsStr,
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

  const getMetricParameters = (mDetails, metric, period) => {
    if (!mDetails) return null;
    let mHome = 0;
    let mAway = 0;
    let cv = 0;
    let isGb = false;

    if (metric === 'corners' && mDetails.gbdt_predictions) {
      let gbdt = mDetails.gbdt_predictions;
      if (typeof gbdt === 'string') {
        try { gbdt = JSON.parse(gbdt); } catch (e) {}
      }
      const pred = gbdt && gbdt[period];
      if (pred) {
        mHome = parseFloat(pred.home_expected || pred.home_expected_corners || 0);
        mAway = parseFloat(pred.away_expected || pred.away_expected_corners || 0);
        cv = parseFloat(pred.covariance || 0);
        isGb = true;
        return { meanHome: mHome, meanAway: mAway, cov: cv, isGBDT: isGb };
      }
    }

    const hAvg = getAverage(mDetails.recent_home_matches, metric, true, false, mDetails.home_team, mDetails.away_team);
    const aAvg = getAverage(mDetails.recent_away_matches, metric, false, true, mDetails.home_team, mDetails.away_team);

    if (hAvg === null || aAvg === null) return null;

    if (metric === 'corners') {
      if (period === 'first_half') {
        mHome = hAvg;
        mAway = aAvg;
      } else if (period === 'second_half') {
        mHome = hAvg * (0.54 / 0.46);
        mAway = aAvg * (0.54 / 0.46);
      } else {
        mHome = hAvg / 0.46;
        mAway = aAvg / 0.46;
      }
    } else {
      const ratio = getMetricPeriodRatio(metric, period);
      mHome = hAvg * ratio;
      mAway = aAvg * ratio;
    }

    return { meanHome: mHome, meanAway: mAway, cov: cv, isGBDT: isGb };
  };

  const activePeriod = currentBet?.period || 'full_time';
  const params = getMetricParameters(matchDetails, activeBetMetric, activePeriod);
  const meanHome = params ? params.meanHome : 0;
  const meanAway = params ? params.meanAway : 0;
  const lambda = params ? (meanHome + meanAway) : null;

  const h2hAvg = matchDetails 
    ? getAverage(matchDetails.recent_h2h_matches, activeBetMetric, false, false, matchDetails.home_team, matchDetails.away_team) 
    : null;

  const displayAvg = (activeBetMetric === sig.metric && sig.avg_value !== undefined)
    ? sig.avg_value
    : (h2hAvg !== null ? h2hAvg : 'N/A');

  return (
    <div 
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
        border: isSelected ? '1.5px solid #bf5af2' : '1px solid var(--border-color)',
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
      {valueBets.length > 0 && currentBet && currentBet.probability === valueBets[0].probability && (
        <div style={{
          position: 'absolute',
          top: '-10px',
          left: '20px',
          background: 'linear-gradient(135deg, #bf5af2 0%, #0082ff 100%)',
          color: '#fff',
          padding: '3px 10px',
          borderRadius: '12px',
          fontSize: '10.5px',
          fontWeight: 800,
          boxShadow: '0 4px 12px rgba(191, 90, 242, 0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          zIndex: 2,
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <span>Pari Recommandé</span>
        </div>
      )}

      <div style={{ zIndex: 1 }}>
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
              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#bf5af2' }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {sig.sport && sig.sport !== 'football' && (
                <span style={{ background: 'rgba(0, 130, 255, 0.15)', color: '#0082ff', padding: '2px 6px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  {sig.sport}
                </span>
              )}
              <span>{sig.tournament}</span>
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge" style={getMetricBadgeStyle(activeBetMetric)}>
                {getMetricLabel(activeBetMetric)}
              </span>
              <div className="tooltip-container" onClick={(e) => e.stopPropagation()}>
                <Info size={13} style={{ color: '#bf5af2', opacity: 0.8, cursor: 'help' }} />
                <div className="tooltip-content" style={{
                  position: 'absolute', bottom: '100%', right: '0', marginBottom: '8px',
                  background: 'rgba(20, 20, 22, 0.97)', border: '1px solid rgba(191, 90, 242, 0.35)',
                  color: 'var(--text-primary)', padding: '10px 14px', borderRadius: '8px',
                  fontSize: '11.5px', fontFamily: 'Outfit', fontWeight: 500, whiteSpace: 'normal',
                  width: '260px', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                  zIndex: 100, pointerEvents: 'none', opacity: 0, transform: 'translateY(6px)',
                  transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)', textAlign: 'left', lineHeight: '1.45'
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

        <div style={{ display: 'flex', gap: '12px', fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '16px', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={12} style={{ opacity: 0.6 }} />
            {sig.date}
          </span>
          <span>•</span>
          <span>{sig.time}</span>
        </div>
      </div>

      <div style={{ display: 'flex', zIndex: 1, flexDirection: 'column', gap: '12px' }}>
        {valueBets.length > 0 && currentBet && (
          <div style={{ 
            background: 'rgba(191, 90, 242, 0.05)', border: '1px solid rgba(191, 90, 242, 0.22)',
            padding: '10px 12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '6px'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '9px', fontWeight: 800, color: '#bf5af2', textTransform: 'uppercase', letterSpacing: '0.08em' }}>VALUE BETS CALIBRÉS</span>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600 }}>{valueBets.length} opportunités</span>
            </div>
            
            {valueBets.length > 1 ? (
              <select
                value={JSON.stringify(currentBet)}
                onChange={(e) => setSelectedBet(JSON.parse(e.target.value))}
                style={{
                  width: '100%', background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-primary)', borderRadius: '6px', padding: '5px 8px',
                  fontSize: '11.5px', fontFamily: 'Outfit', fontWeight: 600, cursor: 'pointer', outline: 'none'
                }}
              >
                {valueBets.map((bet, idx) => (
                  <option key={idx} value={JSON.stringify(bet)} style={{ background: '#1c1c1e', color: '#fff' }}>
                    {bet.tip} {bet.line} {bet.metricTitle} @ {(bet.fairOdds * 0.93).toFixed(2)} ({bet.probability}%)
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
                <span>{currentBet.tip} {currentBet.line} {currentBet.metricTitle}</span>
                <span style={{ color: 'var(--color-success)', fontSize: '11px', background: 'rgba(16, 185, 129, 0.08)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.12)' }}>
                  @{(currentBet.fairOdds * 0.93).toFixed(2)}
                </span>
              </div>
            )}

            {activeBetMetric === 'corners' && matchDetails && matchDetails.gbdt_predictions ? (
              <div style={{ background: 'rgba(191, 90, 242, 0.04)', border: '1px solid rgba(191, 90, 242, 0.15)', borderRadius: '10px', padding: '12px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#bf5af2', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={11} /> Prédictions GBDT (Poisson Bivarié)
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {['first_half', 'second_half', 'full_time'].map((period) => {
                    let gbdt = matchDetails.gbdt_predictions;
                    if (typeof gbdt === 'string') {
                      try { gbdt = JSON.parse(gbdt); } catch(e) {}
                    }
                    const expVal = gbdt?.[period]?.expected || 'N/A';
                    const labels = { first_half: '1ère MT', second_half: '2ème MT', full_time: 'Match' };
                    return (
                      <div key={period} style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '8px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>{labels[period]}</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#bf5af2' }}>{expVal}<span style={{ fontSize: '9px', color: 'var(--text-muted)', marginLeft: '2px', fontWeight: 500 }}>corn.</span></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              lambda !== null && (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '6px', padding: '8px 10px', marginTop: '4px', lineHeight: '1.45' }}>
                  Loi de Poisson estime <strong style={{ color: 'var(--color-success)' }}>{currentBet.probability}%</strong> de probabilité de voir {currentBet.tip.toLowerCase()} {currentBet.line} {getMetricLabel(activeBetMetric).toLowerCase()} ({currentBet.periodLabel}). 
                  Moyenne cumulée : <strong style={{ color: '#bf5af2' }}>{lambda.toFixed(1)}</strong> ({meanHome.toFixed(1)} Dom, {meanAway.toFixed(1)} Ext). 
                  {h2hAvg !== null && ` H2H : ${h2hAvg.toFixed(1)} en moy.`}
                </div>
              )
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '12.5px', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <TrendingUp size={13} style={{ color: 'var(--color-success)' }} />
            Moyenne H2H ({getMetricLabel(activeBetMetric)}) :
          </span>
          <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
            {displayAvg}{activeBetMetric === 'possession' ? '%' : ''}
          </strong>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
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

          <button 
            className="btn btn-primary" 
            style={{ flexGrow: 1, height: '36px', background: 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={(e) => {
              e.stopPropagation();
              handleQuickPlaceBet(mappedPred);
            }}
          >
            <Plus size={16} />
            <span style={{ fontSize: '12.5px', fontWeight: 600 }}>Placer ce Pari</span>
          </button>

          <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button 
              className="btn btn-secondary"
              style={{ padding: '0 8px', height: '36px', display: 'flex', alignItems: 'center', justifyItems: 'center', borderColor: showKebab ? '#bf5af2' : undefined, background: showKebab ? 'rgba(191, 90, 242, 0.15)' : undefined }}
              title="Plus d'actions"
              onClick={() => setShowKebab(prev => !prev)}
            >
              <MoreVertical size={16} />
            </button>

            {showKebab && (
              <div style={{
                position: 'absolute', bottom: '100%', right: 0, marginBottom: '8px',
                background: 'rgba(20, 20, 22, 0.97)', backdropFilter: 'blur(10px)',
                border: '1px solid rgba(191, 90, 242, 0.35)', borderRadius: '10px',
                padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px',
                width: '180px', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                zIndex: 1000,
              }}>
                <button
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                    background: 'transparent', border: 'none', color: 'var(--text-primary)',
                    textAlign: 'left', fontSize: '12.5px', fontFamily: 'Outfit', fontWeight: 600,
                    cursor: 'pointer', borderRadius: '6px', transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#bf5af2'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onClick={() => { handleAddToBasket(mappedPred); setShowKebab(false); }}
                >
                  <ShoppingCart size={14} />
                  Ajouter au Panier
                </button>
                <button
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                    background: 'transparent', border: 'none', color: 'var(--text-primary)',
                    textAlign: 'left', fontSize: '12.5px', fontFamily: 'Outfit', fontWeight: 600,
                    cursor: 'pointer', borderRadius: '6px', transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#bf5af2'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onClick={() => { handleInstantPlaceBet(mappedPred); setShowKebab(false); }}
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
}
