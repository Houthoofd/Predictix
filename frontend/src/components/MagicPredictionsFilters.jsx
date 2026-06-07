import React from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';

export default function MagicPredictionsFilters({
  minCoverage,
  setMinCoverage,
  loading,
  fetchSignals
}) {
  return (
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
  );
}
