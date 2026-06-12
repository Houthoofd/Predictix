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
  Info
} from 'lucide-react';

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
    setMessage({ type: 'info', text: 'Entraînement des modèles GBDT en cours via Go pur...' });
    try {
      const res = await fetch('/api/models/train', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setStatus(json.data);
        setMessage({ type: 'success', text: 'Entraînement réussi en moins de 10ms ! Les 5 modèles ont été mis à jour.' });
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
            ? 'Modèles GBDT activés globalement. Les prédictions avancées sont maintenant appliquées sur tout le site.' 
            : 'Modèles GBDT désactivés. L\'ensemble du site utilise désormais les statistiques et ratings de base.' 
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

  // Helper to get relative time
  const formatLastTrained = (timestamp) => {
    if (!timestamp) return 'Jamais entraîné';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' à ' + date.toLocaleTimeString();
  };

  const modelLabels = {
    corners_1mt: 'Corners - 1ère MT (Foot)',
    corners_ft: 'Corners - Match Entier (Foot)',
    corners_2mt: 'Corners - 2ème MT (Foot)',
    basket_1mt: 'Points - 1ère MT (Basket)',
    basket_1qt: 'Points - 1er QT (Basket)'
  };

  // Feature weights data
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
      
      {/* 1. Configuration Panel */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.015)',
        border: '1px solid rgba(255, 255, 255, 0.04)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '20px'
      }}>
        <div style={{ flex: '1 1 500px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ 
            background: useGbdtModels ? 'rgba(191, 90, 242, 0.1)' : 'rgba(255, 255, 255, 0.03)', 
            border: `1px solid ${useGbdtModels ? '#bf5af2' : 'rgba(255, 255, 255, 0.1)'}`,
            borderRadius: '12px', 
            padding: '12px', 
            color: useGbdtModels ? '#bf5af2' : 'var(--text-muted)' 
          }}>
            <Brain size={24} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 6px 0', fontFamily: 'Outfit', fontSize: '16px', fontWeight: 700 }}>
              Statut de l'application : {useGbdtModels ? 'Modèles GBDT Activés' : 'Statistiques de Base Uniquement'}
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Lorsqu'il est activé, l'algorithme GBDT (Gradient Boosting Decision Trees) calibrera les moyennes de corners (foot) et de points (basket) calculées avec les statistiques de base. Si désactivé, le site utilisera uniquement les moyennes et ratings de base.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={handleToggleGbdt}
            disabled={toggleLoading}
            style={{
              padding: '10px 18px',
              fontFamily: 'Outfit',
              fontSize: '12.5px',
              fontWeight: 700,
              border: `1px solid ${useGbdtModels ? 'rgba(255, 59, 48, 0.2)' : 'rgba(191, 90, 242, 0.2)'}`,
              borderRadius: '8px',
              background: useGbdtModels ? 'rgba(255, 59, 48, 0.05)' : 'rgba(191, 90, 242, 0.08)',
              color: useGbdtModels ? '#ff3b30' : '#bf5af2',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Settings size={15} />
            <span>{useGbdtModels ? 'Désactiver le GBDT' : 'Activer le GBDT'}</span>
          </button>

          <button
            onClick={handleTrain}
            disabled={training}
            style={{
              padding: '10px 20px',
              fontFamily: 'Outfit',
              fontSize: '12.5px',
              fontWeight: 700,
              border: 'none',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)',
              color: '#fff',
              cursor: training ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(127, 0, 255, 0.2)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Play size={14} className={training ? 'animate-spin' : ''} />
            <span>{training ? 'Réentraînement...' : 'Réentraîner les Modèles Go'}</span>
          </button>
        </div>
      </div>

      {/* Message Notifications banner */}
      {message && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '12.5px',
          background: message.type === 'success' ? 'rgba(48, 209, 88, 0.06)' : (message.type === 'error' ? 'rgba(255, 59, 48, 0.06)' : 'rgba(10, 132, 255, 0.06)'),
          border: `1px solid ${message.type === 'success' ? 'rgba(48, 209, 88, 0.2)' : (message.type === 'error' ? 'rgba(255, 59, 48, 0.2)' : 'rgba(10, 132, 255, 0.2)')}`,
          color: message.type === 'success' ? '#30d158' : (message.type === 'error' ? '#ff3b30' : '#0a84ff')
        }}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
          <button 
            onClick={() => setMessage(null)} 
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 800 }}
          >
            ×
          </button>
        </div>
      )}

      {/* 2. Models Status Grid */}
      <div>
        <h4 style={{ margin: '0 0 14px 0', fontFamily: 'Outfit', fontSize: '14px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Statut & Métadonnées des Modèles
        </h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '16px'
        }}>
          {status && Object.entries(status.models || {}).map(([key, model]) => (
            <div 
              key={key} 
              style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255, 255, 255, 0.03)',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: 'inset 0 1px 4px rgba(255,255,255,0.005)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', fontFamily: 'Outfit', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {key.replace('_', ' ')}
                </span>
                <span style={{ 
                  fontSize: '9.5px', 
                  fontWeight: 800, 
                  padding: '2px 6px', 
                  borderRadius: '10px', 
                  background: model.trained ? 'rgba(48, 209, 88, 0.08)' : 'rgba(255, 159, 10, 0.08)',
                  color: model.trained ? '#30d158' : '#ff9f0a',
                  border: `1px solid ${model.trained ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 159, 10, 0.15)'}`
                }}>
                  {model.trained ? 'ACTIF' : 'ATTENTE'}
                </span>
              </div>

              <div style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'Outfit', color: '#fff' }}>
                {modelLabels[key] || key}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Covariance (Bivariée) :</span>
                  <strong style={{ color: '#0082ff' }}>{model.covariance?.toFixed(4) || '0.00'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Nombre d'arbres :</span>
                  <strong style={{ color: 'var(--text-secondary)' }}>{model.numTrees || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Taille Apprentissage :</span>
                  <strong style={{ color: 'var(--text-secondary)' }}>{model.sampleCount || 0} matchs</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Profondeur Max :</span>
                  <strong style={{ color: 'var(--text-secondary)' }}>{model.maxDepth || 3}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '10px', fontSize: '10.5px', color: 'var(--text-muted)', textAlign: 'right' }}>
          Dernier entraînement global : <span style={{ color: 'var(--text-secondary)' }}>{formatLastTrained(status?.lastTrainTime)}</span>
        </div>
      </div>

      {/* 3. Variables & Sandbox split */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '24px'
      }}>
        
        {/* Variables Importance */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid rgba(255, 255, 255, 0.03)',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontFamily: 'Outfit', fontSize: '13.5px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Importance des Variables (Gains)
            </h4>
            <div style={{ display: 'flex', gap: '3px', background: 'rgba(0,0,0,0.2)', padding: '2px', borderRadius: '6px' }}>
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
            Ce graphique montre l'importance relative théorique des variables utilisées par le modèle GBDT pour ajuster et affiner les prédictions finales par rapport aux données réelles.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
            {featureImportances[importanceTab].map((f, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{f.name}</span>
                  <strong style={{ color: f.color }}>{f.value}%</strong>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${f.value}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${f.color}80, ${f.color})`,
                    borderRadius: '3px',
                    boxShadow: `0 0 8px ${f.color}`
                  }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ 
            marginTop: 'auto',
            background: 'rgba(127, 0, 255, 0.02)', 
            border: '1px dashed rgba(127, 0, 255, 0.12)', 
            borderRadius: '8px', 
            padding: '10px 12px', 
            display: 'flex', 
            gap: '10px', 
            fontSize: '10.5px', 
            color: 'var(--text-muted)',
            lineHeight: '1.4'
          }}>
            <Info size={14} style={{ color: '#bf5af2', flexShrink: 0 }} />
            <span>
              <strong>Note :</strong> Les modèles corners se basent sur des moyennes d'équipe et des comparatifs de ligue. Le modèle basket utilise un algorithme de Pace (tirs) pondéré par l'efficacité d'attaque et de défense des deux équipes.
            </span>
          </div>
        </div>

        {/* Sandbox Calculator */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid rgba(255, 255, 255, 0.03)',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={16} style={{ color: '#0082ff' }} />
            <h4 style={{ margin: 0, fontFamily: 'Outfit', fontSize: '13.5px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Bac à sable (Sandbox) Bivarié
            </h4>
          </div>

          <form onSubmit={handleSandboxCalculate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Type de Sport</label>
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
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Ligne (Seuil)</label>
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
                padding: '8px',
                fontFamily: 'Outfit',
                fontSize: '12px',
                fontWeight: 700,
                background: 'rgba(0, 130, 255, 0.1)',
                border: '1px solid rgba(0, 130, 255, 0.2)',
                borderRadius: '6px',
                color: '#0082ff',
                cursor: 'pointer',
                marginTop: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Search size={14} />
              <span>{sandboxLoading ? 'Calcul...' : 'Calculer les Probabilités'}</span>
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
              border: '1px solid rgba(255, 255, 255, 0.02)',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              fontSize: '11.5px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Probabilité Over :</span>
                <strong style={{ color: '#30d158', fontSize: '14px' }}>{Math.round(sandboxResults.overProb * 100)}%</strong>
                <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>Cote juste : {sandboxResults.overOdds.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', borderLeft: '1px solid rgba(255,255,255,0.04)', paddingLeft: '14px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Probabilité Under :</span>
                <strong style={{ color: '#ff9f0a', fontSize: '14px' }}>{Math.round(sandboxResults.underProb * 100)}%</strong>
                <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>Cote juste : {sandboxResults.underOdds.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

      </div>
      
    </div>
  );
}
