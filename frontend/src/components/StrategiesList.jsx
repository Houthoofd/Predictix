import React from 'react';
import { Database, TrendingUp, ToggleRight, ToggleLeft, Trash2, HelpCircle } from 'lucide-react';
import { getMetricLabel } from '../utils/labels';

export default function StrategiesList({
  strategies,
  loading,
  defaultOdds,
  setDefaultOdds,
  minCoverage,
  setMinCoverage,
  handleRunBacktest,
  backtestingId,
  handleToggleStatus,
  handleDeleteStrategy
}) {
  return (
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
  );
}
