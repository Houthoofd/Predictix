import React from 'react';
import { Filter, TrendingUp } from 'lucide-react';

export default function TrackerAnalyticsView({
  timeframe,
  setTimeframe,
  filterBookmaker,
  setFilterBookmaker,
  filterLeague,
  setFilterLeague,
  bookmakers,
  leagues,
  completedBets,
  stats,
  totalProfit,
  winRate,
  wins,
  losses,
  refunded,
  roi,
  totalStaked,
  avgStake,
  avgOdds,
  leaguesList,
  bookmakersList,
  oddsRangesList,
  tipTypesList
}) {
  const currency = stats.bankroll?.currency || '€';

  const drawCumulativeChart = () => {
    if (completedBets.length === 0) {
      return (
        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Aucun pari résolu pour cette sélection.
        </div>
      );
    }

    const sortedBets = [...completedBets].sort((a, b) => a.id - b.id);
    let current = 0;
    const points = [{ val: 0, date: 'Début' }];
    for (const bet of sortedBets) {
      let profit = 0;
      if (bet.status === 'WON') profit = bet.stake * (bet.odds - 1);
      else if (bet.status === 'LOST') profit = -bet.stake;
      current += profit;
      points.push({ val: current, date: bet.date });
    }

    const width = 600;
    const height = 200;
    const padding = 20;

    const values = points.map(p => p.val);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const valRange = maxVal - minVal === 0 ? 1 : maxVal - minVal;

    const getX = (idx) => padding + (idx / (points.length - 1)) * (width - 2 * padding);
    const getY = (val) => height - padding - ((val - minVal) / valRange) * (height - 2 * padding);

    let pathD = `M ${getX(0)} ${getY(values[0])}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${getX(i)} ${getY(values[i])}`;
    }

    let areaD = `${pathD} L ${getX(points.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="200" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '10px' }}>
        <defs>
          <linearGradient id="chartGradTracker" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0082ff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#bf5af2" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="lineGradTracker" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0082ff" />
            <stop offset="100%" stopColor="#bf5af2" />
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

        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

        <path d={areaD} fill="url(#chartGradTracker)" />

        <path d={pathD} fill="none" stroke="url(#lineGradTracker)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p, i) => (
          <circle 
            key={i} 
            cx={getX(i)} 
            cy={getY(p.val)} 
            r="3.5" 
            fill={p.val >= 0 ? '#2ecc71' : '#e74c3c'} 
            stroke="rgba(0,0,0,0.6)" 
            strokeWidth="1"
          />
        ))}

        <text x={padding + 5} y={padding + 15} fill="rgba(255,255,255,0.6)" fontSize="10" fontWeight="bold">
          Max: {maxVal >= 0 ? '+' : ''}{maxVal.toFixed(2)} {currency}
        </text>
        <text x={padding + 5} y={height - padding - 5} fill="rgba(255,255,255,0.6)" fontSize="10" fontWeight="bold">
          Min: {minVal.toFixed(2)} {currency}
        </text>
      </svg>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      {/* Interactive Filters Panel */}
      <div className="glass-card" style={{ display: 'flex', gap: '15px', alignItems: 'center', padding: '15px 20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={15} style={{ color: 'var(--color-accent-solid)' }} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Filtres de performance :</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Période :</label>
          <select 
            value={timeframe} 
            onChange={(e) => setTimeframe(e.target.value)}
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 10px', color: '#fff', fontSize: '12px', outline: 'none' }}
          >
            <option value="all">Tout l'historique</option>
            <option value="7days">7 derniers jours</option>
            <option value="30days">30 derniers jours</option>
            <option value="currentMonth">Mois en cours</option>
            <option value="lastMonth">Mois dernier</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Bookmaker :</label>
          <select 
            value={filterBookmaker} 
            onChange={(e) => setFilterBookmaker(e.target.value)}
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 10px', color: '#fff', fontSize: '12px', outline: 'none' }}
          >
            <option value="all">Tous</option>
            {bookmakers.map(bm => <option key={bm} value={bm}>{bm}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Championnat :</label>
          <select 
            value={filterLeague} 
            onChange={(e) => setFilterLeague(e.target.value)}
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 10px', color: '#fff', fontSize: '12px', outline: 'none', maxWidth: '200px' }}
          >
            <option value="all">Tous</option>
            {leagues.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Key Metrics Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Profit Cumulé</span>
          <h3 style={{ fontSize: '24px', fontFamily: 'Outfit', fontWeight: 800, marginTop: '8px', color: totalProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)} {currency}
          </h3>
        </div>
        <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Taux de Réussite</span>
          <h3 style={{ fontSize: '24px', fontFamily: 'Outfit', fontWeight: 800, marginTop: '8px', color: winRate >= 55 ? '#2ecc71' : winRate >= 50 ? '#f1c40f' : '#e74c3c' }}>
            {winRate}%
          </h3>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{wins} V / {losses} D / {refunded} R</span>
        </div>
        <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Retour sur Invest. (ROI)</span>
          <h3 style={{ fontSize: '24px', fontFamily: 'Outfit', fontWeight: 800, marginTop: '8px', color: roi >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {roi >= 0 ? '+' : ''}{roi}%
          </h3>
        </div>
        <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Volume de Mises</span>
          <h3 style={{ fontSize: '24px', fontFamily: 'Outfit', fontWeight: 800, marginTop: '8px' }}>
            {totalStaked.toFixed(1)} {currency}
          </h3>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Mise moy: {avgStake} {currency} • Cote moy: {avgOdds}</span>
        </div>
      </div>

      {/* SVG Profit evolution timeline chart */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontFamily: 'Outfit', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TrendingUp size={16} style={{ color: '#bf5af2' }} />
          Courbe d'Évolution des Gains (Sélection Filtrée)
        </h3>
        {drawCumulativeChart()}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
        
        {/* Left Col: Leagues and Bookmakers Performance lists */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontFamily: 'Outfit', fontWeight: 700, marginBottom: '12px' }}>Rentabilité par Ligue</h3>
            {leaguesList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                {leaguesList.map((lg) => (
                  <div key={lg.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 700 }}>{lg.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Taux de réussite: {((lg.won / lg.total) * 100).toFixed(0)}% ({lg.total} paris)
                      </div>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: lg.profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {lg.profit >= 0 ? '+' : ''}{lg.profit.toFixed(2)} {currency}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>Aucune donnée historique.</div>
            )}
          </div>

          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontFamily: 'Outfit', fontWeight: 700, marginBottom: '12px' }}>Rentabilité par Bookmaker</h3>
            {bookmakersList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {bookmakersList.map((bm) => (
                  <div key={bm.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 700 }}>{bm.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Taux de réussite: {((bm.won / bm.total) * 100).toFixed(0)}% ({bm.total} paris)
                      </div>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: bm.profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {bm.profit >= 0 ? '+' : ''}{bm.profit.toFixed(2)} {currency}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>Aucune donnée historique.</div>
            )}
          </div>

        </div>

        {/* Right Col: Tip Types and Odds Ranges breakdowns */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontFamily: 'Outfit', fontWeight: 700, marginBottom: '12px' }}>Rentabilité par Tranche de Cote</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {oddsRangesList.map((rg) => (
                <div key={rg.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 700 }}>{rg.label}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Taux de réussite: {rg.total > 0 ? ((rg.won / rg.total) * 100).toFixed(0) : 0}% ({rg.total} paris)
                    </div>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: rg.profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {rg.profit >= 0 ? '+' : ''}{rg.profit.toFixed(2)} {currency}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontFamily: 'Outfit', fontWeight: 700, marginBottom: '12px' }}>Rentabilité par Type de Conseil</h3>
            {tipTypesList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tipTypesList.map((tip) => (
                  <div key={tip.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 700 }}>{tip.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Taux de réussite: {((tip.won / tip.total) * 100).toFixed(0)}% ({tip.total} paris)
                      </div>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: tip.profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {tip.profit >= 0 ? '+' : ''}{tip.profit.toFixed(2)} {currency}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>Aucune donnée historique.</div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
