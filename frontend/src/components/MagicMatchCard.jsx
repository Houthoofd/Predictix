import React, { useState } from 'react';
import { Plus, TrendingUp } from 'lucide-react';
import {
  getMetricPeriodRatio,
  getAverage
} from '../utils/poissonUtils';
import MatchCardHeader from './MatchCardHeader';
import MatchCardTeams from './MatchCardTeams';
import MatchCardKebabMenu from './MatchCardKebabMenu';
import MatchCardValueBetSelector from './MatchCardValueBetSelector';

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
        <MatchCardHeader
          sig={sig}
          activeBetMetric={activeBetMetric}
          isSelected={isSelected}
          setSelectedPredIds={setSelectedPredIds}
        />
        <MatchCardTeams sig={sig} />
      </div>

      <div style={{ display: 'flex', zIndex: 1, flexDirection: 'column', gap: '12px' }}>
        {valueBets.length > 0 && currentBet && (
          <MatchCardValueBetSelector
            valueBets={valueBets}
            currentBet={currentBet}
            setSelectedBet={setSelectedBet}
            activeBetMetric={activeBetMetric}
            matchDetails={matchDetails}
            lambda={lambda}
            meanHome={meanHome}
            meanAway={meanAway}
            h2hAvg={h2hAvg}
          />
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
            Plus d'infos
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

          <MatchCardKebabMenu
            mappedPred={mappedPred}
            handleAddToBasket={handleAddToBasket}
            handleInstantPlaceBet={handleInstantPlaceBet}
          />
        </div>
      </div>
    </div>
  );
}
