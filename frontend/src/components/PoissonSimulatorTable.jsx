import React from 'react';
import { bivariatePoissonOver, bivariatePoissonUnder } from '../utils/poissonUtils';

export default function PoissonSimulatorTable({
  allLinesForPeriod,
  meanHome,
  meanAway,
  cov,
  simPeriod,
  payoutRatio,
  userOdds,
  setUserOdds,
  hoveredRowKey,
  setHoveredRowKey,
  handlePlaceBetFromSimulator,
  customLineInput,
  setCustomLineInput,
  handleAddCustomLine,
  metricTitle
}) {
  const calculateEdge = (userVal, fairVal) => {
    if (!userVal || isNaN(userVal)) return null;
    const probImplied = 1 / userVal;
    const probFair = 1 / fairVal;
    return (probFair / probImplied - 1) * 100;
  };

  const renderValueCell = (edge) => {
    if (edge === null) {
      return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '10.5px' }}>Entrez une cote</span>;
    }
    if (edge > 0) {
      return (
        <span style={{
          color: '#10b981',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.15)',
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.04em'
        }} title="Cette cote est sous-évaluée par le bookmaker, rentable à long terme.">
          VALUE +{edge.toFixed(1)}%
        </span>
      );
    } else {
      return (
        <span style={{
          color: 'var(--text-muted)',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.03)',
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 600
        }} title="Cette cote n'offre pas de rentabilité statistique par rapport aux moyennes.">
          Perte {edge.toFixed(1)}%
        </span>
      );
    }
  };

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textTransform: 'none' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontWeight: 800 }}>
              <th style={{ padding: '6px 4px', textAlign: 'left' }}>Ligne</th>
              <th style={{ padding: '6px 4px', textAlign: 'center' }}>Option</th>
              <th style={{ padding: '6px 4px', textAlign: 'center' }}>Probabilité</th>
              <th style={{ padding: '6px 4px', textAlign: 'center' }}>Cote Juste</th>
              <th style={{ padding: '6px 4px', textAlign: 'center' }}>Cote Estimée Bookie</th>
              <th style={{ padding: '6px 4px', textAlign: 'center', width: '90px' }}>Votre Bookmaker</th>
              <th style={{ padding: '6px 4px', textAlign: 'right' }}>Calculateur de Value</th>
            </tr>
          </thead>
          <tbody>
            {allLinesForPeriod.map(line => {
              const overProb = bivariatePoissonOver(meanHome, meanAway, cov, line);
              const underProb = 1 - overProb;

              const fairOver = overProb > 0 ? 1 / overProb : 99;
              const fairUnder = underProb > 0 ? 1 / underProb : 99;

              const bookieOver = overProb > 0 ? payoutRatio / overProb : 99;
              const bookieUnder = underProb > 0 ? payoutRatio / underProb : 99;

              const overKey = `${simPeriod}-${line}-over`;
              const underKey = `${simPeriod}-${line}-under`;

              const userOddsOver = parseFloat(userOdds[overKey] || '');
              const userOddsUnder = parseFloat(userOdds[underKey] || '');

              const overEdge = calculateEdge(userOddsOver, fairOver);
              const underEdge = calculateEdge(userOddsUnder, fairUnder);

              return (
                <React.Fragment key={line}>
                  <tr 
                    style={{ 
                      borderBottom: '1px solid rgba(255,255,255,0.015)',
                      cursor: 'pointer',
                      background: hoveredRowKey === overKey ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={() => setHoveredRowKey(overKey)}
                    onMouseLeave={() => setHoveredRowKey(null)}
                    onClick={(e) => {
                      if (e.target.tagName === 'INPUT') return;
                      handlePlaceBetFromSimulator(line, 'Over', overProb, fairOver, bookieOver, userOdds[overKey]);
                    }}
                  >
                    <td style={{ padding: '6px 4px', fontWeight: 800 }} rowSpan={2} onClick={(e) => e.stopPropagation()}>
                      {line}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', color: '#10b981', fontWeight: 700 }}>
                      Plus de
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700 }}>
                      {Math.round(overProb * 100)}%
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {fairOver.toFixed(2)}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, color: '#bf5af2' }}>
                      {bookieOver.toFixed(2)}
                    </td>
                    <td style={{ padding: '3px 4px', textAlign: 'center' }}>
                      <input
                        type="text"
                        placeholder="Ex: 1.85"
                        value={userOdds[overKey] || ''}
                        onChange={(e) => setUserOdds({ ...userOdds, [overKey]: e.target.value })}
                        style={{
                          width: '65px',
                          background: 'rgba(0,0,0,0.25)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '4px',
                          color: '#fff',
                          padding: '2px 4px',
                          fontSize: '11px',
                          textAlign: 'center',
                          outline: 'none'
                        }}
                      />
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                      {renderValueCell(overEdge)}
                    </td>
                  </tr>
                  <tr 
                    style={{ 
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      background: hoveredRowKey === underKey ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={() => setHoveredRowKey(underKey)}
                    onMouseLeave={() => setHoveredRowKey(null)}
                    onClick={(e) => {
                      if (e.target.tagName === 'INPUT') return;
                      handlePlaceBetFromSimulator(line, 'Under', underProb, fairUnder, bookieUnder, userOdds[underKey]);
                    }}
                  >
                    <td style={{ padding: '6px 4px', textAlign: 'center', color: '#bf5af2', fontWeight: 700 }}>
                      Moins de
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700 }}>
                      {Math.round(underProb * 100)}%
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {fairUnder.toFixed(2)}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, color: '#bf5af2' }}>
                      {bookieUnder.toFixed(2)}
                    </td>
                    <td style={{ padding: '3px 4px', textAlign: 'center' }}>
                      <input
                        type="text"
                        placeholder="Ex: 1.85"
                        value={userOdds[underKey] || ''}
                        onChange={(e) => setUserOdds({ ...userOdds, [underKey]: e.target.value })}
                        style={{
                          width: '65px',
                          background: 'rgba(0,0,0,0.25)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '4px',
                          color: '#fff',
                          padding: '2px 4px',
                          fontSize: '11px',
                          textAlign: 'center',
                          outline: 'none'
                        }}
                      />
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                      {renderValueCell(underEdge)}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleAddCustomLine} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px', marginTop: '4px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Simuler une autre ligne de {metricTitle.toLowerCase()} :</span>
        <input
          type="number"
          step="0.5"
          placeholder="Ex: 6.5"
          value={customLineInput}
          onChange={(e) => setCustomLineInput(e.target.value)}
          style={{
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '4px',
            color: '#fff',
            padding: '4px 8px',
            fontSize: '11px',
            width: '70px',
            outline: 'none'
          }}
        />
        <button type="submit" style={{ padding: '4px 10px', fontSize: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', borderRadius: '4px', fontWeight: 700 }}>
          Ajouter
        </button>
      </form>
    </>
  );
}
