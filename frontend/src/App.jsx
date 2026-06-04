import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  RefreshCcw,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  X
} from 'lucide-react';

// Import our new components!
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardTab from './components/DashboardTab';
import ScraperTab from './components/ScraperTab';
import TrackerTab from './components/TrackerTab';
import MagicPredictionsTab from './components/MagicPredictionsTab';
import StrategiesTab from './components/StrategiesTab';
import BasketTab from './components/BasketTab';
import IntegrityTab from './components/IntegrityTab';
import AddBetModal from './components/AddBetModal';
import EditBetModal from './components/EditBetModal';
import ResetBankrollModal from './components/ResetBankrollModal';
import MatchDetailsModal from './components/MatchDetailsModal';
import BatchBetsModal from './components/BatchBetsModal';
import ScrapeResultModal from './components/ScrapeResultModal';
import ConfirmModal from './components/ConfirmModal';
import NotificationModal from './components/NotificationModal';

export default function App() {
  // Theme & Navigation
  const [theme, setTheme] = useState('modern');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [trackerSubTab, setTrackerSubTab] = useState('journal');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedMagicSport, setSelectedMagicSport] = useState('all');
  
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
  const [scraperTargetDate, setScraperTargetDate] = useState('');
  const [selectedScraperSource, setSelectedScraperSource] = useState('matchendirect');
  const [selectedScraperSport, setSelectedScraperSport] = useState('football');
  const [liveScrapedMatches, setLiveScrapedMatches] = useState([]);
  
  // Modals state
  const [showAddBetModal, setShowAddBetModal] = useState(false);
  const [showEditBetModal, setShowEditBetModal] = useState(false);
  const [editBetForm, setEditBetForm] = useState({
    id: '', match_id: '', date: '', time: '', league: '', home_team: '', away_team: '',
    best_tip: 'Over', card_line: 4.5, odds: 1.85, stake: 50, probability: '',
    bookmaker: 'Unibet', status: 'PENDING', notes: '', match_url: '', sport: 'football'
  });
  const [betPlacedSuccess, setBetPlacedSuccess] = useState(false);
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
  const [showScrapeResultModal, setShowScrapeResultModal] = useState(false);
  const [customLogos, setCustomLogos] = useState([]);
  const [scrapeResultStats, setScrapeResultStats] = useState(null);
  const [selectedScraperStrategyId, setSelectedScraperStrategyId] = useState('');
  const [basketBets, setBasketBets] = useState([]); // Dynamic bet basket state
  const [notification, setNotification] = useState({
    show: false,
    title: '',
    message: '',
    type: 'success'
  });

  const showNotification = (title, message, type = 'success') => {
    setNotification({
      show: true,
      title,
      message,
      type
    });
  };

  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([
    { id: 'init', message: 'Bienvenue sur votre tableau de bord Predictix !', type: 'info', timestamp: 'À l\'instant', read: false }
  ]);

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Add to notification history
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setNotifications(prev => [
      { id, message, type, timestamp: timeStr, read: false },
      ...prev
    ]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Custom Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: '',
    message: '',
    confirmText: 'Confirmer',
    cancelText: 'Annuler',
    isDanger: false,
    onConfirm: null,
    onCancel: null
  });

  const showConfirm = ({ title, message, confirmText, cancelText, isDanger, onConfirm }) => {
    setConfirmDialog({
      show: true,
      title: title || 'Confirmation Requise',
      message,
      confirmText: confirmText || 'Confirmer',
      cancelText: cancelText || 'Annuler',
      isDanger: !!isDanger,
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, show: false }));
        if (onConfirm) onConfirm();
      },
      onCancel: () => {
        setConfirmDialog(prev => ({ ...prev, show: false }));
      }
    });
  };
  
  // Form States
  const [newBetForm, setNewBetForm] = useState({
    match_id: '', date: '', time: '', league: '', home_team: '', away_team: '',
    best_tip: 'Over', card_line: 4.5, odds: 1.85, stake: 50, probability: '',
    bookmaker: 'Unibet', status: 'PENDING', notes: '', match_url: '', sport: 'football'
  });
  const [resetAmount, setResetAmount] = useState('1000');
  
  // Bet Auto-Refresh States
  const [betRefreshLoading, setBetRefreshLoading] = useState({});
  const [globalRefreshLoading, setGlobalRefreshLoading] = useState(false);
  
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
        fetchPredictions(),
        fetchStats(),
        fetchCustomLogos()
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
        fetchPredictions(),
        fetchStats(),
        fetchCustomLogos()
      ]);
    } catch (error) {
      console.error("Error refreshing data silently:", error);
    }
  };

  const refreshIntegrityData = async () => {
    try {
      await Promise.all([
        fetchPredictions(),
        fetchCustomLogos()
      ]);
    } catch (error) {
      console.error("Error refreshing integrity data silently:", error);
    }
  };

  const fetchCustomLogos = async () => {
    try {
      const res = await fetch('/api/custom-logos');
      const json = await res.json();
      if (json.success) setCustomLogos(json.data || []);
    } catch (err) {
      console.error("Error fetching custom logos:", err);
    }
  };

  const handleSaveCustomLogo = async (teamName, url) => {
    try {
      const res = await fetch('/api/custom-logos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_name: teamName, logo_url: url })
      });
      const json = await res.json();
      if (json.success) {
        showToast("Logo personnalisé enregistré !", "success");
        await fetchCustomLogos();
        await fetchPredictions();
      } else {
        showToast("Erreur: " + json.error.message, "error");
      }
    } catch (err) {
      showToast("Impossible d'enregistrer le logo", "error");
    }
  };

  const handleDeleteCustomLogo = async (teamName) => {
    try {
      const res = await fetch(`/api/custom-logos/${encodeURIComponent(teamName)}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        showToast("Logo personnalisé supprimé !", "success");
        await fetchCustomLogos();
        await fetchPredictions();
      } else {
        showToast("Erreur: " + json.error.message, "error");
      }
    } catch (err) {
      showToast("Impossible de supprimer le logo", "error");
    }
  };

  const handleSaveCustomHistoricalMatch = async (matchData) => {
    try {
      const res = await fetch('/api/predictions/historical/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchData)
      });
      const json = await res.json();
      if (json.success) {
        showToast("Données historiques enregistrées !", "success");
        await fetchPredictions();
        return true;
      } else {
        showToast("Erreur: " + json.error.message, "error");
        return false;
      }
    } catch (err) {
      showToast("Erreur lors de la communication avec le serveur", "error");
      return false;
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
    showToast("Analyse de l'historique H2H démarrée...", "info");
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
            if (!updatedMatch.isCrawling) {
              setCrawlLoading(false);
            }
          } else {
            setCrawlLoading(false);
          }
        } else {
          setCrawlLoading(false);
        }
      } else {
        showToast("Erreur lors de la récupération de l'historique : " + (json.error?.message || "Erreur inconnue"), "error");
        setCrawlLoading(false);
      }
    } catch (err) {
      showToast("Erreur réseau : " + err.message, "error");
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
        setBetPlacedSuccess(true);
        
        // Silently refresh the entire bankroll data in the background instantly!
        await refreshAllDataSilent();

        // Wait 1.5 seconds for the success animation inside the modal, then close and reset
        setTimeout(() => {
          setShowAddBetModal(false);
          setPrefilledBet(null);
          setBetPlacedSuccess(false);
          // Reset form
          setNewBetForm({
            match_id: '', date: '', time: '', league: '', home_team: '', away_team: '',
            best_tip: 'Over', card_line: 4.5, odds: 1.85, stake: 50, probability: '',
            bookmaker: 'Unibet', status: 'PENDING', notes: '', match_url: '', sport: 'football'
          });
        }, 1500);
      } else {
        showToast("Erreur: " + json.error.message, "error");
      }
    } catch (err) {
      showToast("Erreur lors de l'ajout du pari: " + err.message, "error");
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
        const statusLabel = status === 'WON' ? 'gagné' : status === 'LOST' ? 'perdu' : status === 'REFUNDED' ? 'remboursé' : 'remis en jeu';
        showToast(`Pari marqué comme ${statusLabel} !`, "success");
      }
    } catch (err) {
      console.error("Error settling bet:", err);
      showToast("Impossible de mettre à jour le statut du pari", "error");
    }
  };

  // Delete Bet
  const handleDeleteBet = async (id) => {
    showConfirm({
      title: "Supprimer le Pari",
      message: "Voulez-vous vraiment supprimer ce pari ? Cette action est irréversible.",
      confirmText: "Supprimer",
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/bets/${id}`, { method: 'DELETE' });
          const json = await res.json();
          if (json.success) {
            fetchAllData();
            showToast("Pari supprimé de votre historique !", "success");
          }
        } catch (err) {
          console.error("Error deleting bet:", err);
          showToast("Une erreur est survenue lors de la suppression", "error");
        }
      }
    });
  };

  // Delete Multiple Bets
  const handleDeleteMultipleBets = async (ids) => {
    return new Promise((resolve) => {
      showConfirm({
        title: "Supprimer les Paris Sélectionnés",
        message: `Voulez-vous vraiment supprimer les ${ids.length} paris sélectionnés ? Cette action est irréversible.`,
        confirmText: "Supprimer tout",
        isDanger: true,
        onConfirm: async () => {
          try {
            const res = await fetch('/api/bets/delete-batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids })
            });
            const json = await res.json();
            if (json.success) {
              await fetchAllData();
              showToast(`${ids.length} paris supprimés de votre historique !`, "success");
              resolve(true);
            } else {
              showToast("Erreur lors de la suppression : " + json.error.message, "error");
              resolve(false);
            }
          } catch (err) {
            console.error("Error deleting multiple bets:", err);
            showToast("Une erreur est survenue lors de la suppression", "error");
            resolve(false);
          }
        },
        onCancel: () => {
          resolve(false);
        }
      });
    });
  };

  // Open Edit Bet Modal and prefill with current data
  const handleOpenEditBetModal = (bet) => {
    setEditBetForm({
      id: bet.id,
      match_id: bet.match_id || '',
      date: bet.date || '',
      time: bet.time || '',
      league: bet.league || '',
      home_team: bet.home_team || '',
      away_team: bet.away_team || '',
      best_tip: bet.best_tip || 'Over',
      card_line: bet.card_line !== undefined && bet.card_line !== null ? bet.card_line : 4.5,
      odds: bet.odds !== undefined && bet.odds !== null ? bet.odds : 1.85,
      stake: bet.stake !== undefined && bet.stake !== null ? bet.stake : 50,
      probability: bet.probability !== undefined && bet.probability !== null ? bet.probability : '',
      bookmaker: bet.bookmaker || 'Unibet',
      status: bet.status || 'PENDING',
      notes: bet.notes || '',
      match_url: bet.match_url || '',
      sport: bet.sport || 'football'
    });
    setShowEditBetModal(true);
  };

  // Submit edited bet details
  const handleEditBet = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/bets/${editBetForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: editBetForm.date,
          time: editBetForm.time,
          league: editBetForm.league,
          home_team: editBetForm.home_team,
          away_team: editBetForm.away_team,
          best_tip: editBetForm.best_tip,
          card_line: parseFloat(editBetForm.card_line),
          odds: parseFloat(editBetForm.odds),
          stake: parseFloat(editBetForm.stake),
          probability: editBetForm.probability ? parseInt(editBetForm.probability) : null,
          bookmaker: editBetForm.bookmaker,
          status: editBetForm.status,
          notes: editBetForm.notes,
          sport: editBetForm.sport
        })
      });
      const json = await res.json();
      if (json.success) {
        setShowEditBetModal(false);
        await fetchAllData();
        showToast("Pari mis à jour avec succès !", "success");
      } else {
        showToast("Erreur: " + json.error.message, "error");
      }
    } catch (err) {
      console.error("Error editing bet:", err);
      showToast("Erreur lors de la modification du pari: " + err.message, "error");
    }
  };

  // Auto-refresh a single bet outcome by scraping Matchendirect
  const handleRefreshBet = async (id) => {
    setBetRefreshLoading(prev => ({ ...prev, [id]: true }));
    showToast("Mise à jour du pari en cours...", "info");
    try {
      const res = await fetch(`/api/bets/${id}/refresh`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        fetchAllData();
        if (json.data && json.data.bet && json.data.bet.status !== 'PENDING') {
          setScrapeResultStats({
            count: 0,
            settledBets: [json.data.bet]
          });
          setShowScrapeResultModal(true);
          showToast("Pari mis à jour et résolu !", "success");
        } else {
          showToast(json.message, "info");
        }
      } else {
        showToast(json.message || json.error?.message || "Impossible de rafraîchir ce pari.", "error");
      }
    } catch (err) {
      console.error("Error refreshing bet:", err);
      showToast("Une erreur est survenue lors du rafraîchissement.", "error");
    } finally {
      setBetRefreshLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // Auto-refresh all active pending bets in parallel
  const handleRefreshAllBets = async () => {
    const pendingBets = bets.filter(b => b.status === 'PENDING' && b.match_id);
    if (pendingBets.length === 0) {
      showToast("Aucun pari actif (placé depuis une prédiction) en attente à rafraîchir.", "warning");
      return;
    }
    
    showConfirm({
      title: "Rafraîchir les Paris en Cours",
      message: `Voulez-vous lancer la mise à jour automatique pour les ${pendingBets.length} paris en cours via Tor ? Cette opération peut prendre quelques secondes.`,
      confirmText: "Lancer la mise à jour",
      onConfirm: async () => {
        setGlobalRefreshLoading(true);
        showToast("Lancement de la mise à jour globale...", "info");
        try {
          const res = await fetch('/api/bets/refresh-all', { method: 'POST' });
          const json = await res.json();
          if (json.success) {
            fetchAllData();
            if (json.settledBets && json.settledBets.length > 0) {
              setScrapeResultStats({
                count: 0,
                settledBets: json.settledBets
              });
              setShowScrapeResultModal(true);
              showToast(`Mise à jour globale terminée : ${json.settledBets.length} paris résolus !`, "success");
            } else {
              showToast(json.message, "info");
            }
          } else {
            showToast(json.message || json.error?.message || "Impossible de rafraîchir les paris.", "error");
          }
        } catch (err) {
          console.error("Error refreshing all bets:", err);
          showToast("Une erreur est survenue lors du rafraîchissement global.", "error");
        } finally {
          setGlobalRefreshLoading(false);
        }
      }
    });
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
        showToast("Bankroll réinitialisée avec succès !", "success");
      }
    } catch (err) {
      showToast("Erreur de réinitialisation : " + err.message, "error");
    }
  };

  // Place Bet from Match en Direct Prediction
  const handleQuickPlaceBet = (pred) => {
    const rawProb = pred.probability ? String(pred.probability) : '';
    const probNum = parseInt(rawProb.replace('%', ''));
    const lineNum = parseFloat(pred.card_line);
    const oddsNum = pred.best_tip.toLowerCase() === 'over' ? parseFloat(pred.over_odds) : parseFloat(pred.under_odds);

    const formatToYyyyMmDd = (dateStr) => {
      if (!dateStr) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
      
      const slashParts = dateStr.split('/');
      if (slashParts.length === 3 && slashParts[2].length === 4) {
        return `${slashParts[2]}-${slashParts[1].padStart(2, '0')}-${slashParts[0].padStart(2, '0')}`;
      }

      const months = {
        janvier: '01', 'février': '02', 'fevrier': '02', mars: '03', avril: '04',
        mai: '05', juin: '06', juillet: '07', 'août': '08', 'aout': '08',
        septembre: '09', octobre: '10', novembre: '11', 'décembre': '12', 'decembre': '12'
      };
      
      const parts = dateStr.trim().toLowerCase().split(/\s+/);
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const monthStr = parts[1];
        const year = parts[2];
        const month = months[monthStr];
        if (month && !isNaN(day) && !isNaN(year)) {
          return `${year}-${month}-${day}`;
        }
      }

      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          return d.toISOString().substring(0, 10);
        }
      } catch (e) {}
      
      return dateStr;
    };

    const now = new Date();
    const defaultDate = formatToYyyyMmDd(pred.date) || now.toISOString().substring(0, 10);

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
      notes: pred.notes || `Placé depuis la prédiction Predictix (Probabilité: ${pred.probability}, Taux de réussite historique: ${pred.win_rate})`,
      match_url: pred.match_url || '',
      sport: pred.sport || 'football'
    });
    setPrefilledBet(pred);
    setShowAddBetModal(true);
  };

  // Add a bet to the basket
  const handleAddToBasket = (pred) => {
    if (basketBets.some(b => b.match_id === pred.match_id && b.best_tip === pred.best_tip && b.card_line === pred.card_line)) {
      showToast("Cette sélection est déjà dans votre panier.", "warning");
      return;
    }

    const probNum = parseInt(pred.probability.replace('%', ''));
    const lineNum = parseFloat(pred.card_line);
    const oddsNum = pred.best_tip.toLowerCase() === 'over' ? parseFloat(pred.over_odds) : parseFloat(pred.under_odds);
    const now = new Date();
    const defaultDate = pred.date || now.toISOString().substring(0, 10);

    const newBasketBet = {
      id: `${pred.match_id}_${pred.best_tip}_${pred.card_line}`, // unique temporary key
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
      notes: pred.notes || `Ajouté depuis les Pronostics Magiques.`,
      match_url: pred.match_url || ''
    };

    setBasketBets(prev => [...prev, newBasketBet]);
    showToast(`✓ Sélection ajoutée au panier avec succès !`, "success");
  };

  // Instant direct bet placement (without modal)
  const handleInstantPlaceBet = async (pred) => {
    const probNum = parseInt(pred.probability.replace('%', ''));
    const lineNum = parseFloat(pred.card_line);
    const oddsNum = pred.best_tip.toLowerCase() === 'over' ? parseFloat(pred.over_odds) : parseFloat(pred.under_odds);
    const now = new Date();
    const defaultDate = pred.date || now.toISOString().substring(0, 10);

    const instantBet = {
      match_id: pred.match_id,
      date: defaultDate,
      time: pred.time || '20:00',
      league: pred.tournament || 'Football',
      home_team: pred.home_team,
      away_team: pred.away_team,
      best_tip: pred.best_tip || 'Over',
      card_line: isNaN(lineNum) ? 4.5 : lineNum,
      odds: isNaN(oddsNum) ? 1.85 : oddsNum,
      stake: Math.round(bankroll.balance * 0.05), // 5%
      probability: isNaN(probNum) ? '' : probNum,
      bookmaker: 'Unibet',
      status: 'PENDING',
      notes: pred.notes || `Placement direct depuis les Pronostics Magiques.`,
      match_url: pred.match_url || ''
    };

    try {
      const res = await fetch('http://localhost:5000/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(instantBet)
      });
      const json = await res.json();
      if (json.success) {
        fetchAllData(); // Refresh bankroll
        showToast("Pari direct enregistré avec succès !", "success");
      } else {
        showToast("Impossible de placer le pari : " + json.error.message, "error");
      }
    } catch (err) {
      showToast("Une erreur réseau est survenue : " + err.message, "error");
    }
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
        notes: `Placé en lot depuis Predictix (Probabilité: ${pred.probability}, Taux de réussite: ${pred.win_rate || 'N/A'})`,
        match_url: pred.match_url || ''
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
      showToast("Veuillez saisir un montant de mise valide.", "warning");
      return;
    }
    setBatchBetsForm(prev => prev.map(b => ({ ...b, stake: amount })));
  };

  // Apply a single bookmaker name to all bets in the batch form
  const handleApplyGlobalBookmaker = () => {
    if (!batchGlobalBookmaker.trim()) {
      showToast("Veuillez saisir un nom de bookmaker.", "warning");
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
      showToast(`${count} paris ont été enregistrés avec succès !`, "success");
    } catch (err) {
      showToast("Erreur lors de l'enregistrement du lot: " + err.message, "error");
    } finally {
      setBatchLoading(false);
    }
  };

  // Automated 1-Click Pipeline: Run discovery, and instantly chain detailed crawling!
  const handleOneClickScraping = async () => {
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
    setLiveScrapedMatches([]);
    const dateLogSuffix = scraperTargetDate ? ` pour la date ${scraperTargetDate}` : " du jour";
    setScraperLogs([{ message: `[Predictix] [1-Clic] Lancement de la découverte des matchs${dateLogSuffix}...`, type: 'system' }]);
    showToast("Découverte en 1-Clic lancée...", "info");
    
    try {
      const queryParams = scraperTargetDate ? `?date=${scraperTargetDate}` : '';
      const response = await fetch(`/api/predictions/scrape/discover${queryParams}`, { 
        method: 'POST'
      });
      const json = await response.json();
      
      if (json.success) {
        setTotalPrimary(json.count);
        setMatchesRemaining(json.count);
        setScrapeProgress(25);
        setScraperLogs(prev => [
          ...prev, 
          { message: `[Predictix] ✓ Découverte réussie : ${json.count} matchs trouvés${dateLogSuffix}.`, type: 'success' },
          { message: `[Predictix] [1-Clic] Enchaînement automatique : Lancement de l'analyse détaillée pour les ${Math.min(scrapeLimit, json.count)} premiers matchs...`, type: 'system' }
        ]);
        showToast(`Découverte réussie : ${json.count} matchs trouvés !`, "success");
        
        // Directly chain detailed scraping with the configured limit!
        await handleStartDetailedScraping(Math.min(scrapeLimit, json.count));
      } else {
        showToast("Erreur lors de la découverte : " + (json.error?.message || "Erreur inconnue"), "error");
        setScraping(false);
        setScrapePhase('idle');
      }
    } catch (error) {
      setScraperLogs(prev => [...prev, { message: `[ERREUR CONTEXTE] ${error.message}`, type: 'error' }]);
      showToast("Erreur lors de la communication avec le serveur de scraping : " + error.message, "error");
      setScraping(false);
      setScrapePhase('idle');
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
    setLiveScrapedMatches([]);
    const dateLogSuffix = scraperTargetDate ? ` pour la date ${scraperTargetDate}` : " du jour";
    const sourceName = selectedScraperSource === 'flashscore' ? `Flashscore (${selectedScraperSport})` : "Match en Direct";
    setScraperLogs([{ message: `[Predictix] Lancement de la découverte des matchs ${dateLogSuffix} via ${sourceName}...`, type: 'system' }]);
    showToast("Découverte des matchs lancée...", "info");
    
    try {
      const dateParam = scraperTargetDate ? `&date=${scraperTargetDate}` : '';
      const response = await fetch(`/api/predictions/scrape/discover?scraper=${selectedScraperSource}&sport=${selectedScraperSport}${dateParam}`, { 
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
          { message: `[Predictix] ✓ Découverte réussie : ${json.count} matchs trouvés${dateLogSuffix}.`, type: 'success' },
          { message: "[Predictix] En attente de votre configuration pour démarrer l'analyse détaillée...", type: 'warn' }
        ]);
        showToast(`Découverte réussie : ${json.count} matchs trouvés !`, "success");
      } else {
        showToast("Erreur lors de la découverte : " + (json.error?.message || "Erreur inconnue"), "error");
        setScraping(false);
        setScrapePhase('idle');
      }
    } catch (error) {
      setScraperLogs(prev => [...prev, { message: `[ERREUR CONTEXTE] ${error.message}`, type: 'error' }]);
      showToast("Erreur lors de la communication avec le serveur de scraping : " + error.message, "error");
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
    showToast("Lancement de l'analyse détaillée...", "info");
    
    let totalPrimary = selectedLimit;
    let currentPrimary = 0;
    let totalDeep = 6; // default guess
    let currentDeep = 0;
    let inDeepCrawl = false;

    try {
      const response = await fetch('/api/predictions/scrape', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          limit: selectedLimit,
          strategyId: selectedScraperStrategyId || null,
          date: scraperTargetDate || null,
          scraper: selectedScraperSource,
          sport: selectedScraperSport
        })
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
                else if (msg.includes('[ERREUR]') || msg.includes('[Erreur]') || msg.includes('Echec')) logType = 'error';
                else if (msg.includes('[INFO]') || msg.includes('Verification')) logType = 'system';
                else if (msg.includes('Attente') || msg.includes('Recherche') || msg.includes('[Warning]')) logType = 'warn';

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
                if ((msg.includes("✓ Confrontation") || msg.includes("Deep crawling over Tor") || msg.includes("Scraping de l'historique sur Tor")) && inDeepCrawl) {
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
              } else if (eventData.type === 'match_scraped') {
                setLiveScrapedMatches(prev => {
                  const idx = prev.findIndex(m => m.match_id === eventData.match.match_id);
                  if (idx >= 0) {
                    const next = [...prev];
                    next[idx] = { ...next[idx], ...eventData.match, h2hList: next[idx].h2hList || [] };
                    return next;
                  }
                  return [...prev, { ...eventData.match, h2hList: [] }];
                });
              } else if (eventData.type === 'h2h_scraped') {
                setLiveScrapedMatches(prev => {
                  return prev.map(m => {
                    let links = m.historical_links || [];
                    if (typeof links === 'string') {
                      try { links = JSON.parse(links); } catch(e) { links = []; }
                    }
                    if (Array.isArray(links) && links.includes(eventData.h2h.match_url)) {
                      const exists = m.h2hList.some(h => h.match_url === eventData.h2h.match_url);
                      if (!exists) {
                        return { ...m, h2hList: [...m.h2hList, eventData.h2h] };
                      }
                    }
                    return m;
                  });
                });
              } else if (eventData.type === 'error') {
                setScraperLogs(prev => [...prev, { message: `[ERREUR CRITIQUE] ${eventData.message}`, type: 'error' }]);
                showToast(`Erreur de scraping: ${eventData.message}`, "error");
              } else if (eventData.type === 'complete') {
                setScraperLogs(prev => [...prev, { message: `[Predictix] Scraping terminé avec succès ! ${eventData.count} prédictions synchronisées.`, type: 'success' }]);
                setScrapePhase('completed');
                setScrapeProgress(100);
                setMatchesRemaining(0);
                setScrapeTimeRemaining("Terminé");
                setScrapeResultStats({
                  count: eventData.count,
                  settledBets: eventData.settledBets || [],
                  magicPredictions: eventData.magicPredictions || []
                });
                setShowScrapeResultModal(true);
                showToast("Analyse de masse terminée avec succès !", "success");
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
      showToast("Erreur lors de la communication avec le serveur de scraping : " + error.message, "error");
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
        showToast("Le scraper a été arrêté avec succès.", "warning");
        refreshAllDataSilent();
      } else {
        showToast("Impossible d'arrêter le scraper: " + data.error, "error");
      }
    } catch (err) {
      showToast("Erreur lors de la communication de fin de tâche: " + err.message, "error");
    }
  };



  return (
    <div className="app-container">
      {/* Sidebar navigation */}
      <Sidebar 
        sidebarCollapsed={sidebarCollapsed} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        setShowResetBankrollModal={setShowResetBankrollModal} 
        basketCount={basketBets.length}
        selectedMagicSport={selectedMagicSport}
        setSelectedMagicSport={setSelectedMagicSport}
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
          notifications={notifications}
          setNotifications={setNotifications}
        />

        <div className="page-body">
          {/* Header titles & action buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div className="header-title-section">
              <h2 className="page-title">
                {activeTab === 'dashboard' && 'Tableau de Bord'}
                {activeTab === 'magic-predictions' && 'Pronostics Magiques'}
                {activeTab === 'basket' && 'Panier de Paris'}
                {activeTab === 'scraper' && 'Configuration Scraper'}
                {activeTab === 'tracker' && 'Tracker de Paris'}
                {activeTab === 'strategies' && 'Stratégies Personnalisées'}
                {activeTab === 'integrity' && 'Qualité des Données'}
              </h2>
              <p className="header-subtitle">
                {activeTab === 'dashboard' && 'Statistiques de bankroll en temps réel et performances.'}
                {activeTab === 'magic-predictions' && 'Signaux de value-bets basés sur vos stratégies personnalisées sur-mesure.'}
                {activeTab === 'basket' && 'Gérez, ajustez et enregistrez vos sélections de paris en masse.'}
                {activeTab === 'scraper' && 'Gérez et exécutez le scraper de match-en-direct.fr en temps réel.'}
                {activeTab === 'tracker' && 'Journalisez vos paris sportifs pour optimiser votre capital.'}
                {activeTab === 'strategies' && 'Analyse et configuration de vos cibles de paris à forte espérance mathématique.'}
                {activeTab === 'integrity' && 'Analysez les données manquantes, forcer le crawl et gérez les logos personnalisés.'}
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
                  setTrackerSubTab={setTrackerSubTab}
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
                  handleOneClickScraping={handleOneClickScraping}
                  consoleEndRef={consoleEndRef}
                  selectedScraperStrategyId={selectedScraperStrategyId}
                  setSelectedScraperStrategyId={setSelectedScraperStrategyId}
                  scraperTargetDate={scraperTargetDate}
                  setScraperTargetDate={setScraperTargetDate}
                  liveScrapedMatches={liveScrapedMatches}
                  selectedScraperSource={selectedScraperSource}
                  setSelectedScraperSource={setSelectedScraperSource}
                  selectedScraperSport={selectedScraperSport}
                  setSelectedScraperSport={setSelectedScraperSport}
                />
              )}



              {activeTab === 'magic-predictions' && (
                <MagicPredictionsTab 
                  predictions={predictions}
                  handleQuickPlaceBet={handleQuickPlaceBet}
                  setSelectedMatchDetails={setSelectedMatchDetails}
                  handleAddToBasket={handleAddToBasket}
                  handleInstantPlaceBet={handleInstantPlaceBet}
                  selectedPredIds={selectedPredIds}
                  setSelectedPredIds={setSelectedPredIds}
                  selectedMagicSport={selectedMagicSport}
                  setSelectedMagicSport={setSelectedMagicSport}
                />
              )}

              {activeTab === 'tracker' && (
                <TrackerTab 
                  bets={bets} 
                  stats={stats} 
                  handleSettleBet={handleSettleBet} 
                  handleDeleteBet={handleDeleteBet} 
                  handleDeleteMultipleBets={handleDeleteMultipleBets}
                  handleRefreshBet={handleRefreshBet}
                  handleRefreshAllBets={handleRefreshAllBets}
                  betRefreshLoading={betRefreshLoading}
                  globalRefreshLoading={globalRefreshLoading}
                  subTab={trackerSubTab}
                  setSubTab={setTrackerSubTab}
                  onOpenEditBetModal={handleOpenEditBetModal}
                />
              )}

              {activeTab === 'strategies' && (
                <StrategiesTab />
              )}

              {activeTab === 'basket' && (
                <BasketTab 
                  basketBets={basketBets}
                  setBasketBets={setBasketBets}
                  bankroll={bankroll}
                  fetchAllData={fetchAllData}
                  showNotification={showNotification}
                  showToast={showToast}
                />
              )}

              {activeTab === 'integrity' && (
                <IntegrityTab 
                  predictions={predictions}
                  customLogos={customLogos}
                  onSaveCustomLogo={handleSaveCustomLogo}
                  onDeleteCustomLogo={handleDeleteCustomLogo}
                  onSaveCustomHistoricalMatch={handleSaveCustomHistoricalMatch}
                  onCrawlMatchHistory={handleCrawlHistory}
                  onRefreshPredictions={refreshIntegrityData}
                />
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
          betPlacedSuccess={betPlacedSuccess}
        />

        <EditBetModal 
          showEditBetModal={showEditBetModal}
          setShowEditBetModal={setShowEditBetModal}
          editBetForm={editBetForm}
          setEditBetForm={setEditBetForm}
          handleEditBet={handleEditBet}
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
          handleQuickPlaceBet={handleQuickPlaceBet}
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

        <ScrapeResultModal 
          show={showScrapeResultModal}
          onClose={() => setShowScrapeResultModal(false)}
          stats={scrapeResultStats}
          onNavigateToMagicPredictions={() => {
            setActiveTab('magic-predictions');
            setShowScrapeResultModal(false);
          }}
        />

        <ConfirmModal 
          show={confirmDialog.show}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          isDanger={confirmDialog.isDanger}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />

        <NotificationModal 
          show={notification.show}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification(prev => ({ ...prev, show: false }))}
        />

        {/* Floating Toast notifications container */}
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          zIndex: 9999,
          pointerEvents: 'none'
        }}>
          {toasts.map(toast => (
            <div 
              key={toast.id}
              style={{
                pointerEvents: 'auto',
                background: 'rgba(15, 23, 42, 0.88)',
                backdropFilter: 'blur(12px)',
                border: `1.5px solid rgba(${
                  toast.type === 'error' ? '255, 69, 58' : 
                  toast.type === 'warning' ? '255, 159, 10' : 
                  toast.type === 'info' ? '10, 132, 255' : '48, 209, 88'
                }, 0.22)`,
                color: 'var(--text-primary)',
                padding: '12px 20px 12px 24px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                fontSize: '13px',
                fontFamily: 'Outfit',
                fontWeight: 600,
                minWidth: '290px',
                maxWidth: '380px',
                animation: 'slideInRight 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Left accent color bar */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: '4px',
                background: toast.type === 'error' ? '#ff453a' : 
                            toast.type === 'warning' ? '#ff9f0a' : 
                            toast.type === 'info' ? '#0a84ff' : '#30d158'
              }} />
              
              {/* Icon */}
              {toast.type === 'error' && <AlertCircle size={16} style={{ color: '#ff453a' }} />}
              {toast.type === 'warning' && <AlertTriangle size={16} style={{ color: '#ff9f0a' }} />}
              {toast.type === 'info' && <Info size={16} style={{ color: '#0a84ff' }} />}
              {toast.type === 'success' && <CheckCircle size={16} style={{ color: '#30d158' }} />}

              {/* Message */}
              <span style={{ flexGrow: 1, lineHeight: '1.4' }}>{toast.message}</span>

              {/* Close button */}
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}
