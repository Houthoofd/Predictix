import React, { useState } from 'react';
import { Lightbulb, AlertTriangle } from 'lucide-react';
import {
  poissonUnder,
  poissonOver,
  bivariatePoissonOver,
  getMetricPeriodRatio,
  bivariatePoissonPMF
} from '../utils/poissonUtils';
import PoissonSimulatorTable from './PoissonSimulatorTable';

const lnFactCache = [0, 0];
const lnFactorial = (n) => {
  if (n <= 1) return 0;
  if (lnFactCache[n] !== undefined) return lnFactCache[n];
  let res = lnFactCache[lnFactCache.length - 1];
  for (let i = lnFactCache.length; i <= n; i++) {
    res += Math.log(i);
    lnFactCache[i] = res;
  }
  return res;
};

const stablePoissonPMF = (x, lambda) => {
  if (lambda <= 0) return x === 0 ? 1 : 0;
  if (x < 0) return 0;
  const lnFact = lnFactorial(x);
  return Math.exp(x * Math.log(lambda) - lambda - lnFact);
};

const getBivariateProb = (x, y, meanHome, meanAway, cov) => {
  if (cov <= 0) {
    return stablePoissonPMF(x, meanHome) * stablePoissonPMF(y, meanAway);
  }
  return bivariatePoissonPMF(x, y, meanHome, meanAway, cov);
};

export default function MatchDetailsPoissonSimulator({
  selectedMatchDetails,
  activeMetric,
  metricTitle,
  handleQuickPlaceBet,
  setSelectedMatchDetails,
  getAverage,
  getMetricTitle
}) {
  const isBasket = selectedMatchDetails?.sport === 'basketball';
  const isHockey = selectedMatchDetails?.sport === 'hockey' || selectedMatchDetails?.sport === 'ice-hockey';
  const isTennis = selectedMatchDetails?.sport === 'tennis';
  const initialPeriod = isBasket ? 'quarter_1' : (isHockey ? 'period_1' : 'first_half');
  const [simPeriod, setSimPeriod] = useState(initialPeriod);

  React.useEffect(() => {
    setSimPeriod(initialPeriod);
  }, [selectedMatchDetails?.match_id, isBasket, isHockey, isTennis]);

  const [payoutRatio, setPayoutRatio] = useState(0.93);
  const [userOdds, setUserOdds] = useState({});
  const [winnerUserOdds, setWinnerUserOdds] = useState({ home: '', draw: '', away: '' });
  const [hoveredRowKey, setHoveredRowKey] = useState(null);
  const [hoveredWinnerKey, setHoveredWinnerKey] = useState(null);
  const [customLineInput, setCustomLineInput] = useState('');
  const [customLines, setCustomLines] = useState([]);

  React.useEffect(() => {
    let initialWinnerOdds = { home: '', draw: '', away: '' };
    let initialUserOdds = {};
    
    if (selectedMatchDetails?.odds_corners) {
      try {
        const oddsList = typeof selectedMatchDetails.odds_corners === 'string'
          ? JSON.parse(selectedMatchDetails.odds_corners)
          : selectedMatchDetails.odds_corners;
        if (Array.isArray(oddsList)) {
          const matchWinnerOdds = oddsList.find(o => o.market_type === 'winner' || o.market_type === 'full_time');
          if (matchWinnerOdds) {
            initialWinnerOdds = {
              home: matchWinnerOdds.home_odds ? String(matchWinnerOdds.home_odds) : '',
              draw: matchWinnerOdds.draw_odds ? String(matchWinnerOdds.draw_odds) : '',
              away: matchWinnerOdds.away_odds ? String(matchWinnerOdds.away_odds) : ''
            };
          }
          
          oddsList.forEach(o => {
            if (o.market_type === 'totals' && o.period && o.line !== undefined) {
              const overKey = `${o.period}-${o.line}-over`;
              const underKey = `${o.period}-${o.line}-under`;
              if (o.over_odds) initialUserOdds[overKey] = String(o.over_odds);
              if (o.under_odds) initialUserOdds[underKey] = String(o.under_odds);
            }
          });
        }
      } catch (e) {
        console.error("Failed to parse odds_corners:", e);
      }
    }
    
    setWinnerUserOdds(initialWinnerOdds);
    setUserOdds(initialUserOdds);
  }, [selectedMatchDetails?.match_id, selectedMatchDetails?.odds_corners]);

  let meanHome = 0;
  let meanAway = 0;
  let cov = 0;
  let isGBDT = false;

  if (activeMetric === 'corners' && selectedMatchDetails.gbdt_predictions) {
    let gbdt = selectedMatchDetails.gbdt_predictions;
    if (typeof gbdt === 'string') {
      try { gbdt = JSON.parse(gbdt); } catch (e) {}
    }
    const pred = gbdt && gbdt[simPeriod];
    if (pred) {
      meanHome = parseFloat(pred.home_expected || pred.home_expected_corners || 0);
      meanAway = parseFloat(pred.away_expected || pred.away_expected_corners || 0);
      cov = parseFloat(pred.covariance || 0);
      isGBDT = true;
    }
  } else if (isBasket && (activeMetric === 'goals' || activeMetric === 'first_half_points') && selectedMatchDetails.home_avg_first_half_points !== undefined && selectedMatchDetails.home_avg_first_half_points !== null) {
    if (simPeriod === 'first_half') {
      meanHome = selectedMatchDetails.home_avg_first_half_points;
      meanAway = selectedMatchDetails.away_avg_first_half_points;
      cov = selectedMatchDetails.covariance_basket_1mt || 0;
      isGBDT = !!selectedMatchDetails.covariance_basket_1mt;
    } else if (simPeriod === 'quarter_1' && selectedMatchDetails.home_avg_first_quarter_points !== undefined && selectedMatchDetails.home_avg_first_quarter_points !== null) {
      meanHome = selectedMatchDetails.home_avg_first_quarter_points;
      meanAway = selectedMatchDetails.away_avg_first_quarter_points;
      cov = selectedMatchDetails.covariance_basket_1qt || 0;
      isGBDT = !!selectedMatchDetails.covariance_basket_1qt;
    } else {
      const hAvg = selectedMatchDetails.home_avg_first_half_points / 0.502;
      const aAvg = selectedMatchDetails.away_avg_first_half_points / 0.502;
      const ratio = { quarter_1: 0.254, quarter_2: 0.248, quarter_3: 0.250, quarter_4: 0.248, first_half: 0.502, second_half: 0.498, full_time: 1.00 }[simPeriod] || 0.25;
      meanHome = hAvg * ratio;
      meanAway = aAvg * ratio;
      cov = 0;
    }
  } else {
    let hAvg;
    let aAvg;
    if (selectedMatchDetails.sport === 'basketball' && (activeMetric === 'first_half_points' || activeMetric === 'goals') && selectedMatchDetails.home_avg_first_half_points !== undefined && selectedMatchDetails.home_avg_first_half_points !== null) {
      hAvg = selectedMatchDetails.home_avg_first_half_points / 0.502;
      aAvg = selectedMatchDetails.away_avg_first_half_points / 0.502;
    } else {
      hAvg = getAverage(selectedMatchDetails.recent_home_matches, activeMetric, true);
      aAvg = getAverage(selectedMatchDetails.recent_away_matches, activeMetric, false, true);
    }
    
    if (hAvg === null || aAvg === null) {
      return (
        <div style={{
          padding: '24px 16px',
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px dashed rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <AlertTriangle size={20} style={{ color: 'var(--color-warning)' }} />
          <span>Pas assez de données historiques récurrentes pour simuler les cotes de cet indicateur ({metricTitle}).</span>
        </div>
      );
    }
    
    let ratio = getMetricPeriodRatio(activeMetric, simPeriod);
    if (isBasket) {
      ratio = { quarter_1: 0.254, quarter_2: 0.248, quarter_3: 0.250, quarter_4: 0.248, first_half: 0.502, second_half: 0.498, full_time: 1.00 }[simPeriod] || 0.25;
    } else if (isHockey) {
      ratio = { period_1: 0.333, period_2: 0.333, period_3: 0.334, full_time: 1.00 }[simPeriod] || 0.333;
    } else if (isTennis) {
      ratio = { first_half: 0.50, second_half: 0.50, full_time: 1.00 }[simPeriod] || 0.50;
    }
    meanHome = hAvg * ratio;
    meanAway = aAvg * ratio;
    cov = 0;
  }

  let defaultLines = [];
  if (activeMetric === 'corners') {
    defaultLines = simPeriod === 'full_time' ? [7.5, 8.5, 9.5, 10.5, 11.5] : [2.5, 3.5, 4.5, 5.5];
  } else {
    const lambda = meanHome + meanAway;
    let standardLine = Math.round(lambda);
    if (standardLine <= 0) standardLine = 1;
    standardLine = standardLine - 0.5;
    if (isBasket) {
      defaultLines = [
        standardLine - 5, standardLine - 4, standardLine - 3,
        standardLine - 2, standardLine - 1, standardLine,
        standardLine + 1, standardLine + 2, standardLine + 3,
        standardLine + 4, standardLine + 5
      ].filter(v => v >= 0.5);
    } else {
      defaultLines = [standardLine - 2, standardLine - 1, standardLine, standardLine + 1, standardLine + 2].filter(v => v >= 0.5);
    }
  }
  const allLinesForPeriod = [...defaultLines, ...customLines.filter(l => !defaultLines.includes(l))].sort((a, b) => a - b);

  const handleAddCustomLine = (e) => {
    e.preventDefault();
    const parsed = parseFloat(customLineInput);
    if (!isNaN(parsed) && parsed > 0 && !customLines.includes(parsed)) {
      setCustomLines([...customLines, parsed]);
      setCustomLineInput('');
    }
  };

  const labelsMap = isBasket
    ? { quarter_1: 'Q1', quarter_2: 'Q2', quarter_3: 'Q3', quarter_4: 'Q4', first_half: '1ère MT', second_half: '2ème MT', full_time: 'Match' }
    : isHockey
    ? { period_1: 'P1', period_2: 'P2', period_3: 'P3', full_time: 'Match Entier' }
    : isTennis
    ? { first_half: 'Set 1', second_half: 'Set 2', full_time: 'Match Entier' }
    : { first_half: '1ère MT', second_half: '2ème MT', full_time: 'Match Entier' };

  const longLabelsMap = isBasket
    ? { quarter_1: 'Q1', quarter_2: 'Q2', quarter_3: 'Q3', quarter_4: 'Q4', first_half: '1ère Mi-Temps', second_half: '2ème Mi-Temps', full_time: 'Match' }
    : isHockey
    ? { period_1: '1ère Période', period_2: '2ème Période', period_3: '3ème Période', full_time: 'Match' }
    : isTennis
    ? { first_half: '1er Set', second_half: '2ème Set', full_time: 'Match' }
    : { first_half: '1ère MT', second_half: '2ème MT', full_time: 'Match' };

  const periodNote = labelsMap[simPeriod] || 'Match Entier';
  const periodLabel = longLabelsMap[simPeriod] || 'Match';

  const handlePlaceBetFromSimulator = (line, option, prob, fairOdds, bookieOdds, customOddsInputVal) => {
    if (!handleQuickPlaceBet) return;
    
    const isOver = option === 'Over';
    const oddsVal = parseFloat(customOddsInputVal);
    const selectedOdds = !isNaN(oddsVal) && oddsVal > 0 ? oddsVal : parseFloat(bookieOdds);

    const pred = {
      match_id: selectedMatchDetails.match_id,
      date: selectedMatchDetails.date,
      time: selectedMatchDetails.time,
      tournament: selectedMatchDetails.tournament,
      home_team: selectedMatchDetails.home_team,
      away_team: selectedMatchDetails.away_team,
      best_tip: option,
      card_line: line,
      probability: `${Math.round(prob * 100)}%`,
      win_rate: 'N/A',
      over_odds: isOver ? selectedOdds : 1.85,
      under_odds: !isOver ? selectedOdds : 1.85,
      match_url: selectedMatchDetails.match_url || '',
      notes: `Simulation Poisson - ${getMetricTitle(activeMetric)} [${periodNote}]. Option: ${option === 'Over' ? 'Plus de' : 'Moins de'} ${line} (Probabilité: ${Math.round(prob * 100)}%, Cote Estimée: ${bookieOdds.toFixed(2)}, Cote Juste: ${fairOdds.toFixed(2)})`,
      sport: selectedMatchDetails.sport || 'football'
    };

    handleQuickPlaceBet(pred);
    setSelectedMatchDetails(null);
  };

  const handlePlaceWinnerBet = (outcome, prob, fairOdds, bookieOdds, customOddsInputVal) => {
    if (!handleQuickPlaceBet) return;
    
    const oddsVal = parseFloat(customOddsInputVal);
    const selectedOdds = !isNaN(oddsVal) && oddsVal > 0 ? oddsVal : parseFloat(bookieOdds);

    const outcomeLabels = {
      '1': selectedMatchDetails?.home_team || 'Domicile',
      'N': 'Match Nul',
      '2': selectedMatchDetails?.away_team || 'Extérieur'
    };

    const pred = {
      match_id: selectedMatchDetails.match_id,
      date: selectedMatchDetails.date,
      time: selectedMatchDetails.time,
      tournament: selectedMatchDetails.tournament,
      home_team: selectedMatchDetails.home_team,
      away_team: selectedMatchDetails.away_team,
      best_tip: outcome,
      card_line: 0,
      probability: `${Math.round(prob * 100)}%`,
      win_rate: 'N/A',
      over_odds: selectedOdds,
      under_odds: selectedOdds,
      match_url: selectedMatchDetails.match_url || '',
      notes: `Simulation Vainqueur - ${outcomeLabels[outcome]} [${periodNote}] (Probabilité: ${Math.round(prob * 100)}%, Cote Estimée: ${bookieOdds.toFixed(2)}, Cote Juste: ${fairOdds.toFixed(2)})`,
      sport: selectedMatchDetails.sport || 'football'
    };

    handleQuickPlaceBet(pred);
    setSelectedMatchDetails(null);
  };

  const calculateEdge = (userVal, fairVal) => {
    if (!userVal || isNaN(userVal)) return null;
    const probImplied = 1 / userVal;
    const probFair = 1 / fairVal;
    return (probFair / probImplied - 1) * 100;
  };

  // Scraped 1XBet winner odds for display
  let scrapedHomeOdds = '';
  let scrapedAwayOdds = '';
  let scrapedDrawOdds = '';
  if (selectedMatchDetails?.odds_corners) {
    try {
      const oddsList = typeof selectedMatchDetails.odds_corners === 'string'
        ? JSON.parse(selectedMatchDetails.odds_corners)
        : selectedMatchDetails.odds_corners;
      if (Array.isArray(oddsList)) {
        const winner = oddsList.find(o => o.market_type === 'winner' || o.market_type === 'full_time');
        if (winner) {
          scrapedHomeOdds = winner.home_odds ? String(winner.home_odds) : '';
          scrapedAwayOdds = winner.away_odds ? String(winner.away_odds) : '';
          scrapedDrawOdds = winner.draw_odds ? String(winner.draw_odds) : '';
        }
      }
    } catch (e) {}
  }

  // Winner Projections (1N2 / Moneyline) logic
  const isScoreMetric = activeMetric === 'goals' || activeMetric === 'first_half_points';
  
  let probHome = 0;
  let probDraw = 0;
  let probAway = 0;
  
  if (isScoreMetric) {
    const stdHome = Math.sqrt(meanHome);
    const stdAway = Math.sqrt(meanAway);
    
    const xMin = Math.max(0, Math.floor(meanHome - 4 * stdHome - 5));
    const xMax = Math.min(200, Math.ceil(meanHome + 4 * stdHome + 5));
    const yMin = Math.max(0, Math.floor(meanAway - 4 * stdAway - 5));
    const yMax = Math.min(200, Math.ceil(meanAway + 4 * stdAway + 5));
    
    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        const p = getBivariateProb(x, y, meanHome, meanAway, cov);
        if (x > y) {
          probHome += p;
        } else if (x < y) {
          probAway += p;
        } else {
          probDraw += p;
        }
      }
    }
    
    const total = probHome + probAway + probDraw;
    if (total > 0) {
      probHome /= total;
      probAway /= total;
      probDraw /= total;
    }

    // Blend with bookmaker implied probabilities if they are available
    // Use user-entered winner odds if available, otherwise fallback to database scraped odds
    let oddH = parseFloat(winnerUserOdds.home);
    let oddA = parseFloat(winnerUserOdds.away);
    let oddD = parseFloat(winnerUserOdds.draw);

    if (isNaN(oddH) || isNaN(oddA) || oddH <= 1.0 || oddA <= 1.0) {
      // Fallback to scraped odds in DB if user hasn't typed anything
      let bookieWinnerOdds = null;
      if (selectedMatchDetails?.odds_corners) {
        try {
          const oddsList = typeof selectedMatchDetails.odds_corners === 'string'
            ? JSON.parse(selectedMatchDetails.odds_corners)
            : selectedMatchDetails.odds_corners;
          if (Array.isArray(oddsList)) {
            bookieWinnerOdds = oddsList.find(o => o.market_type === 'winner' || o.market_type === 'full_time');
          }
        } catch (e) {}
      }
      if (bookieWinnerOdds) {
        oddH = parseFloat(bookieWinnerOdds.home_odds || bookieWinnerOdds.home);
        oddA = parseFloat(bookieWinnerOdds.away_odds || bookieWinnerOdds.away);
        oddD = parseFloat(bookieWinnerOdds.draw_odds || bookieWinnerOdds.draw || 0);
      }
    }

    if (!isNaN(oddH) && !isNaN(oddA) && oddH > 1.0 && oddA > 1.0) {
      const ipH = 1 / oddH;
      const ipA = 1 / oddA;
      const ipD = (!isNaN(oddD) && oddD > 1.0 && !isBasket) ? (1 / oddD) : 0;
      const ipSum = ipH + ipA + ipD;
      
      const bookieProbHome = ipH / ipSum;
      const bookieProbAway = ipA / ipSum;
      
      // Blend Poisson with Bookie odds. We trust the bookmaker odds as a very strong prior.
      // 30% weight to Poisson, 70% to bookmaker consensus
      const alpha = 0.3; 
      probHome = alpha * probHome + (1 - alpha) * bookieProbHome;
      probAway = alpha * probAway + (1 - alpha) * bookieProbAway;
      probDraw = alpha * probDraw;

      const sumProbs = probHome + probAway + probDraw;
      if (sumProbs > 0) {
        probHome /= sumProbs;
        probAway /= sumProbs;
        probDraw /= sumProbs;
      }
    }

    // Split draw probability for basketball (overtime wins are distributed)
    if (isBasket) {
      const halfDraw = probDraw / 2;
      probHome += halfDraw;
      probAway += halfDraw;
      probDraw = 0;
    }
  }

  const fairHome = probHome > 0 ? 1 / probHome : 999;
  const fairDraw = probDraw > 0 ? 1 / probDraw : 999;
  const fairAway = probAway > 0 ? 1 / probAway : 999;

  const estHome = probHome > 0 ? payoutRatio / probHome : 999;
  const estDraw = probDraw > 0 ? payoutRatio / probDraw : 999;
  const estAway = probAway > 0 ? payoutRatio / probAway : 999;

  const edgeHome = calculateEdge(parseFloat(winnerUserOdds.home || ''), fairHome);
  const edgeDraw = calculateEdge(parseFloat(winnerUserOdds.draw || ''), fairDraw);
  const edgeAway = calculateEdge(parseFloat(winnerUserOdds.away || ''), fairAway);

  const renderWinnerValueCell = (edge) => {
    if (edge === null) {
      return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '10px' }}>Saisir cote</span>;
    }
    if (edge > 0) {
      return (
        <span style={{
          color: '#10b981',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.15)',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '9.5px',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.04em'
        }}>
          VALUE +{edge.toFixed(1)}%
        </span>
      );
    } else {
      return (
        <span style={{
          color: 'var(--text-muted)',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.03)',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '9.5px',
          fontWeight: 600
        }}>
          Perte {edge.toFixed(1)}%
        </span>
      );
    }
  };

  const renderWinnerCard = (label, valueKey, prob, fairOdds, bookieOdds, userOddsVal, edge, bestTipValue, scrapedOddsVal) => {
    const isHovered = hoveredWinnerKey === bestTipValue;
    return (
      <div
        onMouseEnter={() => setHoveredWinnerKey(bestTipValue)}
        onMouseLeave={() => setHoveredWinnerKey(null)}
        onClick={() => {
          handlePlaceWinnerBet(bestTipValue, prob, fairOdds, bookieOdds, userOddsVal);
        }}
        style={{
          background: isHovered ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.01)',
          border: isHovered ? '1px solid rgba(191, 90, 242, 0.4)' : '1px solid rgba(255, 255, 255, 0.04)',
          borderRadius: '10px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: isHovered ? '0 4px 12px rgba(191, 90, 242, 0.05)' : 'none',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }} title={label}>
            {label}
          </span>
          <span style={{ fontSize: '11px', fontWeight: 900, color: '#bf5af2', background: 'rgba(191, 90, 242, 0.1)', padding: '1px 5px', borderRadius: '4px' }}>
            {bestTipValue}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Probabilité :</span>
          <strong style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>{Math.round(prob * 100)}%</strong>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', borderTop: '1px solid rgba(255, 255, 255, 0.03)', paddingTop: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Cote Juste :</span>
            <strong style={{ color: 'var(--text-secondary)' }}>{fairOdds > 99 ? '99+' : fairOdds.toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Cote Estimée :</span>
            <strong style={{ color: '#fff' }}>{bookieOdds > 99 ? '99+' : bookieOdds.toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Cote 1XBet :</span>
            <strong style={{ color: 'var(--color-success)' }}>{scrapedOddsVal || '-'}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '4px' }}>
          <input
            type="text"
            placeholder="Ex: 1.85"
            value={userOddsVal}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              setWinnerUserOdds(prev => ({ ...prev, [valueKey]: e.target.value }));
            }}
            style={{
              width: '100%',
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '4px',
              color: '#fff',
              padding: '4px 6px',
              fontSize: '10.5px',
              textAlign: 'center',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', minHeight: '18px', marginTop: '2px' }} onClick={(e) => e.stopPropagation()}>
          {renderWinnerValueCell(edge)}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.015)',
      border: '1px solid rgba(255, 255, 255, 0.04)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '16px',
      boxShadow: 'inset 0 1px 4px rgba(255,255,255,0.01)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <h4 style={{ fontSize: '11.5px', fontFamily: 'Outfit', fontWeight: 800, color: '#bf5af2', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>SIMULATEUR DE COTES & CALCULATEUR DE VALUE (POISSON BIVARIÉ)</span>
        </h4>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
          {isGBDT 
            ? `Moyennes GBDT : ${meanHome.toFixed(2)} Dom / ${meanAway.toFixed(2)} Ext (Cov: ${cov.toFixed(3)})` 
            : `Moyennes estimées (${periodLabel}) : ${meanHome.toFixed(2)} Dom / ${meanAway.toFixed(2)} Ext`
          }
        </span>
      </div>

      <div style={{ background: 'rgba(127, 0, 255, 0.03)', border: '1px solid rgba(127, 0, 255, 0.12)', borderRadius: '10px', padding: '10px 14px', fontSize: '11px', color: 'var(--text-secondary)' }}>
        <span style={{ fontWeight: 800, color: '#bf5af2', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><Lightbulb size={13} /> Aide rapide :</span>
        <span>Ajustez le <strong>Payout</strong> (taux de retour), puis comparez/saisissez la cote bookmaker. Les cotes affichant <strong style={{ color: '#10b981' }}>VALUE</strong> sont rentables à long terme.</span>
      </div>

      <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.25)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
        {(isBasket
          ? [
              { id: 'quarter_1', label: '1er QT' },
              { id: 'quarter_2', label: '2ème QT' },
              { id: 'quarter_3', label: '3ème QT' },
              { id: 'quarter_4', label: '4ème QT' },
              { id: 'first_half', label: '1ère MT' },
              { id: 'second_half', label: '2ème MT' },
              { id: 'full_time', label: 'Match' }
            ]
          : isHockey
          ? [
              { id: 'period_1', label: '1ère Période' },
              { id: 'period_2', label: '2ème Période' },
              { id: 'period_3', label: '3ème Période' },
              { id: 'full_time', label: 'Match Entier' }
            ]
          : isTennis
          ? [
              { id: 'first_half', label: '1er Set' },
              { id: 'second_half', label: '2ème Set' },
              { id: 'full_time', label: 'Match Entier' }
            ]
          : [
              { id: 'first_half', label: '1ère Mi-Temps' },
              { id: 'second_half', label: '2ème Mi-Temps' },
              { id: 'full_time', label: 'Match Entier' }
            ]
        ).map(p => (
          <button
            key={p.id}
            onClick={() => setSimPeriod(p.id)}
            style={{
              flex: 1,
              padding: '6px 10px',
              fontSize: '10.5px',
              fontFamily: 'Outfit',
              fontWeight: 700,
              border: 'none',
              borderRadius: '6px',
              background: simPeriod === p.id ? 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)' : 'transparent',
              color: simPeriod === p.id ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0,0,0,0.15)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontWeight: 600 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Taux de Retour Bookmaker (Payout) :</span>
          <strong style={{ color: '#bf5af2', fontSize: '12px' }}>{Math.round(payoutRatio * 100)}% <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>({Math.round((1 - payoutRatio) * 100)}% de marge)</span></strong>
        </div>
        <input
          type="range"
          min="85"
          max="98"
          value={Math.round(payoutRatio * 100)}
          onChange={(e) => setPayoutRatio(parseFloat(e.target.value) / 100)}
          style={{
            width: '100%',
            accentColor: '#bf5af2',
            cursor: 'pointer',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '2px',
            outline: 'none'
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', background: 'rgba(0,0,0,0.1)', borderRadius: '6px', padding: '8px 12px', fontSize: '10px', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.015)' }}>
        <div><strong style={{ color: 'var(--text-secondary)' }}>Cote Juste</strong> : Sans marge.</div>
        <div><strong style={{ color: 'var(--text-secondary)' }}>Cote Estimée Bookie</strong> : Avec marge.</div>
        <div><strong style={{ color: 'var(--text-secondary)' }}>Value Edge</strong> : Avantage attendu.</div>
      </div>

      {isScoreMetric && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px', marginBottom: '8px' }}>
          <h5 style={{ fontSize: '11px', fontFamily: 'Outfit', fontWeight: 800, color: 'var(--text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isBasket ? 'Projections Vainqueur (Moneyline)' : 'Projections Vainqueur (1N2 / Moneyline)'}
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: isBasket ? '1fr 1fr' : '1fr 1fr 1fr', gap: '12px' }}>
            {renderWinnerCard(`Victoire ${selectedMatchDetails?.home_team || 'Domicile'}`, 'home', probHome, fairHome, estHome, winnerUserOdds.home, edgeHome, '1', scrapedHomeOdds)}
            {!isBasket && renderWinnerCard('Match Nul', 'draw', probDraw, fairDraw, estDraw, winnerUserOdds.draw, edgeDraw, 'N', scrapedDrawOdds)}
            {renderWinnerCard(`Victoire ${selectedMatchDetails?.away_team || 'Extérieur'}`, 'away', probAway, fairAway, estAway, winnerUserOdds.away, edgeAway, '2', scrapedAwayOdds)}
          </div>
        </div>
      )}

      <PoissonSimulatorTable
        allLinesForPeriod={allLinesForPeriod}
        meanHome={meanHome}
        meanAway={meanAway}
        cov={cov}
        simPeriod={simPeriod}
        payoutRatio={payoutRatio}
        userOdds={userOdds}
        setUserOdds={setUserOdds}
        hoveredRowKey={hoveredRowKey}
        setHoveredRowKey={setHoveredRowKey}
        handlePlaceBetFromSimulator={handlePlaceBetFromSimulator}
        customLineInput={customLineInput}
        setCustomLineInput={setCustomLineInput}
        handleAddCustomLine={handleAddCustomLine}
        metricTitle={metricTitle}
      />
    </div>
  );
}
