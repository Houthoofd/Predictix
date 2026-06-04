import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Send,
  Database,
  ArrowRight,
  Info,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  X
} from 'lucide-react';

export default function StrategiesTab() {
  const [prompt, setPrompt] = useState('');
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [creationStep, setCreationStep] = useState(0);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  
  // Backtest states
  const [backtestingId, setBacktestingId] = useState(null);
  const [backtestResults, setBacktestResults] = useState(null);
  const [defaultOdds, setDefaultOdds] = useState('1.80');
  const [minCoverage, setMinCoverage] = useState('50');


  const creationSteps = [
    "Analyse de votre concept en langage naturel...",
    "Extraction de la métrique ciblée...",
    "Conception du parseur mathématique...",
    "Calibration du screener réactif et persistance..."
  ];

  const fetchStrategies = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/strategies/magic');
      const json = await res.json();
      if (json.success) {
        setStrategies(json.data || []);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des stratégies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
  }, []);

  const handleCreateStrategy = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setCreating(true);
    setCreationStep(0);
    setError(null);
    setSuccessMsg('');

    // Simulated micro-steps animations for the high-end magic feel
    const interval = setInterval(() => {
      setCreationStep(prev => {
        if (prev < creationSteps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          return prev;
        }
      });
    }, 900);

    try {
      const res = await fetch('http://localhost:5000/api/strategies/magic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() })
      });
      const json = await res.json();

      // Small delay to let the user see the final step
      setTimeout(() => {
        clearInterval(interval);
        setCreating(false);
        if (json.success) {
          setSuccessMsg(json.message);
          setPrompt('');
          fetchStrategies();
        } else {
          setError(json.error?.message || 'Erreur lors de la génération de la stratégie.');
        }
      }, 3800);

    } catch (err) {
      clearInterval(interval);
      setCreating(false);
      setError('Erreur réseau lors de la création de la stratégie.');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/strategies/magic/${id}/toggle`, {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success) {
        fetchStrategies();
      }
    } catch (err) {
      console.error("Erreur lors du basculement d'activation:", err);
    }
  };

  const handleDeleteStrategy = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette stratégie sur-mesure ?")) {
      return;
    }
    try {
      const res = await fetch(`http://localhost:5000/api/strategies/magic/${id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        fetchStrategies();
      }
    } catch (err) {
      console.error("Erreur lors de la suppression:", err);
    }
  };

  const handleRunBacktest = async (id) => {
    setBacktestingId(id);
    setBacktestResults(null);
    try {
      const res = await fetch(`http://localhost:5000/api/strategies/backtest/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          defaultOdds: parseFloat(defaultOdds) || 1.80,
          minCoverage: parseFloat(minCoverage) || 50
        })
      });
      const json = await res.json();
      if (json.success) {
        setBacktestResults(json.data);
      } else {
        alert("Erreur backtest: " + (json.error?.message || "Erreur inconnue"));
      }
    } catch (err) {
      console.error("Erreur backtest:", err);
      alert("Erreur de connexion lors du lancement du backtest.");
    } finally {
      setBacktestingId(null);
    }
  };

  const drawProfitChart = (timeline) => {
    if (!timeline || timeline.length === 0) return null;

    const width = 600;
    const height = 200;
    const padding = 20;

    // Include 0 as starting point
    const points = [{ val: 0, idx: 0 }, ...timeline.map((t, idx) => ({ val: t.cumulative, idx: idx + 1 }))];

    const minVal = Math.min(...points.map(p => p.val));
    const maxVal = Math.max(...points.map(p => p.val));
    const valRange = maxVal - minVal === 0 ? 1 : maxVal - minVal;

    const getX = (idx) => padding + (idx / (points.length - 1)) * (width - 2 * padding);
    const getY = (val) => height - padding - ((val - minVal) / valRange) * (height - 2 * padding);

    let pathD = `M ${getX(0)} ${getY(0)}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${getX(i)} ${getY(i)}`;
    }

    let areaD = `${pathD} L ${getX(points.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="200" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '10px', marginTop: '10px' }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bf5af2" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0082ff" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#bf5af2" />
            <stop offset="100%" stopColor="#0082ff" />
          </linearGradient>
        </defs>
        
        {/* Zero Line */}
        {minVal < 0 && maxVal > 0 && (
          <line 
            x1={padding} 
            y1={getY(0)} 
            x2={width - padding} 
            y2={getY(0)} 
            stroke="rgba(255,255,255,0.15)" 
            strokeDasharray="4 4" 
          />
        )}

        {/* Grid lines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.05)" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.05)" />

        {/* Area under the line */}
        <path d={areaD} fill="url(#chartGrad)" />

        {/* Trend Line */}
        <path d={pathD} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points */}
        {points.map((p, i) => (
          <circle 
            key={i} 
            cx={getX(p.idx)} 
            cy={getY(p.val)} 
            r="3.5" 
            fill={p.val >= 0 ? '#2ecc71' : '#e74c3c'} 
            stroke="rgba(0,0,0,0.6)" 
            strokeWidth="1"
          />
        ))}
        
        {/* Texts */}
        <text x={padding + 5} y={padding + 15} fill="rgba(255,255,255,0.6)" fontSize="10" fontWeight="bold">
          Max: {maxVal.toFixed(2)} U
        </text>
        <text x={padding + 5} y={height - padding - 5} fill="rgba(255,255,255,0.6)" fontSize="10" fontWeight="bold">
          Min: {minVal.toFixed(2)} U
        </text>
      </svg>
    );
  };

  const getMetricLabel = (metric) => {
    const labels = {
      fouls: 'Fautes commises',
      yellow_cards: 'Cartons Jaunes',
      possession: 'Possession',
      shots_on_target: 'Tirs Cadrés',
      shots: 'Tirs',
      offsides: 'Hors-jeu',
      corners: 'Corners'
    };
    return labels[metric] || metric;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* 1. Header Information Panel */}
      <div className="glass-card accent-left">
        <h3 style={{ fontSize: '20px', fontFamily: 'Outfit', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={20} style={{ color: 'var(--color-accent-solid)' }} />
          Créateur de Stratégies Magiques (Magic Strategy Creator)
        </h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Rédigez votre concept de paris sportifs en langage naturel (ex : <em>"j'aimerais créer une stratégie sur les fautes au football avec au moins 24 fautes sur 5 confrontations"</em>). 
          Predictix va instantanément traduire votre phrase en formules de filtres mathématiques, collecter les indicateurs 
          grâce à son scraper en Tor et vous avertir sur les prochains matchs dès qu'un signal est détecté dans le H2H !
        </p>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        
        {/* Left Column: Natural Language Prompt Area */}
        <div className="glass-card" style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.015) 0%, rgba(127, 0, 255, 0.01) 100%)',
          border: creating ? '1px solid #bf5af2' : '1px solid var(--border-color)',
          boxShadow: creating ? '0 0 20px rgba(191, 90, 242, 0.08)' : 'none',
          transition: 'all 0.3s ease'
        }}>
          <h4 style={{ fontSize: '18px', fontFamily: 'Outfit', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: '#bf5af2' }} />
            Nouvelle stratégie en langage naturel
          </h4>
          
          <form onSubmit={handleCreateStrategy} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ position: 'relative' }}>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder='Exemple : "Je veux une stratégie sur les fautes avec au moins 24.5 fautes sur 5 confrontations H2H"'
                disabled={creating}
                style={{
                  width: '100%',
                  height: '110px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '14px',
                  color: 'var(--text-primary)',
                  fontFamily: 'Inter',
                  fontSize: '13.5px',
                  lineHeight: '1.5',
                  resize: 'none',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(127, 0, 255, 0.4)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
              />
            </div>

            {error && (
              <div style={{ color: 'var(--color-danger)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Info size={14} />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div style={{ color: 'var(--color-success)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={14} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Custom Steps Loader during creation */}
            {creating && (
              <div style={{ 
                background: 'rgba(255,255,255,0.01)', 
                border: '1px dashed var(--border-color)', 
                borderRadius: '8px', 
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#bf5af2', textTransform: 'uppercase' }}>
                  <span>Conception Magique en cours</span>
                  <Sparkles size={12} className="spin-animation" style={{ color: '#bf5af2' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  {creationSteps.map((step, idx) => (
                    <div key={idx} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      opacity: creationStep > idx ? 0.4 : (creationStep === idx ? 1 : 0.2),
                      fontWeight: creationStep === idx ? 600 : 400,
                      color: creationStep === idx ? 'var(--text-primary)' : undefined,
                      transition: 'all 0.3s ease'
                    }}>
                      <span>{creationStep > idx ? '✓' : (creationStep === idx ? '●' : '○')}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={creating || !prompt.trim()}
              style={{
                width: '100%',
                height: '40px',
                background: 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <span>Générer ma Stratégie</span>
              <Send size={16} />
            </button>
          </form>

          {/* Quick Examples Box */}
          <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.02)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              Exemples d'invites à copier :
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div 
                onClick={() => !creating && setPrompt("Je veux parier sur les fautes avec plus de 24 fautes sur les 5 confrontations H2H")}
                style={{ padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--border-color)' }}
              >
                "Plus de 24 fautes sur 5 confrontations H2H"
              </div>
              <div 
                onClick={() => !creating && setPrompt("j'aimerais parier sur les cartons jaunes avec au moins 3.5 cartons jaunes sur les 5 derniers match")}
                style={{ padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--border-color)' }}
              >
                "Au moins 3.5 cartons jaunes sur 5 matchs"
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Active custom strategies listing */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: '18px', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Database size={18} style={{ color: 'var(--color-accent-solid)' }} />
              Vos Stratégies Actives ({strategies.length})
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700 }}>COTE :</span>
                <input 
                  type="number" 
                  step="0.05" 
                  min="1.01" 
                  value={defaultOdds} 
                  onChange={(e) => setDefaultOdds(e.target.value)} 
                  style={{
                    width: '55px',
                    padding: '4px 6px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 700,
                    textAlign: 'center',
                    outline: 'none'
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700 }} title="Seuil de couverture statistique minimum par championnat">COUVERTURE MIN :</span>
                <select
                  value={minCoverage}
                  onChange={(e) => setMinCoverage(e.target.value)}
                  style={{
                    padding: '4px 6px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="0">0% (Tout)</option>
                  <option value="10">10%</option>
                  <option value="30">30%</option>
                  <option value="50">50%</option>
                  <option value="70">70%</option>
                  <option value="90">90%</option>
                </select>
              </div>
            </div>
          </div>


          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <span>Chargement de vos filtres sur-mesure...</span>
            </div>
          ) : strategies.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {strategies.map((strat) => {
                const cond = strat.conditions || {};
                const isActive = strat.status === 'ACTIVE';

                return (
                  <div 
                    key={strat.id} 
                    className="glass-card"
                    style={{
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderColor: isActive ? 'rgba(127, 0, 255, 0.15)' : undefined,
                      boxShadow: isActive ? '0 4px 15px rgba(127, 0, 255, 0.02)' : 'none',
                      transition: 'all 0.2s ease',
                      opacity: isActive ? 1 : 0.6
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexGrow: 1, paddingRight: '15px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
                          {strat.name}
                        </span>
                      </div>
                      
                      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontStyle: 'italic', margin: '2px 0' }}>
                        "{strat.prompt}"
                      </p>

                      <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span>Métrique : <strong>{getMetricLabel(strat.metric)}</strong></span>
                        <span>•</span>
                        <span>Seuil : <strong>{cond.operator} {cond.threshold}</strong></span>
                        <span>•</span>
                        <span>Scope : <strong>{cond.limit} H2H</strong></span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      {/* Backtest Trigger */}
                      <button
                        onClick={() => handleRunBacktest(strat.id)}
                        className="btn btn-secondary"
                        style={{
                          fontSize: '11px',
                          padding: '0 10px',
                          height: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          borderColor: 'rgba(191, 90, 242, 0.3)',
                          background: 'rgba(191, 90, 242, 0.05)',
                          color: '#bf5af2'
                        }}
                        disabled={backtestingId === strat.id}
                        title="Lancer le rétro-testing de cette stratégie"
                      >
                        <TrendingUp size={12} />
                        {backtestingId === strat.id ? 'Calcul...' : 'Rétro-tester'}
                      </button>

                      {/* Active Toggle */}
                      <button
                        onClick={() => handleToggleStatus(strat.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                        title={isActive ? "Désactiver la stratégie" : "Activer la stratégie"}
                      >
                        {isActive ? (
                          <ToggleRight size={32} style={{ color: '#bf5af2' }} />
                        ) : (
                          <ToggleLeft size={32} style={{ color: 'var(--text-muted)' }} />
                        )}
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteStrategy(strat.id)}
                        className="btn btn-secondary"
                        style={{ 
                          width: '32px', 
                          height: '32px', 
                          padding: '0', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          borderColor: 'rgba(244, 63, 94, 0.2)',
                          color: 'var(--color-danger)'
                        }}
                        title="Supprimer la stratégie"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <HelpCircle size={30} style={{ marginBottom: '10px', opacity: 0.5 }} />
              <p style={{ fontSize: '13px' }}>Aucune stratégie personnalisée enregistrée.</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>Rédigez votre première idée à gauche pour que Predictix l'ajoute à son tableau de bord.</p>
            </div>
          )}
        </div>

      </div>
      
      {/* 3. Backtest Results Card */}
      {backtestResults && (
        <div className="glass-card" style={{ marginTop: '20px', border: '1px solid rgba(191, 90, 242, 0.3)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', fontWeight: 800, color: '#bf5af2', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <TrendingUp size={20} />
                Résultats du Rétro-testing : {backtestResults.strategy_name}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', margin: '2px 0 0 0' }}>
                Simulation lancée avec une cote par défaut de <strong>{defaultOdds}</strong>.
              </p>
            </div>
            
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0 8px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setBacktestResults(null)}
              title="Fermer les résultats"
            >
              <X size={16} />
            </button>
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '25px' }}>
            <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>PARIS ÉVALUÉS</div>
              <div style={{ fontSize: '24px', fontFamily: 'Outfit', fontWeight: 800, marginTop: '6px' }}>{backtestResults.total_bets}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>TAUX DE RÉUSSITE</div>
              <div style={{ fontSize: '24px', fontFamily: 'Outfit', fontWeight: 800, color: backtestResults.win_rate >= 55 ? '#2ecc71' : backtestResults.win_rate >= 50 ? '#f1c40f' : '#e74c3c', marginTop: '6px' }}>
                {backtestResults.win_rate}%
              </div>
              <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{backtestResults.wins} V / {backtestResults.losses} D</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>RENDEMENT (ROI)</div>
              <div style={{ fontSize: '24px', fontFamily: 'Outfit', fontWeight: 800, color: backtestResults.roi >= 0 ? '#2ecc71' : '#e74c3c', marginTop: '6px' }}>
                {backtestResults.roi >= 0 ? '+' : ''}{backtestResults.roi}%
              </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>PROFIT NET TOTAL</div>
              <div style={{ fontSize: '24px', fontFamily: 'Outfit', fontWeight: 800, color: backtestResults.total_profit >= 0 ? '#2ecc71' : '#e74c3c', marginTop: '6px' }}>
                {backtestResults.total_profit >= 0 ? '+' : ''}{backtestResults.total_profit} U
              </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>MATCHS EXCLUS</div>
              <div style={{ fontSize: '24px', fontFamily: 'Outfit', fontWeight: 800, color: 'var(--text-muted)', marginTop: '6px' }}>
                {backtestResults.skipped_low_coverage + backtestResults.skipped_missing_stats}
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {backtestResults.skipped_low_coverage} couv. / {backtestResults.skipped_missing_stats} stats
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '25px', alignItems: 'start' }}>
            
            {/* Chart Area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>Courbe de profit cumulée (unités)</div>
              {drawProfitChart(backtestResults.profit_timeline)}
            </div>

            {/* Logs Area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>Journal des paris simulés</div>
              <div style={{ overflowY: 'auto', maxHeight: '200px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '6px 4px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '6px 4px', textAlign: 'left' }}>Match</th>
                      <th style={{ padding: '6px 4px', textAlign: 'center' }}>Moy H2H</th>
                      <th style={{ padding: '6px 4px', textAlign: 'center' }}>Réel</th>
                      <th style={{ padding: '6px 4px', textAlign: 'center' }}>Cote</th>
                      <th style={{ padding: '6px 4px', textAlign: 'center' }}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backtestResults.logs.map((log, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '6px 4px', color: 'var(--text-muted)' }}>{log.date}</td>
                        <td style={{ padding: '6px 4px', fontWeight: 600 }}>{log.home_team} - {log.away_team} ({log.score})</td>
                        <td style={{ padding: '6px 4px', textAlign: 'center' }}>{log.avg_value}</td>
                        <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700 }}>{log.actual_value}</td>
                        <td style={{ padding: '6px 4px', textAlign: 'center' }}>{log.odds}</td>
                        <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                          <span style={{ 
                            background: log.won ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)', 
                            color: log.won ? '#2ecc71' : '#e74c3c', 
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '9px'
                          }}>
                            {log.won ? 'GAGNÉ' : 'PERDU'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* League Coverage Details */}
          {backtestResults.leagues_coverage && backtestResults.leagues_coverage.length > 0 && (
            <details style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
              <summary style={{ cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', outline: 'none' }}>
                Afficher le détail de la couverture par championnat ({backtestResults.leagues_coverage.length} championnats)
              </summary>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px', marginTop: '12px', maxHeight: '150px', overflowY: 'auto', paddingRight: '5px' }}>
                {backtestResults.leagues_coverage.map((lc, idx) => {
                  const isFiltered = lc.coverage_rate < parseFloat(minCoverage);
                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        background: 'rgba(0,0,0,0.15)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '6px', 
                        padding: '8px 12px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        opacity: isFiltered ? 0.4 : 1
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#fff', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lc.tournament}>
                          {lc.tournament}
                        </span>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                          {lc.matches_with_stats} / {lc.total_matches} matchs
                        </span>
                      </div>
                      <span style={{ 
                        fontSize: '11px', 
                        fontWeight: 700, 
                        color: lc.coverage_rate >= 70 ? '#2ecc71' : lc.coverage_rate >= 40 ? '#f1c40f' : '#e74c3c' 
                      }}>
                        {lc.coverage_rate}% {isFiltered && ' (Exclu)'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </details>
          )}

        </div>
      )}

    </div>
  );
}
