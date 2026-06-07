import React from 'react';
import { Zap } from 'lucide-react';

export default function IntegrityBatcherQueue({
  batcherStatus,
  batcherQueueLength,
  batcherCurrentIndex,
  batcherSuccess,
  batcherErrors,
  batcherQueue,
  batcherLogs,
  prioritizingId,
  handlePrioritizeMatch
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      
      {/* Progress Bar Area */}
      {batcherStatus !== 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontFamily: 'Outfit' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              Statut : <strong style={{ color: batcherStatus === 'running' ? '#bf5af2' : '#ff9500' }}>
                {batcherStatus === 'running' ? 'En Cours' : 'En Pause'}
              </strong>
            </span>
            <span style={{ fontWeight: 600 }}>
              {batcherCurrentIndex} / {batcherQueueLength} Matchs Traités ({batcherSuccess} Succès, {batcherErrors} Erreurs)
            </span>
          </div>
          
          <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <div 
              style={{ 
                width: `${(batcherCurrentIndex / (batcherQueueLength || 1)) * 100}%`, 
                height: '100%', 
                background: 'linear-gradient(90deg, #0082ff 0%, #bf5af2 100%)',
                transition: 'width 0.4s ease'
              }} 
            />
          </div>
        </div>
      )}

      {/* Live Logs Terminal */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Console des Travaux en Direct</span>
        <div 
          style={{ 
            height: '150px', 
            background: '#0a0f1d', 
            borderRadius: '8px', 
            border: '1px solid var(--border-color)', 
            padding: '10px 14px', 
            fontFamily: 'monospace', 
            fontSize: '11.5px', 
            color: '#4af626', 
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
          ref={(el) => {
            if (el) el.scrollTop = el.scrollHeight; // Auto-scroll to bottom on update
          }}
        >
          {batcherLogs.length > 0 ? (
            batcherLogs.map((log, index) => (
              <div key={index} style={{ 
                color: (log.includes('❌') || log.includes('[Erreur]')) ? '#ff3b30' : (log.includes('⚠') || log.includes('[Warning]')) ? '#ff9500' : log.includes('✓') ? '#2ecc71' : '#4af626'
              }}>
                {log}
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucune activité active. Cliquez sur "Lancer la Réparation Globale" pour démarrer.</div>
          )}
        </div>
      </div>

      {/* Queue Inspector list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          File d'Attente de Réparation ({batcherQueueLength} restants)
        </span>
        <div 
          style={{ 
            height: '110px', 
            overflowY: 'auto',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            background: 'rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            padding: '4px'
          }}
        >
          {batcherQueue.length > 0 ? (
            batcherQueue.map((item, idx) => (
              <div 
                key={item.match_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 10px',
                  borderBottom: idx === batcherQueue.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.03)',
                  fontSize: '12px'
                }}
              >
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '10px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '10px', marginRight: '6px' }}>#{batcherCurrentIndex + idx + 1}</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{item.home_team} - {item.away_team}</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '10px', marginLeft: '6px' }}>({item.date})</span>
                </div>
                
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={() => handlePrioritizeMatch(item.match_id)}
                    disabled={prioritizingId === item.match_id}
                    style={{
                      background: 'rgba(191, 90, 242, 0.1)',
                      border: '1px solid rgba(191, 90, 242, 0.3)',
                      borderRadius: '4px',
                      color: '#bf5af2',
                      padding: '2px 8px',
                      fontSize: '10px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {prioritizingId === item.match_id ? '...' : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Zap size={10} style={{ fill: '#bf5af2' }} />
                        Prioriser
                      </span>
                    )}
                  </button>
                )}
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>
              Aucun match restant dans la file d'attente.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
