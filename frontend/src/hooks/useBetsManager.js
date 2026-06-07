import { useState } from 'react';

export default function useBetsManager({ showToast, showConfirm, onSettledBets }) {
  const [bankroll, setBankroll] = useState({ balance: 1000, initial_balance: 1000, currency: '€' });
  const [bets, setBets] = useState([]);
  const [stats, setStats] = useState({
    summary: { total_profit: 0, total_stake: 0, roi: 0, win_rate: 0, current_month_profit: 0, counts: { total: 0, won: 0, lost: 0, pending: 0, refunded: 0, settled: 0 } },
    charts: { history: [], leagues: [], bookmakers: [], monthly: [] }
  });
  const [betRefreshLoading, setBetRefreshLoading] = useState({});
  const [globalRefreshLoading, setGlobalRefreshLoading] = useState(false);
  const [basketBets, setBasketBets] = useState([]);

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

  const fetchStats = async () => {
    const res = await fetch(`/api/bankroll/stats?t=${Date.now()}`);
    const json = await res.json();
    if (json.success) setStats(json.data);
  };

  const refreshAllDataSilent = async () => {
    try {
      await Promise.all([fetchBankroll(), fetchBets(), fetchStats()]);
    } catch (error) {
      console.error("Error refreshing bets data silently:", error);
    }
  };

  const handleSettleBet = async (id, status) => {
    try {
      const res = await fetch(`/api/bets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (json.success) {
        await refreshAllDataSilent();
        const statusLabel = status === 'WON' ? 'gagné' : status === 'LOST' ? 'perdu' : status === 'REFUNDED' ? 'remboursé' : 'remis en jeu';
        showToast(`Pari marqué comme ${statusLabel} !`, "success");
      }
    } catch (err) {
      console.error("Error settling bet:", err);
      showToast("Impossible de mettre à jour le statut du pari", "error");
    }
  };

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
            await refreshAllDataSilent();
            showToast("Pari supprimé de votre historique !", "success");
          }
        } catch (err) {
          console.error("Error deleting bet:", err);
          showToast("Une erreur est survenue lors de la suppression", "error");
        }
      }
    });
  };

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
              await refreshAllDataSilent();
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

  const handleRefreshBet = async (id) => {
    setBetRefreshLoading(prev => ({ ...prev, [id]: true }));
    showToast("Mise à jour du pari en cours...", "info");
    try {
      const res = await fetch(`/api/bets/${id}/refresh`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        await refreshAllDataSilent();
        if (json.data && json.data.bet && json.data.bet.status !== 'PENDING') {
          if (onSettledBets) {
            onSettledBets([json.data.bet]);
          }
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
            await refreshAllDataSilent();
            if (json.settledBets && json.settledBets.length > 0) {
              if (onSettledBets) {
                onSettledBets(json.settledBets);
              }
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

  const handleResetBankroll = async (resetAmount) => {
    try {
      const res = await fetch('/api/bankroll/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initial_balance: parseFloat(resetAmount) })
      });
      const json = await res.json();
      if (json.success) {
        await refreshAllDataSilent();
        showToast("Bankroll réinitialisée avec succès !", "success");
        return true;
      }
      return false;
    } catch (err) {
      showToast("Erreur de réinitialisation : " + err.message, "error");
      return false;
    }
  };

  return {
    bankroll,
    setBankroll,
    bets,
    setBets,
    stats,
    setStats,
    betRefreshLoading,
    globalRefreshLoading,
    basketBets,
    setBasketBets,
    fetchBankroll,
    fetchBets,
    fetchStats,
    refreshAllDataSilent,
    handleSettleBet,
    handleDeleteBet,
    handleDeleteMultipleBets,
    handleRefreshBet,
    handleRefreshAllBets,
    handleResetBankroll
  };
}
