import React from 'react';
import { Coins, Trophy, Info } from 'lucide-react';

export default function ScrapeResultSummaryCards({ count, settledBetsCount }) {
  const hasSettledBets = settledBetsCount > 0;
  
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      {/* Predictions Scraped Card */}
      <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '40px', height: '40px', background: 'rgba(0, 98, 255, 0.1)', border: '1px solid rgba(0, 98, 255, 0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', color: '#38bdf8', flexShrink: 0, justifyContent: 'center' }}>
          <Coins size={20} />
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
            Prédictions Synchros
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'Outfit', marginTop: '2px' }}>
            {count}
          </div>
        </div>
      </div>

      {/* Resolved Bets Card */}
      <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          background: hasSettledBets ? 'rgba(74, 222, 128, 0.1)' : 'rgba(148, 163, 184, 0.06)', 
          border: hasSettledBets ? '1px solid rgba(74, 222, 128, 0.2)' : '1px solid rgba(148, 163, 184, 0.1)', 
          borderRadius: '8px', 
          display: 'flex', 
          alignItems: 'center', 
          color: hasSettledBets ? '#4ade80' : 'var(--text-muted)', 
          flexShrink: 0, 
          justifyContent: 'center' 
        }}>
          {hasSettledBets ? <Trophy size={20} /> : <Info size={20} />}
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
            Paris Résolus
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'Outfit', marginTop: '2px' }}>
            {settledBetsCount}
          </div>
        </div>
      </div>
    </div>
  );
}
