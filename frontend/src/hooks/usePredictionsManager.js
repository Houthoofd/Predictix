import { useState, useEffect } from 'react';

export default function usePredictionsManager({ showToast }) {
  const [predictions, setPredictions] = useState([]);
  const [magicSignals, setMagicSignals] = useState([]);
  const [magicLoading, setMagicLoading] = useState(true);
  const [minCoverage, setMinCoverage] = useState('50');
  const [magicError, setMagicError] = useState(null);
  const [customLogos, setCustomLogos] = useState([]);
  const [selectedMatchDetails, setSelectedMatchDetails] = useState(null);
  const [selectedPredIds, setSelectedPredIds] = useState([]);
  const [prefilledBet, setPrefilledBet] = useState(null);
  const [crawlLoading, setCrawlLoading] = useState(false);

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

  const fetchMagicSignals = async (coverage = minCoverage) => {
    setMagicLoading(true);
    setMagicError(null);
    try {
      const res = await fetch(`/api/predictions/magic?minCoverage=${coverage}`);
      const json = await res.json();
      if (json.success) {
        setMagicSignals(json.data || []);
      } else {
        setMagicError(json.error?.message || 'Impossible de charger les pronostics magiques.');
      }
    } catch (err) {
      setMagicError('Erreur réseau lors de la récupération des signaux.');
    } finally {
      setMagicLoading(false);
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

  const handleCrawlHistory = async (matchId) => {
    setCrawlLoading(true);
    showToast("Analyse de l'historique H2H démarrée...", "info");
    try {
      const res = await fetch(`/api/predictions/${matchId}/crawl-history`, {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success) {
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

  // Background polling for crawling matches
  useEffect(() => {
    if (!selectedMatchDetails?.isCrawling) {
      return;
    }

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

  return {
    predictions,
    setPredictions,
    magicSignals,
    setMagicSignals,
    magicLoading,
    minCoverage,
    setMinCoverage,
    magicError,
    customLogos,
    selectedMatchDetails,
    setSelectedMatchDetails,
    selectedPredIds,
    setSelectedPredIds,
    prefilledBet,
    setPrefilledBet,
    crawlLoading,
    fetchPredictions,
    fetchMagicSignals,
    fetchCustomLogos,
    handleSaveCustomLogo,
    handleDeleteCustomLogo,
    handleSaveCustomHistoricalMatch,
    handleCrawlHistory
  };
}
