import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/authContext';
import { trpc } from '@/lib/trpc';
import {
  Folder,
  BarChart3,
  Target,
  Sliders,
  Wallet,
  Settings,
  Trophy,
} from 'lucide-react';

import {
  defaultBankrolls,
  defaultStrategies,
  bankrollHistoryData,
  betsTrackerData,
} from './data/dashboardConstants';

import { DashboardHeader } from './components/DashboardHeader';
import { DashboardSidebar } from './components/DashboardSidebar';
import { ToastNotification } from './components/ToastNotification';

import { MarketsModal } from './modals/MarketsModal';
import { PlaceBetModal } from './modals/PlaceBetModal';
import { NewBankrollModal } from './modals/NewBankrollModal';
import { NewStrategyModal } from './modals/NewStrategyModal';
import { QuickSearchDialog } from './modals/QuickSearchDialog';

import { OverviewView } from './views/OverviewView';
import { ConfrontationsMarketsView } from './views/ConfrontationsMarketsView';
import { SportsStatsView } from './views/SportsStatsView';
import { BankrollsView } from './views/BankrollsView';
import { StrategiesView } from './views/StrategiesView';
import { TrackerView } from './views/TrackerView';
import { SettingsView } from './views/SettingsView';

export function AuthenticatedDashboard() {
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('overview');
  const [activeTabPill, setActiveTabPill] = useState('overview');
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-Bankroll State
  const [bankrolls, setBankrolls] = useState(defaultBankrolls);
  const [selectedBankrollId, setSelectedBankrollId] = useState('main');
  const [showNewBankrollModal, setShowNewBankrollModal] = useState(false);
  const [newBankrollName, setNewBankrollName] = useState('');
  const [newBankrollAmount, setNewBankrollAmount] = useState('500');
  const [newBankrollSport, setNewBankrollSport] = useState('Football');

  // Strategies State
  const [strategies, setStrategies] = useState(defaultStrategies);
  const [showNewStrategyModal, setShowNewStrategyModal] = useState(false);
  const [newStratName, setNewStratName] = useState('');
  const [newStratSport, setNewStratSport] = useState('Football');
  const [newStratType, setNewStratType] = useState('corners_over');
  const [newStratThreshold, setNewStratThreshold] = useState('9.5');
  const [newStratMinOdds, setNewStratMinOdds] = useState('1.85');
  const [newStratRules, setNewStratRules] = useState('');

  // Filter for real matches from predictix-api
  const [matchFilterSport] = useState('football');
  const [matchSearchTeam, setMatchSearchTeam] = useState('');
  const [backtestResult, setBacktestResult] = useState(null);

  // 35 Disciplines & Confrontations & Place Bet States
  const [trackedBets, setTrackedBets] = useState(betsTrackerData);
  const [showPlaceBetModal, setShowPlaceBetModal] = useState(false);
  const [selectedDisciplineForBet, setSelectedDisciplineForBet] = useState(null);
  const [betBankrollId, setBetBankrollId] = useState('main');
  const [betMatch, setBetMatch] = useState('');
  const [betCompetition, setBetCompetition] = useState('');
  const [betMarket, setBetMarket] = useState('Résultat du match');
  const [betSelection, setBetSelection] = useState('Victoire Domicile (1)');
  const [betOdds, setBetOdds] = useState('1.85');
  const [betStake, setBetStake] = useState('50');
  const [betToastMessage, setBetToastMessage] = useState(null);
  const [disciplineFilterCategory, setDisciplineFilterCategory] = useState('all');
  const [disciplineSearch, setDisciplineSearch] = useState('');

  // Confrontations & Available Markets States
  const [disciplinesSubTab, setDisciplinesSubTab] = useState('confrontations');
  const [selectedSportFilterId, setSelectedSportFilterId] = useState('all');
  const [selectedConfrontation, setSelectedConfrontation] = useState(null);
  const [showMarketsModal, setShowMarketsModal] = useState(false);
  const [marketsFilterCategory, setMarketsFilterCategory] = useState('all');

  const accountMenuRef = useRef(null);

  // tRPC queries to predictix-api
  const disciplinesQuery = trpc.sports.getDisciplines.useQuery(undefined, {
    staleTime: 60000,
  });

  const confrontationsQuery = trpc.sports.getConfrontations.useQuery(
    {
      sportId: selectedSportFilterId === 'all' ? undefined : Number(selectedSportFilterId),
      search: disciplineSearch || undefined,
      limit: 60,
    },
    { staleTime: 30000 }
  );

  const marketsQuery = trpc.sports.getConfrontationMarkets.useQuery(
    {
      captureId: selectedConfrontation?.id || 0,
      sportId: selectedConfrontation?.sportId,
    },
    {
      enabled: !!(selectedConfrontation && selectedConfrontation.id),
      staleTime: 15000,
    }
  );

  const aggregatesQuery = trpc.sports.getAggregates.useQuery(
    { sport: matchFilterSport },
    { staleTime: 60000 }
  );

  const matchesQuery = trpc.sports.getMatches.useQuery(
    {
      sport: matchFilterSport,
      limit: 50,
      team: matchSearchTeam || undefined,
    },
    { staleTime: 30000 }
  );

  const testStrategyMutation = trpc.sports.testStrategy.useMutation({
    onSuccess: (data) => {
      setBacktestResult(data);
    },
  });

  const placeBetMutation = trpc.sports.placeBet.useMutation();

  const handleOpenConfrontationMarkets = (conf) => {
    setSelectedConfrontation(conf);
    setMarketsFilterCategory('all');
    setShowMarketsModal(true);
  };

  const handleSelectMarketBet = (conf, marketName, sel) => {
    setSelectedConfrontation(conf);
    setSelectedDisciplineForBet({
      id: conf.sportId,
      name: conf.sportName,
      competition: conf.competition,
      sampleMatch: conf.match,
    });
    setBetMatch(conf.match);
    setBetCompetition(conf.competition);
    setBetMarket(marketName);
    setBetSelection(sel.selection);
    setBetOdds(String(sel.odds));
    setBetStake('50');

    const matchingBk = bankrolls.find((b) =>
      b.sport.toLowerCase().includes((conf.sportName || '').toLowerCase())
    );
    setBetBankrollId(matchingBk ? matchingBk.id : 'main');

    setShowPlaceBetModal(true);
  };

  const handleOpenPlaceBet = (disc, preselectedOdds = null) => {
    setSelectedDisciplineForBet(disc);
    setBetMatch(disc.sampleMatch || `${disc.name} - Match officiel`);
    setBetCompetition(disc.competition || 'Compétition officielle');
    setBetMarket('Résultat du match');
    setBetOdds(preselectedOdds ? String(preselectedOdds) : String(disc.defaultOdds?.[0] || '1.85'));
    setBetSelection(disc.category === 'Sports Collectifs' ? 'Victoire Domicile (1)' : 'Vainqueur du match');
    setBetStake('50');
    const matchingBk = bankrolls.find((b) => b.sport.toLowerCase().includes(disc.name.toLowerCase()));
    if (matchingBk) {
      setBetBankrollId(matchingBk.id);
    } else {
      setBetBankrollId('main');
    }
    setShowPlaceBetModal(true);
  };

  const handleConfirmPlaceBet = (e) => {
    e.preventDefault();
    const stakeNum = parseFloat(betStake) || 50;
    const oddsNum = parseFloat(betOdds) || 1.85;
    const potentialGain = (stakeNum * oddsNum).toFixed(2);
    const bkName = bankrolls.find((b) => b.id === betBankrollId)?.name || 'Bankroll Principale';
    const sportName = selectedDisciplineForBet?.name || selectedConfrontation?.sportName || 'Football';

    placeBetMutation.mutate({
      sport: sportName,
      sportId: selectedDisciplineForBet?.id || selectedConfrontation?.sportId,
      captureId: selectedConfrontation?.id,
      bankrollId: betBankrollId,
      match: betMatch,
      competition: betCompetition,
      market: betMarket,
      selection: betSelection,
      odds: oddsNum,
      stake: stakeNum,
      bookmaker: 'Bwin',
    });

    const newBetItem = {
      id: Date.now(),
      date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      match: betMatch,
      sport: sportName,
      bet: betMarket ? `${betMarket} : ${betSelection}` : betSelection,
      odds: oddsNum,
      stake: stakeNum,
      status: 'pending',
      profit: `Gain pot. +${(stakeNum * (oddsNum - 1)).toFixed(2)} €`,
      bankroll: bkName,
    };

    setTrackedBets([newBetItem, ...trackedBets]);

    // Deduct stake from chosen bankroll
    setBankrolls((prev) =>
      prev.map((b) => {
        if (b.id === betBankrollId) {
          return {
            ...b,
            current: Math.max(0, +(b.current - stakeNum).toFixed(2)),
          };
        }
        return b;
      })
    );

    setShowPlaceBetModal(false);
    setBetToastMessage({
      title: 'Pari placé avec succès !',
      desc: `${stakeNum} € engagés sur ${betMatch} (${betMarket} : ${betSelection}) à une cote de ${oddsNum.toFixed(2)} (Gain potentiel : ${potentialGain} €).`,
    });
    setTimeout(() => setBetToastMessage(null), 5000);
  };

  // Close account menu on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl + K
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setQuickSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setQuickSearchOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const totalCapital = bankrolls.reduce((sum, b) => sum + b.current, 0);
  const totalInitial = bankrolls.reduce((sum, b) => sum + b.initial, 0);
  const overallROI = (((totalCapital - totalInitial) / totalInitial) * 100).toFixed(1);

  // Add Bankroll Handler
  const handleCreateBankroll = (e) => {
    e.preventDefault();
    if (!newBankrollName.trim()) return;
    const amount = parseFloat(newBankrollAmount) || 500;
    const colors = ['#1D7CEA', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];
    const newB = {
      id: `bk-${Date.now()}`,
      name: newBankrollName.trim(),
      initial: amount,
      current: amount,
      roi: '+0.0%',
      sport: newBankrollSport,
      color: colors[bankrolls.length % colors.length],
    };
    setBankrolls([...bankrolls, newB]);
    setSelectedBankrollId(newB.id);
    setShowNewBankrollModal(false);
    setNewBankrollName('');
    setNewBankrollAmount('500');
  };

  // Add Strategy Handler
  const handleCreateStrategy = (e) => {
    e.preventDefault();
    if (!newStratName.trim()) return;
    const thresholdNum = parseFloat(newStratThreshold) || 2.5;
    const oddsNum = parseFloat(newStratMinOdds) || 1.85;

    testStrategyMutation.mutate({
      strategyType: newStratType,
      threshold: thresholdNum,
      odds: oddsNum,
    });

    const newStrat = {
      id: `strat-${Date.now()}`,
      name: newStratName.trim(),
      type: newStratType,
      threshold: thresholdNum,
      odds: oddsNum,
      sport: newStratSport,
      winRate: 70.0,
      roi: '+16.5%',
      betsCount: 50,
      rules: newStratRules.trim() || `Cote min ${oddsNum} • Seuil ${thresholdNum}`,
    };
    setStrategies([...strategies, newStrat]);
    setShowNewStrategyModal(false);
    setNewStratName('');
    setNewStratRules('');
  };

  const disciplines = disciplinesQuery.data?.disciplines || [];
  const filteredDisciplines = disciplines.filter((disc) => {
    const matchesCat =
      disciplineFilterCategory === 'all' || disc.category === disciplineFilterCategory;
    const matchesSearch =
      !disciplineSearch.trim() ||
      disc.name.toLowerCase().includes(disciplineSearch.toLowerCase()) ||
      disc.competition.toLowerCase().includes(disciplineSearch.toLowerCase()) ||
      disc.sampleMatch.toLowerCase().includes(disciplineSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const navItems = [
    { id: 'overview', label: "Vue d'ensemble", icon: Folder, hasSub: false },
    { id: 'disciplines', label: '35 Disciplines & Cotes', icon: Trophy, hasSub: true },
    { id: 'sports-stats', label: 'Statistiques Multisports', icon: BarChart3, hasSub: true },
    { id: 'bankrolls', label: 'Gestion Multi-Bankrolls', icon: Wallet, hasSub: true },
    { id: 'strategies', label: 'Créateur & Test de Stratégies', icon: Sliders, hasSub: true },
    { id: 'tracker', label: 'Tracker de Paris', icon: Target, hasSub: true },
    { id: 'settings', label: 'Configuration & Profil', icon: Settings, hasSub: false },
  ];

  const totalMatchesCount = aggregatesQuery.data?.totalMatches || 797;
  const avgGoals = aggregatesQuery.data?.avgGoals || 2.74;
  const avgCorners = aggregatesQuery.data?.avgCorners || 9.85;
  const avgCards = aggregatesQuery.data?.avgCards || 4.12;
  const homeWinRate = aggregatesQuery.data?.homeWinRate || 46.2;
  const over25Rate = aggregatesQuery.data?.over25Rate || 54.5;
  const bttsRate = aggregatesQuery.data?.bttsRate || 51.8;

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col font-sans select-none antialiased">
      {/* 1. TOP HEADER & SUB-HEADER TABS */}
      <DashboardHeader
        user={user}
        logout={logout}
        accountMenuOpen={accountMenuOpen}
        setAccountMenuOpen={setAccountMenuOpen}
        accountMenuRef={accountMenuRef}
        totalCapital={totalCapital}
        overallROI={overallROI}
        totalMatchesCount={totalMatchesCount}
        bankrollsCount={bankrolls.length}
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        setActiveTabPill={setActiveTabPill}
        setShowNewBankrollModal={setShowNewBankrollModal}
      />

      {/* 2. MAIN BODY (SIDEBAR + ACTIVE VIEW) */}
      <div className="flex-1 flex overflow-hidden">
        <DashboardSidebar
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          setQuickSearchOpen={setQuickSearchOpen}
          navItems={navItems}
          activeNav={activeNav}
          setActiveNav={setActiveNav}
          setActiveTabPill={setActiveTabPill}
        />

        <main className="flex-1 overflow-y-auto bg-white p-4 sm:p-6 lg:p-8">
          {activeNav === 'overview' && (
            <OverviewView
              totalMatchesCount={totalMatchesCount}
              avgGoals={avgGoals}
              avgCorners={avgCorners}
              avgCards={avgCards}
              bankrolls={bankrolls}
              selectedBankrollId={selectedBankrollId}
              setSelectedBankrollId={setSelectedBankrollId}
              totalCapital={totalCapital}
              overallROI={overallROI}
              strategies={strategies}
              bankrollHistoryData={bankrollHistoryData}
              setActiveNav={setActiveNav}
              setActiveTabPill={setActiveTabPill}
              setShowNewBankrollModal={setShowNewBankrollModal}
              setShowNewStrategyModal={setShowNewStrategyModal}
            />
          )}

          {activeNav === 'disciplines' && (
            <ConfrontationsMarketsView
              confrontationsQuery={confrontationsQuery}
              disciplinesQuery={disciplinesQuery}
              disciplinesSubTab={disciplinesSubTab}
              setDisciplinesSubTab={setDisciplinesSubTab}
              selectedSportFilterId={selectedSportFilterId}
              setSelectedSportFilterId={setSelectedSportFilterId}
              disciplineSearch={disciplineSearch}
              setDisciplineSearch={setDisciplineSearch}
              handleOpenConfrontationMarkets={handleOpenConfrontationMarkets}
              handleSelectMarketBet={handleSelectMarketBet}
              disciplineFilterCategory={disciplineFilterCategory}
              setDisciplineFilterCategory={setDisciplineFilterCategory}
              filteredDisciplines={filteredDisciplines}
              handleOpenPlaceBet={handleOpenPlaceBet}
            />
          )}

          {activeNav === 'sports-stats' && (
            <SportsStatsView
              totalMatchesCount={totalMatchesCount}
              matchesQuery={matchesQuery}
              aggregatesQuery={aggregatesQuery}
              avgGoals={avgGoals}
              over25Rate={over25Rate}
              avgCorners={avgCorners}
              avgCards={avgCards}
              homeWinRate={homeWinRate}
              bttsRate={bttsRate}
              matchSearchTeam={matchSearchTeam}
              setMatchSearchTeam={setMatchSearchTeam}
            />
          )}

          {activeNav === 'bankrolls' && (
            <BankrollsView
              bankrolls={bankrolls}
              selectedBankrollId={selectedBankrollId}
              setSelectedBankrollId={setSelectedBankrollId}
              setShowNewBankrollModal={setShowNewBankrollModal}
              betsTrackerData={betsTrackerData}
            />
          )}

          {activeNav === 'strategies' && (
            <StrategiesView
              strategies={strategies}
              setShowNewStrategyModal={setShowNewStrategyModal}
              backtestResult={backtestResult}
              setBacktestResult={setBacktestResult}
              testStrategyMutation={testStrategyMutation}
            />
          )}

          {activeNav === 'tracker' && (
            <TrackerView
              trackedBets={trackedBets}
              handleOpenPlaceBet={handleOpenPlaceBet}
              disciplines={disciplines}
            />
          )}

          {activeNav === 'settings' && (
            <SettingsView user={user} logout={logout} />
          )}
        </main>
      </div>

      {/* 3. MODALS */}
      <NewBankrollModal
        show={showNewBankrollModal}
        onClose={() => setShowNewBankrollModal(false)}
        onSubmit={handleCreateBankroll}
        name={newBankrollName}
        setName={setNewBankrollName}
        amount={newBankrollAmount}
        setAmount={setNewBankrollAmount}
        sport={newBankrollSport}
        setSport={setNewBankrollSport}
      />

      <NewStrategyModal
        show={showNewStrategyModal}
        onClose={() => setShowNewStrategyModal(false)}
        onSubmit={handleCreateStrategy}
        name={newStratName}
        setName={setNewStratName}
        type={newStratType}
        setType={setNewStratType}
        minOdds={newStratMinOdds}
        setMinOdds={setNewStratMinOdds}
        threshold={newStratThreshold}
        setThreshold={setNewStratThreshold}
        rules={newStratRules}
        setRules={setNewStratRules}
        isTesting={testStrategyMutation.isLoading}
      />

      <PlaceBetModal
        show={showPlaceBetModal}
        selectedDisciplineForBet={selectedDisciplineForBet}
        selectedConfrontation={selectedConfrontation}
        onClose={() => setShowPlaceBetModal(false)}
        onSubmit={handleConfirmPlaceBet}
        bankrolls={bankrolls}
        betBankrollId={betBankrollId}
        setBetBankrollId={setBetBankrollId}
        betMatch={betMatch}
        setBetMatch={setBetMatch}
        betMarket={betMarket}
        setBetMarket={setBetMarket}
        betSelection={betSelection}
        setBetSelection={setBetSelection}
        betOdds={betOdds}
        setBetOdds={setBetOdds}
        betStake={betStake}
        setBetStake={setBetStake}
        isSubmitting={placeBetMutation.isLoading}
      />

      <MarketsModal
        show={showMarketsModal}
        confrontation={selectedConfrontation}
        onClose={() => setShowMarketsModal(false)}
        marketsQuery={marketsQuery}
        marketsFilterCategory={marketsFilterCategory}
        setMarketsFilterCategory={setMarketsFilterCategory}
        onSelectMarketBet={handleSelectMarketBet}
      />

      <QuickSearchDialog
        isOpen={quickSearchOpen}
        onClose={() => setQuickSearchOpen(false)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        navItems={navItems}
        onSelectNav={(id) => {
          setActiveNav(id);
          setActiveTabPill(id);
        }}
      />

      <ToastNotification
        toastMessage={betToastMessage}
        onClose={() => setBetToastMessage(null)}
      />
    </div>
  );
}
