import React from 'react';

export default function DashboardPerformanceGrid({ stats }) {
  return (
    <div className="grid-2">
      {/* Performant Leagues */}
      <div className="glass-card">
        <h3 style={{ fontSize: '16px', marginBottom: '16px', fontFamily: 'Outfit' }}>Performances par Championnat</h3>
        {stats.charts?.leagues?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stats.charts.leagues.slice(0, 4).map((league, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ fontWeight: 600 }}>{league.name}</span>
                  <span style={{ 
                    fontWeight: 700, 
                    color: league.profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                  }}>
                    {league.profit >= 0 ? '+' : ''}{league.profit.toFixed(2)} {stats.bankroll.currency}
                  </span>
                </div>
                {/* Visual Progress Bar */}
                <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${Math.min(100, Math.max(10, (league.won / (league.total || 1)) * 100))}%`, 
                    height: '100%',
                    background: league.profit >= 0 ? 'var(--grad-accent)' : 'var(--color-danger)'
                  }} />
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Taux de réussite: {((league.won / league.total) * 100).toFixed(0)}% ({league.won}/{league.total} paris)
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>Aucune donnée.</p>
        )}
      </div>

      {/* Bookmakers Performance */}
      <div className="glass-card">
        <h3 style={{ fontSize: '16px', marginBottom: '16px', fontFamily: 'Outfit' }}>Performances par Bookmaker</h3>
        {stats.charts?.bookmakers?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stats.charts.bookmakers.slice(0, 4).map((bm, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ fontWeight: 600 }}>{bm.name}</span>
                  <span style={{ 
                    fontWeight: 700, 
                    color: bm.profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                  }}>
                    {bm.profit >= 0 ? '+' : ''}{bm.profit.toFixed(2)} {stats.bankroll.currency}
                  </span>
                </div>
                {/* Visual Progress Bar */}
                <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${Math.min(100, Math.max(10, (bm.won / (bm.total || 1)) * 100))}%`, 
                    height: '100%',
                    background: bm.profit >= 0 ? 'var(--grad-accent)' : 'var(--color-danger)'
                  }} />
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Taux de réussite: {((bm.won / bm.total) * 100).toFixed(0)}% ({bm.won}/{bm.total} paris)
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>Aucune donnée.</p>
        )}
      </div>
    </div>
  );
}
