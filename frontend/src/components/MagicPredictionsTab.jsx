import React from 'react';
import { 
  Sparkles, 
  Calendar, 
  AlertCircle, 
  Plus, 
  TrendingUp, 
  Eye, 
  ShieldCheck, 
  Info,
  RefreshCw,
  MoreVertical,
  ShoppingCart,
  Zap,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Pure Poisson CDF calculations and helper functions
const poissonUnder = (lambda, line) => {
  if (lambda <= 0) return 1;
  let sum = 0;
  let term = Math.exp(-lambda);
  for (let i = 0; i < line; i++) {
    sum += term;
    term = (term * lambda) / (i + 1);
  }
  return sum;
};

const poissonOver = (lambda, line) => {
  return 1 - poissonUnder(lambda, line);
};

const factCache = [1, 1];
const factorial = (n) => {
  if (n < 0) return 0;
  if (factCache[n] !== undefined) return factCache[n];
  let res = factCache[factCache.length - 1];
  for (let i = factCache.length; i <= n; i++) {
    res *= i;
    factCache[i] = res;
  }
  return res;
};

const choose = (n, k) => {
  if (k < 0 || k > n) return 0;
  return factorial(n) / (factorial(k) * factorial(n - k));
};

const bivariatePoissonPMF = (x, y, meanHome, meanAway, cov) => {
  const l3 = Math.max(0, Math.min(cov, Math.min(meanHome, meanAway) - 0.05));
  const l1 = Math.max(0.05, meanHome - l3);
  const l2 = Math.max(0.05, meanAway - l3);

  const expPart = Math.exp(-(l1 + l2 + l3));
  const term1 = Math.pow(l1, x) / factorial(x);
  const term2 = Math.pow(l2, y) / factorial(y);

  let sum = 0;
  const minXY = Math.min(x, y);
  for (let k = 0; k <= minXY; k++) {
    const c1 = choose(x, k);
    const c2 = choose(y, k);
    const factK = factorial(k);
    const mult = Math.pow(l3 / (l1 * l2), k);
    sum += c1 * c2 * factK * mult;
  }

  return expPart * term1 * term2 * sum;
};

const bivariatePoissonUnder = (meanHome, meanAway, cov, line) => {
  const maxVal = Math.floor(line);
  let totalProb = 0;
  for (let x = 0; x <= maxVal; x++) {
    for (let y = 0; y <= maxVal - x; y++) {
      totalProb += bivariatePoissonPMF(x, y, meanHome, meanAway, cov);
    }
  }
  return totalProb;
};

const bivariatePoissonOver = (meanHome, meanAway, cov, line) => {
  return 1 - bivariatePoissonUnder(meanHome, meanAway, cov, line);
};

const getMetricPeriodRatio = (metric, period) => {
  if (period === 'full_time') return 1.0;
  if (period === 'first_half') {
    if (metric === 'yellow_cards' || metric === 'red_cards') return 0.30;
    if (metric === 'fouls') return 0.48;
    if (metric === 'offsides') return 0.50;
    if (metric === 'xg_buts_attendus') return 0.45;
    if (metric === 'corners') return 0.46;
    return 0.47;
  }
  if (period === 'second_half') {
    if (metric === 'yellow_cards' || metric === 'red_cards') return 0.70;
    if (metric === 'fouls') return 0.52;
    if (metric === 'offsides') return 0.50;
    if (metric === 'xg_buts_attendus') return 0.55;
    if (metric === 'corners') return 0.54;
    return 0.53;
  }
  return 1.0;
};

const getMetricExplanation = (key) => {
  const explanations = {
    corners: 'Corners cumulés des deux équipes tirés durant la période spécifiée uniquement. Exclut les corners accordés mais non tirés.',
    fouls: 'Nombre total de fautes commises et sifflées par l\'arbitre durant la période spécifiée.',
    yellow_cards: 'Total des cartons jaunes attribués aux joueurs actifs sur le terrain pendant la période spécifiée.',
    red_cards: 'Total des cartons rouges (directs ou par second jaune consécutif) distribués pendant la période spécifiée.',
    shots_on_target: 'Tentatives de tirs de part et d\'autre qui entrent directement dans le but ou qui auraient franchi la ligne sans intervention décisive.',
    shots: 'Somme cumulée de toutes les tentatives de tirs des deux clubs (cadrés, hors-cadre et contrés) durant la période.',
    offsides: 'Total des positions de hors-jeu signalées par le corps arbitral durant la période spécifiée.',
    possession: 'Pourcentage moyen du temps de contrôle effectif du ballon par l\'équipe à domicile.'
  };
  return explanations[key] || 'Indicateur statistique officiel de la rencontre évalué pour cette opportunité.';
};

const getMetricTitle = (key) => {
  const titles = {
    corners: 'Corners',
    fouls: 'Fautes Commises',
    yellow_cards: 'Cartons Jaunes',
    possession: 'Possession de Balle',
    shots_on_target: 'Tirs Cadrés',
    shots: 'Tirs',
    offsides: 'Hors-jeu',
    red_cards: 'Cartons Rouges',
    xg_buts_attendus: 'Expected Goals (xG)',
    passes: 'Passes Totales',
    passes_reussis: 'Passes Réussies (%)',
    tacles_reussis: 'Tacles Réussis',
    dribbles_reussis: 'Dribbles Réussis',
    duels_reussis: 'Duels Gagnés',
    duels_aeriens_reussis: 'Duels Aériens Gagnés',
    ballons_touches_dans_la_surface_adverse: 'Touches Surface Adverse',
    centres: 'Centres Tentés',
    centres_reussis: 'Centres Réussis',
    degagements: 'Dégagements',
    rentree_de_touche: 'Touches',
    occasions_manquees: 'Occasions Manquées',
    poteau: 'Tirs sur Poteau'
  };
  if (titles[key]) return titles[key];
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getAverage = (matches, metric, isHomeOnly = false, isAwayOnly = false, homeTeam, awayTeam) => {
  if (!matches || !Array.isArray(matches) || matches.length === 0) return null;
  
  let sum = 0;
  let count = 0;
  
  for (const m of matches) {
    if (metric === 'corners') {
      if (isHomeOnly) {
        const val = m.home_team === homeTeam ? m.first_half_corners_home : m.first_half_corners_away;
        if (val !== null && val !== undefined) {
          sum += val;
          count++;
        }
      } else if (isAwayOnly) {
        const val = m.away_team === awayTeam ? m.first_half_corners_away : m.first_half_corners_home;
        if (val !== null && val !== undefined) {
          sum += val;
          count++;
        }
      } else {
        if (m.first_half_corners_home !== null && m.first_half_corners_home !== undefined &&
            m.first_half_corners_away !== null && m.first_half_corners_away !== undefined) {
          sum += (m.first_half_corners_home + m.first_half_corners_away);
          count++;
        }
      }
      continue;
    }
    
    let stats = null;
    try {
      if (m.statistics_json) {
        stats = typeof m.statistics_json === 'string' ? JSON.parse(m.statistics_json) : m.statistics_json;
      }
    } catch (e) {}
    
    if (!stats || !stats[metric]) continue;
    
    if (metric === 'possession') {
      if (stats.possession.home !== undefined) {
        const val = (isHomeOnly || m.home_team === homeTeam)
          ? parseFloat(stats.possession.home)
          : parseFloat(stats.possession.away);
        sum += val;
        count++;
      }
    } else if (stats[metric].home !== undefined && stats[metric].away !== undefined) {
      if (isHomeOnly) {
        const val = m.home_team === homeTeam ? parseFloat(stats[metric].home) : parseFloat(stats[metric].away);
        sum += val;
        count++;
      } else if (isAwayOnly) {
        const val = m.away_team === awayTeam ? parseFloat(stats[metric].away) : parseFloat(stats[metric].home);
        sum += val;
        count++;
      } else {
        sum += (parseFloat(stats[metric].home) + parseFloat(stats[metric].away));
        count++;
      }
    }
  }
  
  return count > 0 ? parseFloat((sum / count).toFixed(1)) : null;
};

const getMetricParameters = (matchDetails, metric, period) => {
  if (!matchDetails) return null;
  let meanHome = 0;
  let meanAway = 0;
  let cov = 0;
  let isGBDT = false;

  if (metric === 'corners' && matchDetails.gbdt_predictions) {
    let gbdt = matchDetails.gbdt_predictions;
    if (typeof gbdt === 'string') {
      try { gbdt = JSON.parse(gbdt); } catch (e) {}
    }
    const pred = gbdt && gbdt[period];
    if (pred) {
      meanHome = parseFloat(pred.home_expected || pred.home_expected_corners || 0);
      meanAway = parseFloat(pred.away_expected || pred.away_expected_corners || 0);
      cov = parseFloat(pred.covariance || 0);
      isGBDT = true;
      return { meanHome, meanAway, cov, isGBDT };
    }
  }

  // Fallback to historical averages
  const hAvg = getAverage(matchDetails.recent_home_matches, metric, true, false, matchDetails.home_team, matchDetails.away_team);
  const aAvg = getAverage(matchDetails.recent_away_matches, metric, false, true, matchDetails.home_team, matchDetails.away_team);

  if (hAvg === null || aAvg === null) {
    return null;
  }

  if (metric === 'corners') {
    // Historical corners is 1st half. Scale it to the target period.
    if (period === 'first_half') {
      meanHome = hAvg;
      meanAway = aAvg;
    } else if (period === 'second_half') {
      meanHome = hAvg * (0.54 / 0.46);
      meanAway = aAvg * (0.54 / 0.46);
    } else { // full_time
      meanHome = hAvg / 0.46;
      meanAway = aAvg / 0.46;
    }
  } else {
    // Other metrics are full-time. Multiply by the ratio.
    const ratio = getMetricPeriodRatio(metric, period);
    meanHome = hAvg * ratio;
    meanAway = aAvg * ratio;
  }

  return { meanHome, meanAway, cov: 0, isGBDT: false };
};

const getLinesToScan = (metric, period, lambda) => {
  if (metric === 'corners') {
    return period === 'full_time' ? [7.5, 8.5, 9.5, 10.5, 11.5] : [2.5, 3.5, 4.5, 5.5];
  }
  let standardLine = Math.round(lambda);
  if (standardLine <= 0) standardLine = 1;
  standardLine = standardLine - 0.5;
  return [standardLine - 2, standardLine - 1, standardLine, standardLine + 1, standardLine + 2].filter(v => v >= 0.5);
};

const getValueBetsForMatch = (matchDetails) => {
  if (!matchDetails) return [];
  const list = [];
  const popularMarkets = ['corners', 'fouls', 'yellow_cards', 'red_cards', 'shots_on_target', 'shots', 'offsides'];
  
  const availableMetricsSet = new Set(['corners']);
  const allMatches = [
    matchDetails,
    ...(matchDetails.recent_h2h_matches || []),
    ...(matchDetails.recent_home_matches || []),
    ...(matchDetails.recent_away_matches || [])
  ];
  for (const m of allMatches) {
    if (m.statistics_json) {
      try {
        const stats = typeof m.statistics_json === 'string' ? JSON.parse(m.statistics_json) : m.statistics_json;
        if (stats && typeof stats === 'object') {
          Object.keys(stats).forEach(key => {
            if (stats[key] && (stats[key].home !== undefined || stats[key].away !== undefined)) {
              availableMetricsSet.add(key);
            }
          });
        }
      } catch (e) {}
    }
  }
  
  const metricsToScan = Array.from(availableMetricsSet).filter(m => popularMarkets.includes(m));
  const periods = ['first_half', 'second_half', 'full_time'];
  const periodLabels = {
    first_half: '1ère MT',
    second_half: '2ème MT',
    full_time: 'Match'
  };

  for (const m of metricsToScan) {
    for (const p of periods) {
      const params = getMetricParameters(matchDetails, m, p);
      if (!params) continue;
      const { meanHome, meanAway, cov } = params;
      const lambda = meanHome + meanAway;
      
      const lines = getLinesToScan(m, p, lambda);
      for (const line of lines) {
        let overProb = 0;
        let underProb = 0;
        
        if (cov === 0) {
          underProb = poissonUnder(lambda, line);
          overProb = 1 - underProb;
        } else {
          underProb = bivariatePoissonUnder(meanHome, meanAway, cov, line);
          overProb = 1 - underProb;
        }
        
        const overBookieOdds = overProb > 0 ? 0.93 / overProb : 99;
        const underBookieOdds = underProb > 0 ? 0.93 / underProb : 99;
        
        if (overBookieOdds >= 1.45 && overBookieOdds <= 1.90) {
          list.push({
            metric: m,
            metricTitle: `${getMetricTitle(m)} (${periodLabels[p]})`,
            period: p,
            periodLabel: periodLabels[p],
            line,
            tip: 'Plus de',
            probability: Math.round(overProb * 100),
            fairOdds: 1 / overProb
          });
        }
        if (underBookieOdds >= 1.45 && underBookieOdds <= 1.90) {
          list.push({
            metric: m,
            metricTitle: `${getMetricTitle(m)} (${periodLabels[p]})`,
            period: p,
            periodLabel: periodLabels[p],
            line,
            tip: 'Moins de',
            probability: Math.round(underProb * 100),
            fairOdds: 1 / underProb
          });
        }
      }
    }
  }
  
  return list.sort((a, b) => b.probability - a.probability);
};

const scanAllValueBets = (predictions) => {
  if (!predictions || !Array.isArray(predictions)) return [];
  
  const allBets = [];
  for (const match of predictions) {
    const valueBets = getValueBetsForMatch(match);
    for (const vb of valueBets) {
      allBets.push({
        ...vb,
        match_id: match.match_id,
        home_team: match.home_team,
        away_team: match.away_team,
        home_logo: match.home_logo,
        away_logo: match.away_logo,
        date: match.date,
        time: match.time,
        tournament: match.tournament,
        match_url: match.match_url
      });
    }
  }
  
  return allBets.sort((a, b) => b.probability - a.probability);
};

const formatHumanDate = (dateStr) => {
  if (!dateStr) return "Date inconnue";
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    try {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      if (!isNaN(d.getTime())) {
        const formatted = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const shortFormat = `${parts[2]}/${parts[1]}/${parts[0]}`;
        const friendly = formatted.charAt(0).toUpperCase() + formatted.slice(1);
        return `${friendly} (${shortFormat})`;
      }
    } catch (e) {}
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const parseFrenchDate = (dateStr) => {
  if (!dateStr) return new Date(0);
  
  // Standard format check: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }
  
  // French format check: "DD month YYYY"
  const months = {
    janvier: 0,
    'février': 1,
    'fevrier': 1,
    mars: 2,
    avril: 3,
    mai: 4,
    juin: 5,
    juillet: 6,
    'août': 7,
    'aout': 7,
    septembre: 8,
    octobre: 9,
    novembre: 10,
    'décembre': 11,
    'decembre': 11
  };
  
  const parts = dateStr.trim().toLowerCase().split(/\s+/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1];
    const year = parseInt(parts[2], 10);
    const month = months[monthStr];
    if (month !== undefined && !isNaN(day) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  
  // Fallback to native Date parser
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

export default function MagicPredictionsTab({ 
  predictions, 
  handleQuickPlaceBet, 
  setSelectedMatchDetails, 
  handleAddToBasket, 
  handleInstantPlaceBet,
  selectedPredIds,
  setSelectedPredIds
}) {
  const [signals, setSignals] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [filterMetric, setFilterMetric] = React.useState('all');
  const [selectedBets, setSelectedBets] = React.useState({});
  const [activeKebabId, setActiveKebabId] = React.useState(null);
  const [sortBy, setSortBy] = React.useState('date'); // 'date' or 'confidence'
  const [minCoverage, setMinCoverage] = React.useState('50');
  const [collapsedDates, setCollapsedDates] = React.useState({});
  const scannerCarouselRef = React.useRef(null);

  const toggleDateCollapse = (dateStr) => {
    setCollapsedDates(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));
  };

  const scrollScanner = (direction) => {
    if (scannerCarouselRef.current) {
      const scrollAmount = 306; // Card width (290) + gap (16)
      scannerCarouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  React.useEffect(() => {
    const handleOutsideClick = () => {
      setActiveKebabId(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  const toggleKebab = (e, sigId) => {
    e.stopPropagation();
    setActiveKebabId(prev => prev === sigId ? null : sigId);
  };

  const fetchSignals = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/predictions/magic?minCoverage=${minCoverage}`);
      const json = await res.json();
      if (json.success) {
        setSignals(json.data || []);
      } else {
        setError(json.error?.message || 'Impossible de charger les pronostics magiques.');
      }
    } catch (err) {
      setError('Erreur réseau lors de la récupération des signaux.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchSignals();
  }, [minCoverage]);

  const getMetricBadgeStyle = (metric) => {
    switch (metric) {
      case 'fouls':
        return { background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' };
      case 'yellow_cards':
        return { background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', color: '#eab308' };
      case 'possession':
        return { background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#3b82f6' };
      case 'shots_on_target':
      case 'shots':
        return { background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981' };
      default:
        return { background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#8b5cf6' };
    }
  };

  const getMetricLabel = (metric) => {
    const labels = {
      fouls: 'Fautes',
      yellow_cards: 'Cartons Jaunes',
      possession: 'Possession',
      shots_on_target: 'Tirs Cadrés',
      shots: 'Tirs',
      offsides: 'Hors-jeu',
      corners: 'Corners'
    };
    return labels[metric] || metric;
  };

  // Extract unique metrics in active signals for filtering
  const availableMetrics = ['all', ...new Set(signals.map(s => s.metric))];

  const filteredSignals = filterMetric === 'all' 
    ? signals 
    : signals.filter(s => s.metric === filterMetric);

  // Group and sort dates for collapse/expand operations
  const dateGroups = React.useMemo(() => {
    const groups = {};
    filteredSignals.forEach(sig => {
      const dateVal = sig.date || 'Date inconnue';
      if (!groups[dateVal]) groups[dateVal] = [];
      groups[dateVal].push(sig);
    });
    return groups;
  }, [filteredSignals]);

  const sortedDates = React.useMemo(() => {
    return Object.keys(dateGroups).sort((a, b) => {
      try {
        return parseFrenchDate(b).getTime() - parseFrenchDate(a).getTime();
      } catch (e) {
        return 0;
      }
    });
  }, [dateGroups]);

  const collapseAllDates = () => {
    const nextCollapsed = {};
    sortedDates.forEach(d => {
      nextCollapsed[d] = true;
    });
    setCollapsedDates(nextCollapsed);
  };

  const expandAllDates = () => {
    setCollapsedDates({});
  };

  // Helper card renderer
  const renderSignalCard = (sig) => {
    const isPossession = sig.metric === 'possession';
    const isSelected = selectedPredIds && selectedPredIds.includes(sig.match_id);

    const matchDetails = (predictions || []).find(p => p.match_id === sig.match_id);
    const valueBets = getValueBetsForMatch(matchDetails);
    
    const defaultBet = valueBets.find(b => b.metric === sig.metric) || (valueBets.length > 0 ? valueBets[0] : null);
    const currentBet = selectedBets[sig.id] || defaultBet;
    const activeBetMetric = currentBet ? currentBet.metric : sig.metric;

    const simulatedOddsStr = currentBet ? (currentBet.fairOdds * 0.93).toFixed(2) : '1.90';

    const mappedPred = currentBet ? {
      match_id: sig.match_id,
      date: sig.date,
      time: sig.time,
      tournament: sig.tournament,
      home_team: sig.home_team,
      away_team: sig.away_team,
      best_tip: currentBet.tip === 'Plus de' ? 'Over' : 'Under',
      card_line: String(currentBet.line),
      probability: `${currentBet.probability}%`,
      win_rate: `${currentBet.probability}%`,
      over_odds: simulatedOddsStr,
      under_odds: simulatedOddsStr,
      notes: `Placé depuis les Pronostics Magiques. Marché: ${currentBet.metricTitle} (${currentBet.tip} ${currentBet.line})`,
      match_url: sig.match_url || ''
    } : {
      match_id: sig.match_id,
      date: sig.date,
      time: sig.time,
      tournament: sig.tournament,
      home_team: sig.home_team,
      away_team: sig.away_team,
      best_tip: isPossession ? 'Possession' : `Plus de`,
      card_line: isPossession ? `${sig.threshold}%` : `${sig.threshold}`,
      odds_corners: [],
      probability: '75%',
      win_rate: '65%',
      over_odds: isPossession ? '1.85' : '1.90',
      under_odds: '1.80',
      notes: `Placé depuis les Pronostics Magiques. Règle: ${sig.strategy_name}`,
      match_url: sig.match_url || ''
    };

    return (
      <div 
        key={sig.id} 
        className="glass-card magic-signal-card"
        onClick={() => {
          if (typeof setSelectedMatchDetails === 'function') {
            setSelectedMatchDetails(matchDetails || mappedPred);
          }
        }}
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between', 
          gap: '20px',
          position: 'relative',
          overflow: 'visible',
          border: isSelected 
            ? '1.5px solid #bf5af2' 
            : '1px solid var(--border-color)',
          boxShadow: 'none',
          transform: isSelected ? 'translateY(-2px)' : 'translateY(0)',
          cursor: 'pointer',
          borderRadius: '16px',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = isSelected ? '#bf5af2' : 'rgba(191, 90, 242, 0.5)';
          e.currentTarget.style.transform = 'translateY(-4px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = isSelected ? '#bf5af2' : 'var(--border-color)';
          e.currentTarget.style.transform = isSelected ? 'translateY(-2px)' : 'translateY(0)';
        }}
      >
        {/* Glow Badge for Recommended Bet */}
        {valueBets.length > 0 && currentBet && currentBet.probability === valueBets[0].probability && (
          <div style={{
            position: 'absolute',
            top: '-10px',
            left: '20px',
            background: 'linear-gradient(135deg, #bf5af2 0%, #0082ff 100%)',
            color: '#fff',
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '10.5px',
            fontWeight: 800,
            boxShadow: '0 4px 12px rgba(191, 90, 242, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            zIndex: 2,
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <span>Pari Recommandé</span>
          </div>
        )}

        <div style={{ zIndex: 1 }}>
          {/* Top line with Tournament & Metric Badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
              <input 
                type="checkbox" 
                checked={isSelected}
                onChange={() => {
                  if (isSelected) {
                    setSelectedPredIds(prev => prev.filter(id => id !== sig.match_id));
                  } else {
                    setSelectedPredIds(prev => [...prev, sig.match_id]);
                  }
                }}
                style={{ 
                  width: '16px', 
                  height: '16px', 
                  cursor: 'pointer',
                  accentColor: '#bf5af2'
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {sig.tournament}
              </span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="badge" style={getMetricBadgeStyle(activeBetMetric)}>
                  {getMetricLabel(activeBetMetric)}
                </span>
                <div className="tooltip-container" onClick={(e) => e.stopPropagation()}>
                  <Info 
                    size={13} 
                    style={{ color: '#bf5af2', opacity: 0.8, cursor: 'help' }} 
                  />
                  <div className="tooltip-content" style={{
                    position: 'absolute',
                    bottom: '100%',
                    right: '0',
                    marginBottom: '8px',
                    background: 'rgba(20, 20, 22, 0.97)',
                    border: '1px solid rgba(191, 90, 242, 0.35)',
                    color: 'var(--text-primary)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontFamily: 'Outfit',
                    fontWeight: 500,
                    whiteSpace: 'normal',
                    width: '260px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                    zIndex: 100,
                    pointerEvents: 'none',
                    opacity: 0,
                    transform: 'translateY(6px)',
                    transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                    textAlign: 'left',
                    lineHeight: '1.45'
                  }}>
                    <div style={{ fontWeight: 700, color: '#bf5af2', marginBottom: '4px', fontSize: '12px' }}>
                      {getMetricLabel(activeBetMetric)}
                    </div>
                    {getMetricExplanation(activeBetMetric)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Teams info */}
          <h4 style={{ fontSize: '16px', fontFamily: 'Outfit', lineHeight: 1.3, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {sig.home_logo ? (
              <img src={sig.home_logo} alt="" referrerPolicy="no-referrer" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'contain' }} />
            ) : (
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--bg-tertiary)' }} />
            )}
            <span>{sig.home_team}</span>
          </h4>
          <h4 style={{ fontSize: '16px', fontFamily: 'Outfit', lineHeight: 1.3, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {sig.away_logo ? (
              <img src={sig.away_logo} alt="" referrerPolicy="no-referrer" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'contain' }} />
            ) : (
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--bg-tertiary)' }} />
            )}
            <span>{sig.away_team}</span>
          </h4>

          {/* Date & Time metadata */}
          <div style={{ display: 'flex', gap: '12px', fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '16px', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={12} style={{ opacity: 0.6 }} />
              {sig.date}
            </span>
            <span>•</span>
            <span>{sig.time}</span>
          </div>
        </div>

        {/* Bottom section with statistics detail & Action button */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 1 }}>
          
          {/* Dynamic sweet-spot Value Bets Dropdown Selector */}
          {valueBets.length > 0 && (() => {
            const activeBet = currentBet || valueBets[0];
            const activeBetMetric = activeBet.metric;
            const activePeriod = activeBet.period || 'full_time';
            
            const params = getMetricParameters(matchDetails, activeBetMetric, activePeriod);
            const meanHome = params ? params.meanHome : 0;
            const meanAway = params ? params.meanAway : 0;
            const lambda = params ? (meanHome + meanAway) : null;
            
            const h2hAvg = matchDetails 
              ? getAverage(matchDetails.recent_h2h_matches, activeBetMetric, false, false, matchDetails.home_team, matchDetails.away_team) 
              : null;

            return (
              <div style={{ 
                background: 'rgba(191, 90, 242, 0.05)',
                border: '1px solid rgba(191, 90, 242, 0.22)',
                padding: '10px 12px',
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                boxShadow: 'inset 0 1px 4px rgba(191, 90, 242, 0.01)'
              }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: '#bf5af2', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>VALUE BETS CALIBRÉS</span>
                  </span>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {valueBets.length} opportunité{valueBets.length > 1 ? 's' : ''}
                  </span>
                </div>
                
                {valueBets.length > 1 ? (
                  <select
                    value={JSON.stringify(activeBet)}
                    onChange={(e) => {
                      const chosen = JSON.parse(e.target.value);
                      setSelectedBets(prev => ({ ...prev, [sig.id]: chosen }));
                    }}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: 'var(--text-primary)',
                      borderRadius: '6px',
                      padding: '5px 8px',
                      fontSize: '11.5px',
                      fontFamily: 'Outfit',
                      fontWeight: 600,
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    {valueBets.map((bet, idx) => (
                      <option key={idx} value={JSON.stringify(bet)} style={{ background: '#1c1c1e', color: '#fff' }}>
                        {bet.tip} {bet.line} {bet.metricTitle} @ {(bet.fairOdds * 0.93).toFixed(2)} ({bet.probability}%)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ 
                    fontSize: '12px', 
                    fontWeight: 700, 
                    color: 'var(--text-primary)', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '2px 0'
                  }}>
                    <span>{activeBet.tip} {activeBet.line} {activeBet.metricTitle}</span>
                    <span style={{ color: 'var(--color-success)', fontSize: '11px', background: 'rgba(16, 185, 129, 0.08)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.12)' }}>
                      @{(activeBet.fairOdds * 0.93).toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Premium Poisson Statistical Explanation Box */}
                {activeBetMetric === 'corners' && matchDetails && matchDetails.gbdt_predictions ? (
                  <div style={{
                    background: 'rgba(191, 90, 242, 0.04)',
                    border: '1px solid rgba(191, 90, 242, 0.15)',
                    borderRadius: '10px',
                    padding: '12px',
                    marginTop: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#bf5af2', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Sparkles size={11} /> Prédictions GBDT (Poisson Bivarié)
                      </span>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        3 périodes modélisées
                      </span>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: '8px',
                    }}>
                      {/* 1ère Mi-Temps */}
                      <div style={{
                        background: 'rgba(0, 0, 0, 0.25)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        borderRadius: '8px',
                        padding: '8px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>1ère MT</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#bf5af2' }}>
                          {(() => {
                            let gbdt = matchDetails.gbdt_predictions;
                            if (typeof gbdt === 'string') {
                              try { gbdt = JSON.parse(gbdt); } catch(e) {}
                            }
                            return gbdt?.first_half?.expected || 'N/A';
                          })()}
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginLeft: '2px', fontWeight: 500 }}>corn.</span>
                        </div>
                      </div>

                      {/* 2ème Mi-Temps */}
                      <div style={{
                        background: 'rgba(0, 0, 0, 0.25)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        borderRadius: '8px',
                        padding: '8px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>2ème MT</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#bf5af2' }}>
                          {(() => {
                            let gbdt = matchDetails.gbdt_predictions;
                            if (typeof gbdt === 'string') {
                              try { gbdt = JSON.parse(gbdt); } catch(e) {}
                            }
                            return gbdt?.second_half?.expected || 'N/A';
                          })()}
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginLeft: '2px', fontWeight: 500 }}>corn.</span>
                        </div>
                      </div>

                      {/* Match Entier */}
                      <div style={{
                        background: 'rgba(0, 0, 0, 0.25)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        borderRadius: '8px',
                        padding: '8px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>Match</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#bf5af2' }}>
                          {(() => {
                            let gbdt = matchDetails.gbdt_predictions;
                            if (typeof gbdt === 'string') {
                              try { gbdt = JSON.parse(gbdt); } catch(e) {}
                            }
                            return gbdt?.full_time?.expected || 'N/A';
                          })()}
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginLeft: '2px', fontWeight: 500 }}>corn.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  lambda !== null && (
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      background: 'rgba(0, 0, 0, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      marginTop: '4px',
                      lineHeight: '1.45'
                    }}>
                      Loi de Poisson estime <strong style={{ color: 'var(--color-success)' }}>{activeBet.probability}%</strong> de probabilité de voir {activeBet.tip.toLowerCase()} {activeBet.line} {getMetricLabel(activeBetMetric).toLowerCase()} ({activeBet.periodLabel}). 
                      Moyenne cumulée : <strong style={{ color: '#bf5af2' }}>{lambda.toFixed(1)}</strong> ({meanHome.toFixed(1)} Dom, {meanAway.toFixed(1)} Ext). 
                      {h2hAvg !== null && ` Confrontations H2H: ${h2hAvg.toFixed(1)} en moyenne.`}
                    </div>
                  )
                )}
              </div>
            );
          })()}

          {/* Detailed average metrics */}
          {(() => {
            const activeBetMetric = currentBet ? currentBet.metric : sig.metric;
            const activeH2hAvg = matchDetails 
              ? getAverage(matchDetails.recent_h2h_matches, activeBetMetric, false, false, matchDetails.home_team, matchDetails.away_team) 
              : null;
            const displayAvg = (activeBetMetric === sig.metric && sig.avg_value !== undefined)
              ? sig.avg_value
              : (activeH2hAvg !== null ? activeH2hAvg : 'N/A');
            const activeIsPossession = activeBetMetric === 'possession';

            return (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                background: 'var(--bg-tertiary)', 
                padding: '10px 14px', 
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                fontSize: '12.5px',
                alignItems: 'center'
              }}>
                <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <TrendingUp size={13} style={{ color: 'var(--color-success)' }} />
                  Moyenne H2H ({getMetricLabel(activeBetMetric)}) :
                </span>
                <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                  {displayAvg}{activeIsPossession ? '%' : ''}
                </strong>
              </div>
            );
          })()}

          <div style={{ display: 'flex', gap: '10px' }}>
            {/* View Details on click */}
            <button 
              className="btn btn-secondary"
              style={{ padding: '0 12px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Inspecter le match"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof setSelectedMatchDetails === 'function') {
                  setSelectedMatchDetails(matchDetails || mappedPred);
                }
              }}
            >
              <Eye size={16} />
            </button>

            {/* Quick Place Bet button */}
            <button 
              className="btn btn-primary" 
              style={{ 
                flexGrow: 1, 
                height: '36px',
                background: 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleQuickPlaceBet(mappedPred);
              }}
            >
              <Plus size={16} />
              <span style={{ fontSize: '12.5px', fontWeight: 600 }}>Placer ce Pari</span>
            </button>

            {/* Kebab action dropdown */}
            <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
              <button 
                className="btn btn-secondary"
                style={{ 
                  padding: '0 8px', 
                  height: '36px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  borderColor: activeKebabId === sig.id ? '#bf5af2' : undefined,
                  background: activeKebabId === sig.id ? 'rgba(191, 90, 242, 0.15)' : undefined
                }}
                title="Plus d'actions"
                onClick={(e) => toggleKebab(e, sig.id)}
              >
                <MoreVertical size={16} />
              </button>

              {activeKebabId === sig.id && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  right: 0,
                  marginBottom: '8px',
                  background: 'rgba(20, 20, 22, 0.97)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(191, 90, 242, 0.35)',
                  borderRadius: '10px',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  width: '180px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                  zIndex: 1000,
                  animation: 'fadeIn 0.15s ease-out'
                }}>
                  <button
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      textAlign: 'left',
                      fontSize: '12.5px',
                      fontFamily: 'Outfit',
                      fontWeight: 600,
                      cursor: 'pointer',
                      borderRadius: '6px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.color = '#bf5af2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onClick={() => {
                      handleAddToBasket(mappedPred);
                      setActiveKebabId(null);
                    }}
                  >
                    <ShoppingCart size={14} />
                    Ajouter au Panier
                  </button>
                  <button
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      textAlign: 'left',
                      fontSize: '12.5px',
                      fontFamily: 'Outfit',
                      fontWeight: 600,
                      cursor: 'pointer',
                      borderRadius: '6px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.color = '#bf5af2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onClick={() => {
                      handleInstantPlaceBet(mappedPred);
                      setActiveKebabId(null);
                    }}
                  >
                    <Zap size={14} style={{ color: '#ffb300' }} />
                    Placement Direct
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <style>{`
        .date-section-header:hover {
          color: #bf5af2 !important;
        }
        .date-section-header:hover span {
          color: #fff !important;
        }
      `}</style>
      
      {/* Header and explanation */}
      <div className="glass-card accent-left" style={{
        background: 'linear-gradient(135deg, rgba(127, 0, 255, 0.08) 0%, rgba(0, 98, 255, 0.02) 100%)',
        borderLeft: '4px solid #7f00ff',
        boxShadow: '0 8px 32px rgba(127, 0, 255, 0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '22px', fontFamily: 'Outfit', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={22} style={{ color: '#bf5af2' }} />
              Pronostics Magiques
            </h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '900px' }}>
              Découvrez les opportunités de paris sportifs basées sur vos **stratégies sur-mesure**. 
              Pour tous les types de statistiques (corners, fautes, cartons, tirs), notre algorithme estime précisément les probabilités sur 3 périodes : **1ère Mi-Temps, 2ème Mi-Temps et Match Complet** grâce à la **distribution de Poisson Bivariée**.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', alignSelf: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>COUVERTURE MIN :</span>
              <select
                value={minCoverage}
                onChange={(e) => setMinCoverage(e.target.value)}
                style={{
                  padding: '6px 10px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer',
                  height: '38px'
                }}
              >
                <option value="0">0% (Aucun filtre)</option>
                <option value="10">10%</option>
                <option value="30">30%</option>
                <option value="50">50%</option>
                <option value="70">70%</option>
                <option value="90">90%</option>
              </select>
            </div>

            <button 
              className="btn btn-secondary" 
              onClick={fetchSignals} 
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '38px' }}
            >
              <RefreshCw size={16} className={loading ? 'spin-animation' : ''} />
              <span>Actualiser</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Value Bet Leaderboard Carousel */}
      {predictions && predictions.length > 0 && (() => {
        const allValueBets = scanAllValueBets(predictions);
        const topBets = allValueBets.slice(0, 12);

        if (topBets.length === 0) return null;

        return (
          <div className="glass-card" style={{
            padding: '24px',
            background: 'linear-gradient(135deg, rgba(20, 20, 22, 0.7) 0%, rgba(28, 28, 30, 0.7) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h4 style={{ fontSize: '16px', fontFamily: 'Outfit', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} style={{ color: '#bf5af2' }} />
                  Scanner de Cibles Prioritaires (Côtes 1.45 - 1.90)
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  Les opportunités les plus rentables classées par taux de réussite (probabilité décroissante).
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(191, 90, 242, 0.1)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(191, 90, 242, 0.2)', fontWeight: 700 }}>
                  {allValueBets.length} opportunités scannées
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    onClick={() => scrollScanner('left')}
                    className="btn btn-secondary"
                    style={{ 
                      padding: 0, 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      cursor: 'pointer'
                    }}
                    title="Précédent"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    onClick={() => scrollScanner('right')}
                    className="btn btn-secondary"
                    style={{ 
                      padding: 0, 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      cursor: 'pointer'
                    }}
                    title="Suivant"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div 
              ref={scannerCarouselRef}
              className="no-scrollbar"
              style={{
                display: 'flex',
                gap: '16px',
                overflowX: 'auto',
                paddingBottom: '8px',
                scrollBehavior: 'smooth'
              }}
            >
              {topBets.map((bet, idx) => {
                const isOver = bet.tip === 'Plus de';
                const calculatedBookieOdds = (bet.fairOdds * 0.93).toFixed(2);
                
                // Prepare mapped pred for basket/placement
                const mappedPred = {
                  match_id: bet.match_id,
                  date: bet.date,
                  time: bet.time,
                  tournament: bet.tournament,
                  home_team: bet.home_team,
                  away_team: bet.away_team,
                  best_tip: bet.tip === 'Plus de' ? 'Over' : 'Under',
                  card_line: String(bet.line),
                  probability: `${bet.probability}%`,
                  win_rate: `${bet.probability}%`,
                  over_odds: calculatedBookieOdds,
                  under_odds: calculatedBookieOdds,
                  notes: `Target Prioritaire #${idx+1} (${bet.metricTitle} - ${bet.tip} ${bet.line})`,
                  match_url: bet.match_url || ''
                };

                return (
                  <div key={idx} className="leaderboard-card" style={{
                    flex: '0 0 290px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(191, 90, 242, 0.4)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}>
                    
                    {/* Badge Rank */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      background: 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 900,
                      padding: '2px 8px 4px 8px',
                      borderBottomLeftRadius: '8px'
                    }}>
                      #{idx + 1}
                    </div>

                    {/* Match Header info */}
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px', letterSpacing: '0.05em' }}>
                        {bet.tournament}
                      </div>
                      
                      {/* Team logos & names */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {bet.home_logo ? (
                            <img src={bet.home_logo} alt="" referrerPolicy="no-referrer" style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'contain' }} />
                          ) : (
                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                          )}
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                            {bet.home_team}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {bet.away_logo ? (
                            <img src={bet.away_logo} alt="" referrerPolicy="no-referrer" style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'contain' }} />
                          ) : (
                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                          )}
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                            {bet.away_team}
                          </span>
                        </div>
                      </div>

                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                        {bet.date} à {bet.time}
                      </div>
                    </div>

                    {/* Prediction details & Prob ring */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.15)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.02)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: 800, 
                          color: isOver ? 'var(--color-success)' : '#bf5af2',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}>
                          {bet.tip} {bet.line}
                        </span>
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {getMetricLabel(bet.metric)} ({bet.periodLabel})
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                          Cote : <span style={{ color: 'var(--color-success)' }}>@{calculatedBookieOdds}</span>
                        </span>
                      </div>

                      {/* Circular indicator ring */}
                      <div style={{
                        position: 'relative',
                        width: '46px',
                        height: '46px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        background: `conic-gradient(#bf5af2 0% ${bet.probability}%, rgba(255, 255, 255, 0.05) ${bet.probability}% 100%)`,
                        padding: '2.5px',
                        boxShadow: '0 0 10px rgba(191, 90, 242, 0.15)'
                      }}>
                        <div style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          background: '#1c1c1e',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10.5px',
                          fontWeight: 800,
                          color: '#fff'
                        }}>
                          {bet.probability}%
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-secondary"
                        style={{
                          flex: 1,
                          fontSize: '11px',
                          fontWeight: 700,
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          padding: 0
                        }}
                        onClick={() => handleAddToBasket(mappedPred)}
                      >
                        <ShoppingCart size={13} />
                        <span>Panier</span>
                      </button>
                      <button
                        className="btn btn-primary"
                        style={{
                          flex: 1,
                          fontSize: '11px',
                          fontWeight: 700,
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          background: 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer'
                        }}
                        onClick={() => handleQuickPlaceBet(mappedPred)}
                      >
                        <Plus size={13} />
                        <span>Placer</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Filter and stats row */}
      {signals.length > 0 && (
        <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {availableMetrics.map((met) => (
              <button
                key={met}
                className={`btn ${filterMetric === met ? 'btn-primary' : 'btn-secondary'}`}
                style={{ 
                  padding: '6px 14px', 
                  fontSize: '12.5px', 
                  borderRadius: '20px',
                  background: filterMetric === met ? 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)' : undefined,
                  border: filterMetric === met ? 'none' : undefined,
                }}
                onClick={() => setFilterMetric(met)}
              >
                {met === 'all' ? 'Tous les signaux' : getMetricLabel(met)}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            {/* Global Sort Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>Trier par :</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-primary)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12.5px',
                  fontFamily: 'Outfit',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="date" style={{ background: '#1c1c1e', color: '#fff' }}>Date & Heure</option>
                <option value="confidence" style={{ background: '#1c1c1e', color: '#fff' }}>Confiance (Probabilité %)</option>
              </select>
            </div>

            {sortBy === 'date' && sortedDates.length > 0 && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className="btn btn-secondary"
                  style={{ 
                    padding: '4px 10px', 
                    fontSize: '11px', 
                    height: '28px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onClick={collapseAllDates}
                  title="Replier toutes les sections de date"
                >
                  Tout replier
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ 
                    padding: '4px 10px', 
                    fontSize: '11px', 
                    height: '28px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onClick={expandAllDates}
                  title="Déplier toutes les sections de date"
                >
                  Tout déplier
                </button>
              </div>
            )}

            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Signaux détectés : <strong style={{ color: '#bf5af2' }}>{filteredSignals.length}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Main content grid */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', gap: '15px' }}>
          <div className="loading-spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(127, 0, 255, 0.1)', borderTopColor: '#bf5af2', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Screening en cours des cibles statistiques...</span>
        </div>
      ) : error ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px', borderColor: 'rgba(244, 63, 94, 0.2)' }}>
          <AlertCircle size={36} style={{ marginBottom: '12px', color: 'var(--color-danger)' }} />
          <p style={{ fontWeight: 600 }}>{error}</p>
          <button className="btn btn-primary" onClick={fetchSignals} style={{ marginTop: '16px' }}>Réessayer</button>
        </div>
      ) : filteredSignals.length > 0 ? (
        (() => {
          if (sortBy === 'date') {
            return sortedDates.map((dateStr, dIdx) => {
              const signalsInDate = dateGroups[dateStr];
              const isCollapsed = !!collapsedDates[dateStr];

              return (
                <div key={dIdx} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                  {/* Date Section Header */}
                  <div 
                    onClick={() => toggleDateCollapse(dateStr)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      padding: '8px 0', 
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      fontFamily: 'Outfit',
                      fontSize: '15px',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'color 0.2s ease-in-out'
                    }}
                    className="date-section-header"
                  >
                    {isCollapsed ? (
                      <ChevronRight size={16} style={{ color: '#bf5af2', marginRight: '2px' }} />
                    ) : (
                      <ChevronDown size={16} style={{ color: '#bf5af2', marginRight: '2px' }} />
                    )}
                    <Calendar size={16} style={{ color: '#bf5af2' }} />
                    <span>{formatHumanDate(dateStr)}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, background: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: '10px', marginLeft: '6px' }}>
                      {signalsInDate.length} signal{signalsInDate.length > 1 ? 'aux' : ''}
                    </span>
                  </div>

                  {!isCollapsed && (
                    <div className="grid-3" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                      {signalsInDate.map((sig) => renderSignalCard(sig))}
                    </div>
                  )}
                </div>
              );
            });
          } else {
            // Sort by confidence
            const sortedSignals = [...filteredSignals].sort((a, b) => {
              const matchA = (predictions || []).find(p => p.match_id === a.match_id);
              const matchB = (predictions || []).find(p => p.match_id === b.match_id);
              const betsA = getValueBetsForMatch(matchA);
              const betsAProb = betsA.length > 0 ? betsA[0].probability : 0;
              const betsB = getValueBetsForMatch(matchB);
              const betsBProb = betsB.length > 0 ? betsB[0].probability : 0;
              return betsBProb - betsAProb;
            });

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '8px 0', 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  fontFamily: 'Outfit',
                  fontSize: '15px',
                  fontWeight: 800,
                  color: 'var(--text-primary)'
                }}>
                  <Sparkles size={16} style={{ color: '#bf5af2' }} />
                  <span>Tous les signaux triés par Confiance (Probabilité décroissante)</span>
                </div>
                <div className="grid-3" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                  {sortedSignals.map((sig) => renderSignalCard(sig))}
                </div>
              </div>
            );
          }
        })()
      ) : (
        <div className="glass-card" style={{ textAlign: 'center', padding: '70px 20px', color: 'var(--text-muted)' }}>
          <Sparkles size={40} style={{ marginBottom: '12px', color: 'var(--text-muted)', opacity: 0.5 }} />
          <p style={{ fontWeight: 600, fontSize: '16px' }}>Aucun signal magique détecté pour le moment.</p>
          <p style={{ fontSize: '13px', marginTop: '6px', maxWidth: '500px', margin: '6px auto 0 auto', lineHeight: 1.5 }}>
            Créez ou activez des stratégies magiques en langage naturel dans l'onglet **Stratégies**, 
            puis lancez le scraper dans **Match en Direct** pour découvrir des matchs et évaluer leurs H2H !
          </p>
        </div>
      )}

      {/* Styled inline spin animation for Refresh icon and custom tooltip popover */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 1.2s linear infinite;
        }
        .tooltip-container {
          position: relative;
          display: inline-flex;
          align-items: center;
        }
        .tooltip-container:hover .tooltip-content {
          opacity: 1 !important;
          pointer-events: auto !important;
          transform: translateY(0) !important;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

    </div>
  );
}
