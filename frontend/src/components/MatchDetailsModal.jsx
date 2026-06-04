import React from 'react';
import { X, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';

export default function MatchDetailsModal({
  selectedMatchDetails,
  setSelectedMatchDetails,
  crawlLoading,
  handleCrawlHistory,
  handleQuickPlaceBet
}) {
  // Lock/Unlock body scroll when modal is shown to avoid background scroll chaining
  React.useEffect(() => {
    if (selectedMatchDetails) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [selectedMatchDetails]);

  const [activeMetric, setActiveMetric] = React.useState('dashboard');
  const [expandedRowKey, setExpandedRowKey] = React.useState(null);
  const [showValueBetsPanel, setShowValueBetsPanel] = React.useState(false);
  const tabsRef = React.useRef(null);

  // Odds Simulator & Value Calculator States
  const [simPeriod, setSimPeriod] = React.useState('first_half');
  const [payoutRatio, setPayoutRatio] = React.useState(0.93);
  const [userOdds, setUserOdds] = React.useState({});
  const [customLineInput, setCustomLineInput] = React.useState('');
  const [customLines, setCustomLines] = React.useState([]);
  const [hoveredRowKey, setHoveredRowKey] = React.useState(null);

  const handlePlaceBetFromSimulator = (line, option, prob, fairOdds, bookieOdds, customOddsInputVal) => {
    if (!handleQuickPlaceBet) return;
    
    const isOver = option === 'Over';
    const oddsVal = parseFloat(customOddsInputVal);
    const selectedOdds = !isNaN(oddsVal) && oddsVal > 0 ? oddsVal : parseFloat(bookieOdds);

    const pred = {
      match_id: selectedMatchDetails.match_id,
      date: selectedMatchDetails.date,
      time: selectedMatchDetails.time,
      tournament: selectedMatchDetails.tournament,
      home_team: selectedMatchDetails.home_team,
      away_team: selectedMatchDetails.away_team,
      best_tip: option,
      card_line: line,
      probability: `${Math.round(prob * 100)}%`,
      win_rate: 'N/A',
      over_odds: isOver ? selectedOdds : 1.85,
      under_odds: !isOver ? selectedOdds : 1.85,
      match_url: selectedMatchDetails.match_url || '',
      notes: `Simulation Poisson - ${getMetricTitle(activeMetric)} [${simPeriod === 'first_half' ? '1ère MT' : simPeriod === 'second_half' ? '2ème MT' : 'Match Entier'}]. Option: ${option === 'Over' ? 'Plus de' : 'Moins de'} ${line} (Probabilité: ${Math.round(prob * 100)}%, Cote Estimée: ${bookieOdds.toFixed(2)}, Cote Juste: ${fairOdds.toFixed(2)})`
    };

    handleQuickPlaceBet(pred);
    setSelectedMatchDetails(null); // Fermer la modal de détails
  };

  function getMetricTitle(key) {
    const titles = {
      corners: 'Corners 1MT',
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
      poteau: 'Tirs sur Poteau',
      total_rebounds: 'Rebonds',
      assists: 'Passes Décisives',
      blocks: 'Contres',
      steals: 'Interceptions',
      field_goals: 'Paniers Réussis',
      free_throws: 'Lancers Francs',
      aces: 'Aces',
      double_faults: 'Doubles Fautes',
      first_serve: '1er Service (%)',
      break_points: 'Balles de Break',
      tries: 'Essais',
      penalties: 'Pénalités',
      conversions: 'Transformations',
      goals: 'Buts',
      saves: 'Arrêts'
    };
    if (titles[key]) return titles[key];
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function getAverage(matches, metric, isHomeOnly = false, isAwayOnly = false) {
    if (!matches || !Array.isArray(matches) || matches.length === 0) return null;
    
    let sum = 0;
    let count = 0;
    
    for (const m of matches) {
      if (metric === 'corners') {
        if (isHomeOnly) {
          const val = m.home_team === selectedMatchDetails.home_team ? m.first_half_corners_home : m.first_half_corners_away;
          if (val !== null && val !== undefined) {
            sum += val;
            count++;
          }
        } else if (isAwayOnly) {
          const val = m.away_team === selectedMatchDetails.away_team ? m.first_half_corners_away : m.first_half_corners_home;
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
          const val = (isHomeOnly || m.home_team === selectedMatchDetails.home_team)
            ? parseFloat(stats.possession.home)
            : parseFloat(stats.possession.away);
          sum += val;
          count++;
        }
      } else if (stats[metric].home !== undefined && stats[metric].away !== undefined) {
        if (isHomeOnly) {
          const val = m.home_team === selectedMatchDetails.home_team ? parseFloat(stats[metric].home) : parseFloat(stats[metric].away);
          sum += val;
          count++;
        } else if (isAwayOnly) {
          const val = m.away_team === selectedMatchDetails.away_team ? parseFloat(stats[metric].away) : parseFloat(stats[metric].home);
          sum += val;
          count++;
        } else {
          sum += (parseFloat(stats[metric].home) + parseFloat(stats[metric].away));
          count++;
        }
      }
    }
    
    return count > 0 ? parseFloat((sum / count).toFixed(1)) : null;
  }

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

  const getStandardLine = (metric, lambda) => {
    const lines = {
      corners: 4.5,
      fouls: 22.5,
      yellow_cards: 3.5,
      red_cards: 0.5,
      shots_on_target: 8.5,
      shots: 22.5,
      offsides: 3.5,
      xg_buts_attendus: 2.5,
      passes: 700,
      tacles_reussis: 30.5,
      dribbles_reussis: 15.5,
      duels_reussis: 90.5,
      duels_aeriens_reussis: 30.5,
      ballons_touches_dans_la_surface_adverse: 35.5,
      centres: 25.5,
      centres_reussis: 8.5,
      degagements: 30.5,
      rentree_de_touche: 35.5,
      occasions_manquees: 2.5,
      poteau: 0.5
    };
    if (lines[metric] !== undefined) return lines[metric];
    return Math.round(lambda) - 0.5;
  };

  const scrollTabs = (direction) => {
    if (tabsRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      tabsRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const toggleExpandRow = (section, idx) => {
    const key = `${section}-${idx}`;
    setExpandedRowKey(expandedRowKey === key ? null : key);
  };

  const getOutcomeIndicator = (match, targetTeam) => {
    if (!match.score || !match.score.includes('-')) return null;
    const parts = match.score.split('-');
    const scoreHome = parseInt(parts[0].trim(), 10);
    const scoreAway = parseInt(parts[1].trim(), 10);
    
    if (isNaN(scoreHome) || isNaN(scoreAway)) return null;
    
    const isHome = match.home_team === targetTeam;
    if (scoreHome === scoreAway) {
      return { label: 'N', color: '#ffb020', bg: 'rgba(255, 176, 32, 0.08)', border: '1px solid rgba(255, 176, 32, 0.2)' };
    }
    const isWin = isHome ? (scoreHome > scoreAway) : (scoreAway > scoreHome);
    if (isWin) {
      return { label: 'V', color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' };
    } else {
      return { label: 'D', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' };
    }
  };

  const renderExpandedStats = (m) => {
    let stats = null;
    try {
      if (m.statistics_json) {
        stats = typeof m.statistics_json === 'string' ? JSON.parse(m.statistics_json) : m.statistics_json;
      }
    } catch (e) {}
    
    const hasCorners = m.first_half_corners_home !== null && m.first_half_corners_away !== null;
    
    if ((!stats || Object.keys(stats).length === 0) && !hasCorners) {
      return (
        <div style={{ padding: '12px', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', width: '100%' }}>
          Aucune statistique détaillée disponible pour cette confrontation.
        </div>
      );
    }
    
    const formatKeyLabel = (key) => {
      const labels = {
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
        poteau: 'Tirs sur Poteau',
        total_rebounds: 'Rebonds',
        assists: 'Passes Décisives',
        blocks: 'Contres',
        steals: 'Interceptions',
        field_goals: 'Paniers Réussis',
        free_throws: 'Lancers Francs',
        aces: 'Aces',
        double_faults: 'Doubles Fautes',
        first_serve: '1er Service (%)',
        break_points: 'Balles de Break',
        tries: 'Essais',
        penalties: 'Pénalités',
        conversions: 'Transformations',
        goals: 'Buts',
        saves: 'Arrêts'
      };
      if (labels[key]) return labels[key];
      return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };
    
    const renderStatGauge = (label, hVal, aVal, key) => {
      const hNum = parseFloat(String(hVal).replace('%', ''));
      const aNum = parseFloat(String(aVal).replace('%', ''));
      
      let pctH = 50;
      let pctA = 50;
      if (!isNaN(hNum) && !isNaN(aNum) && (hNum + aNum) > 0) {
        pctH = (hNum / (hNum + aNum)) * 100;
        pctA = 100 - pctH;
      }
      
      const isPoss = key === 'possession';
      const isPassesReussis = key === 'passes_reussis';
      const formattedH = hVal !== undefined ? (isPoss || isPassesReussis ? `${hVal}%` : hVal) : '-';
      const formattedA = aVal !== undefined ? (isPoss || isPassesReussis ? `${aVal}%` : aVal) : '-';
      
      return (
        <div key={key} style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          background: 'rgba(255, 255, 255, 0.015)', 
          padding: '8px 12px', 
          borderRadius: '6px', 
          border: '1px solid rgba(255, 255, 255, 0.03)',
          gap: '5px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-success)' }}>{formattedH}</span>
            <span style={{ fontSize: '9px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center', width: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>
              {label}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-danger)' }}>{formattedA}</span>
          </div>
          
          <div style={{ height: '3px', width: '100%', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '1.5px', overflow: 'hidden', display: 'flex' }}>
            <div style={{ 
              width: `${pctH}%`, 
              background: 'linear-gradient(90deg, var(--color-success) 0%, #10b981 100%)', 
              height: '100%',
              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }} />
            <div style={{ 
              width: `${pctA}%`, 
              background: 'linear-gradient(90deg, #f97316 0%, var(--color-danger) 100%)', 
              height: '100%',
              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }} />
          </div>
        </div>
      );
    };
    
    return (
      <div style={{
        background: 'rgba(0, 0, 0, 0.35)',
        border: '1px solid rgba(255, 255, 255, 0.04)',
        borderRadius: '8px',
        padding: '12px 14px',
        marginTop: '8px',
        width: '100%',
        boxSizing: 'border-box',
        boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.2)'
      }} onClick={(e) => e.stopPropagation()}>
        <h5 style={{ margin: '0 0 10px 0', fontSize: '10px', fontWeight: 800, color: 'var(--color-accent-solid)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span>STATISTIQUES COMPARATIVES DE LA CONFRONTATION</span>
        </h5>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', 
          gap: '8px' 
        }}>
          {hasCorners && renderStatGauge('Corners 1MT', m.first_half_corners_home, m.first_half_corners_away, 'corners')}
          {stats && Object.keys(stats).filter(k => k !== 'corners').map(key => {
            const s = stats[key];
            if (s.home === undefined && s.away === undefined) return null;
            return renderStatGauge(formatKeyLabel(key), s.home, s.away, key);
          })}
        </div>
      </div>
    );
  };

  const availableMetrics = React.useMemo(() => {
    const metrics = new Set(['dashboard', 'corners']);
    if (!selectedMatchDetails) return Array.from(metrics);
    
    // Scan both the primary upcoming match itself and all historical matches
    const allMatches = [
      selectedMatchDetails,
      ...(selectedMatchDetails.recent_h2h_matches || []),
      ...(selectedMatchDetails.recent_home_matches || []),
      ...(selectedMatchDetails.recent_away_matches || [])
    ];
    
    for (const m of allMatches) {
      if (m.statistics_json) {
        try {
          const stats = typeof m.statistics_json === 'string' ? JSON.parse(m.statistics_json) : m.statistics_json;
          if (stats && typeof stats === 'object') {
            Object.keys(stats).forEach(key => {
              // Ensure that this key matches the structure { home: number, away: number }
              if (stats[key] && (stats[key].home !== undefined || stats[key].away !== undefined)) {
                metrics.add(key);
              }
            });
          }
        } catch (e) {}
      }
    }
    
    // Curated, professional sorting order for football analytics
    const orderedKeys = [
      'dashboard',
      'corners',
      'possession',
      'xg_buts_attendus',
      'shots_on_target',
      'shots',
      'fouls',
      'yellow_cards',
      'red_cards',
      'passes',
      'passes_reussis',
      'tacles_reussis',
      'dribbles_reussis',
      'duels_reussis',
      'duels_aeriens_reussis',
      'ballons_touches_dans_la_surface_adverse',
      'centres',
      'centres_reussis',
      'degagements',
      'rentree_de_touche',
      'occasions_manquees',
      'poteau'
    ];
    
    return Array.from(metrics).sort((a, b) => {
      const idxA = orderedKeys.indexOf(a);
      const idxB = orderedKeys.indexOf(b);
      const valA = idxA !== -1 ? idxA : 999;
      const valB = idxB !== -1 ? idxB : 999;
      return valA - valB;
    });
  }, [selectedMatchDetails]);

  const valueBetsList = React.useMemo(() => {
    if (!selectedMatchDetails) return [];
    const list = [];
    
    // We scan only universally popular and widely available betting markets
    const popularMarkets = ['corners', 'fouls', 'yellow_cards', 'red_cards', 'shots_on_target', 'shots', 'offsides'];
    const metricsToScan = availableMetrics.filter(m => popularMarkets.includes(m));
    
    for (const m of metricsToScan) {
      const homeAvg = getAverage(selectedMatchDetails.recent_home_matches, m, true);
      const awayAvg = getAverage(selectedMatchDetails.recent_away_matches, m, false, true);
      
      if (homeAvg !== null && awayAvg !== null) {
        const lambda = homeAvg + awayAvg;
        
        // Scan integer lines k near lambda to find the sweet spot: probability between 53% and 70%
        // which corresponds to interesting fair odds between 1.43 and 1.89 (no small odds).
        const startK = Math.max(0, Math.floor(lambda) - 4);
        const endK = Math.ceil(lambda) + 4;
        
        for (let k = startK; k <= endK; k++) {
          const line = k + 0.5;
          const overProb = poissonOver(lambda, line);
          const underProb = poissonUnder(lambda, line);
          
          if (overProb >= 0.53 && overProb <= 0.70) {
            list.push({
              metric: m,
              metricTitle: getMetricTitle(m),
              line,
              tip: 'Plus de',
              probability: Math.round(overProb * 100),
              fairOdds: 1 / overProb
            });
          }
          if (underProb >= 0.53 && underProb <= 0.70) {
            list.push({
              metric: m,
              metricTitle: getMetricTitle(m),
              line,
              tip: 'Moins de',
              probability: Math.round(underProb * 100),
              fairOdds: 1 / underProb
            });
          }
        }
      }
    }
    
    // We sort by probability descending so the most confident sweet spot opportunities appear first
    return list.sort((a, b) => b.probability - a.probability);
  }, [selectedMatchDetails, availableMetrics]);

  // Ensure activeMetric aligns with available metrics if dynamically changed
  React.useEffect(() => {
    if (selectedMatchDetails?.metric && availableMetrics.includes(selectedMatchDetails.metric)) {
      setActiveMetric(selectedMatchDetails.metric);
    } else {
      setActiveMetric('dashboard');
    }
  }, [selectedMatchDetails, availableMetrics]);

  const renderMatchBadge = (m) => {
    if (activeMetric === 'dashboard') {
      return (
        <span style={{ fontWeight: 700, color: 'var(--color-accent-solid)', background: 'rgba(9, 132, 227, 0.08)', padding: '3px 8px', borderRadius: '4px', fontSize: '10.5px', marginLeft: '12px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
          Détails
        </span>
      );
    }
    if (activeMetric === 'corners') {
      return (
        <span style={{ fontWeight: 700, color: 'var(--color-success)', background: 'rgba(16, 185, 129, 0.08)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', marginLeft: '12px', flexShrink: 0 }}>
          Corners: {m.first_half_corners_home} - {m.first_half_corners_away}
        </span>
      );
    }
    
    let stats = null;
    try {
      if (m.statistics_json) {
        stats = typeof m.statistics_json === 'string' ? JSON.parse(m.statistics_json) : m.statistics_json;
      }
    } catch (e) {}
    
    if (!stats || !stats[activeMetric]) {
      return (
        <span style={{ fontWeight: 600, color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.02)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', marginLeft: '12px', flexShrink: 0 }}>
          N/A
        </span>
      );
    }
    
    const valHome = stats[activeMetric].home;
    const valAway = stats[activeMetric].away;
    const formatted = activeMetric === 'possession' ? `${valHome}% - ${valAway}%` : `${valHome} - ${valAway}`;
    
    const getMetricShortLabel = (key) => {
      const labels = {
        corners: 'Corners 1MT',
        fouls: 'Fautes',
        yellow_cards: 'Cartons',
        possession: 'Poss.',
        shots_on_target: 'Tirs Cad',
        shots: 'Tirs',
        offsides: 'Hors-jeu',
        red_cards: 'Cartons R.'
      };
      if (labels[key]) return labels[key];
      return key
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };
    
    const label = getMetricShortLabel(activeMetric);
    
    return (
      <span style={{ fontWeight: 700, color: 'var(--color-accent-solid)', background: 'rgba(9, 132, 227, 0.08)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', marginLeft: '12px', flexShrink: 0 }}>
        {label}: {formatted}
      </span>
    );
  };

  if (!selectedMatchDetails) return null;

  const h2hAvg = getAverage(selectedMatchDetails.recent_h2h_matches, activeMetric);
  const homeAvg = getAverage(selectedMatchDetails.recent_home_matches, activeMetric, true);
  const awayAvg = getAverage(selectedMatchDetails.recent_away_matches, activeMetric, false, true);
  
  const metricUnit = activeMetric === 'possession' ? '%' : '';
  
  const metricTitle = getMetricTitle(activeMetric);

  return (
    <div className="modal-overlay" onClick={() => setSelectedMatchDetails(null)}>
      <div className="modal-content glass-card" style={{ maxWidth: '650px', width: '90%', padding: '26px 32px', maxHeight: '85vh', overflowY: 'auto', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)' }} onClick={(e) => e.stopPropagation()}>
        
        {/* Glowing Header Container */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          marginBottom: '20px', 
          borderBottom: '1px solid rgba(255,255,255,0.04)', 
          paddingBottom: '16px',
          position: 'relative',
          background: 'radial-gradient(circle at 35% 50%, rgba(9, 132, 227, 0.05) 0%, transparent 60%)'
        }}>
          <div>
            <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(255,255,255,0.03)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.02)' }}>
              {selectedMatchDetails.tournament || 'Football'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
              {selectedMatchDetails.home_logo ? (
                <img src={selectedMatchDetails.home_logo} alt="" referrerPolicy="no-referrer" style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'contain', background: 'rgba(255,255,255,0.02)', padding: '2px', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.06))', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--bg-tertiary)', flexShrink: 0 }} />
              )}
              <h3 style={{ fontSize: '19px', fontFamily: 'Outfit', color: 'var(--text-primary)', margin: 0, fontWeight: 800, letterSpacing: '-0.02em' }}>
                {selectedMatchDetails.home_team}
              </h3>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'Outfit', fontWeight: 800, background: 'rgba(255,255,255,0.04)', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>vs</span>
              {selectedMatchDetails.away_logo ? (
                <img src={selectedMatchDetails.away_logo} alt="" referrerPolicy="no-referrer" style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'contain', background: 'rgba(255,255,255,0.02)', padding: '2px', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.06))', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--bg-tertiary)', flexShrink: 0 }} />
              )}
              <h3 style={{ fontSize: '19px', fontFamily: 'Outfit', color: 'var(--text-primary)', margin: 0, fontWeight: 800, letterSpacing: '-0.02em' }}>
                {selectedMatchDetails.away_team}
              </h3>
            </div>
          </div>
          <button className="modal-close" onClick={() => setSelectedMatchDetails(null)} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
            <X size={15} />
          </button>
        </div>

        {/* Action Buttons Bar for Value Bets Insights */}
        {valueBetsList.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
            <button 
              onClick={() => setShowValueBetsPanel(!showValueBetsPanel)}
              style={{
                background: showValueBetsPanel 
                  ? 'linear-gradient(135deg, #bf5af2 0%, var(--color-accent-solid) 100%)' 
                  : 'rgba(191, 90, 242, 0.08)',
                border: showValueBetsPanel 
                  ? '1px solid rgba(191, 90, 242, 0.3)' 
                  : '1px solid rgba(191, 90, 242, 0.25)',
                color: showValueBetsPanel ? '#fff' : '#bf5af2',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'Outfit',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: showValueBetsPanel ? '0 4px 15px rgba(191, 90, 242, 0.25)' : 'none',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}
            >
              <span>{showValueBetsPanel ? 'Masquer les Value Bets' : `Voir les Meilleurs Value Bets (${valueBetsList.length})`}</span>
            </button>
          </div>
        )}

        {/* Dedicated Sliding Value Bets Panel */}
        {showValueBetsPanel && valueBetsList.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(191, 90, 242, 0.08) 0%, rgba(9, 132, 227, 0.02) 100%)',
            border: '1px solid rgba(191, 90, 242, 0.2)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '20px',
            boxShadow: '0 8px 32px rgba(191, 90, 242, 0.08), inset 0 1px 4px rgba(255,255,255,0.01)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
            <h4 style={{ fontSize: '11.5px', fontFamily: 'Outfit', fontWeight: 800, color: '#bf5af2', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>MEILLEURES OPPORTUNITÉS DE VALUE BETS DÉTECTÉES</span>
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {valueBetsList.map((bet, idx) => {
                const isOver = bet.tip === 'Plus de';
                return (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    transition: 'all 0.15s ease'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {bet.metricTitle}
                      </span>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                        Seuil : <strong style={{ color: 'var(--text-secondary)' }}>{bet.line}</strong>
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: 800, 
                          color: isOver ? 'var(--color-success)' : '#bf5af2',
                          background: isOver ? 'rgba(16, 185, 129, 0.1)' : 'rgba(191, 90, 242, 0.1)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}>
                          {bet.tip} {bet.line}
                        </span>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Probabilité : <strong>{bet.probability}%</strong>
                        </div>
                      </div>
                      
                      <div style={{ textAlign: 'right', minWidth: '90px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                          Cote Juste : <span style={{ color: isOver ? 'var(--color-success)' : '#bf5af2' }}>{bet.fairOdds.toFixed(2)}</span>
                        </div>
                        <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Cote min. : {(bet.fairOdds * 1.05).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}



        {/* Metric Selector Tabs Carousel */}
        {availableMetrics.length > 1 && (
          <div style={{ 
            position: 'relative', 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '16px', 
            background: 'var(--bg-secondary)', 
            borderRadius: '10px', 
            border: '1px solid var(--border-color)', 
            padding: '4px' 
          }}>
            {/* Left Scroll Button */}
            <button 
              onClick={() => scrollTabs('left')}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: '6px',
                marginRight: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                zIndex: 2
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
            >
              <ChevronLeft size={14} />
            </button>

            {/* Scrollable Tabs Wrapper */}
            <div 
              ref={tabsRef}
              style={{ 
                display: 'flex', 
                gap: '4px', 
                overflowX: 'auto', 
                scrollBehavior: 'smooth', 
                width: '100%', 
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {availableMetrics.map(m => {
                const labels = {
                  dashboard: 'Résumé',
                  corners: 'Corners 1MT',
                  fouls: 'Fautes Commises',
                  yellow_cards: 'Jaunes',
                  red_cards: 'Rouges',
                  possession: 'Possession',
                  shots_on_target: 'Tirs Cad.',
                  shots: 'Tirs Glob.',
                  offsides: 'Hors-jeu',
                  xg_buts_attendus: 'xG',
                  passes: 'Passes',
                  passes_reussis: 'Passes %',
                  tacles_reussis: 'Tacles',
                  dribbles_reussis: 'Dribbles',
                  duels_reussis: 'Duels',
                  duels_aeriens_reussis: 'Duels Aériens',
                  ballons_touches_dans_la_surface_adverse: 'Surf. Adverse',
                  centres: 'Centres',
                  centres_reussis: 'Centres %',
                  degagements: 'Dégagements',
                  rentree_de_touche: 'Touches',
                  occasions_manquees: 'Occ. Manquées',
                  poteau: 'Poteau'
                };
                const label = labels[m] || m.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                const isActive = activeMetric === m;
                return (
                  <button
                    key={m}
                    onClick={() => setActiveMetric(m)}
                    style={{
                      flex: '0 0 auto',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: isActive ? 'var(--color-accent-solid)' : 'transparent',
                      color: isActive ? '#fff' : 'var(--text-secondary)',
                      fontSize: '10px',
                      fontFamily: 'Outfit',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                      boxShadow: isActive ? '0 2px 8px rgba(9, 132, 227, 0.3)' : 'none'
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Right Scroll Button */}
            <button 
              onClick={() => scrollTabs('right')}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: '6px',
                marginLeft: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                zIndex: 2
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Dynamic Averages Section */}
        {activeMetric === 'dashboard' ? (
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.015)', 
            border: '1px solid rgba(255, 255, 255, 0.03)', 
            borderRadius: '10px', 
            padding: '16px 20px', 
            marginBottom: '24px',
            boxShadow: 'inset 0 1px 4px rgba(255,255,255,0.01)'
          }}>
            <h4 style={{ fontSize: '11px', fontFamily: 'Outfit', fontWeight: 800, color: 'var(--color-accent-solid)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>BILAN COMPARATIF DES MOYENNES</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {/* Header Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <span style={{ width: '40%', minWidth: '110px' }}>Statistique</span>
                <span style={{ width: '20%', textAlign: 'center' }}>{selectedMatchDetails.home_team}</span>
                <span style={{ width: '20%', textAlign: 'center', color: 'var(--color-accent-solid)' }}>Moy. H2H</span>
                <span style={{ width: '20%', textAlign: 'center' }}>{selectedMatchDetails.away_team}</span>
              </div>
              
              {/* Data Rows */}
              <div style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '4px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                {availableMetrics.filter(m => m !== 'dashboard').map((m) => {
                  const h2hAvg = getAverage(selectedMatchDetails.recent_h2h_matches, m);
                  const homeAvg = getAverage(selectedMatchDetails.recent_home_matches, m, true);
                  const awayAvg = getAverage(selectedMatchDetails.recent_away_matches, m, false, true);
                  const unit = m === 'possession' ? '%' : '';
                  
                  if (h2hAvg === null && homeAvg === null && awayAvg === null) return null;
                  
                  const totalVal = (homeAvg || 0) + (awayAvg || 0);
                  const pctH = totalVal > 0 ? ((homeAvg || 0) / totalVal) * 100 : 50;
                  const pctA = 100 - pctH;

                  return (
                    <div key={m} style={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      padding: '8px 0', 
                      borderBottom: '1px solid rgba(255, 255, 255, 0.02)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', alignItems: 'center' }}>
                        <span style={{ width: '40%', minWidth: '110px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          {getMetricTitle(m)}
                        </span>
                        <span style={{ width: '20%', textAlign: 'center', fontWeight: 700, color: 'var(--color-success)' }}>
                          {homeAvg !== null ? `${homeAvg}${unit}` : 'N/A'}
                        </span>
                        <span style={{ width: '20%', textAlign: 'center', fontWeight: 800, color: 'var(--color-accent-solid)' }}>
                          {h2hAvg !== null ? `${h2hAvg}${unit}` : 'N/A'}
                        </span>
                        <span style={{ width: '20%', textAlign: 'center', fontWeight: 700, color: 'var(--color-danger)' }}>
                          {awayAvg !== null ? `${awayAvg}${unit}` : 'N/A'}
                        </span>
                      </div>
                      
                      {/* Mini inline split progress line */}
                      {homeAvg !== null && awayAvg !== null && (
                        <div style={{ height: '2px', width: '100%', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '1px', overflow: 'hidden', display: 'flex', marginTop: '5px' }}>
                          <div style={{ width: `${pctH}%`, background: 'var(--color-success)', opacity: 0.6, height: '100%' }} />
                          <div style={{ width: `${pctA}%`, background: 'var(--color-danger)', opacity: 0.6, height: '100%' }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Dynamic Averages Grid */
          <div className="grid-3" style={{ gap: '12px', marginBottom: '24px' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(9, 132, 227, 0.08) 0%, rgba(9, 132, 227, 0.01) 100%)', 
              padding: '14px 12px', 
              borderRadius: '10px', 
              border: '1px solid rgba(9, 132, 227, 0.18)', 
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Moy. {metricTitle} H2H</span>
              <p style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px', color: 'var(--color-accent-solid)', margin: 0, fontFamily: 'Outfit' }}>
                {h2hAvg !== null ? `${h2hAvg}${metricUnit}` : 'N/A'}
              </p>
            </div>
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.01) 100%)', 
              padding: '14px 12px', 
              borderRadius: '10px', 
              border: '1px solid rgba(16, 185, 129, 0.18)', 
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Moy. {selectedMatchDetails.home_team}</span>
              <p style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px', color: 'var(--color-success)', margin: 0, fontFamily: 'Outfit' }}>
                {homeAvg !== null ? `${homeAvg}${metricUnit}` : 'N/A'}
              </p>
            </div>
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(235, 94, 40, 0.08) 0%, rgba(235, 94, 40, 0.01) 100%)', 
              padding: '14px 12px', 
              borderRadius: '10px', 
              border: '1px solid rgba(235, 94, 40, 0.15)', 
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Moy. {selectedMatchDetails.away_team}</span>
              <p style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px', color: 'var(--color-danger)', margin: 0, fontFamily: 'Outfit' }}>
                {awayAvg !== null ? `${awayAvg}${metricUnit}` : 'N/A'}
              </p>
            </div>
          </div>
        )}

        {/* Aide aux Paris & Probabilités de Poisson pour Onglets Individuels */}
        {activeMetric !== 'dashboard' && activeMetric !== 'possession' && activeMetric !== 'passes_reussis' && (() => {
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

          let meanHome = 0;
          let meanAway = 0;
          let cov = 0;
          let isGBDT = false;

          if (activeMetric === 'corners' && selectedMatchDetails.gbdt_predictions) {
            const pred = selectedMatchDetails.gbdt_predictions[simPeriod];
            if (pred) {
              meanHome = pred.home_expected;
              meanAway = pred.away_expected;
              cov = pred.covariance;
              isGBDT = true;
            }
          } else {
            const hAvg = getAverage(selectedMatchDetails.recent_home_matches, activeMetric, true);
            const aAvg = getAverage(selectedMatchDetails.recent_away_matches, activeMetric, false, true);
            if (hAvg === null || aAvg === null) {
              return (
                <div style={{
                  padding: '24px 16px',
                  background: 'rgba(255, 255, 255, 0.01)',
                  border: '1px dashed rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  marginBottom: '16px'
                }}>
                  ⚠️ Pas assez de données historiques récurrentes pour simuler les cotes de cet indicateur ({metricTitle}).
                </div>
              );
            }
            const ratio = getMetricPeriodRatio(activeMetric, simPeriod);
            meanHome = hAvg * ratio;
            meanAway = aAvg * ratio;
            cov = 0;
          }

          let defaultLines = [];
          if (activeMetric === 'corners') {
            defaultLines = simPeriod === 'full_time' ? [7.5, 8.5, 9.5, 10.5, 11.5] : [2.5, 3.5, 4.5, 5.5];
          } else {
            const lambda = meanHome + meanAway;
            let standardLine = Math.round(lambda);
            if (standardLine <= 0) standardLine = 1;
            standardLine = standardLine - 0.5;
            defaultLines = [standardLine - 2, standardLine - 1, standardLine, standardLine + 1, standardLine + 2].filter(v => v >= 0.5);
          }
          const allLinesForPeriod = [...defaultLines, ...customLines.filter(l => !defaultLines.includes(l))].sort((a, b) => a - b);

          const handleAddCustomLine = (e) => {
            e.preventDefault();
            const parsed = parseFloat(customLineInput);
            if (!isNaN(parsed) && parsed > 0 && !customLines.includes(parsed)) {
              setCustomLines([...customLines, parsed]);
              setCustomLineInput('');
            }
          };

          return (
            <div style={{
              background: 'rgba(255, 255, 255, 0.015)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
              boxShadow: 'inset 0 1px 4px rgba(255,255,255,0.01)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {/* Header Title */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <h4 style={{ fontSize: '11.5px', fontFamily: 'Outfit', fontWeight: 800, color: '#bf5af2', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>SIMULATEUR DE COTES & CALCULATEUR DE VALUE (POISSON BIVARIÉ)</span>
                </h4>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {isGBDT 
                    ? `Moyennes GBDT : ${meanHome.toFixed(2)} Dom / ${meanAway.toFixed(2)} Ext (Cov: ${cov.toFixed(3)})` 
                    : `Moyennes estimées (${simPeriod === 'first_half' ? '1ère MT' : simPeriod === 'second_half' ? '2ème MT' : 'Match'}) : ${meanHome.toFixed(2)} Dom / ${meanAway.toFixed(2)} Ext`
                  }
                </span>
              </div>

              {/* Step-by-Step Interactive Guide */}
              <div style={{
                background: 'rgba(127, 0, 255, 0.04)',
                border: '1px solid rgba(127, 0, 255, 0.15)',
                borderRadius: '10px',
                padding: '12px 16px',
                fontSize: '11.5px',
                lineHeight: '1.5',
                color: 'var(--text-secondary)'
              }}>
                <div style={{ fontWeight: 800, color: '#bf5af2', marginBottom: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>💡 Comment utiliser ce simulateur en 3 étapes simples :</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>
                    <strong>1. Ajustez le Payout</strong> : Réglez le curseur sur le taux de retour de votre bookmaker (ex: 93% en France, 95% à l'étranger).
                  </li>
                  <li>
                    <strong>2. Comparez la Cote Estimée Bookie</strong> : Elle représente la cote normale que propose le marché pour cette ligne.
                  </li>
                  <li>
                    <strong>3. Saisissez votre cote</strong> : Entrez la cote de votre bookmaker. Si elle s'allume en <strong style={{ color: '#10b981' }}>Vert (VALUE)</strong>, le pari est rentable à long terme !
                  </li>
                </ul>
              </div>

              {/* Period Selector Tabs (For all count metrics) */}
              <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.25)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                {[
                  { id: 'first_half', label: '1ère Mi-Temps' },
                  { id: 'second_half', label: '2ème Mi-Temps' },
                  { id: 'full_time', label: 'Match Entier' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSimPeriod(p.id)}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      fontSize: '10.5px',
                      fontFamily: 'Outfit',
                      fontWeight: 700,
                      border: 'none',
                      borderRadius: '6px',
                      background: simPeriod === p.id ? 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)' : 'transparent',
                      color: simPeriod === p.id ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Payout Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0,0,0,0.15)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontWeight: 600 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Taux de Retour Bookmaker (Payout) :</span>
                  <strong style={{ color: '#bf5af2', fontSize: '12px' }}>{Math.round(payoutRatio * 100)}% <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>({Math.round((1 - payoutRatio) * 100)}% de marge)</span></strong>
                </div>
                <input
                  type="range"
                  min="85"
                  max="98"
                  value={Math.round(payoutRatio * 100)}
                  onChange={(e) => setPayoutRatio(parseFloat(e.target.value) / 100)}
                  style={{
                    width: '100%',
                    accentColor: '#bf5af2',
                    cursor: 'pointer',
                    height: '4px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '2px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Explanatory definitions row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '10px',
                background: 'rgba(0,0,0,0.1)',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '10px',
                color: 'var(--text-muted)',
                border: '1px solid rgba(255,255,255,0.015)'
              }}>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Cote Juste</strong> : Cote sans marge de profit.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Cote Estimée Bookie</strong> : Cote marché avec marge incluse.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Value Edge</strong> : Avantage statistique attendu.
                </div>
              </div>

              {/* Odds Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textTransform: 'none' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontWeight: 800 }}>
                      <th style={{ padding: '6px 4px', textAlign: 'left' }}>Ligne</th>
                      <th style={{ padding: '6px 4px', textAlign: 'center' }}>Option</th>
                      <th style={{ padding: '6px 4px', textAlign: 'center' }}>Probabilité</th>
                      <th style={{ padding: '6px 4px', textAlign: 'center' }}>Cote Juste</th>
                      <th style={{ padding: '6px 4px', textAlign: 'center' }}>Cote Estimée Bookie</th>
                      <th style={{ padding: '6px 4px', textAlign: 'center', width: '90px' }}>Votre Bookmaker</th>
                      <th style={{ padding: '6px 4px', textAlign: 'right' }}>Calculateur de Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allLinesForPeriod.map(line => {
                      const overProb = bivariatePoissonOver(meanHome, meanAway, cov, line);
                      const underProb = 1 - overProb;

                      const fairOver = overProb > 0 ? 1 / overProb : 99;
                      const fairUnder = underProb > 0 ? 1 / underProb : 99;

                      const bookieOver = overProb > 0 ? payoutRatio / overProb : 99;
                      const bookieUnder = underProb > 0 ? payoutRatio / underProb : 99;

                      const overKey = `${simPeriod}-${line}-over`;
                      const underKey = `${simPeriod}-${line}-under`;

                      const userOddsOver = parseFloat(userOdds[overKey] || '');
                      const userOddsUnder = parseFloat(userOdds[underKey] || '');

                      const calculateEdge = (userVal, fairVal) => {
                        if (!userVal || isNaN(userVal)) return null;
                        const probImplied = 1 / userVal;
                        const probFair = 1 / fairVal;
                        return (probFair / probImplied - 1) * 100;
                      };

                      const overEdge = calculateEdge(userOddsOver, fairOver);
                      const underEdge = calculateEdge(userOddsUnder, fairUnder);

                      const renderValueCell = (edge) => {
                        if (edge === null) return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '10.5px' }}>Entrez une cote</span>;
                        if (edge > 0) {
                          return (
                            <span style={{
                              color: '#10b981',
                              background: 'rgba(16, 185, 129, 0.08)',
                              border: '1px solid rgba(16, 185, 129, 0.15)',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em'
                            }} title="Cette cote est sous-évaluée par le bookmaker, rentable à long terme.">
                              VALUE +{edge.toFixed(1)}%
                            </span>
                          );
                        } else {
                          return (
                            <span style={{
                              color: 'var(--text-muted)',
                              background: 'rgba(255,255,255,0.02)',
                              border: '1px solid rgba(255,255,255,0.03)',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 600
                            }} title="Cette cote n'offre pas de rentabilité statistique par rapport aux moyennes.">
                              Perte {edge.toFixed(1)}%
                            </span>
                          );
                        }
                      };

                      return (
                        <React.Fragment key={line}>
                          {/* OVER ROW */}
                          <tr 
                            style={{ 
                              borderBottom: '1px solid rgba(255,255,255,0.015)',
                              cursor: 'pointer',
                              background: hoveredRowKey === overKey ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                              transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={() => setHoveredRowKey(overKey)}
                            onMouseLeave={() => setHoveredRowKey(null)}
                            onClick={(e) => {
                              if (e.target.tagName === 'INPUT') return;
                              handlePlaceBetFromSimulator(line, 'Over', overProb, fairOver, bookieOver, userOdds[overKey]);
                            }}
                          >
                            <td style={{ padding: '6px 4px', fontWeight: 800 }} rowSpan={2} onClick={(e) => e.stopPropagation()}>
                              {line}
                            </td>
                            <td style={{ padding: '6px 4px', textAlign: 'center', color: '#10b981', fontWeight: 700 }}>
                              Plus de
                            </td>
                            <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700 }}>
                              {Math.round(overProb * 100)}%
                            </td>
                            <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>
                              {fairOver.toFixed(2)}
                            </td>
                            <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, color: '#bf5af2' }}>
                              {bookieOver.toFixed(2)}
                            </td>
                            <td style={{ padding: '3px 4px', textAlign: 'center' }}>
                              <input
                                type="text"
                                placeholder="Ex: 1.85"
                                value={userOdds[overKey] || ''}
                                onChange={(e) => setUserOdds({ ...userOdds, [overKey]: e.target.value })}
                                style={{
                                  width: '65px',
                                  background: 'rgba(0,0,0,0.25)',
                                  border: '1px solid rgba(255,255,255,0.06)',
                                  borderRadius: '4px',
                                  color: '#fff',
                                  padding: '2px 4px',
                                  fontSize: '11px',
                                  textAlign: 'center',
                                  outline: 'none'
                                }}
                              />
                            </td>
                            <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                              {renderValueCell(overEdge)}
                            </td>
                          </tr>
                          {/* UNDER ROW */}
                          <tr 
                            style={{ 
                              borderBottom: '1px solid rgba(255,255,255,0.03)',
                              cursor: 'pointer',
                              background: hoveredRowKey === underKey ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                              transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={() => setHoveredRowKey(underKey)}
                            onMouseLeave={() => setHoveredRowKey(null)}
                            onClick={(e) => {
                              if (e.target.tagName === 'INPUT') return;
                              handlePlaceBetFromSimulator(line, 'Under', underProb, fairUnder, bookieUnder, userOdds[underKey]);
                            }}
                          >
                            <td style={{ padding: '6px 4px', textAlign: 'center', color: '#bf5af2', fontWeight: 700 }}>
                              Moins de
                            </td>
                            <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700 }}>
                              {Math.round(underProb * 100)}%
                            </td>
                            <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>
                              {fairUnder.toFixed(2)}
                            </td>
                            <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, color: '#bf5af2' }}>
                              {bookieUnder.toFixed(2)}
                            </td>
                            <td style={{ padding: '3px 4px', textAlign: 'center' }}>
                              <input
                                type="text"
                                placeholder="Ex: 1.85"
                                value={userOdds[underKey] || ''}
                                onChange={(e) => setUserOdds({ ...userOdds, [underKey]: e.target.value })}
                                style={{
                                  width: '65px',
                                  background: 'rgba(0,0,0,0.25)',
                                  border: '1px solid rgba(255,255,255,0.06)',
                                  borderRadius: '4px',
                                  color: '#fff',
                                  padding: '2px 4px',
                                  fontSize: '11px',
                                  textAlign: 'center',
                                  outline: 'none'
                                }}
                              />
                            </td>
                            <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                              {renderValueCell(underEdge)}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add Custom Line Input */}
              <form onSubmit={handleAddCustomLine} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px', marginTop: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Simuler une autre ligne de {metricTitle.toLowerCase()} :</span>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Ex: 6.5"
                  value={customLineInput}
                  onChange={(e) => setCustomLineInput(e.target.value)}
                  style={{
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '4px',
                    color: '#fff',
                    padding: '4px 8px',
                    fontSize: '11px',
                    width: '70px',
                    outline: 'none'
                  }}
                />
                <button type="submit" style={{ padding: '4px 10px', fontSize: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', borderRadius: '4px', fontWeight: 700 }}>
                  Ajouter
                </button>
              </form>
            </div>
          );
        })()}

        {/* Historical Lists */}
        {(crawlLoading || selectedMatchDetails?.isCrawling) ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.015)', border: '1.5px dashed var(--border-color)', borderRadius: '12px', gap: '16px', margin: '20px 0' }}>
            <div style={{ width: '36px', height: '36px', border: '3.5px solid rgba(255,255,255,0.08)', borderTop: '3.5px solid var(--color-accent-solid)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ fontSize: '14.5px', fontFamily: 'Outfit', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Analyse de l'Historique en cours...
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '6px 0 0 0', maxWidth: '380px', lineHeight: '1.4' }}>
                Récupération des confrontations et corners 1MT depuis Matchendirect via Tor SOCKS5. Cette opération prend environ 10 à 15 secondes.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Call to action if stats are empty */}
            {(!selectedMatchDetails.recent_h2h_matches?.length && 
              !selectedMatchDetails.recent_home_matches?.length && 
              !selectedMatchDetails.recent_away_matches?.length) && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: 'rgba(9, 132, 227, 0.03)', border: '1px dashed rgba(9, 132, 227, 0.25)', borderRadius: '12px', gap: '12px', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent-solid)' }}>
                  <RefreshCcw size={16} />
                  <span style={{ fontSize: '14px', fontFamily: 'Outfit', fontWeight: 700 }}>Statistiques Vides</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, maxWidth: '400px', lineHeight: '1.4' }}>
                  Les confrontations directes et les moyennes de corners ne sont pas encore disponibles pour ce match.
                </p>
                <button 
                  className="btn btn-primary" 
                  style={{ padding: '8px 20px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontFamily: 'Outfit' }}
                  onClick={() => handleCrawlHistory(selectedMatchDetails.match_id)}
                >
                  <RefreshCcw size={13} />
                  Analyser l'historique du match
                </button>
              </div>
            )}

            {/* Section 1: H2H */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px' }}>
                <h4 style={{ fontSize: '13px', fontFamily: 'Outfit', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', margin: 0 }}>
                  Confrontations Directes (H2H)
                </h4>
                {selectedMatchDetails.recent_h2h_matches?.length > 0 && (
                  <button 
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-accent-solid)', fontSize: '11.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
                    onClick={() => handleCrawlHistory(selectedMatchDetails.match_id)}
                  >
                    <RefreshCcw size={11} /> Mettre à jour
                  </button>
                )}
              </div>
              {selectedMatchDetails.recent_h2h_matches && selectedMatchDetails.recent_h2h_matches.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                  {selectedMatchDetails.recent_h2h_matches.map((m, idx) => {
                    const isExpanded = expandedRowKey === `h2h-${idx}`;
                    const outcome = getOutcomeIndicator(m, selectedMatchDetails.home_team);
                    return (
                      <div 
                        key={idx} 
                        onClick={() => toggleExpandRow('h2h', idx)}
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          padding: '8px 12px', 
                          background: 'rgba(255,255,255,0.015)', 
                          border: isExpanded ? '1px solid var(--color-accent-solid)' : '1px solid var(--border-color)', 
                          borderRadius: '6px', 
                          fontSize: '12.5px', 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: isExpanded ? '0 0 10px rgba(0, 130, 255, 0.05)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', width: '115px', flexShrink: 0 }}>
                            {outcome && (
                              <span style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                width: '18px', 
                                height: '18px', 
                                borderRadius: '4px', 
                                fontSize: '10px', 
                                fontWeight: 800, 
                                color: outcome.color, 
                                background: outcome.bg, 
                                border: outcome.border, 
                                marginRight: '8px', 
                                flexShrink: 0 
                              }}>
                                {outcome.label}
                              </span>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600 }}>{m.date}</span>
                              {m.time && m.time !== 'Finished' && (
                                <span style={{ color: 'var(--text-muted)', fontSize: '9.5px', fontFamily: 'Outfit' }}>{m.time}</span>
                              )}
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexGrow: 1, justifyContent: 'center', padding: '0 8px' }}>
                            {m.home_logo ? (
                              <img src={m.home_logo} alt="" referrerPolicy="no-referrer" style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'contain', background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--bg-tertiary)', flexShrink: 0 }} />
                            )}
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{m.home_team}</span>
                            
                            <strong style={{ color: 'var(--text-muted)', margin: '0 4px', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', flexShrink: 0 }}>{m.score}</strong>
                            
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{m.away_team}</span>
                            {m.away_logo ? (
                              <img src={m.away_logo} alt="" referrerPolicy="no-referrer" style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'contain', background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--bg-tertiary)', flexShrink: 0 }} />
                            )}
                          </div>
                          
                          {renderMatchBadge(m)}
                        </div>
                        {isExpanded && renderExpandedStats(m)}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Aucune confrontation H2H en cache dans l'historique.</p>
              )}
            </div>

            {/* Section 2: Recent Home */}
            <div>
              <h4 style={{ fontSize: '13px', fontFamily: 'Outfit', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px' }}>
                Derniers matchs de {selectedMatchDetails.home_team} (à domicile)
              </h4>
              {selectedMatchDetails.recent_home_matches && selectedMatchDetails.recent_home_matches.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                  {selectedMatchDetails.recent_home_matches.map((m, idx) => {
                    const isExpanded = expandedRowKey === `home-${idx}`;
                    const outcome = getOutcomeIndicator(m, selectedMatchDetails.home_team);
                    return (
                      <div 
                        key={idx} 
                        onClick={() => toggleExpandRow('home', idx)}
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          padding: '8px 12px', 
                          background: 'rgba(255,255,255,0.015)', 
                          border: isExpanded ? '1px solid var(--color-accent-solid)' : '1px solid var(--border-color)', 
                          borderRadius: '6px', 
                          fontSize: '12.5px', 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: isExpanded ? '0 0 10px rgba(0, 130, 255, 0.05)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', width: '115px', flexShrink: 0 }}>
                            {outcome && (
                              <span style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                width: '18px', 
                                height: '18px', 
                                borderRadius: '4px', 
                                fontSize: '10px', 
                                fontWeight: 800, 
                                color: outcome.color, 
                                background: outcome.bg, 
                                border: outcome.border, 
                                marginRight: '8px', 
                                flexShrink: 0 
                              }}>
                                {outcome.label}
                              </span>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600 }}>{m.date}</span>
                              {m.time && m.time !== 'Finished' && (
                                <span style={{ color: 'var(--text-muted)', fontSize: '9.5px', fontFamily: 'Outfit' }}>{m.time}</span>
                              )}
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexGrow: 1, justifyContent: 'center', padding: '0 8px' }}>
                            {m.home_logo ? (
                              <img src={m.home_logo} alt="" referrerPolicy="no-referrer" style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'contain', background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--bg-tertiary)', flexShrink: 0 }} />
                            )}
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{m.home_team}</span>
                            
                            <strong style={{ color: 'var(--text-muted)', margin: '0 4px', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', flexShrink: 0 }}>{m.score}</strong>
                            
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{m.away_team}</span>
                            {m.away_logo ? (
                              <img src={m.away_logo} alt="" referrerPolicy="no-referrer" style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'contain', background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--bg-tertiary)', flexShrink: 0 }} />
                            )}
                          </div>
                          
                          {renderMatchBadge(m)}
                        </div>
                        {isExpanded && renderExpandedStats(m)}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Aucun match récent en cache.</p>
              )}
            </div>

            {/* Section 3: Recent Away */}
            <div>
              <h4 style={{ fontSize: '13px', fontFamily: 'Outfit', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px' }}>
                Derniers matchs de {selectedMatchDetails.away_team} (à l'extérieur)
              </h4>
              {selectedMatchDetails.recent_away_matches && selectedMatchDetails.recent_away_matches.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                  {selectedMatchDetails.recent_away_matches.map((m, idx) => {
                    const isExpanded = expandedRowKey === `away-${idx}`;
                    const outcome = getOutcomeIndicator(m, selectedMatchDetails.away_team);
                    return (
                      <div 
                        key={idx} 
                        onClick={() => toggleExpandRow('away', idx)}
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          padding: '8px 12px', 
                          background: 'rgba(255,255,255,0.015)', 
                          border: isExpanded ? '1px solid var(--color-accent-solid)' : '1px solid var(--border-color)', 
                          borderRadius: '6px', 
                          fontSize: '12.5px', 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: isExpanded ? '0 0 10px rgba(0, 130, 255, 0.05)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', width: '115px', flexShrink: 0 }}>
                            {outcome && (
                              <span style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                width: '18px', 
                                height: '18px', 
                                borderRadius: '4px', 
                                fontSize: '10px', 
                                fontWeight: 800, 
                                color: outcome.color, 
                                background: outcome.bg, 
                                border: outcome.border, 
                                marginRight: '8px', 
                                flexShrink: 0 
                              }}>
                                {outcome.label}
                              </span>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600 }}>{m.date}</span>
                              {m.time && m.time !== 'Finished' && (
                                <span style={{ color: 'var(--text-muted)', fontSize: '9.5px', fontFamily: 'Outfit' }}>{m.time}</span>
                              )}
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexGrow: 1, justifyContent: 'center', padding: '0 8px' }}>
                            {m.home_logo ? (
                              <img src={m.home_logo} alt="" referrerPolicy="no-referrer" style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'contain', background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--bg-tertiary)', flexShrink: 0 }} />
                            )}
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{m.home_team}</span>
                            
                            <strong style={{ color: 'var(--text-muted)', margin: '0 4px', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', flexShrink: 0 }}>{m.score}</strong>
                            
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{m.away_team}</span>
                            {m.away_logo ? (
                              <img src={m.away_logo} alt="" referrerPolicy="no-referrer" style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'contain', background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--bg-tertiary)', flexShrink: 0 }} />
                            )}
                          </div>
                          
                          {renderMatchBadge(m)}
                        </div>
                        {isExpanded && renderExpandedStats(m)}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Aucun match récent en cache.</p>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', marginTop: '24px', paddingTop: '16px' }}>
          <button className="btn btn-secondary" onClick={() => setSelectedMatchDetails(null)}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
