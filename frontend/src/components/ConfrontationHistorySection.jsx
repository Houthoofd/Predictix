import React from 'react';
import ConfrontationActiveBadge from './ConfrontationActiveBadge';
import ConfrontationStatsGauge from './ConfrontationStatsGauge';

export default function ConfrontationHistorySection({
  title,
  matches,
  type,
  targetTeam,
  expandedRowKey,
  toggleExpandRow,
  getOutcomeIndicator,
  activeMetric
}) {
  return (
    <div>
      {title && (
        <h4 style={{ fontSize: '13px', fontFamily: 'Outfit', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px' }}>
          {title}
        </h4>
      )}
      {matches && matches.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
          {matches.map((m, idx) => {
            const isExpanded = expandedRowKey === `${type}-${idx}`;
            const outcome = getOutcomeIndicator(m, targetTeam);
            return (
              <div 
                key={idx} 
                onClick={() => toggleExpandRow(type, idx)}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  padding: '8px 12px', 
                  background: 'rgba(255,255,255,0.015)', 
                  border: isExpanded ? '1px solid var(--color-accent-solid)' : '1px solid var(--border-color)', 
                  borderRadius: '6px', 
                  fontSize: '12.5px', 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isExpanded ? '0 0 10px rgba(0, 130, 255, 0.05)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', width: '115px', flexShrink: 0 }}>
                    {outcome && (
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        width: '18px', 
                        height: '18px', 
                        borderRadius: '4px', 
                        fontSize: '10px', 
                        fontWeight: 800, 
                        color: outcome.color, 
                        background: outcome.bg, 
                        border: outcome.border, 
                        marginRight: '8px', 
                        flexShrink: 0 
                      }}>
                        {outcome.label}
                      </span>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600 }}>{m.date}</span>
                      {m.time && m.time !== 'Finished' && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '9.5px', fontFamily: 'Outfit' }}>{m.time}</span>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexGrow: 1, justifyContent: 'center', padding: '0 8px' }}>
                    {m.home_logo ? (
                      <img src={m.home_logo} alt="" referrerPolicy="no-referrer" style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'contain', background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--bg-tertiary)', flexShrink: 0 }} />
                    )}
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{m.home_team}</span>
                    
                    <strong style={{ color: 'var(--text-muted)', margin: '0 4px', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', flexShrink: 0 }}>{m.score}</strong>
                    
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{m.away_team}</span>
                    {m.away_logo ? (
                      <img src={m.away_logo} alt="" referrerPolicy="no-referrer" style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'contain', background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--bg-tertiary)', flexShrink: 0 }} />
                    )}
                  </div>
                  
                  <ConfrontationActiveBadge m={m} activeMetric={activeMetric} />
                </div>
                {isExpanded && <ConfrontationStatsGauge m={m} />}
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Aucun match récent en cache.</p>
      )}
    </div>
  );
}
