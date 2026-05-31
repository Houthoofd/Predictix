import React from 'react';
import { X, Coins, TrendingUp, TrendingDown, Info, Trophy } from 'lucide-react';

export default function ScrapeResultModal({
  show,
  onClose,
  stats
}) {
  // Lock/Unlock body scroll when modal is shown to avoid background scroll chaining
  React.useEffect(() => {
    if (show) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [show]);

  if (!show || !stats) return null;

  const { count = 0, settledBets = [] } = stats;

  // Calculate financial statistics for settled bets during this run
  let totalStaked = 0;
  let totalPayout = 0;
  let netProfitLoss = 0;
  let wonCount = 0;
  let lostCount = 0;
  let refundedCount = 0;

  for (const bet of settledBets) {
    totalStaked += bet.stake;
    totalPayout += bet.payout;
    
    if (bet.status === 'WON') {
      netProfitLoss += bet.stake * (bet.odds - 1);
      wonCount++;
    } else if (bet.status === 'LOST') {
      netProfitLoss -= bet.stake;
      lostCount++;
    } else if (bet.status === 'REFUNDED') {
      refundedCount++;
    }
  }

  const hasSettledBets = settledBets.length > 0;
  const isNetPositive = netProfitLoss >= 0;

  // Format currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);
  };

  // Helper for Tip Labels in French
  const formatTip = (tip, line) => {
    const cleanTip = (tip || '').toLowerCase();
    if (cleanTip === 'over' || cleanTip === 'plus de') {
      return `Plus de ${line} Corners (1MT)`;
    } else if (cleanTip === 'under' || cleanTip === 'moins de') {
      return `Moins de ${line} Corners (1MT)`;
    }
    return `${tip} ${line}`;
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center' }}>
      <div className="modal-content glass-card" style={{ maxWidth: '650px', width: '95%', padding: '24px 30px', maxHeight: '85vh', overflowY: 'auto' }}>
        
        {/* Header */}
        <div className="modal-header" style={{ padding: '0 0 16px 0', borderBottom: '1px solid var(--border-color)', marginBottom: '20px' }}>
          <h3 className="modal-title" style={{ fontFamily: 'Outfit', fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={20} style={{ color: 'var(--color-accent-solid)' }} />
            <span>Rapport de Synchronisation</span>
          </h3>
          <button className="modal-close" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Global Summary Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            
            {/* Predictions Scraped Card */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '40px', height: '40px', background: 'rgba(0, 98, 255, 0.1)', border: '1px solid rgba(0, 98, 255, 0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: '#38bdf8', flexShrink: 0, justifyContent: 'center' }}>
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
                  {settledBets.length}
                </div>
              </div>
            </div>

          </div>

          {/* Real-time Financial Breakdown Section */}
          {hasSettledBets ? (
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
                              {formatTip(bet.best_tip, bet.card_line)}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Corners 1MT :</span>{' '}
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                              {bet.total_corners} ({bet.home_corners}-{bet.away_corners})
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
          ) : (
            /* No settled bets view */
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
          )}

        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ padding: '20px 0 0 0', marginTop: '20px', borderTop: '1px solid var(--border-color)' }}>
          <button className="btn btn-primary" onClick={onClose} style={{ padding: '8px 24px', fontSize: '13px' }}>
            Fermer le Rapport
          </button>
        </div>

      </div>
    </div>
  );
}
