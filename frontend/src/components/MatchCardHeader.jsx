import React from 'react';
import { Info } from 'lucide-react';

const getMetricBadgeStyle = (metric) => {
  switch (metric) {
    case 'fouls':
      return { background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' };
    case 'yellow_cards':
      return { background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', color: '#eab308' };
    case 'possession':
      return { background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#3b82f6' };
    case 'shots_on_target':
    case 'shots':
      return { background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981' };
    default:
      return { background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#8b5cf6' };
  }
};

const getMetricLabel = (metric) => {
  const labels = {
    fouls: 'Fautes',
    yellow_cards: 'Cartons Jaunes',
    possession: 'Possession',
    shots_on_target: 'Tirs Cadrés',
    shots: 'Tirs',
    offsides: 'Hors-jeu',
    corners: 'Corners'
  };
  return labels[metric] || metric;
};

const getMetricExplanation = (metric) => {
  const explanations = {
    corners: 'Moyenne de corners cumulés en première mi-temps.',
    yellow_cards: 'Cartons jaunes reçus par match.',
    fouls: 'Fautes commises par match.',
    possession: 'Possession moyenne du ballon.',
    shots_on_target: 'Tirs cadrés cadrés par match.',
    shots: 'Tirs totaux par match.',
    offsides: 'Hors-jeu signalés par match.'
  };
  return explanations[metric] || `Statistiques pour ${metric}.`;
};

export default function MatchCardHeader({
  sig,
  activeBetMetric,
  isSelected,
  setSelectedPredIds
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
        <input 
          type="checkbox" 
          checked={isSelected}
          onChange={() => {
            if (isSelected) {
              setSelectedPredIds(prev => prev.filter(id => id !== sig.match_id));
            } else {
              setSelectedPredIds(prev => [...prev, sig.match_id]);
            }
          }}
          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#bf5af2' }}
        />
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          {sig.sport && sig.sport !== 'football' && (
            <span style={{ background: 'rgba(0, 130, 255, 0.15)', color: '#0082ff', padding: '2px 6px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              {sig.sport}
            </span>
          )}
          <span>{sig.tournament}</span>
        </span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="badge" style={getMetricBadgeStyle(activeBetMetric)}>
            {getMetricLabel(activeBetMetric)}
          </span>
          <div className="tooltip-container" onClick={(e) => e.stopPropagation()}>
            <Info size={13} style={{ color: '#bf5af2', opacity: 0.8, cursor: 'help' }} />
            <div className="tooltip-content" style={{
              position: 'absolute', bottom: '100%', right: '0', marginBottom: '8px',
              background: 'rgba(20, 20, 22, 0.97)', border: '1px solid rgba(191, 90, 242, 0.35)',
              color: 'var(--text-primary)', padding: '10px 14px', borderRadius: '8px',
              fontSize: '11.5px', fontFamily: 'Outfit', fontWeight: 500, whiteSpace: 'normal',
              width: '260px', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
              zIndex: 100, pointerEvents: 'none', opacity: 0, transform: 'translateY(6px)',
              transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)', textAlign: 'left', lineHeight: '1.45'
            }}>
              <div style={{ fontWeight: 700, color: '#bf5af2', marginBottom: '4px', fontSize: '12px' }}>
                {getMetricLabel(activeBetMetric)}
              </div>
              {getMetricExplanation(activeBetMetric)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
