import React from 'react';
import { Trash2, RefreshCw } from 'lucide-react';
import TrackerPendingBetsTable from './TrackerPendingBetsTable';
import TrackerCompletedBetsTable from './TrackerCompletedBetsTable';
import TrackerAnalyticsView from './TrackerAnalyticsView';

export default function TrackerTab({ 
  bets, 
  stats, 
  handleSettleBet, 
  handleDeleteBet,
  handleDeleteMultipleBets,
  handleRefreshBet,
  handleRefreshAllBets,
  betRefreshLoading = {},
  globalRefreshLoading = false,
  subTab = 'journal',
  setSubTab,
  onOpenEditBetModal
}) {
  const [activeKebabId, setActiveKebabId] = React.useState(null);
  const [localSubTab, setLocalSubTab] = React.useState('journal');
  const [selectedBetIds, setSelectedBetIds] = React.useState([]);
  
  const activeSubTab = setSubTab ? subTab : localSubTab;
  const changeSubTab = setSubTab ? setSubTab : setLocalSubTab;

  const [timeframe, setTimeframe] = React.useState('all');
  const [filterBookmaker, setFilterBookmaker] = React.useState('all');
  const [filterLeague, setFilterLeague] = React.useState('all');

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

  const bookmakers = Array.from(new Set(bets.map(b => normalizeBookmakerName(b.bookmaker)).filter(Boolean)));
  const leagues = Array.from(new Set(bets.map(b => b.league).filter(Boolean)));

  const getFilteredBets = () => {
    const now = new Date();
    const currentYearMonth = now.toISOString().substring(0, 7);
    
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
      if (timeframe === '7days' && b.date < str7DaysAgo) return false;
      if (timeframe === '30days' && b.date < str30DaysAgo) return false;
      if (timeframe === 'currentMonth' && !b.date.startsWith(currentYearMonth)) return false;
      if (timeframe === 'lastMonth' && !b.date.startsWith(lastMonthStr)) return false;
      if (filterBookmaker !== 'all' && normalizeBookmakerName(b.bookmaker) !== filterBookmaker) return false;
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

    if (!leagueMap[bet.league]) {
      leagueMap[bet.league] = { name: bet.league, profit: 0, total: 0, won: 0 };
    }
    leagueMap[bet.league].profit += profit;
    leagueMap[bet.league].total++;
    if (bet.status === 'WON') leagueMap[bet.league].won++;

    const normBm = normalizeBookmakerName(bet.bookmaker);
    if (!bookmakerMap[normBm]) {
      bookmakerMap[normBm] = { name: normBm, profit: 0, total: 0, won: 0 };
    }
    bookmakerMap[normBm].profit += profit;
    bookmakerMap[normBm].total++;
    if (bet.status === 'WON') bookmakerMap[normBm].won++;

    const rawTip = (bet.best_tip || '').toLowerCase();
    let cleanTip = 'Autre';
    if (rawTip.includes('plus') || rawTip.includes('over')) {
      cleanTip = 'Over / Plus de';
    } else if (rawTip.includes('moins') || rawTip.includes('under')) {
      cleanTip = 'Under / Moins de';
    } else if (rawTip === '1' || rawTip === 'home' || rawTip === 'domicile') {
      cleanTip = '1 (Victoire Domicile)';
    } else if (rawTip === '2' || rawTip === 'away' || rawTip === 'extérieur' || rawTip === 'exterieur') {
      cleanTip = '2 (Victoire Extérieur)';
    } else if (rawTip === 'x' || rawTip === 'n' || rawTip === 'nul' || rawTip === 'match nul') {
      cleanTip = 'N (Match Nul)';
    }
    
    if (!tipTypeMap[cleanTip]) {
      tipTypeMap[cleanTip] = { name: cleanTip, profit: 0, total: 0, won: 0 };
    }
    tipTypeMap[cleanTip].profit += profit;
    tipTypeMap[cleanTip].total++;
    if (bet.status === 'WON') tipTypeMap[cleanTip].won++;

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
          {selectedBetIds.length > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              padding: '12px 20px',
              borderRadius: '8px',
              color: '#fff',
              fontFamily: 'Outfit',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '16px',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.05)'
            }}>
              <span>{selectedBetIds.length} pari(s) sélectionné(s)</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ fontSize: '11px', padding: '4px 10px' }} 
                  onClick={() => setSelectedBetIds([])}
                >
                  Annuler la sélection
                </button>
                <button 
                  className="btn btn-danger" 
                  style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }} 
                  onClick={() => {
                    if (handleDeleteMultipleBets) {
                      handleDeleteMultipleBets(selectedBetIds).then(success => {
                        if (success) setSelectedBetIds([]);
                      });
                    }
                  }}
                >
                  <Trash2 size={13} />
                  Supprimer la sélection
                </button>
              </div>
            </div>
          )}

          <TrackerPendingBetsTable
            pendingBets={bets.filter(b => b.status === 'PENDING')}
            stats={stats}
            selectedBetIds={selectedBetIds}
            setSelectedBetIds={setSelectedBetIds}
            handleRefreshAllBets={handleRefreshAllBets}
            globalRefreshLoading={globalRefreshLoading}
            handleSettleBet={handleSettleBet}
            activeKebabId={activeKebabId}
            setActiveKebabId={setActiveKebabId}
            toggleKebab={toggleKebab}
            betRefreshLoading={betRefreshLoading}
            handleRefreshBet={handleRefreshBet}
            onOpenEditBetModal={onOpenEditBetModal}
            handleDeleteBet={handleDeleteBet}
          />

          <TrackerCompletedBetsTable
            completedBets={bets.filter(b => b.status !== 'PENDING')}
            stats={stats}
            selectedBetIds={selectedBetIds}
            setSelectedBetIds={setSelectedBetIds}
            toggleKebab={toggleKebab}
            activeKebabId={activeKebabId}
            setActiveKebabId={setActiveKebabId}
            onOpenEditBetModal={onOpenEditBetModal}
            handleSettleBet={handleSettleBet}
            handleDeleteBet={handleDeleteBet}
          />
        </>
      ) : (
        <TrackerAnalyticsView
          timeframe={timeframe}
          setTimeframe={setTimeframe}
          filterBookmaker={filterBookmaker}
          setFilterBookmaker={setFilterBookmaker}
          filterLeague={filterLeague}
          setFilterLeague={setFilterLeague}
          bookmakers={bookmakers}
          leagues={leagues}
          completedBets={completedBets}
          stats={stats}
          totalProfit={totalProfit}
          winRate={winRate}
          wins={wins}
          losses={losses}
          refunded={refunded}
          roi={roi}
          totalStaked={totalStaked}
          avgStake={avgStake}
          avgOdds={avgOdds}
          leaguesList={leaguesList}
          bookmakersList={bookmakersList}
          oddsRangesList={oddsRangesList}
          tipTypesList={tipTypesList}
        />
      )}

    </div>
  );
}

export function normalizeBookmakerName(bookmaker) {
  if (!bookmaker) return 'Unibet';
  const clean = bookmaker.trim();
  const lower = clean.toLowerCase();
  const mapping = {
    '1xbet': '1XBet',
    'unibet': 'Unibet',
    'betclic': 'Betclic',
    'winamax': 'Winamax',
    'pmu': 'PMU',
    'zebet': 'ZEbet',
    'bwin': 'Bwin',
    'bet365': 'Bet365',
    'parions sport': 'Parions Sport',
    'parionssport': 'Parions Sport'
  };
  return mapping[lower] || (clean.charAt(0).toUpperCase() + clean.slice(1));
}
