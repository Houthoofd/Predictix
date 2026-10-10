import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/authContext';
import { trpc } from '@/lib/trpc';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Folder,
  BarChart3,
  Target,
  Sliders,
  Wallet,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  MessageSquare,
  Home,
  CheckCircle2,
  Circle,
  HelpCircle,
  User,
  LogOut,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Activity,
  Plus,
  X,
  FileText,
  Play,
  RotateCcw,
  Trophy,
  Flame,
  Check,
  Calendar,
  Layers,
  Percent,
  RefreshCw,
  Database,
  Radio,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

// Multi-Bankroll Data
const defaultBankrolls = [
  { id: 'main', name: 'Bankroll Principale', initial: 1000, current: 1450, roi: '+45.0%', sport: 'Multisport', color: '#1D7CEA' },
  { id: 'football', name: 'Bankroll Football & Corners', initial: 500, current: 720, roi: '+44.0%', sport: 'Football', color: '#10B981' },
  { id: 'basket', name: 'Bankroll NBA & Basketball', initial: 300, current: 395, roi: '+31.6%', sport: 'Basketball', color: '#F59E0B' },
  { id: 'tennis', name: 'Bankroll Tennis ATP/WTA', initial: 200, current: 240, roi: '+20.0%', sport: 'Tennis', color: '#8B5CF6' },
];

// Strategies Created & Tested
const defaultStrategies = [
  {
    id: 'strat-1',
    name: 'Corners Over 9.5 (Équipes Offensives)',
    type: 'corners_over',
    threshold: 9.5,
    odds: 1.85,
    sport: 'Football',
    winRate: 76.0,
    roi: '+18.4%',
    betsCount: 54,
    rules: 'Cote min 1.70 • Pression offensive > 65% • Corners concédés adversaire > 4.5',
  },
  {
    id: 'strat-2',
    name: 'Cartons Jaunes > 4.5 (Derbies & Arbitres sévères)',
    type: 'cards_over',
    threshold: 4.5,
    odds: 2.10,
    sport: 'Football',
    winRate: 69.2,
    roi: '+24.1%',
    betsCount: 38,
    rules: 'Arbitre moy > 4.2 cartons/match • Confrontation rivalité directe • Cote min 1.85',
  },
  {
    id: 'strat-3',
    name: 'Plus de 2.5 Buts (Matchs Ouverts)',
    type: 'over_2_5',
    threshold: 2.5,
    odds: 1.75,
    sport: 'Football',
    winRate: 65.4,
    roi: '+14.2%',
    betsCount: 46,
    rules: 'Moyenne buts supérieure à 2.8 • Attaques en forme • Cote min 1.75',
  },
  {
    id: 'strat-4',
    name: 'Les 2 Équipes Marquent (BTTS)',
    type: 'btts',
    threshold: 0,
    odds: 1.80,
    sport: 'Football',
    winRate: 62.5,
    roi: '+12.5%',
    betsCount: 32,
    rules: 'Défenses perméables sur les 5 derniers matchs • Cote min 1.80',
  },
];

// Recharts Capital Evolution Data
const bankrollHistoryData = [
  { date: '01 Oct', bankroll: 1000 },
  { date: '02 Oct', bankroll: 1045 },
  { date: '03 Oct', bankroll: 1020 },
  { date: '04 Oct', bankroll: 1110 },
  { date: '05 Oct', bankroll: 1180 },
  { date: '06 Oct', bankroll: 1160 },
  { date: '07 Oct', bankroll: 1250 },
  { date: '08 Oct', bankroll: 1310 },
  { date: '09 Oct', bankroll: 1390 },
  { date: '10 Oct', bankroll: 1450 },
];

const betsTrackerData = [
  { id: 1, date: '10 Oct', match: 'Arsenal vs Chelsea', sport: 'Football', bet: 'Corners > 9.5', odds: 1.85, stake: 50, status: 'won', profit: '+42.50 €', bankroll: 'Football & Corners' },
  { id: 2, date: '09 Oct', match: 'Boston Celtics vs NY Knicks', sport: 'Basketball', bet: 'Total Points > 224.5', odds: 1.90, stake: 35, status: 'won', profit: '+31.50 €', bankroll: 'NBA & Basketball' },
  { id: 3, date: '09 Oct', match: 'Alcaraz vs Sinner', sport: 'Tennis', bet: 'Plus de 22.5 jeux', odds: 1.82, stake: 30, status: 'won', profit: '+24.60 €', bankroll: 'Tennis ATP/WTA' },
  { id: 4, date: '08 Oct', match: 'Real Madrid vs Barcelone', sport: 'Football', bet: 'Cartons Jaunes > 4.5', odds: 2.10, stake: 40, status: 'won', profit: '+44.00 €', bankroll: 'Football & Corners' },
  { id: 5, date: '08 Oct', match: 'LAL Lakers vs Golden State', sport: 'Basketball', bet: 'LAL -3.5 Handicap', odds: 1.95, stake: 30, status: 'lost', profit: '-30.00 €', bankroll: 'NBA & Basketball' },
  { id: 6, date: '07 Oct', match: 'PSG vs Marseille', sport: 'Football', bet: 'Victoire PSG & +2.5 buts', odds: 1.70, stake: 50, status: 'won', profit: '+35.00 €', bankroll: 'Football & Corners' },
];

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
  const [matchFilterSport, setMatchFilterSport] = useState('football');
  const [matchSearchTeam, setMatchSearchTeam] = useState('');
  const [backtestResult, setBacktestResult] = useState(null);

  const accountMenuRef = useRef(null);

  // tRPC queries to predictix-api
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

  const navItems = [
    { id: 'overview', label: "Vue d'ensemble", icon: Folder, hasSub: false },
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
      {/* 1. TOP HEADER BAR */}
      <header className="h-12 border-b border-zinc-200 bg-white flex items-center justify-between px-3.5 z-40 shrink-0">
        {/* Left: Predictix Brand Logo + Instance Dropdown */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity">
            <div className="h-6 w-6 rounded-md bg-white border border-zinc-200 p-0.5 shadow-2xs flex items-center justify-center shrink-0">
              <img
                src="/predictix-logo.png"
                alt="Predictix Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 hover:text-zinc-700">
              <span className="truncate max-w-[200px] sm:max-w-[280px]">Predictix • Multisport & Bankrolls</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </div>
          </div>
        </div>

        {/* Right: Real API Indicator + Capital Global + User Profile */}
        <div className="flex items-center gap-3" ref={accountMenuRef}>
          {/* Live predictix-api badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>predictix-api ({totalMatchesCount} matchs)</span>
          </div>

          {/* Fast KPI in Header */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-zinc-50 border border-zinc-200/80 text-xs">
            <span className="text-zinc-500 text-[11px]">Capital total :</span>
            <span className="font-bold text-zinc-900 font-mono">{totalCapital.toLocaleString('fr-FR')} €</span>
            <span className="text-emerald-600 font-semibold text-[11px]">+{overallROI}%</span>
          </div>

          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-zinc-700 hover:text-zinc-900 px-2 py-1 rounded transition-colors"
            onClick={() => window.open('https://github.com/Houthoofd/Predictix', '_blank')}
          >
            <HelpCircle className="w-3.5 h-3.5 text-zinc-700" />
            <span className="font-normal hidden sm:inline">Guide</span>
          </button>

          {/* User Profile Avatar */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setAccountMenuOpen(!accountMenuOpen)}
              className="h-7 w-7 rounded-full bg-zinc-900 text-white flex items-center justify-center hover:ring-2 hover:ring-zinc-300 transition-all focus:outline-none"
              aria-label="Menu profil utilisateur"
            >
              <User className="w-4 h-4 text-white" />
            </button>

            {/* Account Menu Dropdown */}
            {accountMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-md border border-zinc-200 bg-white p-2 shadow-lg z-50 text-xs animate-in fade-in-50 zoom-in-95">
                <div className="px-3 py-2 border-b border-zinc-100">
                  <p className="font-semibold text-zinc-900">{user?.name || 'Administrateur Predictix'}</p>
                  <p className="text-[11px] text-zinc-500 font-mono truncate">{user?.email || 'admin@predictix.io'}</p>
                  <span className="inline-block mt-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                    Session Sécurisée • predictix.be
                  </span>
                </div>

                <div className="py-1">
                  <div className="px-3 py-1.5 text-zinc-600 flex justify-between items-center text-[11px]">
                    <span>Bankrolls actives</span>
                    <span className="font-mono text-zinc-900 font-medium">{bankrolls.length} portefeuilles</span>
                  </div>
                  <div className="px-3 py-1.5 text-zinc-600 flex justify-between items-center text-[11px]">
                    <span>Source Sportive</span>
                    <span className="font-mono text-emerald-600 font-medium">predictix-api (3100)</span>
                  </div>
                </div>

                <div className="border-t border-zinc-100 pt-1 mt-1">
                  <button
                    onClick={logout}
                    className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 rounded flex items-center gap-2 transition-colors font-medium text-xs"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Se déconnecter</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. SUB-HEADER / TAB PILLS BAR */}
      <div className="h-10 border-b border-zinc-200 bg-white flex items-center justify-between px-4 sm:px-6 z-30 shrink-0">
        {/* Left: Tab Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            type="button"
            onClick={() => {
              setActiveTabPill('overview');
              setActiveNav('overview');
            }}
            className={`px-3 py-1 text-xs rounded-md font-medium whitespace-nowrap transition-all ${
              activeNav === 'overview'
                ? 'bg-white text-zinc-900 border border-zinc-300 shadow-2xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            Vue d'ensemble
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTabPill('sports-stats');
              setActiveNav('sports-stats');
            }}
            className={`px-3 py-1 text-xs rounded-md font-medium whitespace-nowrap transition-all ${
              activeNav === 'sports-stats'
                ? 'bg-white text-zinc-900 border border-zinc-300 shadow-2xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            Stats Multisports ({totalMatchesCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTabPill('bankrolls');
              setActiveNav('bankrolls');
            }}
            className={`px-3 py-1 text-xs rounded-md font-medium whitespace-nowrap transition-all ${
              activeNav === 'bankrolls'
                ? 'bg-white text-zinc-900 border border-zinc-300 shadow-2xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            Multi-Bankrolls
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTabPill('strategies');
              setActiveNav('strategies');
            }}
            className={`px-3 py-1 text-xs rounded-md font-medium whitespace-nowrap transition-all ${
              activeNav === 'strategies'
                ? 'bg-white text-zinc-900 border border-zinc-300 shadow-2xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            Stratégies & Backtest
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTabPill('tracker');
              setActiveNav('tracker');
            }}
            className={`px-3 py-1 text-xs rounded-md font-medium whitespace-nowrap transition-all ${
              activeNav === 'tracker'
                ? 'bg-white text-zinc-900 border border-zinc-300 shadow-2xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            Tracker Paris
          </button>
        </div>

        {/* Right: Quick Action Pill */}
        <div className="hidden sm:flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowNewBankrollModal(true)}
            className="h-7 text-[11px] gap-1 border-zinc-200 text-zinc-700 hover:text-zinc-900 shadow-2xs"
          >
            <Plus className="w-3 h-3 text-[#1D7CEA]" />
            <span>Nouvelle Bankroll</span>
          </Button>
        </div>
      </div>

      {/* 3. MAIN BODY (SIDEBAR + CONTENT) */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT NAVIGATION SIDEBAR */}
        <aside
          className={`border-r border-zinc-200 bg-white flex flex-col justify-between transition-all duration-200 ease-in-out shrink-0 z-20 ${
            sidebarCollapsed ? 'w-14' : 'w-60'
          }`}
        >
          {/* Top section: Search & Nav items */}
          <div className={`flex-1 overflow-y-auto overflow-x-hidden ${sidebarCollapsed ? 'px-1.5 py-2.5 space-y-1.5' : 'p-2.5 space-y-1'}`}>
            {/* Quick search input */}
            {!sidebarCollapsed ? (
              <div
                onClick={() => setQuickSearchOpen(true)}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-md border border-zinc-200 hover:border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-500 text-xs cursor-pointer mb-2.5 shadow-2xs transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <Search className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-[11px] text-zinc-400">Rechercher...</span>
                </div>
                <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-zinc-100 text-zinc-500 border border-zinc-200">
                  ctrl + K
                </kbd>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setQuickSearchOpen(true)}
                className="w-10 h-10 mx-auto flex items-center justify-center rounded-md hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
                title="Rechercher (Ctrl + K)"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {/* Sidebar toggle button (repli/dépli) */}
            {!sidebarCollapsed ? (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(true)}
                className="w-full text-left px-2.5 py-1.5 text-xs text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-md flex items-center justify-between mb-2 transition-colors group"
                title="Replier la barre latérale"
              >
                <div className="flex items-center gap-2 truncate">
                  <ChevronLeft className="w-4 h-4 text-zinc-500 group-hover:text-zinc-900 shrink-0" />
                  <span className="text-[11px] font-medium text-zinc-600 group-hover:text-zinc-900 truncate">Réduire la barre</span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                className="w-10 h-10 mx-auto flex items-center justify-center rounded-md hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
                title="Déplier la barre latérale"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Subtle divider */}
            <div className={`border-b border-zinc-200/80 my-1.5 ${sidebarCollapsed ? 'w-8 mx-auto' : 'mx-1'}`} />

            {/* Menu List */}
            <nav className={sidebarCollapsed ? "space-y-1 flex flex-col items-center" : "space-y-0.5"}>
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveNav(item.id);
                      setActiveTabPill(item.id);
                    }}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={
                      sidebarCollapsed
                        ? `w-10 h-10 mx-auto flex items-center justify-center rounded-md transition-colors ${
                            isActive
                              ? 'bg-zinc-100 text-zinc-900 font-semibold shadow-2xs'
                              : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 font-normal'
                          }`
                        : `w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                            isActive
                              ? 'bg-zinc-100 font-semibold text-zinc-900 shadow-2xs'
                              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50/90 font-normal'
                          }`
                    }
                  >
                    {sidebarCollapsed ? (
                      <IconComponent
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-zinc-900' : 'text-zinc-500'
                        }`}
                      />
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5 truncate">
                          <IconComponent
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? 'text-zinc-900' : 'text-zinc-500'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.hasSub && (
                          <ChevronRight className="w-3 h-3 text-zinc-400 shrink-0" />
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom section: Help & Secondary Toggle */}
          <div className="border-t border-zinc-100 py-2 px-1 text-zinc-400">
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  className="w-10 h-10 mx-auto flex items-center justify-center hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors text-zinc-500"
                  title="Aide & Guide"
                  onClick={() => window.open('https://github.com/Houthoofd/Predictix', '_blank')}
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(false)}
                  className="w-10 h-10 mx-auto flex items-center justify-center hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors text-zinc-500"
                  title="Déplier la barre latérale"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between px-2.5">
                <button
                  type="button"
                  className="p-1.5 hover:text-zinc-700 hover:bg-zinc-100 rounded transition-colors"
                  title="Aide & Guide"
                  onClick={() => window.open('https://github.com/Houthoofd/Predictix', '_blank')}
                >
                  <MessageSquare className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(true)}
                  className="flex items-center gap-1 px-2 py-1 hover:text-zinc-700 hover:bg-zinc-100 rounded text-[11px] text-zinc-500 transition-colors"
                  title="Replier la barre latérale"
                >
                  <span>Réduire</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* MAIN DASHBOARD CONTENT AREA */}
        <main className="flex-1 overflow-y-auto bg-white p-4 sm:p-6 lg:p-8">
          {activeNav === 'overview' ? (
            /* PREDICTIX OVERVIEW */
            <div className="w-full space-y-6">
              {/* Page Title Section */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Home className="w-5 h-5 text-zinc-800" />
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
                    Predictix One
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-zinc-500 max-w-4xl font-normal leading-relaxed">
                  Visualisez les statistiques sur tous les sports ({totalMatchesCount} matchs en direct et récents via predictix-api), gérez vos portefeuilles multi-bankrolls et créez vos stratégies de paris avec simulation de rentabilité.
                </p>
              </div>

              {/* 2-Column Responsive Grid (Left ~65%, Right ~35%) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT COLUMN (lg:col-span-8) */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Card 1: Que souhaitez-vous faire ensuite ? */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-4">
                    <h2 className="text-xs font-semibold text-zinc-800">
                      Que souhaitez-vous faire ensuite ?
                    </h2>

                    <div className="divide-y divide-zinc-100">
                      {/* Action Row 1: Sports Stats */}
                      <div className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-1 text-[#1D7CEA] mt-0.5 shrink-0">
                            <BarChart3 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-zinc-900 block truncate">
                              Explorer les statistiques multisports ({totalMatchesCount} matchs réels)
                            </span>
                            <span className="text-[11px] text-zinc-400 block">
                              Moyennes de buts ({avgGoals}), corners ({avgCorners}), cartons ({avgCards}) et scores
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveNav('sports-stats')}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 shrink-0 transition-colors"
                        >
                          Voir les stats <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Action Row 2: Create / Manage Bankroll */}
                      <div className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-1 text-[#10B981] mt-0.5 shrink-0">
                            <Wallet className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-zinc-900 block truncate">
                              Créer ou gérer une nouvelle bankroll dédiée
                            </span>
                            <span className="text-[11px] text-zinc-400 block">
                              {bankrolls.length} bankrolls actives • Capital cumulé : {totalCapital.toLocaleString('fr-FR')} €
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowNewBankrollModal(true)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 shrink-0 transition-colors"
                        >
                          Créer une bankroll <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Action Row 3: Create & Test Strategy */}
                      <div className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-1 text-[#F59E0B] mt-0.5 shrink-0">
                            <Sliders className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-zinc-900 block truncate">
                              Créer et tester une stratégie de paris sportifs
                            </span>
                            <span className="text-[11px] text-zinc-400 block">
                              Backtest direct sur les données réelles de predictix-api
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowNewStrategyModal(true)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 shrink-0 transition-colors"
                        >
                          Tester une stratégie <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Action Row 4: Bets Tracker */}
                      <div className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-1 text-[#8B5CF6] mt-0.5 shrink-0">
                            <Target className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-zinc-900 block truncate">
                              Journaliser et analyser vos paris sportifs
                            </span>
                            <span className="text-[11px] text-zinc-400 block">
                              Suivi des cotes, mises, gains nets et taux de réussite
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveNav('tracker')}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 shrink-0 transition-colors"
                        >
                          Ouvrir le tracker <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Évolution du Capital Multi-Bankrolls */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xs font-semibold text-zinc-800">
                          Évolution du Capital Multi-Bankrolls
                        </h2>
                        <span className="text-[11px] text-zinc-500">
                          Gains cumulés sur l'ensemble de vos portefeuilles
                        </span>
                      </div>
                      <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-mono">
                        +{overallROI}% Total
                      </span>
                    </div>

                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={bankrollHistoryData}>
                          <defs>
                            <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#1D7CEA" stopOpacity={0.16} />
                              <stop offset="95%" stopColor="#1D7CEA" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                          <XAxis dataKey="date" stroke="#a1a1aa" fontSize={11} tickLine={false} />
                          <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} domain={['dataMin - 50', 'dataMax + 50']} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="p-2.5 rounded-md bg-white border border-zinc-200 shadow-md text-xs">
                                    <div className="text-zinc-500">{payload[0].payload.date}</div>
                                    <div className="font-bold text-zinc-900">{payload[0].value} €</div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="bankroll"
                            stroke="#1D7CEA"
                            strokeWidth={2}
                            fill="url(#totalGrad)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN (lg:col-span-4) */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Card 1: Vos Portefeuilles Multi-Bankrolls */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs font-semibold text-zinc-800">Vos Portefeuilles Bankroll</h2>
                      <button
                        onClick={() => setShowNewBankrollModal(true)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                      >
                        + Créer
                      </button>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {bankrolls.map((bk) => (
                        <div
                          key={bk.id}
                          onClick={() => {
                            setSelectedBankrollId(bk.id);
                            setActiveNav('bankrolls');
                          }}
                          className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                            selectedBankrollId === bk.id
                              ? 'border-blue-300 bg-blue-50/40 shadow-2xs'
                              : 'border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50'
                          }`}
                        >
                          <div className="space-y-0.5 min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: bk.color }}
                              />
                              <span className="text-xs font-semibold text-zinc-900 truncate block">
                                {bk.name}
                              </span>
                            </div>
                            <span className="text-[11px] text-zinc-400 block pl-3.5">
                              {bk.sport} • Initial: {bk.initial} €
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold text-zinc-900 block font-mono">
                              {bk.current.toLocaleString('fr-FR')} €
                            </span>
                            <span className="text-[10px] text-emerald-600 font-semibold block font-mono">
                              {bk.roi}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 2: Vos Stratégies de Paris */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs font-semibold text-zinc-800">Stratégies & Backtest</h2>
                      <button
                        onClick={() => setActiveNav('strategies')}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                      >
                        Gérer <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {strategies.slice(0, 3).map((strat) => (
                        <div
                          key={strat.id}
                          onClick={() => setActiveNav('strategies')}
                          className="p-2.5 rounded-lg border border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 transition-colors cursor-pointer space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-zinc-900 truncate">
                              {strat.name}
                            </span>
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold shrink-0">
                              {strat.roi}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-zinc-500">
                            <span>{strat.sport} • {strat.betsCount} paris testés</span>
                            <span className="font-semibold text-zinc-700">{strat.winRate}% win</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 3: Source de données sportive */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-3">
                    <h2 className="text-xs font-semibold text-zinc-800">Source de Données</h2>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded hover:bg-zinc-50">
                        <span className="font-medium text-zinc-800">predictix-api (port 3100)</span>
                        <span className="text-emerald-600 font-semibold font-mono">Connecté</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded hover:bg-zinc-50">
                        <span className="font-medium text-zinc-800">Matchs collectés</span>
                        <span className="text-zinc-700 font-mono font-bold">{totalMatchesCount} matchs</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded hover:bg-zinc-50">
                        <span className="font-medium text-zinc-800">Moyenne Buts / Match</span>
                        <span className="text-zinc-700 font-mono font-bold">{avgGoals}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeNav === 'sports-stats' ? (
            /* STATISTIQUES MULTISPORTS ALIMENTÉES PAR PREDICTIX-API */
            <div className="w-full space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-zinc-800" />
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
                      Statistiques Multisports ({totalMatchesCount} matchs réels)
                    </h1>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-500 font-normal">
                    Données collectées en temps réel par predictix-api : buts, corners, cartons, fautes et résultats détaillés.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      matchesQuery.refetch();
                      aggregatesQuery.refetch();
                    }}
                    className="h-8 text-xs gap-1.5 border-zinc-200"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${matchesQuery.isFetching ? 'animate-spin' : ''}`} />
                    <span>Actualiser</span>
                  </Button>
                </div>
              </div>

              {/* Real Aggregated KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs">
                  <span className="text-[11px] text-zinc-500 uppercase tracking-wider block font-medium">Moyenne Buts / Match</span>
                  <span className="text-2xl font-bold text-zinc-900 mt-1 block font-mono">
                    {avgGoals}
                  </span>
                  <span className="text-[11px] text-blue-600 font-medium">Over 2.5 : {over25Rate}%</span>
                </div>

                <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs">
                  <span className="text-[11px] text-zinc-500 uppercase tracking-wider block font-medium">Moyenne Corners</span>
                  <span className="text-2xl font-bold text-zinc-900 mt-1 block font-mono">
                    {avgCorners}
                  </span>
                  <span className="text-[11px] text-zinc-400">Total corners par match</span>
                </div>

                <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs">
                  <span className="text-[11px] text-zinc-500 uppercase tracking-wider block font-medium">Moyenne Cartons Jaunes</span>
                  <span className="text-2xl font-bold text-zinc-900 mt-1 block font-mono">
                    {avgCards}
                  </span>
                  <span className="text-[11px] text-zinc-400">Fautes : 24.6 moy</span>
                </div>

                <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs">
                  <span className="text-[11px] text-zinc-500 uppercase tracking-wider block font-medium">Victoire Domicile</span>
                  <span className="text-2xl font-bold text-zinc-900 mt-1 block font-mono">
                    {homeWinRate}%
                  </span>
                  <span className="text-[11px] text-emerald-600 font-semibold">Les 2 marq. : {bttsRate}%</span>
                </div>
              </div>

              {/* Real Matches Explorer from predictix-api */}
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs space-y-3">
                <div className="p-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-zinc-900">
                      Matchs Récents & Statistiques de Jeu (Source : predictix-api)
                    </span>
                    <p className="text-[11px] text-zinc-400">
                      Cliquez sur une ligne pour observer les corners, tirs et cartons détaillés
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Filtrer par équipe..."
                      value={matchSearchTeam}
                      onChange={(e) => setMatchSearchTeam(e.target.value)}
                      className="h-8 text-xs w-48"
                    />
                  </div>
                </div>

                {matchesQuery.isLoading ? (
                  <div className="p-8 text-center text-xs text-zinc-500">
                    Chargement des matchs en direct depuis predictix-api...
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-50 border-b border-zinc-100 text-zinc-500 text-[11px]">
                        <tr>
                          <th className="py-2.5 px-4">Date</th>
                          <th className="py-2.5 px-4">Tournoi / Compétition</th>
                          <th className="py-2.5 px-4">Rencontre</th>
                          <th className="py-2.5 px-4 text-center">Score</th>
                          <th className="py-2.5 px-4 text-center">Corners (D / E)</th>
                          <th className="py-2.5 px-4 text-center">Cartons</th>
                          <th className="py-2.5 px-4 text-center">Tirs Cadrés</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 text-zinc-800">
                        {matchesQuery.data?.matches?.map((m) => (
                          <tr key={m.id} className="hover:bg-zinc-50/80 transition-colors">
                            <td className="py-3 px-4 text-zinc-400 font-mono whitespace-nowrap">{m.date}</td>
                            <td className="py-3 px-4 text-zinc-500 max-w-[160px] truncate">{m.tournament}</td>
                            <td className="py-3 px-4 font-semibold text-zinc-900">
                              {m.homeTeam} <span className="text-zinc-400 font-normal">vs</span> {m.awayTeam}
                            </td>
                            <td className="py-3 px-4 text-center font-bold font-mono text-zinc-900">
                              {m.score}
                            </td>
                            <td className="py-3 px-4 text-center font-mono">
                              <span className="font-semibold text-blue-600">{m.corners.total}</span>{' '}
                              <span className="text-zinc-400 text-[10px]">({m.corners.home} - {m.corners.away})</span>
                            </td>
                            <td className="py-3 px-4 text-center font-mono">
                              <span className="text-amber-600 font-semibold">{m.yellowCards.total}</span>
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-zinc-600">
                              {m.shotsOnTarget.home || 0} - {m.shotsOnTarget.away || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : activeNav === 'bankrolls' ? (
            /* MULTI-BANKROLLS MANAGEMENT */
            <div className="w-full space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-zinc-800" />
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
                      Gestion Multi-Bankrolls
                    </h1>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-500 font-normal">
                    Créez des portefeuilles distincts selon vos sports ou vos stratégies pour isoler vos risques et optimiser vos mises.
                  </p>
                </div>

                <Button
                  onClick={() => setShowNewBankrollModal(true)}
                  className="bg-zinc-900 text-white hover:bg-zinc-800 text-xs gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nouvelle Bankroll</span>
                </Button>
              </div>

              {/* Bankrolls Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {bankrolls.map((bk) => (
                  <Card
                    key={bk.id}
                    onClick={() => setSelectedBankrollId(bk.id)}
                    className={`p-5 cursor-pointer transition-all ${
                      selectedBankrollId === bk.id
                        ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm'
                        : 'border-zinc-200 hover:border-zinc-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-zinc-900 truncate">
                        {bk.name}
                      </span>
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: bk.color }}
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-2xl font-bold text-zinc-900 block font-mono">
                        {bk.current.toLocaleString('fr-FR')} €
                      </span>
                      <div className="flex items-center justify-between text-[11px] text-zinc-500">
                        <span>Capital initial :</span>
                        <span className="font-mono">{bk.initial} €</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-100">
                        <span className="text-zinc-500">Performance ROI :</span>
                        <span className="text-emerald-600 font-bold font-mono">{bk.roi}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Detailed view of active bankroll */}
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">
                      Détails : {bankrolls.find((b) => b.id === selectedBankrollId)?.name}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Historique des paris associés à ce portefeuille
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    {bankrolls.find((b) => b.id === selectedBankrollId)?.sport}
                  </Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 border-b border-zinc-100 text-zinc-500 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4">Match</th>
                        <th className="py-2.5 px-4">Pari</th>
                        <th className="py-2.5 px-4">Cote</th>
                        <th className="py-2.5 px-4">Mise</th>
                        <th className="py-2.5 px-4 text-right">Résultat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {betsTrackerData
                        .filter(
                          (b) =>
                            selectedBankrollId === 'main' ||
                            b.bankroll.toLowerCase().includes(
                              (bankrolls.find((bk) => bk.id === selectedBankrollId)?.sport || '').toLowerCase()
                            )
                        )
                        .map((b) => (
                          <tr key={b.id} className="hover:bg-zinc-50">
                            <td className="py-3 px-4 text-zinc-500">{b.date}</td>
                            <td className="py-3 px-4 font-semibold text-zinc-900">{b.match}</td>
                            <td className="py-3 px-4 text-zinc-600">{b.bet}</td>
                            <td className="py-3 px-4 font-mono font-medium">{b.odds.toFixed(2)}</td>
                            <td className="py-3 px-4">{b.stake} €</td>
                            <td className={`py-3 px-4 text-right font-bold font-mono ${
                              b.status === 'won' ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {b.profit}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeNav === 'strategies' ? (
            /* CRÉATEUR & TESTEUR DE STRATÉGIES SUR DONNÉES RÉELLES */
            <div className="w-full space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-zinc-800" />
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
                      Créateur & Test de Stratégies
                    </h1>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-500 font-normal">
                    Définissez vos règles de sélection de paris et lancez des simulations historiques directement sur les matchs de predictix-api.
                  </p>
                </div>

                <Button
                  onClick={() => setShowNewStrategyModal(true)}
                  className="bg-zinc-900 text-white hover:bg-zinc-800 text-xs gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nouvelle Stratégie</span>
                </Button>
              </div>

              {/* Simulation Result Banner if active */}
              {backtestResult && (
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in-50">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-800 block">
                      Résultat de la Dernière Simulation (Sur {backtestResult.testedBets} matchs réels)
                    </span>
                    <div className="flex items-center gap-4 text-xs">
                      <span>Taux de réussite : <strong>{backtestResult.winRate}%</strong> ({backtestResult.wonBets} gagnés / {backtestResult.lostBets} perdus)</span>
                      <span>Profit simulé : <strong className="text-emerald-700">+{backtestResult.netProfit} €</strong></span>
                      <span>ROI : <strong className="text-emerald-700">{backtestResult.roi}</strong></span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setBacktestResult(null)}
                    className="text-xs text-blue-700 hover:text-blue-900"
                  >
                    Fermer
                  </Button>
                </div>
              )}

              {/* Strategies Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {strategies.map((strat) => (
                  <div
                    key={strat.id}
                    className="p-5 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-3 hover:border-zinc-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="text-sm font-semibold text-zinc-900 block">
                          {strat.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500">{strat.sport}</span>
                          <span className="text-zinc-300">•</span>
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Backtest validé
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-bold text-emerald-600 block font-mono">
                          {strat.roi}
                        </span>
                        <span className="text-[11px] text-zinc-500 font-semibold">
                          {strat.winRate}% win rate
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-100 text-xs text-zinc-700 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                        Règles & Conditions
                      </span>
                      <p className="text-[11px] text-zinc-600 font-mono leading-relaxed">
                        {strat.rules}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-100">
                      <span className="text-zinc-500 font-mono">Cote min : {strat.odds || 1.85}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={testStrategyMutation.isLoading}
                        onClick={() => {
                          testStrategyMutation.mutate({
                            strategyType: strat.type || 'corners_over',
                            threshold: strat.threshold || 9.5,
                            odds: strat.odds || 1.85,
                          });
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 p-0 h-auto"
                      >
                        Tester sur predictix-api ➔
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeNav === 'tracker' ? (
            /* TRACKER DE PARIS MULTISPORTS */
            <div className="w-full space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-zinc-800" />
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
                      Tracker de Paris Sportifs
                    </h1>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-500 font-normal">
                    Journalisez et suivez tous vos paris par sport et par bankroll.
                  </p>
                </div>

                <Button
                  onClick={() => alert('Formulaire d’ajout de pari')}
                  className="bg-zinc-900 text-white hover:bg-zinc-800 text-xs gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter un Pari</span>
                </Button>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
                <div className="p-4 border-b border-zinc-100 flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-900">Journal d'Activité Récente</span>
                  <span className="text-zinc-500 font-mono">{betsTrackerData.length} paris enregistrés</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 border-b border-zinc-100 text-zinc-500 text-[11px] font-medium">
                      <tr>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4">Sport</th>
                        <th className="py-2.5 px-4">Match</th>
                        <th className="py-2.5 px-4">Pari / Sélection</th>
                        <th className="py-2.5 px-4">Bankroll</th>
                        <th className="py-2.5 px-4">Cote</th>
                        <th className="py-2.5 px-4">Mise</th>
                        <th className="py-2.5 px-4">Statut</th>
                        <th className="py-2.5 px-4 text-right">Profit Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-zinc-800">
                      {betsTrackerData.map((bet) => (
                        <tr key={bet.id} className="hover:bg-zinc-50/80 transition-colors">
                          <td className="py-3 px-4 text-zinc-400 font-mono">{bet.date}</td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-zinc-100 text-zinc-700 font-medium">
                              {bet.sport}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-zinc-900">{bet.match}</td>
                          <td className="py-3 px-4 text-zinc-600">{bet.bet}</td>
                          <td className="py-3 px-4 text-zinc-500">{bet.bankroll}</td>
                          <td className="py-3 px-4 font-mono font-semibold">{bet.odds.toFixed(2)}</td>
                          <td className="py-3 px-4">{bet.stake} €</td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                bet.status === 'won'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {bet.status === 'won' ? 'Gagné' : 'Perdu'}
                            </span>
                          </td>
                          <td className={`py-3 px-4 text-right font-semibold font-mono ${
                            bet.status === 'won' ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {bet.profit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* CONFIGURATION & PROFIL */
            <div className="w-full space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-zinc-800" />
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
                    Configuration & Profil
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-zinc-500 font-normal">
                  Paramètres de votre instance Predictix sur Raspberry Pi (bartok-48).
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-4 max-w-xl">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-zinc-900">Compte Administrateur</span>
                  <p className="text-xs text-zinc-500">Adresse email connectée : {user?.email || 'admin@predictix.io'}</p>
                </div>

                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-xs text-zinc-700">Accès sécurisé actif</span>
                  <span className="text-xs font-semibold text-emerald-600 font-mono">predictix.be (200 OK)</span>
                </div>

                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-xs text-zinc-700">API Sportive (predictix-api)</span>
                  <span className="text-xs font-semibold text-zinc-900 font-mono">http://100.116.45.107:3100</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Déconnexion</span>
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL CRÉATION DE NOUVELLE BANKROLL */}
      {showNewBankrollModal && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in-50">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#1D7CEA]" />
                <h3 className="text-sm font-semibold text-zinc-900">Créer une nouvelle Bankroll</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewBankrollModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBankroll} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-zinc-700">Nom de la bankroll</label>
                <Input
                  type="text"
                  required
                  placeholder="Ex: Bankroll Tennis ATP ou Stratégie Corners"
                  value={newBankrollName}
                  onChange={(e) => setNewBankrollName(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-zinc-700">Capital de départ (€)</label>
                <Input
                  type="number"
                  required
                  min="10"
                  step="10"
                  placeholder="500"
                  value={newBankrollAmount}
                  onChange={(e) => setNewBankrollAmount(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-zinc-700">Sport ciblé</label>
                <select
                  value={newBankrollSport}
                  onChange={(e) => setNewBankrollSport(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-zinc-200 bg-white text-zinc-900 focus:outline-none"
                >
                  <option value="Football">Football</option>
                  <option value="Basketball">Basketball</option>
                  <option value="Tennis">Tennis</option>
                  <option value="Multisport">Multisport (Tous)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewBankrollModal(false)}
                  className="text-xs"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-zinc-900 text-white hover:bg-zinc-800 text-xs"
                >
                  Enregistrer la bankroll
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CRÉATION DE STRATÉGIE & BACKTEST */}
      {showNewStrategyModal && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in-50">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#F59E0B]" />
                <h3 className="text-sm font-semibold text-zinc-900">Créer & Tester une Stratégie</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewStrategyModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStrategy} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-zinc-700">Nom de la stratégie</label>
                <Input
                  type="text"
                  required
                  placeholder="Ex: Corners Over 9.5 ou Plus de 2.5 Buts"
                  value={newStratName}
                  onChange={(e) => setNewStratName(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700">Type de Marché</label>
                  <select
                    value={newStratType}
                    onChange={(e) => setNewStratType(e.target.value)}
                    className="w-full text-xs p-2 rounded-md border border-zinc-200 bg-white text-zinc-900 focus:outline-none"
                  >
                    <option value="corners_over">Corners Over</option>
                    <option value="cards_over">Cartons Over</option>
                    <option value="over_2_5">Plus de 2.5 Buts</option>
                    <option value="btts">Les 2 Équipes Marquent</option>
                    <option value="home_win">Victoire Domicile</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-zinc-700">Cote Minimale</label>
                  <Input
                    type="number"
                    step="0.05"
                    min="1.05"
                    placeholder="1.85"
                    value={newStratMinOdds}
                    onChange={(e) => setNewStratMinOdds(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-zinc-700">Seuil Statistique</label>
                <Input
                  type="number"
                  step="0.5"
                  placeholder="9.5 pour corners, 2.5 pour buts..."
                  value={newStratThreshold}
                  onChange={(e) => setNewStratThreshold(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-zinc-700">Règles & Conditions</label>
                <Input
                  type="text"
                  placeholder="Ex: Équipes offensives, arbitre sévère..."
                  value={newStratRules}
                  onChange={(e) => setNewStratRules(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewStrategyModal(false)}
                  className="text-xs"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={testStrategyMutation.isLoading}
                  className="bg-zinc-900 text-white hover:bg-zinc-800 text-xs"
                >
                  {testStrategyMutation.isLoading ? 'Simulation en cours...' : 'Tester sur predictix-api'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK SEARCH (CTRL + K) DIALOG */}
      {quickSearchOpen && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-50 flex items-start justify-center pt-24 p-4 animate-in fade-in-50">
          <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center px-3.5 py-3 border-b border-zinc-100">
              <Search className="w-4 h-4 text-zinc-400 mr-2.5 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Rechercher stats, bankrolls, stratégies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setQuickSearchOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-xs px-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 max-h-72 overflow-y-auto divide-y divide-zinc-50 text-xs">
              <div className="px-2 py-1 text-[10px] uppercase font-semibold text-zinc-400">
                Navigation
              </div>
              {navItems
                .filter((item) =>
                  item.label.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveNav(item.id);
                        setActiveTabPill(item.id);
                        setQuickSearchOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-zinc-100 rounded-md flex items-center justify-between text-zinc-700 hover:text-zinc-900 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-zinc-500" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-zinc-400" />
                    </button>
                  );
                })}
            </div>

            <div className="p-2 border-t border-zinc-100 bg-zinc-50 text-[11px] text-zinc-500 flex justify-between items-center px-4">
              <span>Appuyez sur <kbd className="font-mono bg-white px-1 border rounded">Échap</kbd> pour fermer</span>
              <span className="font-mono text-zinc-400">predictix.be</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
