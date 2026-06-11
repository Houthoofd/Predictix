import React, { useState } from 'react';
import { Lightbulb, AlertTriangle } from 'lucide-react';
import {
  poissonUnder,
  poissonOver,
  bivariatePoissonOver,
  getMetricPeriodRatio
} from '../utils/poissonUtils';
import PoissonSimulatorTable from './PoissonSimulatorTable';

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
  const [customLineInput, setCustomLineInput] = useState('');
  const [customLines, setCustomLines] = useState([]);
  const [hoveredRowKey, setHoveredRowKey] = useState(null);

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
  } else {
    const hAvg = getAverage(selectedMatchDetails.recent_home_matches, activeMetric, true);
    const aAvg = getAverage(selectedMatchDetails.recent_away_matches, activeMetric, false, true);
    
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
    defaultLines = [standardLine - 2, standardLine - 1, standardLine, standardLine + 1, standardLine + 2].filter(v => v >= 0.5);
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
      notes: `Simulation Poisson - ${getMetricTitle(activeMetric)} [${periodNote}]. Option: ${option === 'Over' ? 'Plus de' : 'Moins de'} ${line} (Probabilité: ${Math.round(prob * 100)}%, Cote Estimée: ${bookieOdds.toFixed(2)}, Cote Juste: ${fairOdds.toFixed(2)})`
    };

    handleQuickPlaceBet(pred);
    setSelectedMatchDetails(null);
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
