import React from 'react';
import { 
  Wallet, 
  TrendingUp, 
  Percent, 
  Award 
} from 'lucide-react';

export default function DashboardTab({ stats, bets, setActiveTab }) {
  // Calculate coordinates for dynamic SVG line chart
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Metrics Cards */}
      <div className="grid-4">
        <div className="glass-card accent-left">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="form-label">Bankroll Actuelle</p>
              <h3 style={{ fontSize: '28px', marginTop: '8px' }}>
                {stats.bankroll?.current?.toFixed(2)} {stats.bankroll?.currency}
              </h3>
            </div>
            <div className="metric-icon-box"><Wallet size={18} /></div>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
            Départ: {stats.bankroll?.initial?.toFixed(2)} {stats.bankroll?.currency}
          </p>
        </div>

        <div className="glass-card accent-right">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="form-label">Bénéfice Net</p>
              <h3 style={{ 
                fontSize: '28px', 
                marginTop: '8px', 
                color: stats.summary?.total_profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
              }}>
                {stats.summary?.total_profit >= 0 ? '+' : ''}{stats.summary?.total_profit?.toFixed(2)} {stats.bankroll?.currency}
              </h3>
            </div>
            <div className="metric-icon-box"><TrendingUp size={18} /></div>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
            Ce mois-ci : {stats.summary?.current_month_profit >= 0 ? '+' : ''}{stats.summary?.current_month_profit?.toFixed(2)} {stats.bankroll?.currency}
          </p>
        </div>

        <div className="glass-card accent-left">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="form-label">Retour sur Investissement (ROI)</p>
              <h3 style={{ fontSize: '28px', marginTop: '8px' }}>
                {stats.summary?.roi?.toFixed(1)} %
              </h3>
            </div>
            <div className="metric-icon-box"><Percent size={18} /></div>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
            Volume de mises : {stats.summary?.total_stake?.toFixed(2)} {stats.bankroll?.currency}
          </p>
        </div>

        <div className="glass-card accent-right">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="form-label">Taux de Réussite</p>
              <h3 style={{ fontSize: '28px', marginTop: '8px' }}>
                {stats.summary?.win_rate?.toFixed(1)} %
              </h3>
            </div>
            <div className="metric-icon-box"><Award size={18} /></div>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
            {stats.summary?.counts?.won} Gagnés | {stats.summary?.counts?.lost} Perdus | {stats.summary?.counts?.pending} En cours
          </p>
        </div>
      </div>

      {/* Bankroll Evolution SVG Line Chart */}
      <div className="glass-card">
        <h3 style={{ fontSize: '18px', marginBottom: '20px', fontFamily: 'Outfit' }}>Évolution du Capital de Paris</h3>
        
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

      {/* Sub-sections grid */}
      <div className="grid-2">
        {/* Performant Leagues */}
        <div className="glass-card">
          <h3 style={{ fontSize: '16px', marginBottom: '16px', fontFamily: 'Outfit' }}>Performances par Championnat</h3>
          {stats.charts?.leagues?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.charts.leagues.slice(0, 4).map((league, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ fontWeight: 600 }}>{league.name}</span>
                    <span style={{ 
                      fontWeight: 700, 
                      color: league.profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                    }}>
                      {league.profit >= 0 ? '+' : ''}{league.profit.toFixed(2)} {stats.bankroll.currency}
                    </span>
                  </div>
                  {/* Visual Progress Bar */}
                  <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${Math.min(100, Math.max(10, (league.won / (league.total || 1)) * 100))}%`, 
                      height: '100%',
                      background: league.profit >= 0 ? 'var(--grad-accent)' : 'var(--color-danger)'
                    }} />
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Taux de réussite: {((league.won / league.total) * 100).toFixed(0)}% ({league.won}/{league.total} paris)
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>Aucune donnée.</p>
          )}
        </div>

        {/* Bookmakers Performance */}
        <div className="glass-card">
          <h3 style={{ fontSize: '16px', marginBottom: '16px', fontFamily: 'Outfit' }}>Performances par Bookmaker</h3>
          {stats.charts?.bookmakers?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.charts.bookmakers.slice(0, 4).map((bm, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ fontWeight: 600 }}>{bm.name}</span>
                    <span style={{ 
                      fontWeight: 700, 
                      color: bm.profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                    }}>
                      {bm.profit >= 0 ? '+' : ''}{bm.profit.toFixed(2)} {stats.bankroll.currency}
                    </span>
                  </div>
                  {/* Visual Progress Bar */}
                  <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${Math.min(100, Math.max(10, (bm.won / (bm.total || 1)) * 100))}%`, 
                      height: '100%',
                      background: bm.profit >= 0 ? 'var(--grad-accent)' : 'var(--color-danger)'
                    }} />
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Taux de réussite: {((bm.won / bm.total) * 100).toFixed(0)}% ({bm.won}/{bm.total} paris)
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>Aucune donnée.</p>
          )}
        </div>
      </div>

      {/* Recent Bets Summary */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontFamily: 'Outfit' }}>Derniers Paris Résolus</h3>
          <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '12px' }} onClick={() => setActiveTab('tracker')}>
            Voir tout
          </button>
        </div>

        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Match</th>
                <th>Ligue</th>
                <th>Conseil</th>
                <th>Mise</th>
                <th>Cote</th>
                <th>Bookmaker</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {bets.filter(b => b.status !== 'PENDING').slice(0, 5).map((bet) => (
                <tr key={bet.id}>
                  <td style={{ fontSize: '13px' }}>{bet.date}</td>
                  <td style={{ fontWeight: 600 }}>{bet.home_team} vs {bet.away_team}</td>
                  <td style={{ fontSize: '13px' }}>{bet.league}</td>
                  <td style={{ fontFamily: 'Outfit', fontWeight: 600 }}>{bet.best_tip} {bet.card_line}</td>
                  <td>{bet.stake} {stats.bankroll.currency}</td>
                  <td>{bet.odds}</td>
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{bet.bookmaker}</td>
                  <td>
                    <span className={`badge badge-${bet.status.toLowerCase()}`}>
                      {bet.status === 'WON' && 'Gagné'}
                      {bet.status === 'LOST' && 'Perdu'}
                      {bet.status === 'REFUNDED' && 'Annulé'}
                    </span>
                  </td>
                </tr>
              ))}
              {bets.filter(b => b.status !== 'PENDING').length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
                    Aucun pari résolu enregistré.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
