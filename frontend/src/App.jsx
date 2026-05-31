import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  RefreshCcw 
} from 'lucide-react';

// Import our new components!
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardTab from './components/DashboardTab';
import ScraperTab from './components/ScraperTab';
import TrackerTab from './components/TrackerTab';
import PredictionsTab from './components/PredictionsTab';
import StrategiesTab from './components/StrategiesTab';
import AddBetModal from './components/AddBetModal';
import ResetBankrollModal from './components/ResetBankrollModal';
import MatchDetailsModal from './components/MatchDetailsModal';
import BatchBetsModal from './components/BatchBetsModal';

export default function App() {
  // Theme & Navigation
  const [theme, setTheme] = useState('modern');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
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
  const [scrapeProgress, setScrapeProgress] = useState(0); 
  const [scrapeTimeRemaining, setScrapeTimeRemaining] = useState(''); 
  const [scrapePhase, setScrapePhase] = useState('idle'); 
  const [scrapeLimit, setScrapeLimit] = useState(30); // Customize maximum matches to scrape
  const [matchesRemaining, setMatchesRemaining] = useState(0); // Count of matches left to scrape 
  const [currentPrimary, setCurrentPrimary] = useState(0);
  const [totalPrimary, setTotalPrimary] = useState(0);
  const [currentDeep, setCurrentDeep] = useState(0);
  const [totalDeep, setTotalDeep] = useState(0);
  
  // Modals state
  const [showAddBetModal, setShowAddBetModal] = useState(false);
  const [showResetBankrollModal, setShowResetBankrollModal] = useState(false);
  const [prefilledBet, setPrefilledBet] = useState(null); // Used to place bet from prediction
  const [selectedMatchDetails, setSelectedMatchDetails] = useState(null); // Track selected match for detailed stats view
  const [selectedPredIds, setSelectedPredIds] = useState([]); // Track list of selected prediction IDs
  const [showBatchBetModal, setShowBatchBetModal] = useState(false); // Toggle batch placement modal
  const [batchBetsForm, setBatchBetsForm] = useState([]); // Form list of bets to place in batch
  const [batchGlobalStake, setBatchGlobalStake] = useState(''); // Global stake input
  const [batchGlobalBookmaker, setBatchGlobalBookmaker] = useState('Unibet'); // Global bookmaker input
  const [batchLoading, setBatchLoading] = useState(false); // Loading state for batch registering
  const [batchProgress, setBatchProgress] = useState(0); // Count of successfully placed batch bets
  const [crawlLoading, setCrawlLoading] = useState(false); // Track on-demand crawling loading state
  
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
  const [predValueBetsOnly, setPredValueBetsOnly] = useState(false);
  const [predStatusFilter, setPredStatusFilter] = useState('all'); // all, live, planned, finished
  const [dateRange, setDateRange] = useState('all'); // all, today, yesterday, week, month, year, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const consoleEndRef = useRef(null);
  const isFirstMount = useRef(true);

  // Sync theme to body element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Fetch predictions whenever date range parameters change
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    fetchPredictions(dateRange, startDate, endDate);
  }, [dateRange, startDate, endDate]);

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

  // Background polling for matches currently being crawled (Method 2)
  useEffect(() => {
    if (!selectedMatchDetails?.isCrawling) {
      return;
    }

    // Set crawl loading to true just in case we opened a match that is already crawling
    setCrawlLoading(true);

    let isActive = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/predictions?t=${Date.now()}`);
        const json = await res.json();
        if (json.success && isActive) {
          setPredictions(json.data);
          const updated = json.data.find(p => p.match_id === selectedMatchDetails.match_id);
          if (updated) {
            setSelectedMatchDetails(updated);
            if (!updated.isCrawling) {
              clearInterval(interval);
              setCrawlLoading(false);
            }
          } else {
            clearInterval(interval);
            setCrawlLoading(false);
          }
        }
      } catch (err) {
        console.error("Error polling crawl history:", err);
      }
    }, 3000);

    return () => {
      isActive = false;
      clearInterval(interval);
      setCrawlLoading(false);
    };
  }, [selectedMatchDetails?.match_id, selectedMatchDetails?.isCrawling]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchBankroll(),
        fetchBets(),
        fetchPredictions(dateRange, startDate, endDate),
        fetchStats()
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshAllDataSilent = async () => {
    try {
      await Promise.all([
        fetchBankroll(),
        fetchBets(),
        fetchPredictions(dateRange, startDate, endDate),
        fetchStats()
      ]);
    } catch (error) {
      console.error("Error refreshing data silently:", error);
    }
  };

  const fetchBankroll = async () => {
    const res = await fetch(`/api/bankroll?t=${Date.now()}`);
    const json = await res.json();
    if (json.success) setBankroll(json.data);
  };

  const fetchBets = async () => {
    const res = await fetch(`/api/bets?t=${Date.now()}`);
    const json = await res.json();
    if (json.success) setBets(json.data);
  };

  const fetchPredictions = async (range = 'all', start = '', end = '') => {
    let url = `/api/predictions?t=${Date.now()}`;
    if (range && range !== 'all') {
      url += `&dateRange=${range}`;
    }
    if (start && end) {
      url += `&startDate=${start}&endDate=${end}`;
    }
    const res = await fetch(url);
    const json = await res.json();
    if (json.success) setPredictions(json.data);
  };

  const handleCrawlHistory = async (matchId) => {
    setCrawlLoading(true);
    try {
      const res = await fetch(`/api/predictions/${matchId}/crawl-history`, {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success) {
        // Re-fetch all predictions immediately to get updated "isCrawling" flag
        const predRes = await fetch(`/api/predictions?t=${Date.now()}`);
        const predJson = await predRes.json();
        if (predJson.success) {
          setPredictions(predJson.data);
          const updatedMatch = predJson.data.find(p => p.match_id === matchId);
          if (updatedMatch) {
            setSelectedMatchDetails(updatedMatch);
          }
        }
      } else {
        alert("Erreur lors de la récupération de l'historique : " + (json.error?.message || "Erreur inconnue"));
        setCrawlLoading(false);
      }
    } catch (err) {
      alert("Erreur réseau : " + err.message);
      setCrawlLoading(false);
    }
  };

  const fetchStats = async () => {
    const res = await fetch(`/api/bankroll/stats?t=${Date.now()}`);
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

  // Place Bet from Match en Direct Prediction
  const handleQuickPlaceBet = (pred) => {
    const probNum = parseInt(pred.probability.replace('%', ''));
    const lineNum = parseFloat(pred.card_line);
    const oddsNum = pred.best_tip.toLowerCase() === 'over' ? parseFloat(pred.over_odds) : parseFloat(pred.under_odds);

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
      notes: `Placé depuis la prédiction Match en Direct (Probabilité: ${pred.probability}, Taux de réussite historique: ${pred.win_rate})`
    });
    setPrefilledBet(pred);
    setShowAddBetModal(true);
  };

  // Pre-fill and open batch placement modal for selected predictions
  const handleOpenBatchPlacement = () => {
    if (selectedPredIds.length === 0) return;
    const selectedPreds = predictions.filter(pred => selectedPredIds.includes(pred.match_id));
    
    const defaultBets = selectedPreds.map(pred => {
      const probNum = parseInt(pred.probability.replace('%', ''));
      const lineNum = parseFloat(pred.card_line);
      const oddsNum = pred.best_tip.toLowerCase() === 'over' ? parseFloat(pred.over_odds) : parseFloat(pred.under_odds);
      
      const now = new Date();
      const defaultDate = pred.date || now.toISOString().substring(0, 10);
      
      return {
        match_id: pred.match_id,
        date: defaultDate,
        time: pred.time || '20:00',
        league: pred.tournament || 'Football',
        home_team: pred.home_team,
        away_team: pred.away_team,
        best_tip: pred.best_tip || 'Over',
        card_line: isNaN(lineNum) ? 4.5 : lineNum,
        odds: isNaN(oddsNum) ? 1.85 : oddsNum,
        stake: Math.round(bankroll.balance * 0.05) || 50, // Default to 5% of bankroll
        probability: isNaN(probNum) ? '' : probNum,
        bookmaker: 'Unibet',
        status: 'PENDING',
        notes: `Placé en lot depuis Predictix (Probabilité: ${pred.probability}, Taux de réussite: ${pred.win_rate || 'N/A'})`
      };
    });
    
    setBatchBetsForm(defaultBets);
    setBatchGlobalStake(Math.round(bankroll.balance * 0.05) || 50);
    setBatchGlobalBookmaker('Unibet');
    setShowBatchBetModal(true);
  };

  // Apply a single stake value to all bets in the batch form
  const handleApplyGlobalStake = () => {
    const amount = parseFloat(batchGlobalStake);
    if (isNaN(amount) || amount <= 0) {
      alert("Veuillez saisir un montant de mise valide.");
      return;
    }
    setBatchBetsForm(prev => prev.map(b => ({ ...b, stake: amount })));
  };

  // Apply a single bookmaker name to all bets in the batch form
  const handleApplyGlobalBookmaker = () => {
    if (!batchGlobalBookmaker.trim()) {
      alert("Veuillez saisir un nom de bookmaker.");
      return;
    }
    setBatchBetsForm(prev => prev.map(b => ({ ...b, bookmaker: batchGlobalBookmaker })));
  };

  // Asynchronously save all bets in the batch sequence
  const handleConfirmBatchBets = async (e) => {
    e.preventDefault();
    if (batchBetsForm.length === 0) return;
    
    setBatchLoading(true);
    setBatchProgress(0);
    
    try {
      let count = 0;
      for (const bet of batchBetsForm) {
        const res = await fetch('/api/bets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bet)
        });
        const json = await res.json();
        if (json.success) {
          count++;
          setBatchProgress(count);
        } else {
          console.error("Échec du placement du pari en lot:", json.error?.message);
        }
      }
      
      setSelectedPredIds([]);
      setShowBatchBetModal(false);
      fetchAllData();
      alert(`${count} paris ont été enregistrés avec succès !`);
    } catch (err) {
      alert("Erreur lors de l'enregistrement du lot: " + err.message);
    } finally {
      setBatchLoading(false);
    }
  };

  // Phase 1: Trigger Homepage discovery first
  const handleTriggerScraping = async () => {
    if (scraping) return;
    setScraping(true);
    setScrapeProgress(5);
    setScrapePhase('discovering');
    setScrapeTimeRemaining('Découverte en cours...');
    setMatchesRemaining(0);
    setCurrentPrimary(0);
    setTotalPrimary(0);
    setCurrentDeep(0);
    setTotalDeep(0);
    setScraperLogs([{ message: "[Predictix] Lancement de la découverte des matchs du jour...", type: 'system' }]);
    
    try {
      const response = await fetch('/api/predictions/scrape/discover', { 
        method: 'POST'
      });
      const json = await response.json();
      
      if (json.success) {
        setScrapePhase('discovered_waiting');
        setTotalPrimary(json.count);
        setMatchesRemaining(json.count);
        setScrapeLimit(Math.min(30, json.count)); // Default suggested limit
        setScrapeProgress(25);
        setScraperLogs(prev => [
          ...prev, 
          { message: `[Predictix] ✓ Découverte réussie : ${json.count} matchs programmés ou en direct aujourd'hui.`, type: 'success' },
          { message: "[Predictix] En attente de votre configuration pour démarrer l'analyse détaillée...", type: 'warn' }
        ]);
      } else {
        alert("Erreur lors de la découverte : " + (json.error?.message || "Erreur inconnue"));
        setScraping(false);
        setScrapePhase('idle');
      }
    } catch (error) {
      setScraperLogs(prev => [...prev, { message: `[ERREUR CONTEXTE] ${error.message}`, type: 'error' }]);
      alert("Erreur lors de la communication avec le serveur de scraping : " + error.message);
      setScraping(false);
      setScrapePhase('idle');
    }
  };

  // Phase 2: Start detailed scraping for the selected limit of matches
  const handleStartDetailedScraping = async (selectedLimit) => {
    setScrapeProgress(30);
    setScrapePhase('scraping_primary');
    setScrapeTimeRemaining('Calcul en cours...');
    setCurrentPrimary(0);
    setTotalPrimary(selectedLimit);
    setCurrentDeep(0);
    setTotalDeep(0);
    setScraperLogs(prev => [
      ...prev, 
      { message: `[Predictix] Lancement de l'analyse détaillée pour ${selectedLimit} matchs...`, type: 'system' }
    ]);
    
    let totalPrimary = selectedLimit;
    let currentPrimary = 0;
    let totalDeep = 6; // default guess
    let currentDeep = 0;
    let inDeepCrawl = false;

    try {
      const response = await fetch('/api/predictions/scrape', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: selectedLimit })
      });
      if (!response.body) {
        throw new Error("Le serveur n'a pas renvoyé de flux de données.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let finished = false;
      let buffer = '';

      while (!finished) {
        const { done, value } = await reader.read();
        if (done) {
          finished = true;
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';
        
        for (let line of lines) {
          line = line.trim();
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

                // 1. Primary phase step: [X/Y] Scraping details for...
                const primaryMatch = msg.match(/\[(\d+)\/(\d+)\] Scraping details for/);
                if (primaryMatch) {
                  currentPrimary = parseInt(primaryMatch[1], 10);
                  totalPrimary = parseInt(primaryMatch[2], 10);
                  setCurrentPrimary(currentPrimary);
                  setTotalPrimary(totalPrimary);
                  setScrapePhase('scraping_primary');
                  const progressVal = Math.round((currentPrimary / totalPrimary) * 75);
                  setScrapeProgress(progressVal);

                  const remaining = totalPrimary - currentPrimary;
                  setMatchesRemaining(remaining);

                  const remainingSec = Math.max(0, (remaining + totalDeep) * 8);
                  const mins = Math.floor(remainingSec / 60);
                  const secs = remainingSec % 60;
                  setScrapeTimeRemaining(mins > 0 ? `${mins} min ${secs}s` : `${secs}s`);
                }

                // 2. Deep crawl phase start: X H2H/derniers matchs déjà en cache, Y nouveaux à scrapper.
                if (msg.includes("nouveaux à scrapper")) {
                  const deepMatch = msg.match(/(\d+) nouveaux à scrapper/);
                  if (deepMatch) {
                    totalDeep = Math.min(parseInt(deepMatch[1], 10), 12);
                    inDeepCrawl = true;
                    setTotalDeep(totalDeep);
                    setCurrentDeep(0);
                    setScrapePhase('scraping_history');
                    setMatchesRemaining(totalDeep);
                  }
                }

                // 3. Deep crawl phase step: Deep crawling over Tor:
                if ((msg.includes("Deep crawling over Tor") || msg.includes("Scraping de l'historique sur Tor")) && inDeepCrawl) {
                  currentDeep++;
                  setCurrentDeep(currentDeep);
                  const progressVal = Math.round(75 + (Math.min(currentDeep, totalDeep) / totalDeep) * 20);
                  setScrapeProgress(progressVal);

                  const remaining = Math.max(0, totalDeep - currentDeep);
                  setMatchesRemaining(remaining);

                  const remainingSec = Math.max(0, remaining * 8);
                  const mins = Math.floor(remainingSec / 60);
                  const secs = remainingSec % 60;
                  setScrapeTimeRemaining(mins > 0 ? `${mins} min ${secs}s` : `${secs}s`);
                }

                // 4. Analysis/import phase: Analyse et importation des données...
                if (msg.includes("Analyse et importation") || msg.includes("Enregistrement dans SQLite")) {
                  setScrapePhase('importing');
                  setScrapeProgress(96);
                  setMatchesRemaining(0);
                  setScrapeTimeRemaining("Importation en cours...");
                }

                // 5. User canceled log catch
                if (msg.includes("Scraping annulé par l'utilisateur")) {
                  setScrapePhase('stopped');
                  setScrapeProgress(0);
                  setMatchesRemaining(0);
                  setScrapeTimeRemaining("Annulé");
                }
              } else if (eventData.type === 'error') {
                setScraperLogs(prev => [...prev, { message: `[ERREUR CRITIQUE] ${eventData.message}`, type: 'error' }]);
                alert(`Erreur de scraping: ${eventData.message}`);
              } else if (eventData.type === 'complete') {
                setScraperLogs(prev => [...prev, { message: `[Predictix] Scraping terminé avec succès ! ${eventData.count} prédictions synchronisées.`, type: 'success' }]);
                setScrapePhase('completed');
                setScrapeProgress(100);
                setMatchesRemaining(0);
                setScrapeTimeRemaining("Terminé");
                refreshAllDataSilent();
              }
            } catch (err) {
              // Ignore invalid JSON fragments
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

  // Stop active Scraper run
  const handleStopScraping = async () => {
    try {
      setScraperLogs(prev => [...prev, { message: "[Predictix] Demande d'arrêt envoyée au serveur...", type: 'system' }]);
      const response = await fetch('/api/predictions/scrape/stop', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setScrapePhase('stopped');
        setScrapeProgress(0);
        setScrapeTimeRemaining("Arrêté");
        setScraperLogs(prev => [...prev, { message: "[Predictix] ✓ Le scraper a été arrêté avec succès.", type: 'warn' }]);
        refreshAllDataSilent();
      } else {
        alert("Impossible d'arrêter le scraper: " + data.error);
      }
    } catch (err) {
      alert("Erreur lors de la communication de fin de tâche: " + err.message);
    }
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

    // 3. Value Bets Only
    if (predValueBetsOnly) {
      let hasValueBet = false;
      try {
        if (pred.odds_corners && pred.odds_corners.length > 0) {
          hasValueBet = pred.odds_corners.some(o => o.over_value_bet || o.under_value_bet);
        }
        
        if (!hasValueBet) {
          let rawProb = pred.win_rate || pred.probability || '';
          let cleanProb = String(rawProb).replace('%', '').trim();
          let probPct = parseInt(cleanProb, 10);
          
          let rawOdds = '';
          const tipLower = String(pred.best_tip).toLowerCase();
          if (tipLower.includes('plus') || tipLower.includes('over')) {
            rawOdds = pred.over_odds;
          } else if (tipLower.includes('moins') || tipLower.includes('under')) {
            rawOdds = pred.under_odds;
          }
          let oddsVal = parseFloat(String(rawOdds).trim());
          
          if (!isNaN(probPct) && !isNaN(oddsVal) && probPct > 0 && oddsVal > 0) {
            const ev = (probPct / 100) * oddsVal;
            if (ev >= 1.05) {
              hasValueBet = true;
            }
          }
        }
      } catch (e) {}
      if (!hasValueBet) return false;
    }

    // 4. Status tab filter
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
      {/* Sidebar navigation */}
      <Sidebar 
        sidebarCollapsed={sidebarCollapsed} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        setShowResetBankrollModal={setShowResetBankrollModal} 
      />

      {/* Main interface content */}
      <main className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        
        {/* Top Header */}
        <Header 
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          activeTab={activeTab}
          theme={theme}
          setTheme={setTheme}
          bankroll={bankroll}
        />

        <div className="page-body">
          {/* Header titles & action buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div className="header-title-section">
              <h2 className="page-title">
                {activeTab === 'dashboard' && 'Tableau de Bord'}
                {activeTab === 'predictions' && 'Pronostics Corners'}
                {activeTab === 'scraper' && 'Configuration Scraper'}
                {activeTab === 'tracker' && 'Tracker de Paris'}
                {activeTab === 'strategies' && 'Stratégies de Cartons'}
              </h2>
              <p className="header-subtitle">
                {activeTab === 'dashboard' && 'Statistiques de bankroll en temps réel et performances.'}
                {activeTab === 'predictions' && 'Visualisez, analysez et placez vos paris corners basés sur le modèle de Poisson.'}
                {activeTab === 'scraper' && 'Gérez et exécutez le scraper de match-en-direct.fr en temps réel.'}
                {activeTab === 'tracker' && 'Journalisez vos paris sportifs pour optimiser votre capital.'}
                {activeTab === 'strategies' && 'Analyse des cibles de paris à forte espérance mathématique.'}
              </p>
            </div>
            <div className="header-actions">
              {activeTab === 'tracker' && (
                <button className="btn btn-primary" onClick={() => { setPrefilledBet(null); setShowAddBetModal(true); }}>
                  <Plus size={16} />
                  <span>Nouveau Pari</span>
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '16px' }}>
              <RefreshCcw size={40} className="console-line system animate-spin" />
              <p style={{ fontFamily: 'Outfit', fontWeight: 600 }}>Chargement de Predictix...</p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardTab 
                  stats={stats} 
                  bets={bets} 
                  setActiveTab={setActiveTab} 
                />
              )}

              {activeTab === 'scraper' && (
                <ScraperTab 
                  scraping={scraping}
                  scrapeLimit={scrapeLimit}
                  setScrapeLimit={setScrapeLimit}
                  matchesRemaining={matchesRemaining}
                  scrapeProgress={scrapeProgress}
                  scrapePhase={scrapePhase}
                  scrapeTimeRemaining={scrapeTimeRemaining}
                  currentPrimary={currentPrimary}
                  totalPrimary={totalPrimary}
                  currentDeep={currentDeep}
                  totalDeep={totalDeep}
                  scraperLogs={scraperLogs}
                  handleStopScraping={handleStopScraping}
                  handleTriggerScraping={handleTriggerScraping}
                  handleStartDetailedScraping={handleStartDetailedScraping}
                  consoleEndRef={consoleEndRef}
                />
              )}

              {activeTab === 'predictions' && (
                <PredictionsTab 
                  predStatusFilter={predStatusFilter}
                  setPredStatusFilter={setPredStatusFilter}
                  predValueBetsOnly={predValueBetsOnly}
                  setPredValueBetsOnly={setPredValueBetsOnly}
                  predHighProbOnly={predHighProbOnly}
                  setPredHighProbOnly={setPredHighProbOnly}
                  predSearch={predSearch}
                  setPredSearch={setPredSearch}
                  filteredPredictions={filteredPredictions}
                  selectedPredIds={selectedPredIds}
                  setSelectedPredIds={setSelectedPredIds}
                  setSelectedMatchDetails={setSelectedMatchDetails}
                  handleQuickPlaceBet={handleQuickPlaceBet}
                  stats={stats}
                  dateRange={dateRange}
                  setDateRange={setDateRange}
                  startDate={startDate}
                  setStartDate={setStartDate}
                  endDate={endDate}
                  setEndDate={setEndDate}
                />
              )}

              {activeTab === 'tracker' && (
                <TrackerTab 
                  bets={bets} 
                  stats={stats} 
                  handleSettleBet={handleSettleBet} 
                  handleDeleteBet={handleDeleteBet} 
                />
              )}

              {activeTab === 'strategies' && (
                <StrategiesTab />
              )}
            </>
          )}
        </div>

        {/* Modals */}
        <AddBetModal 
          showAddBetModal={showAddBetModal}
          setShowAddBetModal={setShowAddBetModal}
          prefilledBet={prefilledBet}
          setPrefilledBet={setPrefilledBet}
          newBetForm={newBetForm}
          setNewBetForm={setNewBetForm}
          handleAddBet={handleAddBet}
          bankroll={bankroll}
        />

        <ResetBankrollModal 
          showResetBankrollModal={showResetBankrollModal}
          setShowResetBankrollModal={setShowResetBankrollModal}
          resetAmount={resetAmount}
          setResetAmount={setResetAmount}
          handleResetBankroll={handleResetBankroll}
          bankroll={bankroll}
        />

        <MatchDetailsModal 
          selectedMatchDetails={selectedMatchDetails}
          setSelectedMatchDetails={setSelectedMatchDetails}
          crawlLoading={crawlLoading}
          handleCrawlHistory={handleCrawlHistory}
        />

        <BatchBetsModal 
          selectedPredIds={selectedPredIds}
          setSelectedPredIds={setSelectedPredIds}
          showBatchBetModal={showBatchBetModal}
          setShowBatchBetModal={setShowBatchBetModal}
          batchBetsForm={batchBetsForm}
          setBatchBetsForm={setBatchBetsForm}
          batchGlobalStake={batchGlobalStake}
          setBatchGlobalStake={setBatchGlobalStake}
          batchGlobalBookmaker={batchGlobalBookmaker}
          setBatchGlobalBookmaker={setBatchGlobalBookmaker}
          batchLoading={batchLoading}
          batchProgress={batchProgress}
          bankroll={bankroll}
          handleOpenBatchPlacement={handleOpenBatchPlacement}
          handleConfirmBatchBets={handleConfirmBatchBets}
          handleApplyGlobalStake={handleApplyGlobalStake}
          handleApplyGlobalBookmaker={handleApplyGlobalBookmaker}
        />

      </main>
    </div>
  );
}
