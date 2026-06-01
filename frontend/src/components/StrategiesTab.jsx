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
  HelpCircle
} from 'lucide-react';

export default function StrategiesTab() {
  const [prompt, setPrompt] = useState('');
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [creationStep, setCreationStep] = useState(0);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

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
          <h4 style={{ fontSize: '18px', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} style={{ color: 'var(--color-accent-solid)' }} />
            Vos Stratégies Actives ({strategies.length})
          </h4>

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

    </div>
  );
}
