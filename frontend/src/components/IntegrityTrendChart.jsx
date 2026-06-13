import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';

export default function IntegrityTrendChart() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/integrity/history')
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          setHistory(res.data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch integrity history:', err);
        setLoading(false);
      });
  }, []);

  const renderSVGChartPath = (data) => {
    if (!data || data.length < 2) return { pathD: '', areaD: '', points: [] };

    const width = 800;
    const height = 180;
    const padding = 20;

    const scores = data.map(h => h.score);
    const maxVal = 100;
    const minVal = Math.max(0, Math.min(...scores) - 5);
    const valRange = maxVal - minVal || 10;

    const stepX = (width - padding * 2) / (data.length - 1);
    
    const points = data.map((h, i) => {
      const x = padding + i * stepX;
      const y = height - padding - ((h.score - minVal) / valRange) * (height - padding * 2);
      return { x, y, data: h };
    });

    // Line path
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }

    // Closed path for gradient area
    const areaD = `${pathD} L ${points[points.length-1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return { pathD, areaD, points, minVal };
  };

  if (loading) {
    return (
      <div className="glass-card" style={{ padding: '20px', display: 'flex', height: '220px', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-muted)' }}>Chargement du graphique d'intégrité...</span>
      </div>
    );
  }

  const { pathD, areaD, points, minVal } = renderSVGChartPath(history);

  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={20} style={{ color: 'var(--color-success)' }} />
          <h3 style={{ fontSize: '16px', fontFamily: 'Outfit', margin: 0 }}>Évolution de la Qualité des Données</h3>
        </div>
        {history.length > 0 && (
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Dernier score : {history[history.length - 1].score.toFixed(1)}%
          </span>
        )}
      </div>

      {history.length >= 2 ? (
        <div>
          <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
            <svg viewBox="0 0 800 185" className="chart-svg-container" style={{ overflow: 'visible', width: '100%', height: 'auto' }}>
              <defs>
                <linearGradient id="integrityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-stop-mid)" stopOpacity="0.2"/>
                  <stop offset="100%" stopColor="var(--chart-stop-start)" stopOpacity="0.0"/>
                </linearGradient>
                <linearGradient id="integrityLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--chart-stop-start)"/>
                  <stop offset="50%" stopColor="var(--chart-stop-mid)"/>
                  <stop offset="100%" stopColor="var(--chart-stop-end)"/>
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="20" y1="20" x2="780" y2="20" stroke="var(--chart-grid)" strokeWidth="1" />
              <line x1="20" y1="60" x2="780" y2="60" stroke="var(--chart-grid)" strokeWidth="1" />
              <line x1="20" y1="100" x2="780" y2="100" stroke="var(--chart-grid)" strokeWidth="1" />
              <line x1="20" y1="140" x2="780" y2="140" stroke="var(--chart-grid)" strokeWidth="1" />
              <line x1="20" y1="160" x2="780" y2="160" stroke="var(--chart-grid)" strokeWidth="1" />

              {/* Y-axis labels */}
              <text x="25" y="32" fill="var(--text-muted)" fontSize="9" fontFamily="Outfit">100%</text>
              <text x="25" y="152" fill="var(--text-muted)" fontSize="9" fontFamily="Outfit">{minVal.toFixed(0)}%</text>

              {/* Area & Line */}
              <path d={areaD} fill="url(#integrityGradient)" />
              <path d={pathD} fill="none" stroke="url(#integrityLineGradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              
              {/* Highlight dots */}
              {points.map((p, idx) => (
                <g key={idx} className="chart-dot-group" style={{ cursor: 'pointer' }}>
                  <circle 
                    cx={p.x} 
                    cy={p.y} 
                    r="3.5" 
                    fill="var(--bg-primary)" 
                    stroke="var(--color-success)" 
                    strokeWidth="2" 
                  />
                  {/* Hover helper ring */}
                  <circle 
                    cx={p.x} 
                    cy={p.y} 
                    r="8" 
                    fill="transparent" 
                    className="chart-dot-hover"
                  >
                    <title>{`${p.data.date}\nScore moyen : ${p.data.score.toFixed(2)}%\nMatchs sains : ${p.data.healthy_matches}/${p.data.total_matches}`}</title>
                  </circle>
                </g>
              ))}
            </svg>
          </div>
          
          {/* Timeline dates markers */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
            <span>{history[0]?.date}</span>
            <span>{history[history.length-1]?.date}</span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', height: '120px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          Attendez le premier enregistrement quotidien ou effectuez des analyses pour peupler le graphique.
        </div>
      )}
    </div>
  );
}
