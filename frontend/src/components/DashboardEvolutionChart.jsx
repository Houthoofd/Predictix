import React from 'react';
import { TrendingUp } from 'lucide-react';

export default function DashboardEvolutionChart({ stats, setActiveTab, setTrackerSubTab }) {
  const renderSVGChartPath = (historyData) => {
    if (!historyData || historyData.length < 2) return { pathD: '', areaD: '', points: [] };

    const width = 800;
    const height = 220;
    const padding = 20;

    const initialBalance = stats.bankroll?.initial || 1000;
    const balances = historyData.map(h => h.balance);
    const maxVal = Math.max(...balances, initialBalance) * 1.05;
    const minVal = Math.min(...balances, initialBalance) * 0.95;
    const valRange = maxVal - minVal || 100;

    const stepX = (width - padding * 2) / (historyData.length - 1);
    
    const points = historyData.map((h, i) => {
      const x = padding + i * stepX;
      const y = height - padding - ((h.balance - minVal) / valRange) * (height - padding * 2);
      return { x, y, data: h };
    });

    // Line path
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }

    // Closed path for gradient area
    const areaD = `${pathD} L ${points[points.length-1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return { pathD, areaD, points };
  };

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', margin: 0 }}>Évolution du Capital de Paris</h3>
        {setTrackerSubTab && (
          <button 
            className="btn btn-secondary" 
            style={{ 
              padding: '6px 12px', 
              fontSize: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontFamily: 'Outfit', 
              fontWeight: 600,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'var(--text-primary)'
            }} 
            onClick={() => { 
              setActiveTab('tracker'); 
              setTrackerSubTab('analytics'); 
            }}
          >
            <span>Analyses Détaillées</span>
            <TrendingUp size={14} style={{ color: 'var(--color-accent-solid)' }} />
          </button>
        )}
      </div>
      
      {stats.charts?.history?.length > 1 ? (
        <div>
          <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
            <svg viewBox="0 0 800 230" className="chart-svg-container" style={{ overflow: 'visible', width: '100%', height: 'auto' }}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-stop-mid)" stopOpacity="0.2"/>
                  <stop offset="100%" stopColor="var(--chart-stop-start)" stopOpacity="0.0"/>
                </linearGradient>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--chart-stop-start)"/>
                  <stop offset="50%" stopColor="var(--chart-stop-mid)"/>
                  <stop offset="100%" stopColor="var(--chart-stop-end)"/>
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="20" y1="20" x2="780" y2="20" stroke="var(--chart-grid)" strokeWidth="1" />
              <line x1="20" y1="70" x2="780" y2="70" stroke="var(--chart-grid)" strokeWidth="1" />
              <line x1="20" y1="120" x2="780" y2="120" stroke="var(--chart-grid)" strokeWidth="1" />
              <line x1="20" y1="170" x2="780" y2="170" stroke="var(--chart-grid)" strokeWidth="1" />
              <line x1="20" y1="200" x2="780" y2="200" stroke="var(--chart-grid)" strokeWidth="1" />

              {/* Area & Line */}
              {(() => {
                const { pathD, areaD, points } = renderSVGChartPath(stats.charts.history);
                return (
                  <>
                    <path d={areaD} fill="url(#chartGradient)" />
                    <path d={pathD} fill="none" stroke="url(#lineGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    
                    {/* Highlight dots */}
                    {points.map((p, idx) => (
                      <g key={idx} className="chart-dot-group" style={{ cursor: 'pointer' }}>
                        <circle 
                          cx={p.x} 
                          cy={p.y} 
                          r="4" 
                          fill="var(--bg-primary)" 
                          stroke="var(--color-accent-solid)" 
                          strokeWidth="2.5" 
                        />
                        {/* Hover helper ring */}
                        <circle 
                          cx={p.x} 
                          cy={p.y} 
                          r="10" 
                          fill="transparent" 
                          className="chart-dot-hover"
                        >
                          <title>{`${p.data.date}\nSolde: ${p.data.balance} €\nProfit: ${p.data.profit} €`}</title>
                        </circle>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
          
          {/* Timeline dates markers */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
            <span>Lancement</span>
            <span>Dernier Paris ({stats.charts.history[stats.charts.history.length-1]?.date})</span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', height: '160px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Enregistrez au moins 2 paris résolus (Gagnés/Perdus) pour visualiser le graphique d'évolution.
        </div>
      )}
    </div>
  );
}
