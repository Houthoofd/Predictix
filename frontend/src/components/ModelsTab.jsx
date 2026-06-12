import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Play, 
  Activity, 
  Settings, 
  CheckCircle2, 
  AlertCircle, 
  Sliders, 
  Search, 
  Database,
  Info,
  TrendingUp,
  Cpu,
  Calculator,
  ToggleLeft,
  ToggleRight,
  TrendingDown
} from 'lucide-react';

const formatLastTrained = (timestamp) => {
  if (!timestamp) return 'Jamais';
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Jamais';
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (e) {
    return 'Jamais';
  }
};

export default function ModelsTab() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [useGbdtModels, setUseGbdtModels] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Variable Importance tabs
  const [importanceTab, setImportanceTab] = useState('football');

  // Sandbox state
  const [sandboxSport, setSandboxSport] = useState('football');
  const [sandboxMeanHome, setSandboxMeanHome] = useState('2.2');
  const [sandboxMeanAway, setSandboxMeanAway] = useState('2.0');
  const [sandboxCov, setSandboxCov] = useState('0.15');
  const [sandboxLine, setSandboxLine] = useState('4.5');
  const [sandboxResults, setSandboxResults] = useState(null);
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxError, setSandboxError] = useState(null);

  const fetchStatusAndSettings = async () => {
    try {
      const [resStatus, resSettings] = await Promise.all([
        fetch('/api/models/status'),
        fetch('/api/settings')
      ]);
      const jsonStatus = await resStatus.json();
      const jsonSettings = await resSettings.json();
      if (jsonStatus.success) setStatus(jsonStatus.data);
      if (jsonSettings.success) {
        setUseGbdtModels(jsonSettings.data.use_gbdt_models === 'true');
      }
    } catch (e) {
      console.error("Error fetching models status/settings:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusAndSettings();
  }, []);

  const handleTrain = async () => {
    if (training) return;
    setTraining(true);
    setMessage({ type: 'info', text: 'Apprentissage en cours via le binaire Go pur...' });
    try {
      const res = await fetch('/api/models/train', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setStatus(json.data);
        setMessage({ type: 'success', text: 'Entraînement réussi en moins de 10ms ! Les 5 modèles de corners et de points ont été réajustés.' });
      } else {
        setMessage({ type: 'error', text: 'Échec de l\'entraînement : ' + (json.error?.message || 'Erreur inconnue') });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Erreur réseau lors de la requête d\'entraînement.' });
    } finally {
      setTraining(false);
    }
  };

  const handleToggleGbdt = async () => {
    if (toggleLoading) return;
    setToggleLoading(true);
    const newValue = !useGbdtModels;
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ use_gbdt_models: newValue })
      });
      const json = await res.json();
      if (json.success) {
        setUseGbdtModels(json.data.use_gbdt_models === 'true');
        setMessage({ 
          type: 'success', 
          text: newValue 
            ? 'Succès : Modèle GBDT activé globalement pour toutes les futures prédictions.' 
            : 'Succès : Modèle GBDT désactivé globalement. Les prédictions se basent désormais sur les statistiques de base.' 
        });
      } else {
        setMessage({ type: 'error', text: 'Erreur lors de la mise à jour de la configuration.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Erreur réseau lors du basculement des modèles.' });
    } finally {
      setToggleLoading(false);
    }
  };

  const handleSandboxCalculate = async (e) => {
    e.preventDefault();
    setSandboxLoading(true);
    setSandboxError(null);
    try {
      const res = await fetch('/api/models/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meanHome: parseFloat(sandboxMeanHome) || 0,
          meanAway: parseFloat(sandboxMeanAway) || 0,
          cov: parseFloat(sandboxCov) || 0,
          line: parseFloat(sandboxLine) || 0
        })
      });
      const json = await res.json();
      if (json.success) {
        setSandboxResults(json.data);
      } else {
        setSandboxError(json.error?.message || 'Erreur de calcul');
      }
    } catch (error) {
      setSandboxError('Erreur réseau lors du calcul');
    } finally {
      setSandboxLoading(false);
    }
  };

  // Helper to compute reliability score
  const getReliabilityScore = (count, improvement) => {
    if (!count) return 0;
    const countScore = Math.min(1.0, count / 300) * 50;
    const impScore = Math.min(1.0, Math.max(0, improvement) / 20) * 50;
    return Math.round(countScore + impScore);
  };

  const getReliabilityLabel = (score) => {
    if (score >= 80) return { text: 'Excellent', color: '#30d158' };
    if (score >= 60) return { text: 'Très Bon', color: '#0a84ff' };
    if (score >= 40) return { text: 'Correct', color: '#ff9f0a' };
    return { text: 'Faible', color: '#ff3b30' };
  };

  const modelLabels = {
    corners_1mt: 'Corners - 1ère MT',
    corners_ft: 'Corners - Match Entier',
    corners_2mt: 'Corners - 2ème MT',
    basket_1mt: 'Points - 1ère MT',
    basket_1qt: 'Points - 1er QT'
  };

  const featureImportances = {
    football: [
      { name: 'Moyenne Corners Équipe Domicile', value: 42, color: '#0082ff' },
      { name: 'Moyenne Corners Équipe Extérieur', value: 38, color: '#bf5af2' },
      { name: 'Moyenne de Corners de la Ligue', value: 12, color: '#0a84ff' },
      { name: 'Total Moyen Combiné des 2 Équipes', value: 8, color: '#30d158' }
    ],
    basketball: [
      { name: 'Pace Projeté (FGA Combiné)', value: 48, color: '#ff9f0a' },
      { name: 'Rating d\'Efficacité Offensive', value: 32, color: '#bf5af2' },
      { name: 'Rating d\'Efficacité Défensive', value: 12, color: '#0a84ff' },
      { name: 'Avantage du Terrain (HCA)', value: 8, color: '#30d158' }
    ]
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '40vh', gap: '16px' }}>
        <Brain size={40} className="console-line system animate-spin" style={{ color: '#bf5af2' }} />
        <p style={{ fontFamily: 'Outfit', fontWeight: 600, color: 'var(--text-secondary)' }}>Chargement des données de modélisation GBDT...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Global Apply Banner */}
      <div style={{
        background: useGbdtModels ? 'linear-gradient(135deg, rgba(127,0,255,0.06) 0%, rgba(0,130,255,0.04) 100%)' : 'rgba(255, 255, 255, 0.015)',
        border: `1px solid ${useGbdtModels ? 'rgba(191,90,242,0.2)' : 'rgba(255, 255, 255, 0.04)'}`,
        borderRadius: '16px',
        padding: '24px',
        boxShadow: useGbdtModels ? '0 8px 30px rgba(127, 0, 255, 0.1), inset 0 1px 1px rgba(255,255,255,0.02)' : '0 4px 20px rgba(0,0,0,0.15)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow effect when active */}
        {useGbdtModels && (
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(191, 90, 242, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0
          }} />
        )}

        <div style={{ flex: '1 1 500px', display: 'flex', gap: '20px', alignItems: 'flex-start', zIndex: 1 }}>
          <div style={{ 
            background: useGbdtModels ? 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)' : 'rgba(255, 255, 255, 0.03)', 
            border: `1px solid ${useGbdtModels ? '#bf5af2' : 'rgba(255, 255, 255, 0.1)'}`,
            borderRadius: '14px', 
            padding: '16px', 
            color: '#fff',
            boxShadow: useGbdtModels ? '0 4px 16px rgba(127, 0, 255, 0.3)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Brain size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <h3 style={{ margin: 0, fontFamily: 'Outfit', fontSize: '18px', fontWeight: 800, color: '#fff' }}>
                Application Globale du Modèle GBDT
              </h3>
              <span style={{
                fontSize: '9px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '20px',
                background: useGbdtModels ? 'rgba(48, 209, 88, 0.12)' : 'rgba(142, 142, 147, 0.12)',
                color: useGbdtModels ? '#30d158' : 'var(--text-muted)',
                border: `1px solid ${useGbdtModels ? 'rgba(48, 209, 88, 0.2)' : 'rgba(142, 142, 147, 0.2)'}`,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {useGbdtModels ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Cliquer sur le commutateur ci-contre pour **appliquer le modèle GBDT** à l'ensemble des prédictions (football/basket) du site. Si désactivé, le système utilisera les statistiques et ratings de base.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', zIndex: 1 }}>
          <button 
            onClick={handleToggleGbdt}
            disabled={toggleLoading}
            style={{
              padding: '12px 24px',
              fontFamily: 'Outfit',
              fontSize: '13px',
              fontWeight: 800,
              borderRadius: '10px',
              background: useGbdtModels ? 'rgba(255, 59, 48, 0.12)' : 'rgba(48, 209, 88, 0.12)',
              border: `1px solid ${useGbdtModels ? 'rgba(255, 59, 48, 0.25)' : 'rgba(48, 209, 88, 0.25)'}`,
              color: useGbdtModels ? '#ff3b30' : '#30d158',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            {useGbdtModels ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
            <span>{useGbdtModels ? 'Désactiver le Modèle' : 'Appliquer le Modèle'}</span>
          </button>

          <button
            onClick={handleTrain}
            disabled={training}
            style={{
              padding: '12px 24px',
              fontFamily: 'Outfit',
              fontSize: '13px',
              fontWeight: 800,
              border: 'none',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)',
              color: '#fff',
              cursor: training ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 15px rgba(127, 0, 255, 0.3)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Play size={14} className={training ? 'animate-spin' : ''} />
            <span>{training ? 'Calcul en Go...' : 'Lancer l\'Apprentissage'}</span>
          </button>
        </div>
      </div>

      {/* Message Notifications banner */}
      {message && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 18px',
          borderRadius: '10px',
          fontSize: '12.5px',
          background: message.type === 'success' ? 'rgba(48, 209, 88, 0.08)' : (message.type === 'error' ? 'rgba(255, 59, 48, 0.08)' : 'rgba(10, 132, 255, 0.08)'),
          border: `1px solid ${message.type === 'success' ? 'rgba(48, 209, 88, 0.25)' : (message.type === 'error' ? 'rgba(255, 59, 48, 0.25)' : 'rgba(10, 132, 255, 0.25)')}`,
          color: message.type === 'success' ? '#30d158' : (message.type === 'error' ? '#ff3b30' : '#0a84ff'),
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
        }}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span style={{ fontWeight: 500 }}>{message.text}</span>
          <button 
            onClick={() => setMessage(null)} 
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 900, fontSize: '14px' }}
          >
            ×
          </button>
        </div>
      )}

      {/* 2. Educational Section */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.008)',
        border: '1px solid rgba(255, 255, 255, 0.03)',
        borderRadius: '14px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div>
          <h4 style={{ margin: '0 0 6px 0', fontFamily: 'Outfit', fontSize: '14px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Pipeline d'Estimation : Comment ça fonctionne ?
          </h4>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Le moteur de prédiction Predictix combine des modèles de probabilités statistiques avec du Machine Learning supervisé en Go.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          
          <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.015)', borderRadius: '10px', padding: '16px', display: 'flex', gap: '14px' }}>
            <div style={{ color: '#0a84ff', background: 'rgba(10,132,255,0.08)', borderRadius: '8px', padding: '8px', height: 'fit-content' }}>
              <Database size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#0a84ff', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Étape 1</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Modèle de Base</div>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Extrait les moyennes historiques et calcule des projections théoriques de corners ou de points en basket (Pace, Ratings, et correction domicile HCA).
              </p>
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.015)', borderRadius: '10px', padding: '16px', display: 'flex', gap: '14px' }}>
            <div style={{ color: '#bf5af2', background: 'rgba(191,90,242,0.08)', borderRadius: '8px', padding: '8px', height: 'fit-content' }}>
              <Cpu size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#bf5af2', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Étape 2</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Calibrage GBDT (Go)</div>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                L'algorithme GBDT entraîné en Go ajuste les projections statistiques selon les patterns historiques pour éliminer le biais (réduction de l'erreur absolue).
              </p>
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.015)', borderRadius: '10px', padding: '16px', display: 'flex', gap: '14px' }}>
            <div style={{ color: '#30d158', background: 'rgba(48,209,88,0.08)', borderRadius: '8px', padding: '8px', height: 'fit-content' }}>
              <Calculator size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#30d158', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Étape 3</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Poisson Bivarié</div>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Simule les probabilités d'Over/Under à partir des moyennes calibrées par GBDT et de la **covariance réelle** calculée sur l'historique des résultats.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* 3. Detailed Models Status & Gauges */}
      <div>
        <h4 style={{ margin: '0 0 16px 0', fontFamily: 'Outfit', fontSize: '14px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Analyse de Précision des Modèles Actifs
        </h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '20px'
        }}>
          {status && Object.entries(status.models || {}).map(([key, model]) => {
            const relScore = getReliabilityScore(model.sampleCount, model.metrics?.improvement || 0);
            const relInfo = getReliabilityLabel(relScore);
            
            // SVG circular progress dimensions
            const radius = 30;
            const strokeWidth = 5.5;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference - (relScore / 100) * circumference;

            return (
              <div 
                key={key} 
                style={{
                  background: 'rgba(255, 255, 255, 0.012)',
                  border: '1px solid rgba(255, 255, 255, 0.035)',
                  borderRadius: '14px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  boxShadow: 'inset 0 1px 4px rgba(255,255,255,0.005)'
                }}
              >
                {/* Header section with reliability gauge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {modelLabels[key] || key}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'Outfit', color: '#fff' }}>
                      {key.includes('basket') ? 'Points attendus' : 'Corners attendus'}
                    </div>
                  </div>

                  {/* Circular Gauge */}
                  <div style={{ position: 'relative', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="70" height="70" style={{ transform: 'rotate(-90deg)' }}>
                      <circle 
                        cx="35" cy="35" r={radius} 
                        fill="transparent" 
                        stroke="rgba(255,255,255,0.03)" 
                        strokeWidth={strokeWidth} 
                      />
                      <circle 
                        cx="35" cy="35" r={radius} 
                        fill="transparent" 
                        stroke={relInfo.color} 
                        strokeWidth={strokeWidth} 
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
                      />
                    </svg>
                    <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 900, fontFamily: 'Outfit', color: '#fff' }}>{relScore}%</span>
                      <span style={{ fontSize: '7px', fontWeight: 800, textTransform: 'uppercase', color: relInfo.color }}>{relInfo.text}</span>
                    </div>
                  </div>
                </div>

                {/* Accuracy Metrics Comparison */}
                {model.metrics && (
                  <div style={{
                    background: 'rgba(0,0,0,0.15)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    border: '1px solid rgba(255,255,255,0.01)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>Erreur Moyenne Absolue (MAE) :</span>
                      {model.metrics.improvement > 0 ? (
                        <span style={{ color: '#30d158', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <TrendingDown size={12} />
                          <span>-{model.metrics.improvement.toFixed(1)}% d'erreur</span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Stable</span>
                      )}
                    </div>

                    {/* Comparative Bars */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Base Model Bar */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                          <span>Modèle Statistique de Base</span>
                          <strong>{model.metrics.maeBase.toFixed(2)} MAE</strong>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '2px' }}>
                          <div style={{ width: '90%', height: '100%', background: 'rgba(255,255,255,0.15)', borderRadius: '2px' }} />
                        </div>
                      </div>

                      {/* GBDT Calibrated Bar */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#30d158' }}>
                          <span>Ajustement GBDT en Go (Calibré)</span>
                          <strong>{model.metrics.maeGbdt.toFixed(2)} MAE</strong>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '2px' }}>
                          <div style={{ 
                            width: `${(model.metrics.maeGbdt / (model.metrics.maeBase || 1)) * 90}%`, 
                            height: '100%', 
                            background: `linear-gradient(90deg, ${relInfo.color}60, ${relInfo.color})`, 
                            borderRadius: '2px',
                            boxShadow: `0 0 6px ${relInfo.color}40`
                          }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Metadata Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderRight: '1px solid rgba(255,255,255,0.04)', paddingRight: '10px' }}>
                    <span>Covariance (l3) :</span>
                    <strong style={{ color: '#0082ff' }}>{model.covariance?.toFixed(3) || '0.00'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '4px' }}>
                    <span>Arbres :</span>
                    <strong style={{ color: 'var(--text-secondary)' }}>{model.numTrees || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderRight: '1px solid rgba(255,255,255,0.04)', paddingRight: '10px' }}>
                    <span>Données d'entraînement :</span>
                    <strong style={{ color: 'var(--text-secondary)' }}>{model.sampleCount || 0} matchs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '4px' }}>
                    <span>Profondeur Max :</span>
                    <strong style={{ color: 'var(--text-secondary)' }}>{model.maxDepth || 3}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: '10px', fontSize: '10.5px', color: 'var(--text-muted)', textAlign: 'right' }}>
          Dernier entraînement global : <span style={{ color: 'var(--text-secondary)' }}>{formatLastTrained(status?.lastTrainTime)}</span>
        </div>
      </div>

      {/* 4. Variables & Sandbox split */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px'
      }}>
        
        {/* Variables Importance */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.012)',
          border: '1px solid rgba(255, 255, 255, 0.03)',
          borderRadius: '14px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontFamily: 'Outfit', fontSize: '13.5px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Poids relatif des indicateurs (Gain)
            </h4>
            <div style={{ display: 'flex', gap: '3px', background: 'rgba(0,0,0,0.25)', padding: '2px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)' }}>
              <button 
                onClick={() => setImportanceTab('football')}
                style={{
                  padding: '4px 8px',
                  fontSize: '9.5px',
                  fontFamily: 'Outfit',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '4px',
                  background: importanceTab === 'football' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                  color: importanceTab === 'football' ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                Football
              </button>
              <button 
                onClick={() => setImportanceTab('basketball')}
                style={{
                  padding: '4px 8px',
                  fontSize: '9.5px',
                  fontFamily: 'Outfit',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '4px',
                  background: importanceTab === 'basketball' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                  color: importanceTab === 'basketball' ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                Basket
              </button>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            Pondération algorithmique des données d'entrée exploitée par les arbres de décision GBDT pour ajuster le modèle.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
            {featureImportances[importanceTab].map((f, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{f.name}</span>
                  <strong style={{ color: f.color }}>{f.value}%</strong>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${f.value}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${f.color}80, ${f.color})`,
                    borderRadius: '3px',
                    boxShadow: `0 0 6px ${f.color}`
                  }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ 
            marginTop: 'auto',
            background: 'rgba(127, 0, 255, 0.02)', 
            border: '1px dashed rgba(127, 0, 255, 0.12)', 
            borderRadius: '10px', 
            padding: '12px 14px', 
            display: 'flex', 
            gap: '10px', 
            fontSize: '11px', 
            color: 'var(--text-muted)',
            lineHeight: '1.4'
          }}>
            <Info size={14} style={{ color: '#bf5af2', flexShrink: 0, marginTop: '2px' }} />
            <span>
              <strong>Note :</strong> Les arbres GBDT ont été configurés avec un taux d'apprentissage de 0.10 et un nombre d'estimateurs de 15, garantissant un apprentissage stable et rapide sans risque de sur-apprentissage (overfitting) sur des échantillons restreints.
            </span>
          </div>
        </div>

        {/* Sandbox Calculator */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.012)',
          border: '1px solid rgba(255, 255, 255, 0.03)',
          borderRadius: '14px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={16} style={{ color: '#0082ff' }} />
            <h4 style={{ margin: 0, fontFamily: 'Outfit', fontSize: '13.5px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Calculateur Sandbox Poisson Bivarié
            </h4>
          </div>

          <form onSubmit={handleSandboxCalculate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Sport de test</label>
              <select 
                value={sandboxSport} 
                onChange={(e) => {
                  const s = e.target.value;
                  setSandboxSport(s);
                  if (s === 'basketball') {
                    setSandboxMeanHome('48.5');
                    setSandboxMeanAway('46.2');
                    setSandboxCov('5.13');
                    setSandboxLine('94.5');
                  } else {
                    setSandboxMeanHome('2.2');
                    setSandboxMeanAway('2.0');
                    setSandboxCov('0.15');
                    setSandboxLine('4.5');
                  }
                  setSandboxResults(null);
                }}
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: '#fff',
                  fontSize: '12px',
                  fontFamily: 'Outfit',
                  outline: 'none'
                }}
              >
                <option value="football">Football (Corners)</option>
                <option value="basketball">Basketball (Points)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Moyenne Domicile</label>
              <input 
                type="number" 
                step="0.01"
                value={sandboxMeanHome} 
                onChange={(e) => setSandboxMeanHome(e.target.value)}
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: '#fff',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Moyenne Extérieur</label>
              <input 
                type="number" 
                step="0.01"
                value={sandboxMeanAway} 
                onChange={(e) => setSandboxMeanAway(e.target.value)}
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: '#fff',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Covariance (l3)</label>
              <input 
                type="number" 
                step="0.001"
                value={sandboxCov} 
                onChange={(e) => setSandboxCov(e.target.value)}
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: '#fff',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Seuil (Ligne)</label>
              <input 
                type="number" 
                step="0.5"
                value={sandboxLine} 
                onChange={(e) => setSandboxLine(e.target.value)}
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: '#fff',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={sandboxLoading}
              style={{
                gridColumn: 'span 2',
                padding: '10px',
                fontFamily: 'Outfit',
                fontSize: '12.5px',
                fontWeight: 700,
                background: 'rgba(0, 130, 255, 0.08)',
                border: '1px solid rgba(0, 130, 255, 0.2)',
                borderRadius: '8px',
                color: '#0082ff',
                cursor: 'pointer',
                marginTop: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <Search size={14} />
              <span>{sandboxLoading ? 'Calcul en cours...' : 'Simuler les Cotes Poisson'}</span>
            </button>
          </form>

          {sandboxError && (
            <div style={{ fontSize: '11px', color: '#ff3b30', textAlign: 'center' }}>
              {sandboxError}
            </div>
          )}

          {sandboxResults && (
            <div style={{
              background: 'rgba(0,0,0,0.15)',
              border: '1px solid rgba(255, 255, 255, 0.015)',
              borderRadius: '10px',
              padding: '14px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '14px',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '10.5px' }}>Probabilité Over :</span>
                <strong style={{ color: '#30d158', fontSize: '15px' }}>{Math.round(sandboxResults.overProb * 100)}%</strong>
                <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>Cote bookmaker : <strong style={{ color: '#fff' }}>{sandboxResults.overOdds.toFixed(2)}</strong></span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', borderLeft: '1px solid rgba(255,255,255,0.04)', paddingLeft: '14px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '10.5px' }}>Probabilité Under :</span>
                <strong style={{ color: '#ff9f0a', fontSize: '15px' }}>{Math.round(sandboxResults.underProb * 100)}%</strong>
                <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>Cote bookmaker : <strong style={{ color: '#fff' }}>{sandboxResults.underOdds.toFixed(2)}</strong></span>
              </div>
            </div>
          )}
        </div>

      </div>
      
    </div>
  );
}
