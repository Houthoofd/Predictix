import React from 'react';
import { X, RefreshCcw, Plus } from 'lucide-react';
import { formatTipLabel } from '../utils/labels';

export default function BatchBetsModal({
  selectedPredIds,
  setSelectedPredIds,
  showBatchBetModal,
  setShowBatchBetModal,
  batchBetsForm,
  setBatchBetsForm,
  batchGlobalStake,
  setBatchGlobalStake,
  batchGlobalBookmaker,
  setBatchGlobalBookmaker,
  batchLoading,
  batchProgress,
  bankroll,
  handleOpenBatchPlacement,
  handleConfirmBatchBets,
  handleApplyGlobalStake,
  handleApplyGlobalBookmaker
}) {
  // Lock/Unlock body scroll when modal is shown to avoid background scroll chaining
  React.useEffect(() => {
    if (showBatchBetModal) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [showBatchBetModal]);

  return (
    <>
      {/* ========================================================================
         BATCH SELECTION FLOAT ACTION BAR
         ======================================================================== */}
      {selectedPredIds.length > 0 && !showBatchBetModal && (
        <div 
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1.5px solid var(--color-accent-solid)',
            borderRadius: '16px',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '30px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 98, 255, 0.2)',
            zIndex: 900,
            width: 'max-content',
            maxWidth: '90%'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-accent-solid)' }}></span>
            <span style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Outfit', color: '#ffffff' }}>
              {selectedPredIds.length} match{selectedPredIds.length > 1 ? 's' : ''} sélectionné{selectedPredIds.length > 1 ? 's' : ''}
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '6px 14px', fontSize: '12.5px', background: 'rgba(255,255,255,0.05)', color: '#cccccc', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={() => setSelectedPredIds([])}
            >
              Tout désélectionner
            </button>
            <button 
              className="btn btn-primary" 
              style={{ padding: '6px 16px', fontSize: '12.5px' }}
              onClick={handleOpenBatchPlacement}
            >
              <Plus size={14} style={{ marginRight: '4px' }} />
              Placer ces Paris
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================
         MODAL: BATCH BETS PLACEMENT
         ======================================================================== */}
      {showBatchBetModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" style={{ maxWidth: '850px', width: '95%', padding: '24px 30px', maxHeight: '88vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ padding: '0 0 16px 0', marginBottom: '20px' }}>
              <h3 className="modal-title" style={{ fontFamily: 'Outfit', fontSize: '20px' }}>
                Placer {batchBetsForm.length} Paris en Lot
              </h3>
              <button className="modal-close" onClick={() => setShowBatchBetModal(false)} disabled={batchLoading}>
                <X size={20} />
              </button>
            </div>

            {batchLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '250px', gap: '16px' }}>
                <RefreshCcw size={40} className="console-line system animate-spin" />
                <p style={{ fontFamily: 'Outfit', fontWeight: 600 }}>Enregistrement des paris en lot en cours...</p>
                <div style={{ width: '200px', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden', marginTop: '8px' }}>
                  <div style={{ width: `${(batchProgress / batchBetsForm.length) * 100}%`, height: '100%', background: 'var(--grad-accent)', transition: 'width 0.3s ease' }}></div>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{batchProgress} / {batchBetsForm.length} paris finalisés</span>
              </div>
            ) : (
              <form onSubmit={handleConfirmBatchBets}>
                <div className="modal-body" style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Batch Global settings Bar */}
                  <div style={{ background: 'var(--bg-tertiary)', padding: '14px 20px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Outils Uniformes :</span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* Global Stake Input */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input 
                          type="number" 
                          className="form-control" 
                          style={{ width: '80px', padding: '5px 8px', fontSize: '12.5px' }}
                          placeholder="Mise €"
                          value={batchGlobalStake}
                          onChange={(e) => setBatchGlobalStake(e.target.value)}
                        />
                        <button 
                          type="button" 
                          className="btn btn-secondary" 
                          style={{ padding: '5px 10px', fontSize: '11.5px' }}
                          onClick={handleApplyGlobalStake}
                        >
                          Mise Globale
                        </button>
                      </div>

                      {/* Global Bookmaker Input */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input 
                          type="text" 
                          className="form-control" 
                          style={{ width: '100px', padding: '5px 8px', fontSize: '12.5px' }}
                          placeholder="Bookmaker"
                          value={batchGlobalBookmaker}
                          onChange={(e) => setBatchGlobalBookmaker(e.target.value)}
                        />
                        <button 
                          type="button" 
                          className="btn btn-secondary" 
                          style={{ padding: '5px 10px', fontSize: '11.5px' }}
                          onClick={handleApplyGlobalBookmaker}
                        >
                          Bookmaker Global
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bets List Table */}
                  <div style={{ maxHeight: '42vh', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                    <table className="premium-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                          <th style={{ padding: '12px 14px' }}>Match / Ligne</th>
                          <th style={{ padding: '12px 14px', width: '110px' }}>Cote</th>
                          <th style={{ padding: '12px 14px', width: '110px' }}>Mise ({bankroll.currency})</th>
                          <th style={{ padding: '12px 14px', width: '130px' }}>Bookmaker</th>
                          <th style={{ padding: '12px 14px', width: '50px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchBetsForm.map((bet, idx) => (
                          <tr key={idx} style={{ borderBottom: idx < batchBetsForm.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', background: 'transparent' }}>
                            {/* Match & Tip info */}
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>{bet.league}</span>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginTop: '2px' }}>{bet.home_team} vs {bet.away_team}</span>
                              <span style={{ fontSize: '12px', color: 'var(--color-accent-solid)', fontWeight: 700, display: 'inline-block', marginTop: '4px', background: 'rgba(0, 98, 255, 0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                                {formatTipLabel(bet.best_tip, bet.card_line, bet.sport)}
                              </span>
                            </td>
                            
                            {/* Individual Odds */}
                            <td style={{ padding: '12px 14px' }}>
                              <input 
                                type="number" 
                                step="0.01"
                                className="form-control" 
                                style={{ padding: '5px 8px', fontSize: '12.5px' }}
                                required
                                value={bet.odds}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setBatchBetsForm(prev => prev.map((b, i) => i === idx ? { ...b, odds: isNaN(val) ? '' : val } : b));
                                }}
                              />
                            </td>
                            
                            {/* Individual Stake */}
                            <td style={{ padding: '12px 14px' }}>
                              <input 
                                type="number" 
                                className="form-control" 
                                style={{ padding: '5px 8px', fontSize: '12.5px' }}
                                required
                                value={bet.stake}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setBatchBetsForm(prev => prev.map((b, i) => i === idx ? { ...b, stake: isNaN(val) ? '' : val } : b));
                                }}
                              />
                            </td>

                            {/* Individual Bookmaker */}
                            <td style={{ padding: '12px 14px' }}>
                              <input 
                                type="text" 
                                className="form-control" 
                                style={{ padding: '5px 8px', fontSize: '12.5px' }}
                                required
                                value={bet.bookmaker}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBatchBetsForm(prev => prev.map((b, i) => i === idx ? { ...b, bookmaker: val } : b));
                                }}
                              />
                            </td>

                            {/* Remove single item button */}
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              <button 
                                type="button" 
                                style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onClick={() => {
                                  setBatchBetsForm(prev => prev.filter((_, i) => i !== idx));
                                  // Remove from selected Pred IDs as well
                                  setSelectedPredIds(prev => prev.filter(id => id !== bet.match_id));
                                }}
                                title="Retirer ce pari du lot"
                              >
                                <X size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {batchBetsForm.length === 0 && (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
                              Aucun pari dans le lot.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Mise totale estimée :
                    </span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {batchBetsForm.reduce((acc, b) => acc + (parseFloat(b.stake) || 0), 0).toFixed(2)} {bankroll.currency}
                    </strong>
                  </div>

                </div>

                <div className="modal-footer" style={{ padding: '20px 0 0 0', marginTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowBatchBetModal(false)} disabled={batchLoading}>
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={batchLoading || batchBetsForm.length === 0}>
                    Valider et Enregistrer ces {batchBetsForm.length} Paris
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
