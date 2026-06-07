import React from 'react';
import { TrendingUp, X } from 'lucide-react';

export default function StrategyBacktestResults({
  backtestResults,
  defaultOdds,
  minCoverage,
  setBacktestResults
}) {
  const drawProfitChart = (timeline) => {
    if (!timeline || timeline.length === 0) return null;

    const width = 600;
    const height = 200;
    const padding = 20;

    const points = [{ val: 0, idx: 0 }, ...timeline.map((t, idx) => ({ val: t.cumulative, idx: idx + 1 }))];

    const minVal = Math.min(...points.map(p => p.val));
    const maxVal = Math.max(...points.map(p => p.val));
    const valRange = maxVal - minVal === 0 ? 1 : maxVal - minVal;

    const getX = (idx) => padding + (idx / (points.length - 1)) * (width - 2 * padding);
    const getY = (val) => height - padding - ((val - minVal) / valRange) * (height - 2 * padding);

    let pathD = `M ${getX(0)} ${getY(0)}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${getX(i)} ${getY(i)}`;
    }

    let areaD = `${pathD} L ${getX(points.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="200" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '10px', marginTop: '10px' }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bf5af2" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0082ff" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#bf5af2" />
            <stop offset="100%" stopColor="#0082ff" />
          </linearGradient>
        </defs>
        
        {minVal < 0 && maxVal > 0 && (
          <line 
            x1={padding} 
            y1={getY(0)} 
            x2={width - padding} 
            y2={getY(0)} 
            stroke="rgba(255,255,255,0.15)" 
            strokeDasharray="4 4" 
          />
        )}

        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.05)" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.05)" />

        <path d={areaD} fill="url(#chartGrad)" />

        <path d={pathD} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p, i) => (
          <circle 
            key={i} 
            cx={getX(p.idx)} 
            cy={getY(p.val)} 
            r="3.5" 
            fill={p.val >= 0 ? '#2ecc71' : '#e74c3c'} 
            stroke="rgba(0,0,0,0.6)" 
            strokeWidth="1"
          />
        ))}
        
        <text x={padding + 5} y={padding + 15} fill="rgba(255,255,255,0.6)" fontSize="10" fontWeight="bold">
          Max: {maxVal.toFixed(2)} U
        </text>
        <text x={padding + 5} y={height - padding - 5} fill="rgba(255,255,255,0.6)" fontSize="10" fontWeight="bold">
          Min: {minVal.toFixed(2)} U
        </text>
      </svg>
    );
  };

  return (
    <div className="glass-card" style={{ marginTop: '20px', border: '1px solid rgba(191, 90, 242, 0.3)', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', fontWeight: 800, color: '#bf5af2', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <TrendingUp size={20} />
            Résultats du Rétro-testing : {backtestResults.strategy_name}
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', margin: '2px 0 0 0' }}>
            Simulation lancée avec une cote par défaut de <strong>{defaultOdds}</strong>.
          </p>
        </div>
        
        <button 
          className="btn btn-secondary" 
          style={{ padding: '0 8px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setBacktestResults(null)}
          title="Fermer les résultats"
        >
          <X size={16} />
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '25px' }}>
        <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>PARIS ÉVALUÉS</div>
          <div style={{ fontSize: '24px', fontFamily: 'Outfit', fontWeight: 800, marginTop: '6px' }}>{backtestResults.total_bets}</div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>TAUX DE RÉUSSITE</div>
          <div style={{ fontSize: '24px', fontFamily: 'Outfit', fontWeight: 800, color: backtestResults.win_rate >= 55 ? '#2ecc71' : backtestResults.win_rate >= 50 ? '#f1c40f' : '#e74c3c', marginTop: '6px' }}>
            {backtestResults.win_rate}%
          </div>
          <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{backtestResults.wins} V / {backtestResults.losses} D</div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>RENDEMENT (ROI)</div>
          <div style={{ fontSize: '24px', fontFamily: 'Outfit', fontWeight: 800, color: backtestResults.roi >= 0 ? '#2ecc71' : '#e74c3c', marginTop: '6px' }}>
            {backtestResults.roi >= 0 ? '+' : ''}{backtestResults.roi}%
          </div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>PROFIT NET TOTAL</div>
          <div style={{ fontSize: '24px', fontFamily: 'Outfit', fontWeight: 800, color: backtestResults.total_profit >= 0 ? '#2ecc71' : '#e74c3c', marginTop: '6px' }}>
            {backtestResults.total_profit >= 0 ? '+' : ''}{backtestResults.total_profit} U
          </div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>MATCHS EXCLUS</div>
          <div style={{ fontSize: '24px', fontFamily: 'Outfit', fontWeight: 800, color: 'var(--text-muted)', marginTop: '6px' }}>
            {backtestResults.skipped_low_coverage + backtestResults.skipped_missing_stats}
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {backtestResults.skipped_low_coverage} couv. / {backtestResults.skipped_missing_stats} stats
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '25px', alignItems: 'start' }}>
        {/* Chart Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>Courbe de profit cumulée (unités)</div>
          {drawProfitChart(backtestResults.profit_timeline)}
        </div>

        {/* Logs Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>Journal des paris simulés</div>
          <div style={{ overflowY: 'auto', maxHeight: '200px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '6px 4px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '6px 4px', textAlign: 'left' }}>Match</th>
                  <th style={{ padding: '6px 4px', textAlign: 'center' }}>Moy H2H</th>
                  <th style={{ padding: '6px 4px', textAlign: 'center' }}>Réel</th>
                  <th style={{ padding: '6px 4px', textAlign: 'center' }}>Cote</th>
                  <th style={{ padding: '6px 4px', textAlign: 'center' }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {backtestResults.logs.map((log, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '6px 4px', color: 'var(--text-muted)' }}>{log.date}</td>
                    <td style={{ padding: '6px 4px', fontWeight: 600 }}>{log.home_team} - {log.away_team} ({log.score})</td>
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>{log.avg_value}</td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700 }}>{log.actual_value}</td>
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>{log.odds}</td>
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                      <span style={{ 
                        background: log.won ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)', 
                        color: log.won ? '#2ecc71' : '#e74c3c', 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '9px'
                      }}>
                        {log.won ? 'GAGNÉ' : 'PERDU'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* League Coverage Details */}
      {backtestResults.leagues_coverage && backtestResults.leagues_coverage.length > 0 && (
        <details style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
          <summary style={{ cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', outline: 'none' }}>
            Afficher le détail de la couverture par championnat ({backtestResults.leagues_coverage.length} championnats)
          </summary>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px', marginTop: '12px', maxHeight: '150px', overflowY: 'auto', paddingRight: '5px' }}>
            {backtestResults.leagues_coverage.map((lc, idx) => {
              const isFiltered = lc.coverage_rate < parseFloat(minCoverage);
              return (
                <div 
                  key={idx} 
                  style={{ 
                    background: 'rgba(0,0,0,0.15)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '6px', 
                    padding: '8px 12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    opacity: isFiltered ? 0.4 : 1
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#fff', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lc.tournament}>
                      {lc.tournament}
                    </span>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                      {lc.matches_with_stats} / {lc.total_matches} matchs
                    </span>
                  </div>
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: 700, 
                    color: lc.coverage_rate >= 70 ? '#2ecc71' : lc.coverage_rate >= 40 ? '#f1c40f' : '#e74c3c' 
                  }}>
                    {lc.coverage_rate}% {isFiltered && ' (Exclu)'}
                  </span>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
