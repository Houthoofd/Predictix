import React, { useState, useEffect } from 'react';
import { Database } from 'lucide-react';
import StrategyNLPForm from './StrategyNLPForm';
import StrategiesList from './StrategiesList';
import StrategyBacktestResults from './StrategyBacktestResults';

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* 1. Header Information Panel */}
      <div className="glass-card accent-left">
        <h3 style={{ fontSize: '20px', fontFamily: 'Outfit', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={20} style={{ color: 'var(--color-accent-solid)' }} />
          Créateur de Stratégies Magiques (Magic Strategy Creator)
        </h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Rédigez votre concept de paris sportifs en langage naturel (ex : <em>"j'aimerais créer une stratégie sur les fautes au football avec au moins 24 fautes sur les 5 confrontations H2H"</em>). 
          Predictix va instantanément traduire votre phrase en formules de filtres mathématiques, collecter les indicateurs 
          grâce à son scraper en Tor et vous avertir sur les prochains matchs dès qu'un signal est détecté dans le H2H !
        </p>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <StrategyNLPForm
          prompt={prompt}
          setPrompt={setPrompt}
          creating={creating}
          handleCreateStrategy={handleCreateStrategy}
          error={error}
          successMsg={successMsg}
          creationStep={creationStep}
          creationSteps={creationSteps}
        />

        <StrategiesList
          strategies={strategies}
          loading={loading}
          defaultOdds={defaultOdds}
          setDefaultOdds={setDefaultOdds}
          minCoverage={minCoverage}
          setMinCoverage={setMinCoverage}
          handleRunBacktest={handleRunBacktest}
          backtestingId={backtestingId}
          handleToggleStatus={handleToggleStatus}
          handleDeleteStrategy={handleDeleteStrategy}
        />
      </div>
      
      {backtestResults && (
        <StrategyBacktestResults
          backtestResults={backtestResults}
          defaultOdds={defaultOdds}
          minCoverage={minCoverage}
          setBacktestResults={setBacktestResults}
        />
      )}

    </div>
  );
}
