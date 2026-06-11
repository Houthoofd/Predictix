import React from 'react';
import { Filter, TrendingUp, Award, Activity, BarChart2 } from 'lucide-react';

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
  const [activePoint, setActivePoint] = React.useState(null);

  const [showLgChart, setShowLgChart] = React.useState(false);
  const [showBmChart, setShowBmChart] = React.useState(false);
  const [showSpChart, setShowSpChart] = React.useState(false);
  const [showOddsChart, setShowOddsChart] = React.useState(false);
  const [showTipChart, setShowTipChart] = React.useState(false);
  const [showCatChart, setShowCatChart] = React.useState(false);

  const renderDataSection = (title, items, isChart, setIsChart, maxHeight = '250px') => {
    const hasData = items && items.length > 0;
    
    return (
      <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '15px', fontFamily: 'Outfit', fontWeight: 700, margin: 0 }}>{title}</h3>
          {hasData && (
            <div style={{ 
              display: 'flex', 
              background: 'rgba(0, 0, 0, 0.25)', 
              border: '1px solid rgba(255, 255, 255, 0.08)', 
              borderRadius: '8px', 
              padding: '2px', 
              gap: '2px' 
            }}>
              <button 
                onClick={() => setIsChart(false)}
                style={{
                  border: 'none',
                  background: !isChart ? 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)' : 'transparent',
                  color: !isChart ? '#fff' : 'var(--text-secondary)',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
              >
                Tableau
              </button>
              <button 
                onClick={() => setIsChart(true)}
                style={{
                  border: 'none',
                  background: isChart ? 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)' : 'transparent',
                  color: isChart ? '#fff' : 'var(--text-secondary)',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
              >
                Graphique
              </button>
            </div>
          )}
        </div>

        {!hasData ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
            Aucune donnée historique.
          </div>
        ) : !isChart ? (
          /* TABLEAU VIEW */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: maxHeight, overflowY: 'auto', paddingRight: '4px' }}>
            {items.map((item, idx) => {
              const displayName = item.name || item.label || 'Inconnu';
              const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
              const wr = item.total > 0 ? ((item.won / item.total) * 100).toFixed(0) : 0;
              return (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 700 }}>{formattedName}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Taux de réussite: {wr}% ({item.total} paris)
                    </div>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: item.profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {item.profit >= 0 ? '+' : ''}{item.profit.toFixed(2)} {currency}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          /* GRAPHIQUE VIEW */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: maxHeight, overflowY: 'auto', paddingRight: '4px' }}>
            {items.map((item, idx) => {
              const displayName = item.name || item.label || 'Inconnu';
              const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
              const wr = item.total > 0 ? Math.round((item.won / item.total) * 100) : 0;
              const isProfitPositive = item.profit >= 0;
              const progressColor = isProfitPositive 
                ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' 
                : 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
              const trackColor = 'rgba(255, 255, 255, 0.05)';
              
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.01)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>{formattedName} <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>({item.total} paris)</span></span>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: isProfitPositive ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {isProfitPositive ? '+' : ''}{item.profit.toFixed(2)} {currency}
                    </span>
                  </div>
                  
                  {/* Progress bar container */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flexGrow: 1, height: '7px', background: trackColor, borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                      <div style={{ 
                        height: '100%', 
                        background: progressColor, 
                        width: `${wr}%`, 
                        borderRadius: '4px',
                        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: isProfitPositive ? '0 0 8px rgba(16, 185, 129, 0.4)' : '0 0 8px rgba(239, 68, 68, 0.4)'
                      }} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', minWidth: '32px', textAlign: 'right', fontFamily: 'Outfit' }}>
                      {wr}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const startBalance = stats.bankroll?.initial || 1000;

  // 1. Sort bets chronologically to draw the correct time evolution
  const sortedBets = React.useMemo(() => {
    return [...completedBets].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.time !== b.time) return a.time.localeCompare(b.time);
      return a.id - b.id;
    });
  }, [completedBets]);

  // 2. Compute bankroll points
  const points = React.useMemo(() => {
    let current = startBalance;
    let cumulativeProfit = 0;
    const list = [{ val: startBalance, profit: 0, date: 'Initial', bet: null }];
    for (const bet of sortedBets) {
      let profit = 0;
      if (bet.status === 'WON') profit = bet.stake * (bet.odds - 1);
      else if (bet.status === 'LOST') profit = -bet.stake;
      current += profit;
      cumulativeProfit += profit;
      list.push({ val: current, profit: cumulativeProfit, date: bet.date, bet });
    }
    return list;
  }, [sortedBets, startBalance]);

  // 3. Compute Advanced Trading Metrics (Win/Loss Streaks, Profit Factor, Expected Profit)
  const advancedStats = React.useMemo(() => {
    let currentWinStreak = 0;
    let maxWinStreak = 0;
    let currentLossStreak = 0;
    let maxLossStreak = 0;
    let grossProfit = 0;
    let grossLoss = 0;

    for (const bet of sortedBets) {
      if (bet.status === 'WON') {
        currentWinStreak++;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
        currentLossStreak = 0;
        grossProfit += bet.stake * (bet.odds - 1);
      } else if (bet.status === 'LOST') {
        currentLossStreak++;
        maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
        currentWinStreak = 0;
        grossLoss += bet.stake;
      }
    }

    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : grossProfit > 0 ? 99.9 : 0;
    const totalBetsCount = sortedBets.filter(b => b.status === 'WON' || b.status === 'LOST').length;
    const mathExpectancy = totalBetsCount > 0 ? (totalProfit / totalBetsCount) : 0;

    return {
      maxWinStreak,
      maxLossStreak,
      profitFactor,
      mathExpectancy
    };
  }, [sortedBets, totalProfit]);

  // 4. Compute Breakdown by Sport (Football, Basketball, Tennis, etc.)
  const sportsList = React.useMemo(() => {
    const sportMap = {};
    for (const bet of completedBets) {
      const sp = (bet.sport || 'football').toLowerCase().trim();
      let profit = 0;
      if (bet.status === 'WON') profit = bet.stake * (bet.odds - 1);
      else if (bet.status === 'LOST') profit = -bet.stake;

      if (!sportMap[sp]) {
        sportMap[sp] = { name: sp, profit: 0, total: 0, won: 0 };
      }
      sportMap[sp].profit += profit;
      sportMap[sp].total++;
      if (bet.status === 'WON') sportMap[sp].won++;
    }
    return Object.values(sportMap).sort((a, b) => b.profit - a.profit);
  }, [completedBets]);

  // 5. Compute Breakdown by Bet Category (1X2, Handicap, Over/Under)
  const betCategoriesList = React.useMemo(() => {
    const categoryMap = {
      'Victoire 1X2': { name: 'Victoire 1X2', profit: 0, total: 0, won: 0 },
      'Handicap': { name: 'Handicap', profit: 0, total: 0, won: 0 },
      'Over / Under': { name: 'Over / Under', profit: 0, total: 0, won: 0 }
    };

    for (const bet of completedBets) {
      const rawTip = (bet.best_tip || '').toLowerCase();
      const isHandicap = (rawTip === '1' || rawTip === '2') && bet.card_line !== 0 && !isNaN(bet.card_line);

      let cat = 'Over / Under';
      if (isHandicap) {
        cat = 'Handicap';
      } else if (rawTip === '1' || rawTip === '2' || rawTip === 'x' || rawTip === 'n' || rawTip === 'nul' || rawTip === 'match nul' || rawTip === 'home' || rawTip === 'away') {
        cat = 'Victoire 1X2';
      }

      let profit = 0;
      if (bet.status === 'WON') profit = bet.stake * (bet.odds - 1);
      else if (bet.status === 'LOST') profit = -bet.stake;

      categoryMap[cat].profit += profit;
      categoryMap[cat].total++;
      if (bet.status === 'WON') categoryMap[cat].won++;
    }
    return Object.values(categoryMap).filter(c => c.total > 0).sort((a, b) => b.profit - a.profit);
  }, [completedBets]);

  const drawCumulativeChart = () => {
    if (completedBets.length === 0) {
      return (
        <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Aucun pari résolu pour cette sélection.
        </div>
      );
    }

    const width = 1200;
    const height = 250;
    const paddingLeft = 20;
    const paddingRight = 60;
    const paddingTop = 20;
    const paddingBottom = 25;

    const values = points.map(p => p.val);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const valRange = maxVal - minVal === 0 ? 1 : maxVal - minVal;

    const getX = (idx) => paddingLeft + (idx / (points.length - 1)) * (width - paddingLeft - paddingRight);
    const getY = (val) => height - paddingBottom - ((val - minVal) / valRange) * (height - paddingTop - paddingBottom);

    let pathD = `M ${getX(0)} ${getY(values[0])}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${getX(i)} ${getY(values[i])}`;
    }
    let areaD = `${pathD} L ${getX(points.length - 1)} ${height - paddingBottom} L ${getX(0)} ${height - paddingBottom} Z`;

    // Calculate vertical grid intervals
    const gridLines = [];
    const gridCount = 3;
    for (let i = 0; i <= gridCount; i++) {
      gridLines.push(minVal + (i / gridCount) * valRange);
    }

    return (
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        width="100%" 
        style={{ 
          display: 'block',
          background: 'rgba(0,0,0,0.15)', 
          borderRadius: '12px', 
          border: '1px solid var(--border-color)', 
          padding: '12px', 
          overflow: 'visible',
          height: 'auto'
        }}
      >
        <defs>
          <linearGradient id="chartGradTracker" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0082ff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#bf5af2" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="lineGradTracker" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0082ff" />
            <stop offset="100%" stopColor="#bf5af2" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {gridLines.map((val, idx) => (
          <g key={idx}>
            <line 
              x1={paddingLeft} 
              y1={getY(val)} 
              x2={width - paddingRight} 
              y2={getY(val)} 
              stroke="rgba(255, 255, 255, 0.05)" 
              strokeWidth="0.5"
              strokeDasharray="3 3"
            />
            <text 
              x={width - paddingRight + 6} 
              y={getY(val) + 3} 
              fill="rgba(255, 255, 255, 0.35)" 
              fontSize="9.5" 
              fontWeight="600"
              fontFamily="Outfit"
            >
              {val.toFixed(0)}{currency}
            </text>
          </g>
        ))}

        {/* Reference initial line */}
        <line
          x1={paddingLeft}
          y1={getY(startBalance)}
          x2={width - paddingRight}
          y2={getY(startBalance)}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="0.8"
          strokeDasharray="4 2"
        />

        {/* Crosshair guidelines on hover */}
        {activePoint && (
          <>
            <line
              x1={getX(activePoint.index)}
              y1={paddingTop}
              x2={getX(activePoint.index)}
              y2={height - paddingBottom}
              stroke="rgba(191, 90, 242, 0.25)"
              strokeWidth="1"
              strokeDasharray="2 2"
              style={{ pointerEvents: 'none' }}
            />
            <line
              x1={paddingLeft}
              y1={getY(activePoint.val)}
              x2={width - paddingRight}
              y2={getY(activePoint.val)}
              stroke="rgba(191, 90, 242, 0.15)"
              strokeWidth="0.8"
              strokeDasharray="2 2"
              style={{ pointerEvents: 'none' }}
            />
          </>
        )}

        {/* Main area under curve */}
        <path d={areaD} fill="url(#chartGradTracker)" style={{ pointerEvents: 'none' }} />

        {/* Main line path */}
        <path d={pathD} fill="none" stroke="url(#lineGradTracker)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }} />

        {/* Circle markers */}
        {points.map((p, i) => {
          const isHovered = activePoint && activePoint.index === i;
          return (
            <circle 
              key={i} 
              cx={getX(i)} 
              cy={getY(p.val)} 
              r={isHovered ? "5" : "2.5"} 
              fill={p.val >= startBalance ? '#10b981' : '#ef4444'} 
              stroke={isHovered ? '#fff' : 'rgba(0,0,0,0.5)'} 
              strokeWidth={isHovered ? '1.5' : '0.5'}
              style={{ transition: 'all 0.12s ease-out', cursor: 'pointer' }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setActivePoint({
                  index: i,
                  val: p.val,
                  profit: p.profit,
                  date: p.date,
                  bet: p.bet,
                  rect: {
                    x: rect.left + window.scrollX,
                    y: rect.top + window.scrollY
                  }
                });
              }}
              onMouseLeave={() => setActivePoint(null)}
            />
          );
        })}
      </svg>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', position: 'relative' }}>
      
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
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Mise moyenne: {avgStake} {currency}</span>
        </div>
        <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Cote Moyenne</span>
          <h3 style={{ fontSize: '24px', fontFamily: 'Outfit', fontWeight: 800, marginTop: '8px', color: '#bf5af2' }}>
            {avgOdds}
          </h3>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Sur la sélection</span>
        </div>
      </div>

      {/* Advanced Performance Stats Cards */}
      {completedBets.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '3px solid #2ecc71' }}>
            <Award size={24} style={{ color: '#2ecc71', opacity: 0.8 }} />
            <div>
              <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Série de Victoires Max</span>
              <h4 style={{ fontSize: '18px', fontFamily: 'Outfit', fontWeight: 800, margin: '2px 0 0 0' }}>{advancedStats.maxWinStreak} d'affilée</h4>
            </div>
          </div>
          <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '3px solid #e74c3c' }}>
            <Activity size={24} style={{ color: '#e74c3c', opacity: 0.8 }} />
            <div>
              <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Série de Défaites Max</span>
              <h4 style={{ fontSize: '18px', fontFamily: 'Outfit', fontWeight: 800, margin: '2px 0 0 0' }}>{advancedStats.maxLossStreak} d'affilée</h4>
            </div>
          </div>
          <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '3px solid #0082ff' }}>
            <TrendingUp size={24} style={{ color: '#0082ff', opacity: 0.8 }} />
            <div>
              <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Facteur de Profit</span>
              <h4 style={{ fontSize: '18px', fontFamily: 'Outfit', fontWeight: 800, margin: '2px 0 0 0', color: advancedStats.profitFactor >= 1.5 ? '#2ecc71' : advancedStats.profitFactor >= 1.0 ? '#f1c40f' : '#e74c3c' }}>
                {advancedStats.profitFactor.toFixed(2)}
              </h4>
            </div>
          </div>
          <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '3px solid #bf5af2' }}>
            <BarChart2 size={24} style={{ color: '#bf5af2', opacity: 0.8 }} />
            <div>
              <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Espérance Gain / Pari</span>
              <h4 style={{ fontSize: '18px', fontFamily: 'Outfit', fontWeight: 800, margin: '2px 0 0 0', color: advancedStats.mathExpectancy >= 0 ? '#2ecc71' : '#e74c3c' }}>
                {advancedStats.mathExpectancy >= 0 ? '+' : ''}{advancedStats.mathExpectancy.toFixed(2)} {currency}
              </h4>
            </div>
          </div>
        </div>
      )}

      {/* SVG Profit evolution timeline chart */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontFamily: 'Outfit', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TrendingUp size={16} style={{ color: '#bf5af2' }} />
          Courbe d'Évolution de la Bankroll (Sélection Filtrée)
        </h3>
        {drawCumulativeChart()}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
        
        {/* Left Col: Leagues, Bookmakers and Sports performance lists */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {renderDataSection("Rentabilité par Ligue", leaguesList, showLgChart, setShowLgChart)}
          {renderDataSection("Rentabilité par Bookmaker", bookmakersList, showBmChart, setShowBmChart)}
          {renderDataSection("Rentabilité par Sport", sportsList, showSpChart, setShowSpChart)}
        </div>

        {/* Right Col: Tip Types, Odds Ranges and Bet Categories breakdowns */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {renderDataSection("Rentabilité par Tranche de Cote", oddsRangesList, showOddsChart, setShowOddsChart)}
          {renderDataSection("Rentabilité par Type de Conseil", tipTypesList, showTipChart, setShowTipChart)}
          {renderDataSection("Rentabilité par Type de Pari", betCategoriesList, showCatChart, setShowCatChart)}
        </div>

      </div>

      {/* Floating Interactive Tooltip */}
      {activePoint && (
        <div 
          style={{
            position: 'fixed',
            left: `${activePoint.rect.x - window.scrollX}px`,
            top: `${activePoint.rect.y - window.scrollY - 10}px`,
            transform: 'translate(-50%, -100%)',
            background: 'rgba(10, 15, 29, 0.95)',
            border: '1px solid rgba(191, 90, 242, 0.4)',
            borderRadius: '10px',
            padding: '12px 14px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 15px rgba(191, 90, 242, 0.15)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            pointerEvents: 'none',
            minWidth: '220px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontFamily: 'Outfit',
            fontSize: '12px',
            color: '#fff',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {activePoint.bet ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px', marginBottom: '2px' }}>
                <span style={{ fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', fontSize: '9px' }}>
                  {activePoint.bet.league}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
                  {activePoint.bet.date}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                {activePoint.bet.home_team} vs {activePoint.bet.away_team}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Pronostic :</span>
                <strong style={{ color: '#bf5af2' }}>{activePoint.bet.best_tip} {activePoint.bet.card_line}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Cote / Mise :</span>
                <strong>@{activePoint.bet.odds.toFixed(2)} / {activePoint.bet.stake.toFixed(1)} {currency}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '4px', marginTop: '2px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Résultat :</span>
                <strong style={{ 
                  color: activePoint.bet.status === 'WON' ? 'var(--color-success)' : activePoint.bet.status === 'LOST' ? 'var(--color-danger)' : 'var(--text-muted)' 
                }}>
                  {activePoint.bet.status === 'WON' ? 'GAGNÉ' : activePoint.bet.status === 'LOST' ? 'PERDU' : 'REMBOURSÉ'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Profit Net :</span>
                <strong style={{ color: (activePoint.val - points[activePoint.index - 1].val) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {(activePoint.val - points[activePoint.index - 1].val) >= 0 ? '+' : ''}{(activePoint.val - points[activePoint.index - 1].val).toFixed(2)} {currency}
                </strong>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', fontWeight: 700 }}>État Initial : {startBalance.toFixed(2)} {currency}</div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(191, 90, 242, 0.2)', paddingTop: '4px', marginTop: '2px', fontWeight: 800 }}>
            <span style={{ color: 'var(--text-muted)' }}>Solde Bankroll :</span>
            <span style={{ color: '#bf5af2' }}>{activePoint.val.toFixed(2)} {currency}</span>
          </div>
        </div>
      )}

    </div>
  );
}
