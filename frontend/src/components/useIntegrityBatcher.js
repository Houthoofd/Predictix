import { useState, useEffect, useRef } from 'react';

export default function useIntegrityBatcher(onRefreshPredictions) {
  const [batcherStatus, setBatcherStatus] = useState('idle');
  const [batcherQueueLength, setBatcherQueueLength] = useState(0);
  const [batcherCurrentIndex, setBatcherCurrentIndex] = useState(0);
  const [batcherProcessed, setBatcherProcessed] = useState(0);
  const [batcherSuccess, setBatcherSuccess] = useState(0);
  const [batcherErrors, setBatcherErrors] = useState(0);
  const [batcherLogs, setBatcherLogs] = useState([]);
  const [batcherLoading, setBatcherLoading] = useState(false);
  const [batcherQueue, setBatcherQueue] = useState([]);
  const [injectedUrl, setInjectedUrl] = useState('');
  const [injecting, setInjecting] = useState(false);
  const [prioritizingId, setPrioritizingId] = useState(null);
  const [cleaning, setCleaning] = useState(false);

  const refreshRef = useRef(onRefreshPredictions);
  const lastStatusRef = useRef('idle');

  useEffect(() => {
    refreshRef.current = onRefreshPredictions;
  }, [onRefreshPredictions]);

  // Poll batcher status
  useEffect(() => {
    let intervalId = null;

    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/predictions/integrity-batch/status');
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          setBatcherStatus(d.status);
          setBatcherQueueLength(d.queueLength);
          setBatcherCurrentIndex(d.currentIndex);
          setBatcherProcessed(d.processedCount);
          setBatcherSuccess(d.successCount);
          setBatcherErrors(d.errorCount);
          setBatcherLogs(d.logs || []);
          setBatcherQueue(d.queue || []);

          const isRunning = d.status === 'running';
          const statusChanged = d.status !== lastStatusRef.current;
          
          if ((isRunning || statusChanged) && refreshRef.current) {
            refreshRef.current();
          }

          lastStatusRef.current = d.status;
        }
      } catch (err) {
        console.error('Error fetching batcher status:', err);
      }
    };

    fetchStatus();
    intervalId = setInterval(fetchStatus, 1500);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const handleStartBatcher = async () => {
    setBatcherLoading(true);
    try {
      const res = await fetch('/api/predictions/integrity-batch/start', { method: 'POST' });
      const json = await res.json();
      if (!json.success) {
        alert(json.error?.message || "Échec du lancement du batcher.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur de connexion lors du lancement du batcher.");
    } finally {
      setBatcherLoading(false);
    }
  };

  const handlePauseBatcher = async () => {
    try {
      const res = await fetch('/api/predictions/integrity-batch/pause', { method: 'POST' });
      await res.json();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStopBatcher = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir arrêter la réparation et réinitialiser le batcher ?")) return;
    try {
      const res = await fetch('/api/predictions/integrity-batch/stop', { method: 'POST' });
      await res.json();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrioritizeMatch = async (matchId) => {
    setPrioritizingId(matchId);
    try {
      const res = await fetch('/api/predictions/integrity-batch/prioritize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId })
      });
      const json = await res.json();
      if (json.success) {
        const idx = batcherQueue.findIndex(m => m.match_id === matchId);
        if (idx > -1) {
          const updated = [...batcherQueue];
          const [item] = updated.splice(idx, 1);
          updated.unshift(item);
          setBatcherQueue(updated);
        }
      } else {
        alert(json.error?.message || "Erreur de priorisation.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur de connexion.");
    } finally {
      setPrioritizingId(null);
    }
  };

  const handleInjectUrl = async (e) => {
    e.preventDefault();
    if (!injectedUrl.trim() || !injectedUrl.startsWith('/live-score/')) {
      alert("Veuillez entrer une URL valide commençant par /live-score/ (ex: /live-score/psg-brest.html)");
      return;
    }
    setInjecting(true);
    try {
      const res = await fetch('/api/predictions/integrity-batch/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_url: injectedUrl.trim() })
      });
      const json = await res.json();
      if (json.success) {
        setInjectedUrl('');
        if (refreshRef.current) {
          refreshRef.current();
        }
      } else {
        alert(json.error?.message || "Échec de l'injection.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur de connexion.");
    } finally {
      setInjecting(false);
    }
  };

  const handleInjectAndPrioritize = async (matchId) => {
    try {
      const res = await fetch('/api/predictions/integrity-batch/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_url: matchId })
      });
      const json = await res.json();
      if (json.success && refreshRef.current) {
        refreshRef.current();
      } else if (!json.success) {
        alert(json.error?.message || "Erreur de priorisation.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur de connexion.");
    }
  };

  const handleCleanupDatabase = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir lancer le nettoyage d'intégrité de la base de données ? Cette opération va supprimer les doublons et purger les historiques orphelins.")) return;
    setCleaning(true);
    try {
      const res = await fetch('/api/predictions/integrity-batch/cleanup', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        const d = json.data;
        alert(`Nettoyage réussi !\n- Doublons supprimés : ${d.deletedDuplicates}\n- Historiques orphelins purgés : ${d.purgedOrphans}\n- Matchs guéris : ${d.healedCount}`);
        if (refreshRef.current) {
          refreshRef.current();
        }
      } else {
        alert(json.error?.message || "Échec du nettoyage.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur de connexion.");
    } finally {
      setCleaning(false);
    }
  };

  return {
    batcherStatus,
    batcherQueueLength,
    batcherCurrentIndex,
    batcherProcessed,
    batcherSuccess,
    batcherErrors,
    batcherLogs,
    batcherLoading,
    batcherQueue,
    injectedUrl,
    setInjectedUrl,
    injecting,
    prioritizingId,
    cleaning,
    handleStartBatcher,
    handlePauseBatcher,
    handleStopBatcher,
    handlePrioritizeMatch,
    handleInjectUrl,
    handleInjectAndPrioritize,
    handleCleanupDatabase
  };
}
