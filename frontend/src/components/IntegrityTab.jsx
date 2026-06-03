import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Check, 
  AlertTriangle, 
  RefreshCcw, 
  Image, 
  FileText, 
  Trash2, 
  Plus, 
  X, 
  Database,
  Info,
  Calendar,
  Sparkles,
  Pause,
  Play,
  Square,
  MoreVertical
} from 'lucide-react';

export default function IntegrityTab({
  predictions,
  customLogos,
  onSaveCustomLogo,
  onDeleteCustomLogo,
  onSaveCustomHistoricalMatch,
  onCrawlMatchHistory,
  onRefreshPredictions
}) {
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const selectedMatch = predictions?.find(p => p.match_id === selectedMatchId) || null;
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [showH2HModal, setShowH2HModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  // Data Integrity Batcher State
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
  const [activeKebabMatchId, setActiveKebabMatchId] = useState(null);

  // Refs to avoid stale closures in polling interval
  const refreshRef = React.useRef(onRefreshPredictions);
  const lastProcessedRef = React.useRef(0);
  const lastStatusRef = React.useRef('idle');

  React.useEffect(() => {
    refreshRef.current = onRefreshPredictions;
  }, [onRefreshPredictions]);

  // Poll batcher status
  React.useEffect(() => {
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

          // Trigger refresh if the batcher is running (updates H2H stats and logos in real-time as they are crawled)
          // or if the status transitioned to/from running
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
        // Optimistically update the queue list
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
        // Optimistically trigger prediction refresh
        if (onRefreshPredictions) {
          onRefreshPredictions();
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
      if (json.success) {
        // Optimistically trigger prediction refresh to reflect status changes if any
        if (onRefreshPredictions) {
          onRefreshPredictions();
        }
      } else {
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
        if (onRefreshPredictions) {
          onRefreshPredictions();
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
  
  // Custom Logo Modal Form State
  const [logoForm, setLogoForm] = useState({ team: '', url: '' });
  
  // Manual Entry / Parser Form State
  const [targetLink, setTargetLink] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [statsForm, setStatsForm] = useState({
    match_id: '',
    date: '',
    time: 'Finished',
    tournament: 'Football',
    home_team: '',
    away_team: '',
    score: '',
    first_half_corners_home: '',
    first_half_corners_away: '',
    possession_home: '50',
    possession_away: '50',
    corners_ft_home: '',
    corners_ft_away: '',
    fouls_home: '',
    fouls_away: '',
    yellow_home: '',
    yellow_away: '',
    red_home: '',
    red_away: '',
    shots_on_target_home: '',
    shots_on_target_away: '',
    shots_home: '',
    shots_away: '',
    offsides_home: '',
    offsides_away: ''
  });

  const [parseError, setParseError] = useState('');
  const [validationError, setValidationError] = useState('');

  // 1. Text Parser for Match En Direct copy-paste data
  const handleParseText = () => {
    setParseError('');
    if (!pasteText.trim()) {
      setParseError('Veuillez coller du texte brut de Match en Direct.');
      return;
    }

    const text = pasteText;
    const lines = text.split('\n').map(l => l.trim().toLowerCase()).filter(l => l !== '');
    
    const parsed = {
      possession: { home: 50, away: 50 },
      corners: { home: null, away: null },
      corners1MT: { home: null, away: null },
      fouls: { home: null, away: null },
      yellow_cards: { home: null, away: null },
      red_cards: { home: null, away: null },
      shots_on_target: { home: null, away: null },
      shots: { home: null, away: null },
      offsides: { home: null, away: null },
      score: '',
      date: ''
    };

    const extractNumbers = (str) => {
      const matches = str.match(/\d+/g);
      if (matches && matches.length >= 2) {
        return [parseInt(matches[0], 10), parseInt(matches[1], 10)];
      }
      return null;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Score "X - Y"
      if (line.match(/^\d+\s*-\s*\d+$/)) {
        parsed.score = line.replace(/\s+/g, '');
        continue;
      }

      // Date parsing
      if (line.includes('date') || line.includes('mardi') || line.includes('mercredi') || line.includes('jeudi') || line.includes('vendredi') || line.includes('samedi') || line.includes('dimanche') || line.includes('lundi')) {
        const dateMatch = line.match(/(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})/);
        if (dateMatch) {
          parsed.date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
        }
      }

      const checkMetric = (key, terms) => {
        const hasTerm = terms.some(t => line.includes(t));
        if (!hasTerm) return false;

        let nums = extractNumbers(line);
        if (nums) {
          parsed[key] = { home: nums[0], away: nums[1] };
          return true;
        }

        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          nums = extractNumbers(nextLine);
          if (nums) {
            parsed[key] = { home: nums[0], away: nums[1] };
            return true;
          }
          if (i + 2 < lines.length) {
            const nextNextLine = lines[i + 2];
            const val1 = parseInt(nextLine, 10);
            const val2 = parseInt(nextNextLine, 10);
            if (!isNaN(val1) && !isNaN(val2)) {
              parsed[key] = { home: val1, away: val2 };
              return true;
            }
          }
        }
        return false;
      };

      checkMetric('possession', ['possession']);
      checkMetric('corners1MT', ['corners 1', 'corners (1', 'corners 1mt', 'corners first half', 'mi-temps corners', '1ère mi-temps corners', 'corners 1er mi-temps']);
      
      if (!line.includes('1ère') && !line.includes('1mt') && !line.includes('mi-temps') && !line.includes('1er')) {
        checkMetric('corners', ['corners', 'corner']);
      }
      checkMetric('fouls', ['fautes', 'fouls', 'fautes commises']);
      checkMetric('yellow_cards', ['cartons jaunes', 'yellow cards', 'jaunes']);
      checkMetric('red_cards', ['cartons rouges', 'red cards', 'rouges']);
      checkMetric('shots_on_target', ['tirs cadrés', 'shots on target', 'cadrés']);
      checkMetric('shots', ['tirs', 'shots', 'tirs totaux']);
      checkMetric('offsides', ['hors-jeu', 'offsides', 'hors jeu']);
    }

    // Apply parsed values to state form
    setStatsForm(prev => ({
      ...prev,
      date: parsed.date || prev.date,
      score: parsed.score || prev.score,
      first_half_corners_home: parsed.corners1MT.home !== null ? String(parsed.corners1MT.home) : prev.first_half_corners_home,
      first_half_corners_away: parsed.corners1MT.away !== null ? String(parsed.corners1MT.away) : prev.first_half_corners_away,
      possession_home: parsed.possession.home !== null ? String(parsed.possession.home) : '50',
      possession_away: parsed.possession.away !== null ? String(parsed.possession.away) : '50',
      corners_ft_home: parsed.corners.home !== null ? String(parsed.corners.home) : prev.corners_ft_home,
      corners_ft_away: parsed.corners.away !== null ? String(parsed.corners.away) : prev.corners_ft_away,
      fouls_home: parsed.fouls.home !== null ? String(parsed.fouls.home) : prev.fouls_home,
      fouls_away: parsed.fouls.away !== null ? String(parsed.fouls.away) : prev.fouls_away,
      yellow_home: parsed.yellow_cards.home !== null ? String(parsed.yellow_cards.home) : prev.yellow_home,
      yellow_away: parsed.yellow_cards.away !== null ? String(parsed.yellow_cards.away) : prev.yellow_away,
      red_home: parsed.red_cards.home !== null ? String(parsed.red_cards.home) : prev.red_home,
      red_away: parsed.red_cards.away !== null ? String(parsed.red_cards.away) : prev.red_away,
      shots_on_target_home: parsed.shots_on_target.home !== null ? String(parsed.shots_on_target.home) : prev.shots_on_target_home,
      shots_on_target_away: parsed.shots_on_target.away !== null ? String(parsed.shots_on_target.away) : prev.shots_on_target_away,
      shots_home: parsed.shots.home !== null ? String(parsed.shots.home) : prev.shots_home,
      shots_away: parsed.shots.away !== null ? String(parsed.shots.away) : prev.shots_away,
      offsides_home: parsed.offsides.home !== null ? String(parsed.offsides.home) : prev.offsides_home,
      offsides_away: parsed.offsides.away !== null ? String(parsed.offsides.away) : prev.offsides_away
    }));
  };

  const handleOpenStatsModal = (link, home, away, tournament) => {
    // Check if there is already a cached match in recent history to prefill
    const cachedMatch = selectedMatch.recent_h2h_matches?.find(m => m.match_url === link) ||
                        selectedMatch.recent_home_matches?.find(m => m.match_url === link) ||
                        selectedMatch.recent_away_matches?.find(m => m.match_url === link);

    let defaultStats = {
      possession: { home: '50', away: '50' },
      corners: { home: '', away: '' },
      fouls: { home: '', away: '' },
      yellow_cards: { home: '', away: '' },
      red_cards: { home: '', away: '' },
      shots_on_target: { home: '', away: '' },
      shots: { home: '', away: '' },
      offsides: { home: '', away: '' }
    };

    if (cachedMatch && cachedMatch.statistics_json) {
      try {
        const stats = typeof cachedMatch.statistics_json === 'string' 
          ? JSON.parse(cachedMatch.statistics_json) 
          : cachedMatch.statistics_json;
        if (stats) {
          Object.keys(defaultStats).forEach(key => {
            if (stats[key]) {
              defaultStats[key] = {
                home: String(stats[key].home || '').replace('%', ''),
                away: String(stats[key].away || '').replace('%', '')
              };
            }
          });
        }
      } catch (e) {}
    }

    setTargetLink(link);
    setPasteText('');
    setValidationError('');
    setStatsForm({
      match_id: link,
      date: cachedMatch?.date || '',
      time: cachedMatch?.time || 'Finished',
      tournament: tournament || selectedMatch.tournament || 'Football',
      home_team: home || selectedMatch.home_team,
      away_team: away || selectedMatch.away_team,
      score: cachedMatch?.score || '',
      first_half_corners_home: cachedMatch?.first_half_corners_home !== undefined && cachedMatch?.first_half_corners_home !== null ? String(cachedMatch.first_half_corners_home) : '',
      first_half_corners_away: cachedMatch?.first_half_corners_away !== undefined && cachedMatch?.first_half_corners_away !== null ? String(cachedMatch.first_half_corners_away) : '',
      possession_home: defaultStats.possession.home || '50',
      possession_away: defaultStats.possession.away || '50',
      corners_ft_home: defaultStats.corners.home || '',
      corners_ft_away: defaultStats.corners.away || '',
      fouls_home: defaultStats.fouls.home || '',
      fouls_away: defaultStats.fouls.away || '',
      yellow_home: defaultStats.yellow_cards.home || '',
      yellow_away: defaultStats.yellow_cards.away || '',
      red_home: defaultStats.red_cards.home || '',
      red_away: defaultStats.red_cards.away || '',
      shots_on_target_home: defaultStats.shots_on_target.home || '',
      shots_on_target_away: defaultStats.shots_on_target.away || '',
      shots_home: defaultStats.shots.home || '',
      shots_away: defaultStats.shots.away || '',
      offsides_home: defaultStats.offsides.home || '',
      offsides_away: defaultStats.offsides.away || ''
    });
    setShowStatsModal(true);
  };

  const handleSaveStats = async () => {
    setValidationError('');
    
    // Validations
    if (!statsForm.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      setValidationError("La date doit être au format AAAA-MM-JJ.");
      return;
    }
    if (!statsForm.score.match(/^\d+-\d+$/)) {
      setValidationError("Le score final doit être au format ButsDom-ButsExt (ex: 2-1).");
      return;
    }
    // Prepare JSON payload
    const statistics = {
      possession: { home: `${statsForm.possession_home}%`, away: `${statsForm.possession_away}%` },
      corners: { home: statsForm.corners_ft_home || '0', away: statsForm.corners_ft_away || '0' },
      fouls: { home: statsForm.fouls_home || '0', away: statsForm.fouls_away || '0' },
      yellow_cards: { home: statsForm.yellow_home || '0', away: statsForm.yellow_away || '0' },
      red_cards: { home: statsForm.red_home || '0', away: statsForm.red_away || '0' },
      shots_on_target: { home: statsForm.shots_on_target_home || '0', away: statsForm.shots_on_target_away || '0' },
      shots: { home: statsForm.shots_home || '0', away: statsForm.shots_away || '0' },
      offsides: { home: statsForm.offsides_home || '0', away: statsForm.offsides_away || '0' }
    };

    const payload = {
      match_id: statsForm.match_id,
      date: statsForm.date,
      time: statsForm.time,
      tournament: statsForm.tournament,
      home_team: statsForm.home_team,
      away_team: statsForm.away_team,
      score: statsForm.score,
      first_half_corners_home: statsForm.first_half_corners_home !== '' ? parseInt(statsForm.first_half_corners_home, 10) : null,
      first_half_corners_away: statsForm.first_half_corners_away !== '' ? parseInt(statsForm.first_half_corners_away, 10) : null,
      statistics
    };

    const success = await onSaveCustomHistoricalMatch(payload);
    if (success) {
      setShowStatsModal(false);
    }
  };

  const handleOpenLogoModal = (teamName) => {
    const existing = customLogos.find(l => l.team_name.toLowerCase() === teamName.toLowerCase());
    setLogoForm({ team: teamName, url: existing ? existing.logo_url : '' });
    setShowLogoModal(true);
  };

  const handleSaveLogo = () => {
    if (!logoForm.url.trim()) return;
    onSaveCustomLogo(logoForm.team, logoForm.url.trim());
    setShowLogoModal(false);
  };

  const getDiagnosticsSummary = () => {
    if (!predictions || predictions.length === 0) return { total: 0, healthy: 0, critical: 0 };
    let healthy = 0;
    let critical = 0;

    for (const p of predictions) {
      if (p.diagnostic) {
        if (p.diagnostic.is_complete) healthy++;
        else if (p.diagnostic.score < 60) critical++;
      }
    }
    return {
      total: predictions.length,
      healthy,
      warning: predictions.length - healthy - critical,
      critical
    };
  };

  const summary = getDiagnosticsSummary();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      {/* Upper summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>MATCHS SCANNÉS</span>
          <span style={{ fontSize: '28px', fontFamily: 'Outfit', fontWeight: 800 }}>{summary.total}</span>
        </div>
        <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '3px solid var(--color-success)' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>DONNÉES COMPLÈTES</span>
          <span style={{ fontSize: '28px', fontFamily: 'Outfit', fontWeight: 800, color: 'var(--color-success)' }}>{summary.healthy}</span>
        </div>
        <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '3px solid var(--color-warning)' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>AVERTISSEMENTS LOGO/HISTO</span>
          <span style={{ fontSize: '28px', fontFamily: 'Outfit', fontWeight: 800, color: 'var(--color-warning)' }}>{summary.warning}</span>
        </div>
        <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '3px solid var(--color-danger)' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>HISTORIQUE MANQUANT / CRITIQUE</span>
          <span style={{ fontSize: '28px', fontFamily: 'Outfit', fontWeight: 800, color: 'var(--color-danger)' }}>{summary.critical}</span>
        </div>
      </div>

      {/* Batcher Réparation de Données Panel */}
      <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={20} style={{ color: '#0082ff' }} />
            <div>
              <h3 style={{ fontSize: '16px', fontFamily: 'Outfit', fontWeight: 800, margin: 0 }}>Cockpit de Réparation Automatique</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Recherche et répare tous les diagnostics incomplets (historique, stats de corners, logos manquants).
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="btn"
              onClick={handleCleanupDatabase}
              disabled={cleaning}
              style={{
                fontSize: '12.5px',
                fontWeight: 700,
                fontFamily: 'Outfit',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 59, 48, 0.08)',
                border: '1px solid rgba(255, 59, 48, 0.2)',
                borderRadius: '6px',
                padding: '8px 14px',
                cursor: 'pointer',
                color: '#ff3b30',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 59, 48, 0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 59, 48, 0.08)'}
            >
              <Trash2 size={14} className={cleaning ? 'animate-spin' : ''} />
              <span>{cleaning ? 'Nettoyage...' : 'Nettoyer la base'}</span>
            </button>

            {batcherStatus === 'idle' ? (
              <button 
                className="btn btn-primary"
                style={{ 
                  background: 'linear-gradient(135deg, #0082ff 0%, #bf5af2 100%)', 
                  border: 'none', 
                  fontFamily: 'Outfit', 
                  fontWeight: 700, 
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  color: '#fff'
                }}
                onClick={handleStartBatcher}
                disabled={batcherLoading}
              >
                <RefreshCcw size={14} className={batcherLoading ? 'animate-spin' : ''} />
                <span>Lancer la Réparation Globale</span>
              </button>
            ) : batcherStatus === 'running' ? (
              <>
                <button 
                  className="btn btn-warning"
                  style={{ 
                    background: '#ff9500', 
                    border: 'none', 
                    fontFamily: 'Outfit', 
                    fontWeight: 700, 
                    fontSize: '12.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    color: '#fff'
                  }}
                  onClick={handlePauseBatcher}
                >
                  <Pause size={14} />
                  <span>Pause</span>
                </button>
                <button 
                  className="btn btn-danger"
                  style={{ 
                    background: '#ff3b30', 
                    border: 'none', 
                    fontFamily: 'Outfit', 
                    fontWeight: 700, 
                    fontSize: '12.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    color: '#fff'
                  }}
                  onClick={handleStopBatcher}
                >
                  <Square size={14} />
                  <span>Arrêter</span>
                </button>
              </>
            ) : (
              // Paused
              <>
                <button 
                  className="btn btn-primary"
                  style={{ 
                    background: '#2ecc71', 
                    border: 'none', 
                    fontFamily: 'Outfit', 
                    fontWeight: 700, 
                    fontSize: '12.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    color: '#fff'
                  }}
                  onClick={handleStartBatcher}
                >
                  <Play size={14} />
                  <span>Reprendre</span>
                </button>
                <button 
                  className="btn btn-danger"
                  style={{ 
                    background: '#ff3b30', 
                    border: 'none', 
                    fontFamily: 'Outfit', 
                    fontWeight: 700, 
                    fontSize: '12.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    color: '#fff'
                  }}
                  onClick={handleStopBatcher}
                >
                  <Square size={14} />
                  <span>Arrêter</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '25px', marginTop: '5px' }}>
          {/* Col 1: Progress, Controls, Terminal Logs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* Progress Bar Area */}
            {batcherStatus !== 'idle' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontFamily: 'Outfit' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Statut : <strong style={{ color: batcherStatus === 'running' ? '#bf5af2' : '#ff9500' }}>
                      {batcherStatus === 'running' ? 'En Cours' : 'En Pause'}
                    </strong>
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    {batcherCurrentIndex} / {batcherQueueLength} Matchs Traités ({batcherSuccess} Succès, {batcherErrors} Erreurs)
                  </span>
                </div>
                
                <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <div 
                    style={{ 
                      width: `${(batcherCurrentIndex / (batcherQueueLength || 1)) * 100}%`, 
                      height: '100%', 
                      background: 'linear-gradient(90deg, #0082ff 0%, #bf5af2 100%)',
                      transition: 'width 0.4s ease'
                    }} 
                  />
                </div>
              </div>
            )}

            {/* Live Logs Terminal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Console des Travaux en Direct</span>
              <div 
                style={{ 
                  height: '150px', 
                  background: '#0a0f1d', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-color)', 
                  padding: '10px 14px', 
                  fontFamily: 'monospace', 
                  fontSize: '11.5px', 
                  color: '#4af626', 
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
                ref={(el) => {
                  if (el) el.scrollTop = el.scrollHeight; // Auto-scroll to bottom on update
                }}
              >
                {batcherLogs.length > 0 ? (
                  batcherLogs.map((log, index) => (
                    <div key={index} style={{ 
                      color: log.includes('❌') ? '#ff3b30' : log.includes('⚠') ? '#ff9500' : log.includes('✓') ? '#2ecc71' : '#4af626'
                    }}>
                      {log}
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucune activité active. Cliquez sur "Lancer la Réparation Globale" pour démarrer.</div>
                )}
              </div>
            </div>

          </div>

          {/* Col 2: Queue Inspector & URL Injector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* URL Injector Form */}
            <form onSubmit={handleInjectUrl} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Injecteur de Match sur Demande</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text"
                  placeholder="Coller l'URL MatchDirect (ex: /live-score/psg-brest.html)"
                  value={injectedUrl}
                  onChange={(e) => setInjectedUrl(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '12.5px',
                    color: '#fff',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={injecting}
                  style={{
                    background: 'var(--color-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Plus size={14} />
                  <span>{injecting ? '...' : 'Injecter'}</span>
                </button>
              </div>
            </form>

            {/* Queue Inspector list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                File d'Attente de Réparation ({batcherQueueLength} restants)
              </span>
              <div 
                style={{ 
                  height: '110px', 
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '4px'
                }}
              >
                {batcherQueue.length > 0 ? (
                  batcherQueue.map((item, idx) => (
                    <div 
                      key={item.match_id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 10px',
                        borderBottom: idx === batcherQueue.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.03)',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '10px' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '10px', marginRight: '6px' }}>#{batcherCurrentIndex + idx + 1}</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{item.home_team} - {item.away_team}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '10px', marginLeft: '6px' }}>({item.date})</span>
                      </div>
                      
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => handlePrioritizeMatch(item.match_id)}
                          disabled={prioritizingId === item.match_id}
                          style={{
                            background: 'rgba(191, 90, 242, 0.1)',
                            border: '1px solid rgba(191, 90, 242, 0.3)',
                            borderRadius: '4px',
                            color: '#bf5af2',
                            padding: '2px 8px',
                            fontSize: '10px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {prioritizingId === item.match_id ? '...' : '⚡ Prioriser'}
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>
                    Aucun match restant dans la file d'attente.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '25px', alignItems: 'flex-start' }}>
        
        {/* Left Side: Predictions list with Diagnostic overview */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontFamily: 'Outfit', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} style={{ color: '#bf5af2' }} />
            Diagnostic de la Base des Matchs
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {predictions && predictions.length > 0 ? (
              predictions.map((match) => {
                const diag = match.diagnostic || { score: 100, is_complete: true };
                const isSelected = selectedMatch?.match_id === match.match_id;

                return (
                  <div 
                    key={match.match_id}
                    onClick={() => setSelectedMatchId(match.match_id)}
                    style={{
                      padding: '12px 16px',
                      background: isSelected ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.15)',
                      border: isSelected ? '1px solid #bf5af2' : '1px solid var(--border-color)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                        {match.tournament}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {match.home_team} - {match.away_team}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                        <div style={{ display: 'flex', gap: '4px' }} title="Matrice de santé (Logo Dom, Logo Ext, H2H, Histo Dom, Histo Ext)">
                          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: diag.missing_home_logo ? '#ff3b30' : '#2ecc71' }} />
                          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: diag.missing_away_logo ? '#ff3b30' : '#2ecc71' }} />
                          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: (diag.h2h_matches_count || 0) >= 10 ? '#2ecc71' : (diag.h2h_matches_count || 0) > 0 ? '#ff9500' : '#ff3b30' }} />
                          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: (diag.home_matches_count || 0) >= 10 ? '#2ecc71' : (diag.home_matches_count || 0) > 0 ? '#ff9500' : '#ff3b30' }} />
                          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: (diag.away_matches_count || 0) >= 10 ? '#2ecc71' : (diag.away_matches_count || 0) > 0 ? '#ff9500' : '#ff3b30' }} />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          H2H: {diag.h2h_matches_count || 0}/10 • Dom: {diag.home_matches_count || 0}/10 • Ext: {diag.away_matches_count || 0}/10
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        {diag.is_complete ? (
                          <span style={{ fontSize: '10px', background: 'rgba(46, 204, 113, 0.15)', color: '#2ecc71', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                            Complet
                          </span>
                        ) : (
                          <span style={{ fontSize: '10px', background: diag.score < 60 ? 'rgba(231, 76, 60, 0.15)' : 'rgba(241, 196, 15, 0.15)', color: diag.score < 60 ? '#e74c3c' : '#f1c40f', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                            {diag.score < 60 ? 'Critique' : 'Alerte'}
                          </span>
                        )}
                        <span style={{ fontSize: '12px', fontWeight: 800, color: diag.score < 60 ? '#e74c3c' : diag.score < 90 ? '#f1c40f' : '#2ecc71' }}>
                          Score : {diag.score}%
                        </span>
                      </div>

                      {/* Kebab Menu */}
                      <div style={{ position: 'relative', zIndex: activeKebabMatchId === match.match_id ? 999 : 1 }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveKebabMatchId(activeKebabMatchId === match.match_id ? null : match.match_id);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                          <MoreVertical size={16} />
                        </button>

                        {activeKebabMatchId === match.match_id && (
                          <>
                            {/* Backdrop overlay */}
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveKebabMatchId(null);
                              }}
                              style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 998,
                                background: 'transparent',
                                cursor: 'default'
                              }}
                            />
                            {/* Dropdown Menu contents */}
                            <div
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: '28px',
                                background: '#121829',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.6)',
                                zIndex: 999,
                                minWidth: '170px',
                                padding: '4px 0'
                              }}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInjectAndPrioritize(match.match_id);
                                  setActiveKebabMatchId(null);
                                }}
                                style={{
                                  width: '100%',
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#fff',
                                  padding: '8px 12px',
                                  textAlign: 'left',
                                  fontSize: '12.5px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <Sparkles size={13} style={{ color: '#bf5af2' }} />
                                <span style={{ fontWeight: 600 }}>Réparer en priorité</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '40px 0', textTransform: 'center', color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center' }}>
                Aucune prédiction disponible. Lancez le scraper pour découvrir des matchs.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Selected Match Details & Override Panel */}
        <div>
          {selectedMatch ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              
              {/* Diagnostic Checklist Panel */}
              <div className="glass-card" style={{ padding: '20px', borderLeft: selectedMatch.diagnostic?.is_complete ? '4px solid #2ecc71' : selectedMatch.diagnostic?.score < 60 ? '4px solid #e74c3c' : '4px solid #f1c40f' }}>
                <h3 style={{ fontSize: '15px', fontFamily: 'Outfit', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert size={18} style={{ color: selectedMatch.diagnostic?.is_complete ? '#2ecc71' : selectedMatch.diagnostic?.score < 60 ? '#e74c3c' : '#f1c40f' }} />
                  Inspecteur de Diagnostic
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Checkpoint 1: Logo Domicile */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {selectedMatch.diagnostic?.missing_home_logo ? (
                        <X size={14} style={{ color: '#e74c3c' }} />
                      ) : (
                        <Check size={14} style={{ color: '#2ecc71' }} />
                      )}
                      <span>Logo Domicile : {selectedMatch.home_team}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {selectedMatch.diagnostic?.missing_home_logo ? 'Manquant/Générique' : 'Valide'}
                    </span>
                  </div>
                  
                  {/* Checkpoint 2: Logo Extérieur */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {selectedMatch.diagnostic?.missing_away_logo ? (
                        <X size={14} style={{ color: '#e74c3c' }} />
                      ) : (
                        <Check size={14} style={{ color: '#2ecc71' }} />
                      )}
                      <span>Logo Extérieur : {selectedMatch.away_team}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {selectedMatch.diagnostic?.missing_away_logo ? 'Manquant/Générique' : 'Valide'}
                    </span>
                  </div>
                  
                  {/* Checkpoint 3: Historique H2H */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {selectedMatch.diagnostic?.missing_h2h ? (
                        <X size={14} style={{ color: '#e74c3c' }} />
                      ) : (
                        <Check size={14} style={{ color: '#2ecc71' }} />
                      )}
                      <span>Confrontations Directes (H2H)</span>
                    </div>
                    <span style={{ fontSize: '11px', color: selectedMatch.diagnostic?.missing_h2h ? '#e74c3c' : 'var(--text-primary)', fontWeight: 600 }}>
                      {selectedMatch.diagnostic?.h2h_matches_count || 0} match(s) en base
                    </span>
                  </div>

                  {/* Checkpoint 4: Historique Domicile */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {selectedMatch.diagnostic?.home_matches_count < 5 ? (
                        <AlertTriangle size={14} style={{ color: '#f1c40f' }} />
                      ) : (
                        <Check size={14} style={{ color: '#2ecc71' }} />
                      )}
                      <span>Historique Domicile : {selectedMatch.home_team}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: selectedMatch.diagnostic?.home_matches_count < 5 ? '#f1c40f' : 'var(--text-primary)', fontWeight: 600 }}>
                      {selectedMatch.diagnostic?.home_matches_count || 0}/5 recommandés
                    </span>
                  </div>

                  {/* Checkpoint 5: Historique Extérieur */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {selectedMatch.diagnostic?.away_matches_count < 5 ? (
                        <AlertTriangle size={14} style={{ color: '#f1c40f' }} />
                      ) : (
                        <Check size={14} style={{ color: '#2ecc71' }} />
                      )}
                      <span>Historique Extérieur : {selectedMatch.away_team}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: selectedMatch.diagnostic?.away_matches_count < 5 ? '#f1c40f' : 'var(--text-primary)', fontWeight: 600 }}>
                      {selectedMatch.diagnostic?.away_matches_count || 0}/5 recommandés
                    </span>
                  </div>
                </div>
              </div>

              {/* Match Header Details & Logo triggers */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontFamily: 'Outfit', fontWeight: 800, marginBottom: '16px' }}>
                  Statut du Match Sélectionné
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  
                  {/* Home Team Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.1)', padding: '10px 14px', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {selectedMatch.home_logo ? (
                        <img src={selectedMatch.home_logo} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'contain' }} />
                      ) : (
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Image size={14} /></div>
                      )}
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>{selectedMatch.home_team} (Domicile)</div>
                        <div style={{ fontSize: '11px', color: selectedMatch.diagnostic?.missing_home_logo ? 'var(--color-warning)' : 'var(--color-success)' }}>
                          {selectedMatch.diagnostic?.missing_home_logo ? 'Logo manquant ou générique' : 'Logo valide'}
                        </div>
                      </div>
                    </div>
                    <button 
                      className="btn btn-secondary" 
                      style={{ fontSize: '11px', padding: '4px 10px', height: '28px' }}
                      onClick={() => handleOpenLogoModal(selectedMatch.home_team)}
                    >
                      Définir Logo
                    </button>
                  </div>

                  {/* Away Team Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.1)', padding: '10px 14px', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {selectedMatch.away_logo ? (
                        <img src={selectedMatch.away_logo} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'contain' }} />
                      ) : (
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Image size={14} /></div>
                      )}
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>{selectedMatch.away_team} (Extérieur)</div>
                        <div style={{ fontSize: '11px', color: selectedMatch.diagnostic?.missing_away_logo ? 'var(--color-warning)' : 'var(--color-success)' }}>
                          {selectedMatch.diagnostic?.missing_away_logo ? 'Logo manquant ou générique' : 'Logo valide'}
                        </div>
                      </div>
                    </div>
                    <button 
                      className="btn btn-secondary" 
                      style={{ fontSize: '11px', padding: '4px 10px', height: '28px' }}
                      onClick={() => handleOpenLogoModal(selectedMatch.away_team)}
                    >
                      Définir Logo
                    </button>
                  </div>

                  {/* Scraper / Crawl History status & button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '6px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>Historique de Statistiques</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        H2H: {selectedMatch.diagnostic?.h2h_matches_count || 0}/10 • Dom: {selectedMatch.diagnostic?.home_matches_count || 0}/10 • Ext: {selectedMatch.diagnostic?.away_matches_count || 0}/10
                      </div>
                    </div>
                    
                    <button 
                      className="btn btn-primary"
                      style={{ 
                        fontSize: '11.5px', 
                        padding: '6px 14px', 
                        height: '32px',
                        background: 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      disabled={selectedMatch.isCrawling}
                      onClick={() => onCrawlMatchHistory(selectedMatch.match_id)}
                    >
                      <RefreshCcw size={13} className={selectedMatch.isCrawling ? 'animate-spin' : ''} />
                      <span>{selectedMatch.isCrawling ? 'Crawling...' : 'Forcer Crawl'}</span>
                    </button>
                  </div>

                </div>
              </div>

              {/* H2H Links checklist panel */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontFamily: 'Outfit', fontWeight: 800, marginBottom: '12px' }}>
                  Confrontations Directes (H2H Links)
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Ces confrontations déterminent les moyennes H2H pour la simulation de Poisson.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(() => {
                    let links = [];
                    try {
                      if (selectedMatch.historical_links) {
                        links = typeof selectedMatch.historical_links === 'string' 
                          ? JSON.parse(selectedMatch.historical_links) 
                          : selectedMatch.historical_links;
                      }
                    } catch (e) {}

                    if (links.length === 0) {
                      return (
                        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                          Aucun lien historique trouvé. Crawlez d'abord ce match.
                        </div>
                      );
                    }

                    return links.map((link, idx) => {
                      // Find if this link is cached in predictions
                      const cached = selectedMatch.recent_h2h_matches?.find(m => m.match_url === link);
                      const isCached = !!cached;

                      return (
                        <div key={idx} style={{
                          padding: '10px 12px',
                          background: 'rgba(0, 0, 0, 0.12)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                              #{idx + 1} {link}
                            </span>
                            {isCached ? (
                              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {cached.date} : {cached.home_team} {cached.score} {cached.away_team}
                              </span>
                            ) : (
                              <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <AlertTriangle size={12} /> Données manquantes
                              </span>
                            )}
                          </div>

                          <div>
                            {isCached ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '11.5px', color: '#2ecc71', background: 'rgba(46, 204, 113, 0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(46, 204, 113, 0.2)', fontWeight: 600 }}>
                                  Corners: {cached.first_half_corners_home}-{cached.first_half_corners_away} (1MT)
                                </span>
                                <button 
                                  className="btn btn-secondary"
                                  style={{ padding: '0 6px', height: '24px', fontSize: '10px' }}
                                  onClick={() => handleOpenStatsModal(link, cached.home_team, cached.away_team, cached.tournament)}
                                  title="Modifier les statistiques"
                                >
                                  Modifier
                                </button>
                              </div>
                            ) : (
                              <button 
                                className="btn btn-primary"
                                style={{ 
                                  fontSize: '11px', 
                                  padding: '4px 10px', 
                                  height: '26px',
                                  background: 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)',
                                  border: 'none'
                                }}
                                onClick={() => handleOpenStatsModal(link)}
                              >
                                Saisir Stats
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

            </div>
          ) : (
            <div className="glass-card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <ShieldAlert size={40} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: '12px' }} />
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Aucun Match Sélectionné</h4>
              <p style={{ fontSize: '12.5px', maxWidth: '340px', margin: '0 auto', lineHeight: 1.5 }}>
                Cliquez sur un match dans la liste de gauche pour auditer son intégrité, forcer son crawling ou définir des logos personnalisés.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Overridden Logos List Panel */}
      <div className="glass-card" style={{ padding: '20px', marginTop: '10px' }}>
        <h3 style={{ fontSize: '16px', fontFamily: 'Outfit', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Image size={18} style={{ color: '#bf5af2' }} />
          Logos d'Équipes Personnalisés ({customLogos.length})
        </h3>
        
        {customLogos.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {customLogos.map((logo) => (
              <div key={logo.team_name} style={{
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={logo.logo_url} alt="" onError={(e) => { e.target.src = 'placeholder'; }} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'contain' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>{logo.team_name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px', whiteSpace: 'nowrap' }} title={logo.logo_url}>
                      {logo.logo_url}
                    </div>
                  </div>
                </div>

                <button 
                  className="btn btn-secondary"
                  style={{ 
                    padding: '0 8px', 
                    height: '28px', 
                    color: 'var(--color-danger)', 
                    borderColor: 'rgba(231, 76, 60, 0.2)',
                    background: 'rgba(231, 76, 60, 0.05)'
                  }}
                  onClick={() => onDeleteCustomLogo(logo.team_name)}
                  title="Supprimer la substitution"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            Aucun logo personnalisé configuré dans la bibliothèque.
          </div>
        )}
      </div>

      {/* 1. Modal Dialog for mapping Custom Team Logos */}
      {showLogoModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div className="glass-card" style={{ width: '400px', padding: '24px', position: 'relative' }}>
            <button 
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              onClick={() => setShowLogoModal(false)}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', fontWeight: 800, marginBottom: '16px' }}>
              Définir un Logo Personnalisé
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Équipe</label>
                <input 
                  type="text" 
                  value={logoForm.team} 
                  disabled
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-muted)', marginTop: '4px', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>URL de l'image (logo)</label>
                <input 
                  type="text" 
                  value={logoForm.url} 
                  onChange={(e) => setLogoForm(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://ex.com/logo.png"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: 'var(--text-primary)', marginTop: '4px', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowLogoModal(false)}>
                  Annuler
                </button>
                <button className="btn btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)', border: 'none' }} onClick={handleSaveLogo}>
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal Dialog for manual entry and copy-paste parsing */}
      {showStatsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          overflowY: 'auto'
        }}>
          <div className="glass-card" style={{ width: '680px', padding: '24px', position: 'relative', margin: '40px 0', maxHeight: '90vh', overflowY: 'auto' }}>
            <button 
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              onClick={() => setShowStatsModal(false)}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', fontWeight: 800, marginBottom: '6px' }}>
              Saisir les Statistiques du Match H2H
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              Collez le bloc textuel de Match en Direct ou saisissez les informations manuellement.
            </p>

            {/* Paste Area and Trigger */}
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
              <label style={{ fontSize: '10.5px', color: '#bf5af2', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Copier-coller de Match en Direct</label>
              <textarea 
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Collez ici les statistiques de match-en-direct.fr..."
                style={{ width: '100%', height: '80px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: '#fff', fontSize: '12px', fontFamily: 'monospace', padding: '10px', marginTop: '6px', outline: 'none', resize: 'none' }}
              />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Lit automatiquement possession, corners 1MT & FT, fautes, tirs, cartons, etc.
                </span>
                <button 
                  className="btn btn-secondary" 
                  style={{ fontSize: '11px', height: '28px', padding: '0 12px' }}
                  onClick={handleParseText}
                >
                  Parser le texte
                </button>
              </div>
              {parseError && <div style={{ color: 'var(--color-danger)', fontSize: '12px', marginTop: '8px', fontWeight: 600 }}>{parseError}</div>}
            </div>

            {/* Interactive Data Editing fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Teams & Meta Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 700 }}>ÉQUIPE DOMICILE</label>
                  <input type="text" value={statsForm.home_team} onChange={(e) => setStatsForm(p => ({ ...p, home_team: e.target.value }))} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', marginTop: '4px', fontSize: '12.5px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 700 }}>ÉQUIPE EXTÉRIEUR</label>
                  <input type="text" value={statsForm.away_team} onChange={(e) => setStatsForm(p => ({ ...p, away_team: e.target.value }))} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', marginTop: '4px', fontSize: '12.5px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 700 }}>TOURNOI / LIGUE</label>
                  <input type="text" value={statsForm.tournament} onChange={(e) => setStatsForm(p => ({ ...p, tournament: e.target.value }))} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', marginTop: '4px', fontSize: '12.5px' }} />
                </div>
              </div>

              {/* Date & Score */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 700 }}>DATE (AAAA-MM-JJ)</label>
                  <input type="text" placeholder="2026-05-25" value={statsForm.date} onChange={(e) => setStatsForm(p => ({ ...p, date: e.target.value }))} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', marginTop: '4px', fontSize: '12.5px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 700 }}>SCORE FINAL (DOM-EXT)</label>
                  <input type="text" placeholder="2-1" value={statsForm.score} onChange={(e) => setStatsForm(p => ({ ...p, score: e.target.value }))} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', marginTop: '4px', fontSize: '12.5px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 700 }}>PÉRIODE (HEURE/FIN)</label>
                  <input type="text" value={statsForm.time} onChange={(e) => setStatsForm(p => ({ ...p, time: e.target.value }))} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', marginTop: '4px', fontSize: '12.5px' }} />
                </div>
              </div>

              {/* Corners Details */}
              <div style={{ padding: '14px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>CORNERS</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Corners 1ère Mi-Temps (Dom / Ext)</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <input type="number" min="0" placeholder="Dom" value={statsForm.first_half_corners_home} onChange={(e) => setStatsForm(p => ({ ...p, first_half_corners_home: e.target.value }))} style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.15)', color: '#fff', fontSize: '12.5px' }} />
                      <input type="number" min="0" placeholder="Ext" value={statsForm.first_half_corners_away} onChange={(e) => setStatsForm(p => ({ ...p, first_half_corners_away: e.target.value }))} style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.15)', color: '#fff', fontSize: '12.5px' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Corners Match Complet (Dom / Ext)</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <input type="number" min="0" placeholder="Dom" value={statsForm.corners_ft_home} onChange={(e) => setStatsForm(p => ({ ...p, corners_ft_home: e.target.value }))} style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.15)', color: '#fff', fontSize: '12.5px' }} />
                      <input type="number" min="0" placeholder="Ext" value={statsForm.corners_ft_away} onChange={(e) => setStatsForm(p => ({ ...p, corners_ft_away: e.target.value }))} style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.15)', color: '#fff', fontSize: '12.5px' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                
                {/* Left col stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  
                  {/* Possession */}
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Possession % (Dom / Ext)</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <input type="number" min="0" max="100" placeholder="Dom" value={statsForm.possession_home} onChange={(e) => setStatsForm(p => ({ ...p, possession_home: e.target.value }))} style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} />
                      <input type="number" min="0" max="100" placeholder="Ext" value={statsForm.possession_away} onChange={(e) => setStatsForm(p => ({ ...p, possession_away: e.target.value }))} style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} />
                    </div>
                  </div>

                  {/* Fautes */}
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Fautes Commises (Dom / Ext)</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <input type="number" min="0" placeholder="Dom" value={statsForm.fouls_home} onChange={(e) => setStatsForm(p => ({ ...p, fouls_home: e.target.value }))} style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} />
                      <input type="number" min="0" placeholder="Ext" value={statsForm.fouls_away} onChange={(e) => setStatsForm(p => ({ ...p, fouls_away: e.target.value }))} style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} />
                    </div>
                  </div>

                  {/* Cartons Jaunes */}
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Cartons Jaunes (Dom / Ext)</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <input type="number" min="0" placeholder="Dom" value={statsForm.yellow_home} onChange={(e) => setStatsForm(p => ({ ...p, yellow_home: e.target.value }))} style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} />
                      <input type="number" min="0" placeholder="Ext" value={statsForm.yellow_away} onChange={(e) => setStatsForm(p => ({ ...p, yellow_away: e.target.value }))} style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} />
                    </div>
                  </div>

                  {/* Cartons Rouges */}
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Cartons Rouges (Dom / Ext)</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <input type="number" min="0" placeholder="Dom" value={statsForm.red_home} onChange={(e) => setStatsForm(p => ({ ...p, red_home: e.target.value }))} style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} />
                      <input type="number" min="0" placeholder="Ext" value={statsForm.red_away} onChange={(e) => setStatsForm(p => ({ ...p, red_away: e.target.value }))} style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} />
                    </div>
                  </div>

                </div>

                {/* Right col stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  
                  {/* Tirs Cadrés */}
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Tirs Cadrés (Dom / Ext)</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <input type="number" min="0" placeholder="Dom" value={statsForm.shots_on_target_home} onChange={(e) => setStatsForm(p => ({ ...p, shots_on_target_home: e.target.value }))} style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} />
                      <input type="number" min="0" placeholder="Ext" value={statsForm.shots_on_target_away} onChange={(e) => setStatsForm(p => ({ ...p, shots_on_target_away: e.target.value }))} style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} />
                    </div>
                  </div>

                  {/* Tirs */}
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Tirs Totaux (Dom / Ext)</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <input type="number" min="0" placeholder="Dom" value={statsForm.shots_home} onChange={(e) => setStatsForm(p => ({ ...p, shots_home: e.target.value }))} style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} />
                      <input type="number" min="0" placeholder="Ext" value={statsForm.shots_away} onChange={(e) => setStatsForm(p => ({ ...p, shots_away: e.target.value }))} style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} />
                    </div>
                  </div>

                  {/* Hors-Jeu */}
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Hors-Jeu Signalés (Dom / Ext)</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <input type="number" min="0" placeholder="Dom" value={statsForm.offsides_home} onChange={(e) => setStatsForm(p => ({ ...p, offsides_home: e.target.value }))} style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} />
                      <input type="number" min="0" placeholder="Ext" value={statsForm.offsides_away} onChange={(e) => setStatsForm(p => ({ ...p, offsides_away: e.target.value }))} style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} />
                    </div>
                  </div>

                </div>

              </div>

              {validationError && (
                <div style={{ color: 'var(--color-danger)', fontSize: '12.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(231, 76, 60, 0.08)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(231, 76, 60, 0.15)' }}>
                  <AlertTriangle size={15} />
                  <span>{validationError}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowStatsModal(false)}>
                  Annuler
                </button>
                <button className="btn btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)', border: 'none' }} onClick={handleSaveStats}>
                  Enregistrer Confrontation
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
