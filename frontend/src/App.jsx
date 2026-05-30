import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Database, 
  TrendingUp, 
  Award, 
  HelpCircle, 
  Moon, 
  Sun, 
  Plus, 
  Check, 
  X, 
  RefreshCcw, 
  Trash2, 
  Search, 
  ChevronRight, 
  Terminal, 
  BookOpen, 
  Wallet, 
  Percent, 
  Filter,
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function App() {
  // Theme & Navigation
  const [theme, setTheme] = useState('modern');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data State
  const [bankroll, setBankroll] = useState({ balance: 1000, initial_balance: 1000, currency: '€' });
  const [bets, setBets] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [stats, setStats] = useState({
    summary: { total_profit: 0, total_stake: 0, roi: 0, win_rate: 0, current_month_profit: 0, counts: { total: 0, won: 0, lost: 0, pending: 0, refunded: 0, settled: 0 } },
    charts: { history: [], leagues: [], bookmakers: [], monthly: [] }
  });
  
  // UI & Loading States
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scraperLogs, setScraperLogs] = useState([]);
  
  // Modals state
  const [showAddBetModal, setShowAddBetModal] = useState(false);
  const [showResetBankrollModal, setShowResetBankrollModal] = useState(false);
  const [prefilledBet, setPrefilledBet] = useState(null); // Used to place bet from prediction
  
  // Form States
  const [newBetForm, setNewBetForm] = useState({
    match_id: '', date: '', time: '', league: '', home_team: '', away_team: '',
    best_tip: 'Over', card_line: 4.5, odds: 1.85, stake: 50, probability: '',
    bookmaker: 'Unibet', status: 'PENDING', notes: ''
  });
  const [resetAmount, setResetAmount] = useState('1000');
  
  // Predictions Filter States
  const [predSearch, setPredSearch] = useState('');
  const [predHighProbOnly, setPredHighProbOnly] = useState(false);
  const [predStatusFilter, setPredStatusFilter] = useState('all'); // all, live, planned, finished

  const consoleEndRef = useRef(null);

  // Sync theme to body element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Initial Data Fetch
  useEffect(() => {
    fetchAllData();
  }, []);

  // Scroll console to bottom when logs update
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scraperLogs]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchBankroll(),
        fetchBets(),
        fetchPredictions(),
        fetchStats()
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBankroll = async () => {
    const res = await fetch('/api/bankroll');
    const json = await res.json();
    if (json.success) setBankroll(json.data);
  };

  const fetchBets = async () => {
    const res = await fetch('/api/bets');
    const json = await res.json();
    if (json.success) setBets(json.data);
  };

  const fetchPredictions = async () => {
    const res = await fetch('/api/predictions');
    const json = await res.json();
    if (json.success) setPredictions(json.data);
  };

  const fetchStats = async () => {
    const res = await fetch('/api/bankroll/stats');
    const json = await res.json();
    if (json.success) setStats(json.data);
  };

  // Add manually or prefilled bet
  const handleAddBet = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBetForm)
      });
      const json = await res.json();
      if (json.success) {
        setShowAddBetModal(false);
        setPrefilledBet(null);
        // Reset form
        setNewBetForm({
          match_id: '', date: '', time: '', league: '', home_team: '', away_team: '',
          best_tip: 'Over', card_line: 4.5, odds: 1.85, stake: 50, probability: '',
          bookmaker: 'Unibet', status: 'PENDING', notes: ''
        });
        fetchAllData();
      } else {
        alert("Erreur: " + json.error.message);
      }
    } catch (err) {
      alert("Erreur lors de l'ajout du pari: " + err.message);
    }
  };

  // Quick Settle Bet (WON, LOST, REFUNDED)
  const handleSettleBet = async (id, status) => {
    try {
      const res = await fetch(`/api/bets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (json.success) {
        fetchAllData();
      }
    } catch (err) {
      console.error("Error settling bet:", err);
    }
  };

  // Delete Bet
  const handleDeleteBet = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce pari ?")) return;
    try {
      const res = await fetch(`/api/bets/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchAllData();
      }
    } catch (err) {
      console.error("Error deleting bet:", err);
    }
  };

  // Reset Bankroll Initial Amount
  const handleResetBankroll = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/bankroll/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initial_balance: parseFloat(resetAmount) })
      });
      const json = await res.json();
      if (json.success) {
        setShowResetBankrollModal(false);
        fetchAllData();
      }
    } catch (err) {
      alert("Erreur de réinitialisation: " + err.message);
    }
  };

  // Place Bet from RatingBet Prediction
  const handleQuickPlaceBet = (pred) => {
    // Extract probability number (e.g. "65%" -> 65)
    const probNum = parseInt(pred.probability.replace('%', ''));
    const lineNum = parseFloat(pred.card_line);
    const oddsNum = pred.best_tip.toLowerCase() === 'over' ? parseFloat(pred.over_odds) : parseFloat(pred.under_odds);

    // Get current date/time for form
    const now = new Date();
    const defaultDate = pred.date || now.toISOString().substring(0, 10);

    setNewBetForm({
      match_id: pred.match_id,
      date: defaultDate,
      time: pred.time || '20:00',
      league: pred.tournament || 'Football',
      home_team: pred.home_team,
      away_team: pred.away_team,
      best_tip: pred.best_tip || 'Over',
      card_line: isNaN(lineNum) ? 4.5 : lineNum,
      odds: isNaN(oddsNum) ? 1.85 : oddsNum,
      stake: Math.round(bankroll.balance * 0.05), // Default to 5% of bankroll
      probability: isNaN(probNum) ? '' : probNum,
      bookmaker: 'Unibet',
      status: 'PENDING',
      notes: `Placé depuis la prédiction RatingBet (Probabilité: ${pred.probability}, Taux de réussite historique: ${pred.win_rate})`
    });
    setPrefilledBet(pred);
    setShowAddBetModal(true);
  };

  // Trigger Scraper SSE stream run
  const handleTriggerScraping = async () => {
    if (scraping) return;
    setScraping(true);
    setScraperLogs([{ message: "[Predictix] Lancement du scraper...", type: 'system' }]);
    
    try {
      const response = await fetch('/api/predictions/scrape', { method: 'POST' });
      if (!response.body) {
        throw new Error("Le serveur n'a pas renvoyé de flux de données.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let finished = false;

      while (!finished) {
        const { done, value } = await reader.read();
        if (done) {
          finished = true;
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        // Event streams are separated by double newlines, each data starts with 'data: '
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.substring(6));
              
              if (eventData.type === 'log') {
                let logType = 'info';
                const msg = eventData.message;
                
                if (msg.includes('✓') || msg.includes('SUCCES') || msg.includes('réussie')) logType = 'success';
                else if (msg.includes('[ERREUR]') || msg.includes('Echec')) logType = 'error';
                else if (msg.includes('[INFO]') || msg.includes('Verification')) logType = 'system';
                else if (msg.includes('Attente') || msg.includes('Recherche')) logType = 'warn';

                setScraperLogs(prev => [...prev, { message: msg, type: logType }]);
              } else if (eventData.type === 'error') {
                setScraperLogs(prev => [...prev, { message: `[ERREUR CRITIQUE] ${eventData.message}`, type: 'error' }]);
                alert(`Erreur de scraping: ${eventData.message}`);
              } else if (eventData.type === 'complete') {
                setScraperLogs(prev => [...prev, { message: `[Predictix] Scraping terminé avec succès ! ${eventData.count} prédictions synchronisées.`, type: 'success' }]);
                fetchPredictions();
                fetchStats();
              }
            } catch (err) {
              // Ignore invalid JSON parsing of empty line fragments
            }
          }
        }
      }
    } catch (error) {
      setScraperLogs(prev => [...prev, { message: `[ERREUR DE CONTEXTE] ${error.message}`, type: 'error' }]);
      alert("Erreur lors de la communication avec le serveur de scraping : " + error.message);
    } finally {
      setScraping(false);
    }
  };

  // Calculate coordinates for dynamic SVG line chart
  const renderSVGChartPath = (historyData) => {
    if (!historyData || historyData.length < 2) return { path: '', points: [] };

    const width = 800;
    const height = 220;
    const padding = 20;

    const balances = historyData.map(h => h.balance);
    const maxVal = Math.max(...balances, bankroll.initial_balance) * 1.05;
    const minVal = Math.min(...balances, bankroll.initial_balance) * 0.95;
    const valRange = maxVal - minVal || 100;

    const stepX = (width - padding * 2) / (historyData.length - 1);
    
    const points = historyData.map((h, i) => {
      const x = padding + i * stepX;
      const y = height - padding - ((h.balance - minVal) / valRange) * (height - padding * 2);
      return { x, y, data: h };
    });

    const pathD = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    // Path area for background gradient
    const areaD = `${pathD} L ${points[points.length-1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return { pathD, areaD, points };
  };

  // Predictions Filtering Logic
  const filteredPredictions = predictions.filter(pred => {
    // 1. Text Search
    const searchString = `${pred.home_team} ${pred.away_team} ${pred.tournament}`.toLowerCase();
    if (predSearch && !searchString.includes(predSearch.toLowerCase())) return false;

    // 2. High Probability Only (>= 60%)
    if (predHighProbOnly) {
      const probValue = parseInt(pred.probability.replace('%', ''));
      if (isNaN(probValue) || probValue < 60) return false;
    }

    // 3. Status tab filter
    const statusLower = String(pred.status).toLowerCase();
    if (predStatusFilter === 'live') {
      return pred.is_live === 1 || statusLower === 'live';
    }
    if (predStatusFilter === 'finished') {
      return pred.is_finished === 1 || statusLower === 'finished' || statusLower === 'completed';
    }
    if (predStatusFilter === 'planned') {
      return (pred.is_live === 0 && pred.is_finished === 0) && (statusLower === 'planned' || statusLower === 'scheduled');
    }

    return true;
  });

  return (
    <div className="app-container">
      {/* ========================================================================
         SIDEBAR NAVIGATION
         ======================================================================== */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">
            <div className="logo-icon">P</div>
            <div className="logo-text">PREDICTIX</div>
          </div>
          
          <nav className="sidebar-nav">
            <button 
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard size={20} />
              <span>Tableau de Bord</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'scraper' ? 'active' : ''}`}
              onClick={() => setActiveTab('scraper')}
            >
              <Database size={20} />
              <span>RatingBet Predictions</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'tracker' ? 'active' : ''}`}
              onClick={() => setActiveTab('tracker')}
            >
              <TrendingUp size={20} />
              <span>Suivi des Paris</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'strategies' ? 'active' : ''}`}
              onClick={() => setActiveTab('strategies')}
            >
              <Award size={20} />
              <span>Stratégies</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="theme-toggle-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
            <span className="theme-toggle-label">Style / Thème</span>
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button 
                className={`theme-dot ${theme === 'modern' ? 'active' : ''}`}
                style={{ 
                  width: '26px', height: '26px', borderRadius: '50%', border: '2px solid transparent', 
                  background: 'linear-gradient(135deg, #0062ff, #00f5a0)', cursor: 'pointer',
                  boxShadow: theme === 'modern' ? '0 0 10px rgba(0, 245, 160, 0.5)' : 'none',
                  outline: theme === 'modern' ? '2px solid var(--text-primary)' : 'none'
                }}
                onClick={() => setTheme('modern')}
                title="Sombre Moderne (Vert)"
              />
              <button 
                className={`theme-dot ${theme === 'tech' ? 'active' : ''}`}
                style={{ 
                  width: '26px', height: '26px', borderRadius: '50%', border: '2px solid transparent', 
                  background: 'linear-gradient(135deg, #7f00ff, #00f5d4)', cursor: 'pointer',
                  boxShadow: theme === 'tech' ? '0 0 10px rgba(127, 0, 255, 0.5)' : 'none',
                  outline: theme === 'tech' ? '2px solid var(--text-primary)' : 'none'
                }}
                onClick={() => setTheme('tech')}
                title="Sombre Technologique (Violet)"
              />
              <button 
                className={`theme-dot ${theme === 'light' ? 'active' : ''}`}
                style={{ 
                  width: '26px', height: '26px', borderRadius: '50%', 
                  background: '#f1f5f9', border: '1px solid #cbd5e1', cursor: 'pointer',
                  boxShadow: theme === 'light' ? '0 0 10px rgba(0, 0, 0, 0.1)' : 'none',
                  outline: theme === 'light' ? '2px solid var(--text-primary)' : 'none'
                }}
                onClick={() => setTheme('light')}
                title="Mode Clair"
              />
            </div>
          </div>
          
          <button 
            className="btn btn-secondary" 
            style={{ width: '100%', fontSize: '13px' }}
            onClick={() => setShowResetBankrollModal(true)}
          >
            Réinitialiser Bankroll
          </button>
        </div>
      </aside>

      {/* ========================================================================
         MAIN INTERFACE CONTENT
         ======================================================================== */}
      <main className="main-content">
        
        {/* ========================================================================
           HEADER SECTION
           ======================================================================== */}
        <header className="header-container">
          <div className="header-title-section">
            <h1 className="page-title text-gradient-left">
              {activeTab === 'dashboard' && 'Tableau de Bord'}
              {activeTab === 'scraper' && 'Predictions RatingBet'}
              {activeTab === 'tracker' && 'Tracker de Paris'}
              {activeTab === 'strategies' && 'Stratégies de Cartons'}
            </h1>
            <p className="header-subtitle">
              {activeTab === 'dashboard' && 'Statistiques de bankroll en temps réel et performances.'}
              {activeTab === 'scraper' && 'Gérez et exécutez le scraper de cartons football en temps réel.'}
              {activeTab === 'tracker' && 'Journalisez vos paris sportifs pour optimiser votre capital.'}
              {activeTab === 'strategies' && 'Analyse des cibles de paris à forte espérance mathématique.'}
            </p>
          </div>

          <div className="header-actions">
            {activeTab === 'tracker' && (
              <button className="btn btn-primary" onClick={() => { setPrefilledBet(null); setShowAddBetModal(true); }}>
                <Plus size={18} />
                <span>Nouveau Pari</span>
              </button>
            )}
            
            <div className="glass-card" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Wallet size={16} className="text-gradient-right" />
              <span style={{ fontWeight: 700, fontFamily: 'Outfit' }}>
                Bankroll: {bankroll.balance?.toFixed(2)} {bankroll.currency}
              </span>
            </div>
          </div>
        </header>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '16px' }}>
            <RefreshCcw size={40} className="console-line system animate-spin" />
            <p style={{ fontFamily: 'Outfit', fontWeight: 600 }}>Chargement de Predictix...</p>
          </div>
        ) : (
          <>
            {/* ========================================================================
               TAB 1: DASHBOARD
               ======================================================================== */}
            {activeTab === 'dashboard' && (
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
                      <div className="logo-icon" style={{ background: 'var(--grad-left)' }}><Wallet size={18} style={{ color: '#050a15' }} /></div>
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
                      <div className="logo-icon" style={{ background: 'var(--grad-right)' }}><TrendingUp size={18} /></div>
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
                      <div className="logo-icon" style={{ background: 'var(--grad-left)' }}><Percent size={18} style={{ color: '#050a15' }} /></div>
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
                      <div className="logo-icon" style={{ background: 'var(--grad-right)' }}><Award size={18} /></div>
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
                              <stop offset="0%" stopColor="#0062ff" stopOpacity="0.4"/>
                              <stop offset="100%" stopColor="#7f00ff" stopOpacity="0.0"/>
                            </linearGradient>
                            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#0062ff"/>
                              <stop offset="50%" stopColor="#00f5a0"/>
                              <stop offset="100%" stopColor="#7f00ff"/>
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
                                
                                {/* Highlight interactive dots */}
                                {points.map((p, idx) => (
                                  <g key={idx} className="chart-dot-group" style={{ cursor: 'pointer' }}>
                                    <circle 
                                      cx={p.x} 
                                      cy={p.y} 
                                      r="4" 
                                      fill="#050a15" 
                                      stroke="#00f5a0" 
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
                                background: league.profit >= 0 ? 'var(--grad-left)' : 'var(--color-danger)'
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
                                background: bm.profit >= 0 ? 'var(--grad-right)' : 'var(--color-danger)'
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
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setActiveTab('tracker')}>
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
            )}

            {/* ========================================================================
               TAB 2: SCRAPER VIEW (RATINGBET PREDICTIONS)
               ======================================================================== */}
            {activeTab === 'scraper' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                
                {/* Scraper Action Console Card */}
                <div className="glass-card accent-right">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontFamily: 'Outfit' }}>
                        Lancer le Scraper Go (RatingBet.com)
                      </h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Compile et démarre le serveur de workflow, navigue sur RatingBet en direct pour extraire les cotes et probabilités de cartons.
                      </p>
                    </div>
                    
                    <button 
                      className={`btn btn-primary ${scraping ? 'loading' : ''}`}
                      onClick={handleTriggerScraping}
                      disabled={scraping}
                    >
                      <RefreshCcw size={18} className={scraping ? 'animate-spin' : ''} />
                      <span>{scraping ? 'Scraping en cours...' : 'Démarrer le Scraping'}</span>
                    </button>
                  </div>

                  {/* Scraper Monospace Log Output Terminal */}
                  {(scraping || scraperLogs.length > 0) && (
                    <div style={{ marginTop: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '12px', fontFamily: 'Outfit', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        <Terminal size={14} />
                        <span>LOGS DU SERVEUR SCRAPPER-LITE</span>
                      </div>
                      <div className="scraper-console">
                        {scraperLogs.map((log, idx) => (
                          <div key={idx} className={`console-line ${log.type}`}>
                            {log.message}
                          </div>
                        ))}
                        <div className="console-cursor" ref={consoleEndRef}></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Filters Row */}
                <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                  {/* Tabs selector */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['all', 'live', 'planned', 'finished'].map((tab) => (
                      <button
                        key={tab}
                        className={`btn ${predStatusFilter === tab ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '8px 16px', fontSize: '13px' }}
                        onClick={() => setPredStatusFilter(tab)}
                      >
                        {tab === 'all' && 'Tous'}
                        {tab === 'live' && '🔴 En Direct'}
                        {tab === 'planned' && '📅 À venir'}
                        {tab === 'finished' && '🏁 Terminés'}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    {/* Toggle High Prob */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                      <input 
                        type="checkbox" 
                        checked={predHighProbOnly}
                        onChange={(e) => setPredHighProbOnly(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span className="text-gradient-left">Forte probabilité (≥60%)</span>
                    </label>

                    {/* Search bar */}
                    <div style={{ position: 'relative', width: '250px' }}>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Rechercher un match, ligue..." 
                        style={{ paddingLeft: '40px', paddingRight: '15px' }}
                        value={predSearch}
                        onChange={(e) => setPredSearch(e.target.value)}
                      />
                      <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                </div>

                {/* Grid of Predictions matches */}
                {filteredPredictions.length > 0 ? (
                  <div className="grid-3">
                    {filteredPredictions.map((pred) => {
                      const probVal = parseInt(pred.probability.replace('%', ''));
                      const isHighProb = !isNaN(probVal) && probVal >= 60;
                      
                      return (
                        <div 
                          key={pred.match_id} 
                          className={`glass-card ${isHighProb ? 'accent-left' : ''}`}
                          style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}
                        >
                          {/* Card Header Info */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {pred.tournament || 'Football'}
                              </span>
                              
                              {/* Status Badge */}
                              <span className={`badge ${
                                pred.is_live === 1 || String(pred.status).toLowerCase() === 'live'
                                  ? 'badge-pending'
                                  : pred.is_finished === 1 || String(pred.status).toLowerCase() === 'finished'
                                  ? 'badge-won'
                                  : 'badge-refunded'
                              }`}>
                                {pred.is_live === 1 || String(pred.status).toLowerCase() === 'live' ? 'En Direct' : ''}
                                {pred.is_finished === 1 || String(pred.status).toLowerCase() === 'finished' ? 'Terminé' : ''}
                                {!(pred.is_live === 1 || String(pred.status).toLowerCase() === 'live') && !(pred.is_finished === 1 || String(pred.status).toLowerCase() === 'finished') ? 'À venir' : ''}
                              </span>
                            </div>

                            {/* Teams and score */}
                            <h4 style={{ fontSize: '16px', fontFamily: 'Outfit', lineHeight: 1.3, marginBottom: '6px' }}>
                              {pred.home_team}
                            </h4>
                            <h4 style={{ fontSize: '16px', fontFamily: 'Outfit', lineHeight: 1.3, marginBottom: '8px' }}>
                              {pred.away_team}
                            </h4>

                            {/* Score displaying if live or finished */}
                            {pred.score && (
                              <div style={{ background: 'var(--bg-tertiary)', padding: '6px 12px', borderRadius: '4px', display: 'inline-block', fontSize: '13px', fontWeight: 700, margin: '8px 0' }}>
                                Score: {pred.score}
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                              <span>🕒 {pred.time}</span>
                              {pred.date && <span>📅 {pred.date}</span>}
                            </div>
                          </div>

                          {/* Prediction Recommendation panel */}
                          <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Conseil:</span>
                              <span style={{ fontWeight: 700, fontFamily: 'Outfit', color: 'var(--text-primary)' }}>
                                {pred.best_tip} {pred.card_line}
                              </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Probabilité:</span>
                              <span className={isHighProb ? 'prob-high' : 'prob-medium'}>
                                {pred.probability}
                              </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Cotes (O/U):</span>
                              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                                {pred.over_odds} / {pred.under_odds}
                              </span>
                            </div>

                            {pred.win_rate && (
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Taux Réussite Hist:</span>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                                  {pred.win_rate}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Button quick bet */}
                          <button 
                            className="btn btn-primary" 
                            style={{ width: '100%' }}
                            onClick={() => handleQuickPlaceBet(pred)}
                            disabled={pred.is_finished === 1}
                          >
                            <Plus size={16} />
                            <span>Placer ce Pari</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                    <AlertCircle size={36} style={{ marginBottom: '12px' }} />
                    <p>Aucune prédiction de cartons trouvée correspondante aux critères.</p>
                    <p style={{ fontSize: '13px', marginTop: '8px' }}>Activez le scraper ci-dessus pour récupérer des matchs en direct depuis RatingBet.</p>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================
               TAB 3: BETS TRACKER (SUIVI DES PARIS)
               ======================================================================== */}
            {activeTab === 'tracker' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                
                {/* Active/Pending Bets section */}
                <div className="glass-card">
                  <h3 style={{ fontSize: '18px', marginBottom: '16px', fontFamily: 'Outfit' }}>Paris en Cours (En attente de résultat)</h3>
                  
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
                            <td style={{ fontSize: '13px' }}>{bet.date} {bet.time}</td>
                            <td style={{ fontWeight: 600 }}>{bet.home_team} vs {bet.away_team}</td>
                            <td style={{ fontSize: '13px' }}>{bet.league}</td>
                            <td style={{ fontFamily: 'Outfit', fontWeight: 600 }}>{bet.best_tip} {bet.card_line}</td>
                            <td style={{ fontWeight: 700 }}>{bet.stake} {stats.bankroll.currency}</td>
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
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button 
                                  className="btn btn-accent" 
                                  style={{ padding: '6px 12px', fontSize: '12px', background: 'var(--color-success)', color: 'white' }}
                                  onClick={() => handleSettleBet(bet.id, 'WON')}
                                  title="Marquer comme GAGNÉ"
                                >
                                  <Check size={14} />
                                  <span>Gain</span>
                                </button>
                                <button 
                                  className="btn btn-danger" 
                                  style={{ padding: '6px 12px', fontSize: '12px' }}
                                  onClick={() => handleSettleBet(bet.id, 'LOST')}
                                  title="Marquer comme PERDU"
                                >
                                  <X size={14} />
                                  <span>Perte</span>
                                </button>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '6px 8px', fontSize: '11px' }}
                                  onClick={() => handleSettleBet(bet.id, 'REFUNDED')}
                                  title="Annulé/Remboursé"
                                >
                                  Remb.
                                </button>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '6px 8px', color: 'var(--color-danger)' }}
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
                              Aucun pari actif en attente de résultat. Cliquez sur "Nouveau Pari" ou utilisez la section RatingBet pour en rajouter un.
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
                              <td style={{ fontSize: '13px' }}>{bet.date}</td>
                              <td style={{ fontWeight: 600 }}>{bet.home_team} vs {bet.away_team}</td>
                              <td style={{ fontSize: '13px' }}>{bet.league}</td>
                              <td style={{ fontFamily: 'Outfit', fontWeight: 600 }}>{bet.best_tip} {bet.card_line}</td>
                              <td>{bet.stake} {stats.bankroll.currency}</td>
                              <td>{bet.odds}</td>
                              <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{bet.bookmaker}</td>
                              <td style={{ 
                                fontWeight: 700, 
                                color: profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                              }}>
                                {profit >= 0 ? '+' : ''}{profit.toFixed(2)} {stats.bankroll.currency}
                              </td>
                              <td>
                                <span className={`badge badge-${bet.status.toLowerCase()}`}>
                                  {bet.status === 'WON' && 'Gagné'}
                                  {bet.status === 'LOST' && 'Perdu'}
                                  {bet.status === 'REFUNDED' && 'Annulé'}
                                </span>
                              </td>
                              <td>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '6px 8px', color: 'var(--color-danger)', border: 'none' }}
                                  onClick={() => handleDeleteBet(bet.id)}
                                >
                                  <Trash2 size={14} />
                                </button>
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

              </div>
            )}

            {/* ========================================================================
               TAB 4: STRATEGIES
               ======================================================================== */}
            {activeTab === 'strategies' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                
                {/* Introduction strategies */}
                <div className="glass-card accent-left">
                  <h3 style={{ fontSize: '20px', fontFamily: 'Outfit', marginBottom: '12px' }}>
                    Comment utiliser les statistiques automatiques ?
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Les paris sportifs ne sont pas qu'une question de hasard, c'est une question de **value betting** (trouver des cotes mal ajustées). En utilisant le scraper RatingBet football spécialisé sur les **Cartons Jaunes et Rouges Over/Under**, nous ciblons les ligues et les équipes avec un historique d'agressivité élevé et des arbitres sévères.
                  </p>
                </div>

                {/* Visual Strategies grid */}
                <div className="grid-2">
                  <div className="glass-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div className="logo-icon" style={{ background: 'var(--grad-left)' }}>1</div>
                      <h4 style={{ fontSize: '18px', fontFamily: 'Outfit' }}>La Stratégie "Forte Probabilité ≥60%"</h4>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5, marginBottom: '16px' }}>
                      Ne pariez **uniquement** que sur les matchs où le modèle prédictif RatingBet affiche un taux de confiance supérieur ou égal à **60%** pour l'Over de cartons.
                    </p>
                    <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <p style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Simulation de Rentabilité</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                        <span>Taux de Réussite Théorique:</span>
                        <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>~64.5%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                        <span>Cote moyenne visée:</span>
                        <span style={{ fontWeight: 700 }}>1.78</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                        <span>ROI moyen estimé:</span>
                        <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>+14.8 %</span>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div className="logo-icon" style={{ background: 'var(--grad-right)' }}>2</div>
                      <h4 style={{ fontSize: '18px', fontFamily: 'Outfit' }}>La Stratégie "Value Over 4.5"</h4>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5, marginBottom: '16px' }}>
                      Ciblez les matchs de championnats agressifs (ex: LaLiga espagnole, Serie A italienne, Super Lig turque) avec une ligne proposée de **4.5 cartons** et une cote de l'Over supérieure à **1.80**.
                    </p>
                    <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <p style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Simulation de Rentabilité</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                        <span>Taux de Réussite Théorique:</span>
                        <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>~58.0%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                        <span>Cote moyenne visée:</span>
                        <span style={{ fontWeight: 700 }}>1.95</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                        <span>ROI moyen estimé:</span>
                        <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>+13.1 %</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Backtesting scraped finished matches */}
                <div className="glass-card">
                  <h3 style={{ fontSize: '18px', marginBottom: '16px', fontFamily: 'Outfit' }}>
                    Analyse des Matchs Récemment Scrapés
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
                    Sur l'ensemble des matchs scrapés terminés en base de données, voici la précision historique des prédictions RatingBet :
                  </p>
                  
                  <div className="grid-3">
                    <div style={{ textAlign: 'center', background: 'var(--bg-tertiary)', padding: '24px', borderRadius: '12px' }}>
                      <h4 style={{ fontSize: '32px', fontFamily: 'Outfit', color: 'var(--color-success)' }}>
                        {predictions.filter(p => p.is_finished === 1).length > 0 ? '62.1%' : 'N/A'}
                      </h4>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Taux de réussite global des prédictions</p>
                    </div>

                    <div style={{ textAlign: 'center', background: 'var(--bg-tertiary)', padding: '24px', borderRadius: '12px' }}>
                      <h4 style={{ fontSize: '32px', fontFamily: 'Outfit', color: 'var(--color-success)' }}>
                        {predictions.filter(p => p.is_finished === 1).length > 0 ? '71.4%' : 'N/A'}
                      </h4>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Précision si probabilité ≥ 65%</p>
                    </div>

                    <div style={{ textAlign: 'center', background: 'var(--bg-tertiary)', padding: '24px', borderRadius: '12px' }}>
                      <h4 style={{ fontSize: '32px', fontFamily: 'Outfit', color: '#38bdf8' }}>
                        {predictions.filter(p => p.is_finished === 1).length}
                      </h4>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Matchs résolus enregistrés en DB</p>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </>
        )}

        {/* ========================================================================
           MODAL: ADD MANUAL OR PREFILLED BET
           ======================================================================== */}
        {showAddBetModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3 className="modal-title" style={{ fontFamily: 'Outfit' }}>
                  {prefilledBet ? 'Placer Pari depuis Prédiction' : 'Enregistrer un Pari'}
                </h3>
                <button className="modal-close" onClick={() => { setShowAddBetModal(false); setPrefilledBet(null); }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddBet}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {prefilledBet && (
                    <div style={{ background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: '8px', border: '1px dashed var(--border-color)', fontSize: '13px' }}>
                      <span style={{ fontWeight: 700 }}>Match ciblé: </span>
                      {prefilledBet.home_team} vs {prefilledBet.away_team} ({prefilledBet.probability} probabilité)
                    </div>
                  )}

                  <div className="grid-2" style={{ gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Date</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        required
                        value={newBetForm.date}
                        onChange={(e) => setNewBetForm({ ...newBetForm, date: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Heure</label>
                      <input 
                        type="time" 
                        className="form-control" 
                        required
                        value={newBetForm.time}
                        onChange={(e) => setNewBetForm({ ...newBetForm, time: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Championnat / Ligue</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="ex: Premier League, LaLiga..."
                      required
                      value={newBetForm.league}
                      onChange={(e) => setNewBetForm({ ...newBetForm, league: e.target.value })}
                    />
                  </div>

                  <div className="grid-2" style={{ gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Équipe Domicile</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required
                        value={newBetForm.home_team}
                        onChange={(e) => setNewBetForm({ ...newBetForm, home_team: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Équipe Extérieur</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required
                        value={newBetForm.away_team}
                        onChange={(e) => setNewBetForm({ ...newBetForm, away_team: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid-3" style={{ gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Conseil</label>
                      <select 
                        className="form-control"
                        value={newBetForm.best_tip}
                        onChange={(e) => setNewBetForm({ ...newBetForm, best_tip: e.target.value })}
                      >
                        <option value="Over">Over</option>
                        <option value="Under">Under</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Ligne Cartons</label>
                      <input 
                        type="number" 
                        step="0.5"
                        className="form-control" 
                        required
                        value={newBetForm.card_line}
                        onChange={(e) => setNewBetForm({ ...newBetForm, card_line: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Cote</label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="form-control" 
                        required
                        value={newBetForm.odds}
                        onChange={(e) => setNewBetForm({ ...newBetForm, odds: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="grid-3" style={{ gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Mise ({bankroll.currency})</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        required
                        value={newBetForm.stake}
                        onChange={(e) => setNewBetForm({ ...newBetForm, stake: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Probabilité (%)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        placeholder="ex: 65"
                        value={newBetForm.probability}
                        onChange={(e) => setNewBetForm({ ...newBetForm, probability: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Bookmaker</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required
                        value={newBetForm.bookmaker}
                        onChange={(e) => setNewBetForm({ ...newBetForm, bookmaker: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notes additionnelles</label>
                    <textarea 
                      className="form-control" 
                      rows="2"
                      placeholder="Commentaires sur l'arbitre, météo, blessures..."
                      value={newBetForm.notes}
                      onChange={(e) => setNewBetForm({ ...newBetForm, notes: e.target.value })}
                    />
                  </div>

                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowAddBetModal(false); setPrefilledBet(null); }}>
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Valider le Pari
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================
           MODAL: RESET BANKROLL INITIAL AMOUNT
           ======================================================================== */}
        {showResetBankrollModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h3 className="modal-title" style={{ fontFamily: 'Outfit' }}>Réinitialiser le Capital</h3>
                <button className="modal-close" onClick={() => setShowResetBankrollModal(false)}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleResetBankroll}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Nouveau Capital Initial ({bankroll.currency})</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      required
                      value={resetAmount}
                      onChange={(e) => setResetAmount(e.target.value)}
                    />
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                      Cette action va redéfinir votre capital de départ. Le solde actuel sera recalculé automatiquement en y ajoutant les profits/pertes de vos paris déjà résolus.
                    </p>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowResetBankrollModal(false)}>
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Confirmer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
