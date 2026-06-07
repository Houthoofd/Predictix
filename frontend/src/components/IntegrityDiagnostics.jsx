import React from 'react';

export default function IntegrityDiagnostics({ predictions }) {
  const getDiagnosticsSummary = () => {
    if (!predictions || predictions.length === 0) return { total: 0, healthy: 0, warning: 0, critical: 0 };
    let healthy = 0;
    let critical = 0;

    for (const p of predictions) {
      if (p.diagnostic) {
        if (p.diagnostic.is_complete) healthy++;
        else if (p.diagnostic.score < 60) critical++;
      }
    }
    return {
      total: predictions.length,
      healthy,
      warning: predictions.length - healthy - critical,
      critical
    };
  };

  const summary = getDiagnosticsSummary();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
      <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>MATCHS SCANNÉS</span>
        <span style={{ fontSize: '28px', fontFamily: 'Outfit', fontWeight: 800 }}>{summary.total}</span>
      </div>
      <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '3px solid var(--color-success)' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>DONNÉES COMPLÈTES</span>
        <span style={{ fontSize: '28px', fontFamily: 'Outfit', fontWeight: 800, color: 'var(--color-success)' }}>{summary.healthy}</span>
      </div>
      <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '3px solid var(--color-warning)' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>AVERTISSEMENTS LOGO/HISTO</span>
        <span style={{ fontSize: '28px', fontFamily: 'Outfit', fontWeight: 800, color: 'var(--color-warning)' }}>{summary.warning}</span>
      </div>
      <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '3px solid var(--color-danger)' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>HISTORIQUE MANQUANT / CRITIQUE</span>
        <span style={{ fontSize: '28px', fontFamily: 'Outfit', fontWeight: 800, color: 'var(--color-danger)' }}>{summary.critical}</span>
      </div>
    </div>
  );
}
