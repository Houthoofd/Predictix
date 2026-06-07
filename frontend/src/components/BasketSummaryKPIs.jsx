import React from 'react';
import { Bookmark, DollarSign, TrendingUp } from 'lucide-react';

export default function BasketSummaryKPIs({
  basketBetsCount,
  totalBasketStake,
  bankroll
}) {
  return (
    <div className="grid-3" style={{ gap: '20px' }}>
      <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(127, 0, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(127, 0, 255, 0.15)' }}>
          <Bookmark size={20} style={{ color: '#bf5af2' }} />
        </div>
        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Sélections</span>
          <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'Outfit', marginTop: '2px' }}>{basketBetsCount}</div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
          <DollarSign size={20} style={{ color: 'var(--color-success)' }} />
        </div>
        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Mise Totale du Panier</span>
          <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'Outfit', marginTop: '2px', color: 'var(--color-success)' }}>
            {totalBasketStake} {bankroll.currency}
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0, 130, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0, 130, 255, 0.15)' }}>
          <TrendingUp size={20} style={{ color: '#3b82f6' }} />
        </div>
        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Bankroll Après Placement</span>
          <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'Outfit', marginTop: '2px' }}>
            {(bankroll.balance - totalBasketStake).toFixed(1)} {bankroll.currency}
          </div>
        </div>
      </div>
    </div>
  );
}
