import React from 'react';
import { X, Trophy, Sparkles } from 'lucide-react';
import ScrapeResultSummaryCards from './ScrapeResultSummaryCards';
import ScrapeResultSettledBets from './ScrapeResultSettledBets';
import ScrapeResultMagicPredictions from './ScrapeResultMagicPredictions';

export default function ScrapeResultModal({
  show,
  onClose,
  stats,
  onNavigateToMagicPredictions
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

  const { count = 0, settledBets = [], magicPredictions = [] } = stats;

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
          
          <ScrapeResultSummaryCards
            count={count}
            settledBetsCount={settledBets.length}
          />

          <ScrapeResultSettledBets
            settledBets={settledBets}
            netProfitLoss={netProfitLoss}
            totalStaked={totalStaked}
            wonCount={wonCount}
            lostCount={lostCount}
            refundedCount={refundedCount}
          />

          <ScrapeResultMagicPredictions
            magicPredictions={magicPredictions}
          />

        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ 
          padding: '20px 0 0 0', 
          marginTop: '20px', 
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {magicPredictions && magicPredictions.length > 0 ? (
            <button 
              className="btn btn-primary" 
              onClick={onNavigateToMagicPredictions}
              style={{ 
                padding: '8px 20px', 
                fontSize: '13px',
                background: 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(127, 0, 255, 0.25)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Sparkles size={14} />
              <span>Voir dans Sports ({magicPredictions.length})</span>
            </button>
          ) : <div />}
          
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '8px 24px', fontSize: '13px' }}>
            Fermer le Rapport
          </button>
        </div>

      </div>
    </div>
  );
}
