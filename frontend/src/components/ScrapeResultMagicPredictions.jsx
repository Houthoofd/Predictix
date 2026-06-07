import React from 'react';
import { Sparkles } from 'lucide-react';

export default function ScrapeResultMagicPredictions({ magicPredictions }) {
  if (!magicPredictions || magicPredictions.length === 0) return null;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
      <h4 style={{ 
        fontSize: '13px', 
        fontWeight: 700, 
        textTransform: 'uppercase', 
        letterSpacing: '0.05em', 
        color: '#bf5af2', 
        marginBottom: '4px', 
        fontFamily: 'Outfit',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <Sparkles size={14} style={{ color: '#bf5af2' }} />
        <span>Pronostics Magiques Détectés ({magicPredictions.length})</span>
      </h4>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
        {magicPredictions.map((sig, idx) => (
          <div key={idx} style={{ 
            background: 'rgba(191, 90, 242, 0.03)', 
            border: '1px solid rgba(191, 90, 242, 0.15)', 
            borderRadius: '8px', 
            padding: '12px 14px', 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px'
          }}>
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '13px' }}>
                {sig.home_team} vs {sig.away_team}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Règle : {sig.strategy_name} (Moyenne : <strong style={{ color: '#bf5af2' }}>{sig.avg_value}</strong>)
              </div>
            </div>
            
            <span style={{ 
              fontSize: '11px', 
              background: 'rgba(191, 90, 242, 0.1)', 
              border: '1px solid rgba(191, 90, 242, 0.25)', 
              color: '#bf5af2',
              padding: '3px 8px',
              borderRadius: '12px',
              fontWeight: 700
            }}>
              {sig.metric.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
