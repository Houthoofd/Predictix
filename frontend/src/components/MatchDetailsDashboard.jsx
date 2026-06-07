import React from 'react';

export default function MatchDetailsDashboard({
  selectedMatchDetails,
  availableMetrics,
  getAverage,
  getMetricTitle
}) {
  return (
    <div style={{ 
      background: 'rgba(255, 255, 255, 0.015)', 
      border: '1px solid rgba(255, 255, 255, 0.03)', 
      borderRadius: '10px', 
      padding: '16px 20px', 
      marginBottom: '24px',
      boxShadow: 'inset 0 1px 4px rgba(255,255,255,0.01)'
    }}>
      <h4 style={{ 
        fontSize: '11px', 
        fontFamily: 'Outfit', 
        fontWeight: 800, 
        color: 'var(--color-accent-solid)', 
        marginBottom: '14px', 
        textTransform: 'uppercase', 
        letterSpacing: '0.08em', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px' 
      }}>
        <span>BILAN COMPARATIF DES MOYENNES</span>
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {/* Header Row */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: '9px', 
          fontWeight: 800, 
          color: 'var(--text-muted)', 
          borderBottom: '1px solid rgba(255,255,255,0.04)', 
          paddingBottom: '8px', 
          textTransform: 'uppercase', 
          letterSpacing: '0.08em' 
        }}>
          <span style={{ width: '40%', minWidth: '110px' }}>Statistique</span>
          <span style={{ width: '20%', textAlign: 'center' }}>{selectedMatchDetails.home_team}</span>
          <span style={{ width: '20%', textAlign: 'center', color: 'var(--color-accent-solid)' }}>Moy. H2H</span>
          <span style={{ width: '20%', textAlign: 'center' }}>{selectedMatchDetails.away_team}</span>
        </div>
        
        {/* Data Rows */}
        <div style={{ 
          maxHeight: '280px', 
          overflowY: 'auto', 
          paddingRight: '4px', 
          scrollbarWidth: 'thin', 
          scrollbarColor: 'rgba(255,255,255,0.1) transparent' 
        }}>
          {availableMetrics.filter(m => m !== 'dashboard').map((m) => {
            const h2hAvg = getAverage(selectedMatchDetails.recent_h2h_matches, m);
            const homeAvg = getAverage(selectedMatchDetails.recent_home_matches, m, true);
            const awayAvg = getAverage(selectedMatchDetails.recent_away_matches, m, false, true);
            const unit = m === 'possession' ? '%' : '';
            
            if (h2hAvg === null && homeAvg === null && awayAvg === null) return null;
            
            const totalVal = (homeAvg || 0) + (awayAvg || 0);
            const pctH = totalVal > 0 ? ((homeAvg || 0) / totalVal) * 100 : 50;
            const pctA = 100 - pctH;

            return (
              <div key={m} style={{ 
                display: 'flex', 
                flexDirection: 'column',
                padding: '8px 0', 
                borderBottom: '1px solid rgba(255, 255, 255, 0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', alignItems: 'center' }}>
                  <span style={{ width: '40%', minWidth: '110px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {getMetricTitle(m)}
                  </span>
                  <span style={{ width: '20%', textAlign: 'center', fontWeight: 700, color: 'var(--color-success)' }}>
                    {homeAvg !== null ? `${homeAvg}${unit}` : 'N/A'}
                  </span>
                  <span style={{ width: '20%', textAlign: 'center', fontWeight: 800, color: 'var(--color-accent-solid)' }}>
                    {h2hAvg !== null ? `${h2hAvg}${unit}` : 'N/A'}
                  </span>
                  <span style={{ width: '20%', textAlign: 'center', fontWeight: 700, color: 'var(--color-danger)' }}>
                    {awayAvg !== null ? `${awayAvg}${unit}` : 'N/A'}
                  </span>
                </div>
                
                {/* Mini inline split progress line */}
                {homeAvg !== null && awayAvg !== null && (
                  <div style={{ height: '2px', width: '100%', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '1px', overflow: 'hidden', display: 'flex', marginTop: '5px' }}>
                    <div style={{ width: `${pctH}%`, background: 'var(--color-success)', opacity: 0.6, height: '100%' }} />
                    <div style={{ width: `${pctA}%`, background: 'var(--color-danger)', opacity: 0.6, height: '100%' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
