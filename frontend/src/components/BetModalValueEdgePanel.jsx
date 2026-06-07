import React from 'react';
import { Info } from 'lucide-react';

export default function BetModalValueEdgePanel({ hasValidCalc, valueEdge, fairOdds }) {
  if (!hasValidCalc) return null;
  
  return (
    <div style={{
      background: valueEdge > 0 
        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.03) 100%)' 
        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.015) 100%)',
      border: valueEdge > 0 
        ? '1px solid rgba(16, 185, 129, 0.3)' 
        : '1px solid rgba(239, 68, 68, 0.2)',
      padding: '14px 16px',
      borderRadius: '8px',
      boxShadow: valueEdge > 0 ? '0 0 15px rgba(16, 185, 129, 0.05)' : 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      fontFamily: 'Outfit',
      transition: 'all 0.2s ease'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <span style={{ 
          fontSize: '11px', 
          fontWeight: 800, 
          color: valueEdge > 0 ? 'var(--color-success)' : '#ef4444',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{ 
            width: '6px', 
            height: '6px', 
            borderRadius: '50%', 
            background: valueEdge > 0 ? 'var(--color-success)' : '#ef4444', 
            display: 'inline-block',
            boxShadow: valueEdge > 0 ? '0 0 8px var(--color-success)' : 'none'
          }}></span>
          {valueEdge > 0 ? 'VALUE BET DÉTECTÉ' : 'EDGE NÉGATIF / PAS DE VALUE'}
        </span>
        <span style={{ 
          fontSize: '14px', 
          fontWeight: 800, 
          color: valueEdge > 0 ? 'var(--color-success)' : '#ef4444' 
        }}>
          {valueEdge > 0 ? `+${valueEdge.toFixed(1)}% Edge` : `${valueEdge.toFixed(1)}% Edge`}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
        <span>Cote Juste Estimée :</span>
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fairOdds}</span>
      </div>

      <div style={{ 
        fontSize: '11px', 
        color: 'var(--text-muted)', 
        borderTop: '1px solid rgba(255, 255, 255, 0.03)', 
        paddingTop: '6px',
        fontStyle: 'italic',
        lineHeight: 1.3,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '6px'
      }}>
        <Info size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '1px' }} />
        <span>Saisir la cote réelle de votre bookmaker aide le modèle Predictix à mesurer les écarts du marché réel pour auto-calibrer et affiner ses cotes théoriques futures.</span>
      </div>
    </div>
  );
}
