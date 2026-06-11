import React from 'react';
import { TrendingUp, TrendingDown, Info, Trophy } from 'lucide-react';
import { formatTipLabel } from '../utils/labels';

const formatCurrency = (val) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);
};

export default function ScrapeResultSettledBets({
  settledBets,
  netProfitLoss,
  totalStaked,
  wonCount,
  lostCount,
  refundedCount
}) {
  const hasSettledBets = settledBets.length > 0;
  const isNetPositive = netProfitLoss >= 0;

  if (!hasSettledBets) {
    return (
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.01)', 
        border: '1px dashed var(--border-color)', 
        borderRadius: '10px', 
        padding: '30px 20px', 
        textAlign: 'center', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '10px' 
      }}>
        <Info size={28} style={{ color: 'var(--text-muted)' }} />
        <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Aucun pari en cours impacté
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '350px', margin: '0 auto', lineHeight: '1.4' }}>
          Aucun pari actif enregistré dans le tracker n'était lié aux matchs analysés. Les cotes et prédictions SQLite ont tout de même été actualisées avec succès.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Financial Balance Summary Card */}
      <div style={{ 
        background: isNetPositive ? 'rgba(74, 222, 128, 0.03)' : 'rgba(239, 68, 68, 0.03)', 
        border: `1px solid ${isNetPositive ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`, 
        borderRadius: '10px', 
        padding: '20px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'Outfit' }}>Bilan Financier Session</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {wonCount} gagné(s) · {lostCount} perdu(s) · {refundedCount} remboursé(s)
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ 
            fontSize: '22px', 
            fontWeight: 800, 
            fontFamily: 'Outfit', 
            color: isNetPositive ? 'var(--color-success)' : 'var(--color-danger)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            justifyContent: 'flex-end' 
          }}>
            {isNetPositive ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
            <span>{isNetPositive ? '+' : ''}{formatCurrency(netProfitLoss)}</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Total des mises : {formatCurrency(totalStaked)}
          </span>
        </div>
      </div>

      {/* Resolved Bets List */}
      <div>
        <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '10px', fontFamily: 'Outfit' }}>
          Détail des opérations résolues
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {settledBets.map((bet) => {
            const betNet = bet.status === 'WON' 
              ? bet.stake * (bet.odds - 1) 
              : (bet.status === 'LOST' ? -bet.stake : 0);
            
            return (
              <div key={bet.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {/* Upper row: Teams & Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '13.5px', fontFamily: 'Outfit' }}>
                    {bet.home_team} vs {bet.away_team}
                  </span>
                  
                  {/* Badge outcomes */}
                  <span className={`badge ${
                    bet.status === 'WON' ? 'badge-won' : bet.status === 'LOST' ? 'badge-lost' : 'badge-refunded'
                  }`}>
                    {bet.status === 'WON' ? 'Gagné' : bet.status === 'LOST' ? 'Perdu' : 'Remboursé'}
                  </span>
                </div>

                {/* Middle row: Prediction Played & Final Score */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', color: 'var(--text-secondary)', borderBottom: '1px dotted var(--border-color)', paddingBottom: '8px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Pronostic :</span>{' '}
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {formatTipLabel(bet.best_tip, bet.card_line, bet.sport, bet.notes)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {bet.sport && bet.sport !== 'football' ? 'Score Final :' : 'Corners 1MT :'}
                    </span>{' '}
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {bet.sport && bet.sport !== 'football' 
                        ? (bet.score || '-') 
                        : `${bet.total_corners || 0} (${bet.home_corners || 0}-${bet.away_corners || 0})`}
                    </span>
                  </div>
                </div>

                {/* Bottom Row: Financial stats */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)' }}>
                    <span>Mise : <strong style={{ color: 'var(--text-secondary)' }}>{formatCurrency(bet.stake)}</strong></span>
                    <span>Cote : <strong style={{ color: 'var(--text-secondary)' }}>{bet.odds.toFixed(2)}</strong></span>
                  </div>
                  
                  <span style={{ 
                    fontWeight: 700, 
                    color: bet.status === 'WON' ? 'var(--color-success)' : bet.status === 'LOST' ? 'var(--color-danger)' : 'var(--text-muted)'
                  }}>
                    {bet.status === 'WON' && `+${formatCurrency(betNet)}`}
                    {bet.status === 'LOST' && `${formatCurrency(betNet)}`}
                    {bet.status === 'REFUNDED' && `Remboursé (${formatCurrency(bet.stake)})`}
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
