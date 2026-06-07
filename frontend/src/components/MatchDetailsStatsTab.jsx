import React from 'react';

export default function MatchDetailsStatsTab({
  selectedMatchDetails,
  activeMetric,
  metricTitle,
  metricUnit,
  getAverage
}) {
  const h2hAvg = getAverage(selectedMatchDetails.recent_h2h_matches, activeMetric);
  const homeAvg = getAverage(selectedMatchDetails.recent_home_matches, activeMetric, true);
  const awayAvg = getAverage(selectedMatchDetails.recent_away_matches, activeMetric, false, true);

  return (
    <div className="grid-3" style={{ gap: '12px', marginBottom: '24px' }}>
      <div style={{ 
        background: 'linear-gradient(135deg, rgba(9, 132, 227, 0.08) 0%, rgba(9, 132, 227, 0.01) 100%)', 
        padding: '14px 12px', 
        borderRadius: '10px', 
        border: '1px solid rgba(9, 132, 227, 0.18)', 
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      }}>
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Moy. {metricTitle} H2H</span>
        <p style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px', color: 'var(--color-accent-solid)', margin: 0, fontFamily: 'Outfit' }}>
          {h2hAvg !== null ? `${h2hAvg}${metricUnit}` : 'N/A'}
        </p>
      </div>
      <div style={{ 
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.01) 100%)', 
        padding: '14px 12px', 
        borderRadius: '10px', 
        border: '1px solid rgba(16, 185, 129, 0.18)', 
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      }}>
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Moy. {selectedMatchDetails.home_team}</span>
        <p style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px', color: 'var(--color-success)', margin: 0, fontFamily: 'Outfit' }}>
          {homeAvg !== null ? `${homeAvg}${metricUnit}` : 'N/A'}
        </p>
      </div>
      <div style={{ 
        background: 'linear-gradient(135deg, rgba(235, 94, 40, 0.08) 0%, rgba(235, 94, 40, 0.01) 100%)', 
        padding: '14px 12px', 
        borderRadius: '10px', 
        border: '1px solid rgba(235, 94, 40, 0.15)', 
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      }}>
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Moy. {selectedMatchDetails.away_team}</span>
        <p style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px', color: 'var(--color-danger)', margin: 0, fontFamily: 'Outfit' }}>
          {awayAvg !== null ? `${awayAvg}${metricUnit}` : 'N/A'}
        </p>
      </div>
    </div>
  );
}
