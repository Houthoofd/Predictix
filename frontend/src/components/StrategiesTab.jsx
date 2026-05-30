import React from 'react';

export default function StrategiesTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Introduction strategies */}
      <div className="glass-card accent-left">
        <h3 style={{ fontSize: '20px', fontFamily: 'Outfit', marginBottom: '12px' }}>
          Comment utiliser les statistiques automatiques ?
        </h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Les paris sportifs ne sont pas qu'une question de hasard, c'est une question de **value betting** (trouver des cotes mal ajustées). En utilisant le scraper Match en Direct football spécialisé sur les **Cartons Jaunes et Rouges Over/Under**, nous ciblons les ligues et les équipes avec un historique d'agressivité élevé et des arbitres sévères.
        </p>
      </div>

      {/* Visual Strategies grid */}
      <div className="grid-2">
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div className="logo-icon">1</div>
            <h4 style={{ fontSize: '18px', fontFamily: 'Outfit' }}>La Stratégie "Forte Probabilité ≥60%"</h4>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5, marginBottom: '16px' }}>
            Ne pariez **uniquement** que sur les matchs où le modèle prédictif Match en Direct affiche un taux de confiance supérieur ou égal à **60%** pour l'Over de cartons.
          </p>
          <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <p style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Simulation de Rentabilité</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <span>Taux de Réussite Théorique:</span>
              <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>~64.5%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              <span>Cote moyenne visée:</span>
              <span style={{ fontWeight: 700 }}>1.78</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              <span>ROI moyen estimé:</span>
              <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>+14.8 %</span>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div className="logo-icon">2</div>
            <h4 style={{ fontSize: '18px', fontFamily: 'Outfit' }}>La Stratégie "Value Over 4.5"</h4>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5, marginBottom: '16px' }}>
            Ciblez les matchs de championnats agressifs (ex: LaLiga espagnole, Serie A italienne, Super Lig turque) avec une ligne proposée de **4.5 cartons** et une cote de l'Over supérieure à **1.80**.
          </p>
          <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <p style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Simulation de Rentabilité</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <span>Taux de Réussite Théorique:</span>
              <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>~58.0%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              <span>Cote moyenne visée:</span>
              <span style={{ fontWeight: 700 }}>1.95</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              <span>ROI moyen estimé:</span>
              <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>+13.1 %</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
