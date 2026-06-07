import { useState } from 'react';

export default function useScraperManager({ showToast, refreshAllDataSilent }) {
  const [scraping, setScraping] = useState(false);
  const [scraperLogs, setScraperLogs] = useState([]);
  const [scrapeProgress, setScrapeProgress] = useState(0); 
  const [scrapeTimeRemaining, setScrapeTimeRemaining] = useState(''); 
  const [scrapePhase, setScrapePhase] = useState('idle'); 
  const [scrapeLimit, setScrapeLimit] = useState(30); 
  const [matchesRemaining, setMatchesRemaining] = useState(0); 
  const [currentPrimary, setCurrentPrimary] = useState(0);
  const [totalPrimary, setTotalPrimary] = useState(0);
  const [currentDeep, setCurrentDeep] = useState(0);
  const [totalDeep, setTotalDeep] = useState(0);
  const [scraperTargetDate, setScraperTargetDate] = useState('');
  const [selectedScraperSource, setSelectedScraperSource] = useState('matchendirect');
  const [selectedScraperSport, setSelectedScraperSport] = useState('football');
  const [liveScrapedMatches, setLiveScrapedMatches] = useState([]);
  const [selectedScraperStrategyId, setSelectedScraperStrategyId] = useState('');
  const [scrapeResultStats, setScrapeResultStats] = useState(null);
  const [showScrapeResultModal, setShowScrapeResultModal] = useState(false);

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
    const sourceName = selectedScraperSource === 'flashscore'
      ? `Flashscore (${selectedScraperSport === 'all' ? 'Tous les sports' : selectedScraperSport})`
      : "Match en Direct";
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
        setScrapeLimit(Math.min(30, json.count)); 
        setScrapeProgress(25);
        setScraperLogs(prev => [
          ...prev, 
          { message: `[Predictix] ✓ Découverte réussie : ${json.count} matchs trouvés${dateLogSuffix}.`, type: 'success' },
          { message: "[Predictix] En attente de votre configuration pour démarrer l'analyse détaillée...", type: 'warn' }
        ]);
        showToast("Découverte réussie !", "success");
      } else {
        showToast("Erreur lors de la découverte : " + (json.error?.message || "Erreur inconnue"), "error");
        setScraping(false);
        setScrapePhase('idle');
      }
    } catch (error) {
      setScraperLogs(prev => [...prev, { message: `[ERREUR CONTEXTE] ${error.message}`, type: 'error' }]);
      showToast("Erreur de communication : " + error.message, "error");
      setScraping(false);
      setScrapePhase('idle');
    }
  };

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
    let totalDeep = 6; 
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

                const primaryMatch = msg.match(/\[(\d+)\/(\d+)\] Scraping details for/);
                if (primaryMatch) {
                  currentPrimary = parseInt(primaryMatch[1], 10);
                  totalPrimary = parseInt(primaryMatch[2], 10);
                  setCurrentPrimary(currentPrimary);
                  setTotalPrimary(totalPrimary);
                  setScrapePhase('scraping_primary');
                  setScrapeProgress(Math.round((currentPrimary / totalPrimary) * 75));
                  const remaining = totalPrimary - currentPrimary;
                  setMatchesRemaining(remaining);

                  const remainingSec = Math.max(0, (remaining + totalDeep) * 8);
                  const mins = Math.floor(remainingSec / 60);
                  const secs = remainingSec % 60;
                  setScrapeTimeRemaining(mins > 0 ? `${mins} min ${secs}s` : `${secs}s`);
                }

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

                if ((msg.includes("✓ Confrontation") || msg.includes("Deep crawling over Tor") || msg.includes("Scraping de l'historique sur Tor")) && inDeepCrawl) {
                  currentDeep++;
                  setCurrentDeep(currentDeep);
                  setScrapeProgress(Math.round(75 + (Math.min(currentDeep, totalDeep) / totalDeep) * 20));
                  const remaining = Math.max(0, totalDeep - currentDeep);
                  setMatchesRemaining(remaining);

                  const remainingSec = Math.max(0, remaining * 8);
                  const mins = Math.floor(remainingSec / 60);
                  const secs = remainingSec % 60;
                  setScrapeTimeRemaining(mins > 0 ? `${mins} min ${secs}s` : `${secs}s`);
                }

                if (msg.includes("Analyse et importation") || msg.includes("Enregistrement dans SQLite")) {
                  setScrapePhase('importing');
                  setScrapeProgress(96);
                  setMatchesRemaining(0);
                  setScrapeTimeRemaining("Importation en cours...");
                }

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
                showToast(`Erreur: ${eventData.message}`, "error");
              } else if (eventData.type === 'complete') {
                setScraperLogs(prev => [...prev, { message: "[Predictix] Scraping terminé !", type: 'success' }]);
                setScrapePhase('complete');
                setScrapeProgress(100);
                setMatchesRemaining(0);
                setScrapeTimeRemaining("Terminé");
                setScrapeResultStats({
                  count: eventData.count,
                  settledBets: eventData.settledBets || [],
                  magicPredictions: eventData.magicPredictions || []
                });
                setShowScrapeResultModal(true);
                showToast("Analyse terminée avec succès !", "success");
                refreshAllDataSilent();
              }
            } catch (err) {
              // Ignore partial JSON
            }
          }
        }
      }
    } catch (error) {
      setScraperLogs(prev => [...prev, { message: `[ERREUR DE CONTEXTE] ${error.message}`, type: 'error' }]);
      showToast("Erreur de scraping : " + error.message, "error");
    } finally {
      setScraping(false);
    }
  };

  const handleStopScraping = async () => {
    try {
      setScraperLogs(prev => [...prev, { message: "[Predictix] Demande d'arrêt envoyée...", type: 'system' }]);
      const response = await fetch('/api/predictions/scrape/stop', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setScrapePhase('stopped');
        setScrapeProgress(0);
        setScrapeTimeRemaining("Arrêté");
        setScraperLogs(prev => [...prev, { message: "[Predictix] Le scraper a été arrêté.", type: 'warn' }]);
        showToast("Le scraper a été arrêté.", "warning");
        refreshAllDataSilent();
      } else {
        showToast("Impossible d'arrêter: " + data.error, "error");
      }
    } catch (err) {
      showToast("Erreur d'arrêt : " + err.message, "error");
    }
  };

  return {
    scraping,
    scraperLogs,
    scrapeProgress,
    scrapeTimeRemaining,
    scrapePhase,
    scrapeLimit,
    setScrapeLimit,
    matchesRemaining,
    currentPrimary,
    totalPrimary,
    currentDeep,
    totalDeep,
    scraperTargetDate,
    setScraperTargetDate,
    selectedScraperSource,
    setSelectedScraperSource,
    selectedScraperSport,
    setSelectedScraperSport,
    liveScrapedMatches,
    selectedScraperStrategyId,
    setSelectedScraperStrategyId,
    scrapeResultStats,
    setScrapeResultStats,
    showScrapeResultModal,
    setShowScrapeResultModal,
    handleOneClickScraping,
    handleTriggerScraping,
    handleStartDetailedScraping,
    handleStopScraping
  };
}
