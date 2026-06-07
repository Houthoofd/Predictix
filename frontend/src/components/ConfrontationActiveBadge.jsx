import React from 'react';

export default function ConfrontationActiveBadge({ m, activeMetric }) {
  if (activeMetric === 'dashboard') {
    return (
      <span style={{ fontWeight: 700, color: 'var(--color-accent-solid)', background: 'rgba(9, 132, 227, 0.08)', padding: '3px 8px', borderRadius: '4px', fontSize: '10.5px', marginLeft: '12px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
        Détails
      </span>
    );
  }
  if (activeMetric === 'corners') {
    return (
      <span style={{ fontWeight: 700, color: 'var(--color-success)', background: 'rgba(16, 185, 129, 0.08)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', marginLeft: '12px', flexShrink: 0 }}>
        Corners: {m.first_half_corners_home} - {m.first_half_corners_away}
      </span>
    );
  }
  
  let stats = null;
  try {
    if (m.statistics_json) {
      stats = typeof m.statistics_json === 'string' ? JSON.parse(m.statistics_json) : m.statistics_json;
    }
  } catch (e) {}
  
  if (!stats || !stats[activeMetric]) {
    return (
      <span style={{ fontWeight: 600, color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.02)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', marginLeft: '12px', flexShrink: 0 }}>
        N/A
      </span>
    );
  }
  
  const valHome = stats[activeMetric].home;
  const valAway = stats[activeMetric].away;
  const formatted = activeMetric === 'possession' ? `${valHome}% - ${valAway}%` : `${valHome} - ${valAway}`;
  
  const getMetricShortLabel = (key) => {
    const labels = {
      corners: 'Corners 1MT',
      fouls: 'Fautes',
      yellow_cards: 'Cartons',
      possession: 'Poss.',
      shots_on_target: 'Tirs Cad',
      shots: 'Tirs',
      offsides: 'Hors-jeu',
      red_cards: 'Cartons R.'
    };
    if (labels[key]) return labels[key];
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  const label = getMetricShortLabel(activeMetric);
  
  return (
    <span style={{ fontWeight: 700, color: 'var(--color-accent-solid)', background: 'rgba(9, 132, 227, 0.08)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', marginLeft: '12px', flexShrink: 0 }}>
      {label}: {formatted}
    </span>
  );
}
