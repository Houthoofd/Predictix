import React from 'react';
import { 
  Check, 
  X, 
  Trash2,
  RefreshCw,
  MoreVertical,
  RotateCcw,
  TrendingUp,
  BarChart2,
  PieChart,
  Calendar,
  Filter,
  ArrowUpRight
} from 'lucide-react';

export default function TrackerTab({ 
  bets, 
  stats, 
  handleSettleBet, 
  handleDeleteBet,
  handleRefreshBet,
  handleRefreshAllBets,
  betRefreshLoading = {},
  globalRefreshLoading = false,
  subTab = 'journal',
  setSubTab
}) {
  const [activeKebabId, setActiveKebabId] = React.useState(null);
  const [localSubTab, setLocalSubTab] = React.useState('journal');
  
  // Use prop or local fallback
  const activeSubTab = setSubTab ? subTab : localSubTab;
  const changeSubTab = setSubTab ? setSubTab : setLocalSubTab;

  const [timeframe, setTimeframe] = React.useState('all');
  const [filterBookmaker, setFilterBookmaker] = React.useState('all');
  const [filterLeague, setFilterLeague] = React.useState('all');


  // Close kebab dropdown when clicking anywhere else
  React.useEffect(() => {
    const handleDocumentClick = () => {
      setActiveKebabId(null);
    };
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  const toggleKebab = (e, betId) => {
    e.stopPropagation();
    setActiveKebabId(activeKebabId === betId ? null : betId);
  };

  // Get unique bookmakers and leagues for filters
  const bookmakers = Array.from(new Set(bets.map(b => b.bookmaker).filter(Boolean)));
  const leagues = Array.from(new Set(bets.map(b => b.league).filter(Boolean)));

  // Filtered bets
  const getFilteredBets = () => {
    const now = new Date();
    const currentYearMonth = now.toISOString().substring(0, 7); // "2026-06"
    
    const date7DaysAgo = new Date();
    date7DaysAgo.setDate(now.getDate() - 7);
    const str7DaysAgo = date7DaysAgo.toISOString().substring(0, 10);

    const date30DaysAgo = new Date();
    date30DaysAgo.setDate(now.getDate() - 30);
    const str30DaysAgo = date30DaysAgo.toISOString().substring(0, 10);

    const lastMonthDate = new Date();
    lastMonthDate.setMonth(now.getMonth() - 1);
    const lastMonthStr = lastMonthDate.toISOString().substring(0, 7);

    return bets.filter(b => {
      // Timeframe
      if (timeframe === '7days' && b.date < str7DaysAgo) return false;
      if (timeframe === '30days' && b.date < str30DaysAgo) return false;
      if (timeframe === 'currentMonth' && !b.date.startsWith(currentYearMonth)) return false;
      if (timeframe === 'lastMonth' && !b.date.startsWith(lastMonthStr)) return false;

      // Bookmaker
      if (filterBookmaker !== 'all' && b.bookmaker !== filterBookmaker) return false;

      // League
      if (filterLeague !== 'all' && b.league !== filterLeague) return false;

      return true;
    });
  };

  const filteredBets = getFilteredBets();
  const completedBets = filteredBets.filter(b => b.status !== 'PENDING');
  const pendingBets = filteredBets.filter(b => b.status === 'PENDING');

  let totalProfit = 0;
  let totalStaked = 0;
  let wins = 0;
  let losses = 0;
  let refunded = 0;
  let totalOddsSum = 0;

  const leagueMap = {};
  const bookmakerMap = {};
  const tipTypeMap = {};
  const oddsRangeMap = {
    'low': { label: 'Cote < 1.50', profit: 0, total: 0, won: 0 },
    'medium': { label: 'Cote 1.50 - 2.00', profit: 0, total: 0, won: 0 },
    'high': { label: 'Cote 2.00 - 3.00', profit: 0, total: 0, won: 0 },
    'very_high': { label: 'Cote > 3.00', profit: 0, total: 0, won: 0 }
  };

  for (const bet of completedBets) {
    let profit = 0;
    if (bet.status === 'WON') {
      profit = bet.stake * (bet.odds - 1);
      wins++;
    } else if (bet.status === 'LOST') {
      profit = -bet.stake;
      losses++;
    } else if (bet.status === 'REFUNDED') {
      profit = 0;
      refunded++;
    }

    totalProfit += profit;
    totalStaked += bet.stake;
    totalOddsSum += bet.odds;

    // By League
    if (!leagueMap[bet.league]) {
      leagueMap[bet.league] = { name: bet.league, profit: 0, total: 0, won: 0 };
    }
    leagueMap[bet.league].profit += profit;
    leagueMap[bet.league].total++;
    if (bet.status === 'WON') leagueMap[bet.league].won++;

    // By Bookmaker
    if (!bookmakerMap[bet.bookmaker]) {
      bookmakerMap[bet.bookmaker] = { name: bet.bookmaker, profit: 0, total: 0, won: 0 };
    }
    bookmakerMap[bet.bookmaker].profit += profit;
    bookmakerMap[bet.bookmaker].total++;
    if (bet.status === 'WON') bookmakerMap[bet.bookmaker].won++;

    // By Tip Type (Plus de vs Moins de)
    const rawTip = (bet.best_tip || '').toLowerCase();
    const cleanTip = rawTip.includes('plus') || rawTip.includes('over') ? 'Over / Plus de' : 'Under / Moins de';
    if (!tipTypeMap[cleanTip]) {
      tipTypeMap[cleanTip] = { name: cleanTip, profit: 0, total: 0, won: 0 };
    }
    tipTypeMap[cleanTip].profit += profit;
    tipTypeMap[cleanTip].total++;
    if (bet.status === 'WON') tipTypeMap[cleanTip].won++;

    // By Odds Range
    const odds = bet.odds;
    let rangeKey = 'medium';
    if (odds < 1.50) rangeKey = 'low';
    else if (odds <= 2.00) rangeKey = 'medium';
    else if (odds <= 3.00) rangeKey = 'high';
    else rangeKey = 'very_high';

    oddsRangeMap[rangeKey].profit += profit;
    oddsRangeMap[rangeKey].total++;
    if (bet.status === 'WON') oddsRangeMap[rangeKey].won++;
  }

  const winRate = completedBets.length > 0 ? parseFloat(((wins / (wins + losses || 1)) * 100).toFixed(1)) : 0;
  const roi = totalStaked > 0 ? parseFloat(((totalProfit / totalStaked) * 100).toFixed(1)) : 0;
  const avgOdds = completedBets.length > 0 ? parseFloat((totalOddsSum / completedBets.length).toFixed(2)) : 0;
  const avgStake = completedBets.length > 0 ? parseFloat((totalStaked / completedBets.length).toFixed(1)) : 0;

  const leaguesList = Object.values(leagueMap).sort((a, b) => b.profit - a.profit);
  const bookmakersList = Object.values(bookmakerMap).sort((a, b) => b.profit - a.profit);
  const tipTypesList = Object.values(tipTypeMap).sort((a, b) => b.profit - a.profit);
  const oddsRangesList = Object.values(oddsRangeMap);

  // SVG Chart rendering logic
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

    const currency = stats.bankroll?.currency || '€';

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

        {/* Zero Line */}
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

        {/* Grid lines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

        {/* Area under the line */}
        <path d={areaD} fill="url(#chartGradTracker)" />

        {/* The trend line */}
        <path d={pathD} fill="none" stroke="url(#lineGradTracker)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points */}
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

        {/* Legend text */}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Subtab Toggle Buttons */}
      <div style={{ display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)', width: 'fit-content' }}>
        <button
          onClick={() => changeSubTab('journal')}
          className="btn"
          style={{ 
            fontSize: '12.5px', 
            padding: '6px 14px', 
            borderRadius: '6px', 
            border: 'none',
            background: activeSubTab === 'journal' ? 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)' : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 700
          }}
        >
          Journal des Paris
        </button>
        <button
          onClick={() => changeSubTab('analytics')}
          className="btn"
          style={{ 
            fontSize: '12.5px', 
            padding: '6px 14px', 
            borderRadius: '6px', 
            border: 'none',
            background: activeSubTab === 'analytics' ? 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)' : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 700
          }}
        >
          Analyses & Statistiques
        </button>
      </div>

      {activeSubTab === 'journal' ? (
        <>
          {/* Active/Pending Bets section */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', margin: 0 }}>Paris en Cours (En attente de résultat)</h3>
              {bets.filter(b => b.status === 'PENDING' && b.match_id).length > 0 && (
                <button
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontFamily: 'Outfit', background: 'var(--grad-accent)', border: 'none' }}
                  onClick={handleRefreshAllBets}
                  disabled={globalRefreshLoading}
                >
                  <RefreshCw size={14} className={globalRefreshLoading ? 'animate-spin' : ''} />
                  <span>{globalRefreshLoading ? 'Mise à jour en cours...' : 'Mettre à jour tous les paris'}</span>
                </button>
              )}
            </div>
            
            <div className="table-container">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Match</th>
                    <th>Championnat</th>
                    <th>Conseil</th>
                    <th>Mise</th>
                    <th>Cote</th>
                    <th>Bookmaker</th>
                    <th>Probabilité</th>
                    <th style={{ textAlign: 'center' }}>Résoudre le Pari</th>
                  </tr>
                </thead>
                <tbody>
                  {bets.filter(b => b.status === 'PENDING').map((bet) => (
                    <tr key={bet.id}>
                      <td style={{ fontSize: '12.5px', fontFamily: 'Outfit' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{bet.date}</div>
                        {bet.time && bet.time !== 'Planned' && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>{bet.time}</div>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>{bet.home_team} vs {bet.away_team}</td>
                      <td style={{ fontSize: '13px' }}>{bet.league}</td>
                      <td style={{ fontFamily: 'Outfit', fontWeight: 600 }}>{bet.best_tip} {bet.card_line}</td>
                      <td style={{ fontWeight: 700 }}>{bet.stake} {stats.bankroll?.currency || '€'}</td>
                      <td>{bet.odds}</td>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{bet.bookmaker}</td>
                      <td>
                        {bet.probability ? (
                          <span className={bet.probability >= 60 ? 'prob-high' : 'prob-medium'}>
                            {bet.probability}%
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                          {bet.match_id ? (
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '4px 8px', color: 'var(--color-accent-solid)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              onClick={() => handleRefreshBet(bet.id)}
                              disabled={betRefreshLoading[bet.id]}
                              title="Auto-résoudre le score via Matchendirect"
                            >
                              <RefreshCw size={13} className={betRefreshLoading[bet.id] ? 'animate-spin' : ''} />
                            </button>
                          ) : (
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '4px 8px', color: 'var(--text-muted)', cursor: 'not-allowed', opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              disabled
                              title="Indisponible pour les paris manuels (sans ID match)"
                            >
                              <RefreshCw size={13} />
                            </button>
                          )}
                          
                          <button 
                            className="btn btn-accent" 
                            style={{ padding: '4px 10px', fontSize: '12px', background: 'var(--color-success)', color: 'white' }}
                            onClick={() => handleSettleBet(bet.id, 'WON')}
                            title="Marquer comme GAGNÉ"
                          >
                            <Check size={14} />
                            <span>Gain</span>
                          </button>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => handleSettleBet(bet.id, 'LOST')}
                            title="Marquer comme PERDU"
                          >
                            <X size={14} />
                            <span>Perte</span>
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '4px 6px', fontSize: '11px' }}
                            onClick={() => handleSettleBet(bet.id, 'REFUNDED')}
                            title="Annulé/Remboursé"
                          >
                            Remb.
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '4px 6px', color: 'var(--color-danger)' }}
                            onClick={() => handleDeleteBet(bet.id)}
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {bets.filter(b => b.status === 'PENDING').length === 0 && (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
                        Aucun pari actif en attente de résultat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bets History section */}
          <div className="glass-card">
            <h3 style={{ fontSize: '18px', marginBottom: '16px', fontFamily: 'Outfit' }}>Historique Complet de tous les Paris</h3>
            
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
                    <th>Bénéfice/Perte</th>
                    <th>Statut</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bets.filter(b => b.status !== 'PENDING').map((bet) => {
                    let profit = 0;
                    if (bet.status === 'WON') profit = bet.stake * (bet.odds - 1);
                    else if (bet.status === 'LOST') profit = -bet.stake;

                    return (
                      <tr key={bet.id}>
                        <td style={{ fontSize: '12.5px', fontFamily: 'Outfit' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{bet.date}</div>
                          {bet.time && bet.time !== 'Planned' && (
                            <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>{bet.time}</div>
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>{bet.home_team} vs {bet.away_team}</td>
                        <td style={{ fontSize: '13px' }}>{bet.league}</td>
                        <td style={{ fontFamily: 'Outfit', fontWeight: 600 }}>{bet.best_tip} {bet.card_line}</td>
                        <td>{bet.stake} {stats.bankroll?.currency || '€'}</td>
                        <td>{bet.odds}</td>
                        <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{bet.bookmaker}</td>
                        <td style={{ 
                          fontWeight: 700, 
                          color: profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                        }}>
                          {profit >= 0 ? '+' : ''}{profit.toFixed(2)} {stats.bankroll?.currency || '€'}
                        </td>
                        <td>
                          <span className={`badge badge-${bet.status.toLowerCase()}`}>
                            {bet.status === 'WON' && 'Gagné'}
                            {bet.status === 'LOST' && 'Perdu'}
                            {bet.status === 'REFUNDED' && 'Annulé'}
                          </span>
                        </td>
                        <td style={{ position: 'relative' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '4px 6px', border: 'none', color: 'var(--text-secondary)' }}
                            onClick={(e) => toggleKebab(e, bet.id)}
                            title="Actions"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {activeKebabId === bet.id && (
                            <div className="glass-card" style={{ 
                              position: 'absolute', 
                              top: '100%', 
                              right: '16px', 
                              zIndex: 100, 
                              minWidth: '150px', 
                              padding: '6px 0', 
                              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)', 
                              borderRadius: '6px',
                              background: '#0f172a',
                              border: '1px solid var(--border-color)',
                              textAlign: 'left'
                            }}>
                              <button 
                                style={{ 
                                  width: '100%', 
                                  padding: '8px 14px', 
                                  background: 'transparent', 
                                  border: 'none', 
                                  color: 'var(--text-primary)', 
                                  fontSize: '12.5px', 
                                  textAlign: 'left', 
                                  cursor: 'pointer', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '8px' 
                                }}
                                onClick={() => {
                                  handleSettleBet(bet.id, 'PENDING');
                                  setActiveKebabId(null);
                                }}
                                className="kebab-item"
                              >
                                <RotateCcw size={14} style={{ color: 'var(--color-accent-solid)' }} />
                                <span>Remettre en jeu</span>
                              </button>
                              <button 
                                style={{ 
                                  width: '100%', 
                                  padding: '8px 14px', 
                                  background: 'transparent', 
                                  border: 'none', 
                                  color: 'var(--color-danger)', 
                                  fontSize: '12.5px', 
                                  textAlign: 'left', 
                                  cursor: 'pointer', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '8px' 
                                }}
                                onClick={() => {
                                  handleDeleteBet(bet.id);
                                  setActiveKebabId(null);
                                }}
                                className="kebab-item"
                              >
                                <Trash2 size={14} />
                                <span>Supprimer</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {bets.filter(b => b.status !== 'PENDING').length === 0 && (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
                        Historique vide.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* ========================================================================
           ANALYTICS VIEW (OPTION 5)
           ======================================================================== */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          {/* Interactive Filters Panel */}
          <div className="glass-card" style={{ display: 'flex', gap: '15px', alignItems: 'center', padding: '15px 20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={15} style={{ color: 'var(--color-accent-solid)' }} />
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Filtres de performance :</span>
            </div>
            
            {/* Timeframe */}
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

            {/* Bookmaker */}
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

            {/* League */}
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
                {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)} {stats.bankroll?.currency || '€'}
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
                {totalStaked.toFixed(1)} {stats.bankroll?.currency || '€'}
              </h3>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Mise moy: {avgStake} {stats.bankroll?.currency || '€'} • Cote moy: {avgOdds}</span>
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
              
              {/* League performance card */}
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
                          {lg.profit >= 0 ? '+' : ''}{lg.profit.toFixed(2)} {stats.bankroll?.currency || '€'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>Aucune donnée historique.</div>
                )}
              </div>

              {/* Bookmaker performance card */}
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
                          {bm.profit >= 0 ? '+' : ''}{bm.profit.toFixed(2)} {stats.bankroll?.currency || '€'}
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
              
              {/* Odds Ranges Performance card */}
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
                        {rg.profit >= 0 ? '+' : ''}{rg.profit.toFixed(2)} {stats.bankroll?.currency || '€'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tip Type performance card */}
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
                          {tip.profit >= 0 ? '+' : ''}{tip.profit.toFixed(2)} {stats.bankroll?.currency || '€'}
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
      )}

    </div>
  );
}

