import React from 'react';
import { X } from 'lucide-react';

export default function ResetBankrollModal({
  showResetBankrollModal,
  setShowResetBankrollModal,
  resetAmount,
  setResetAmount,
  handleResetBankroll,
  bankroll
}) {
  // Lock/Unlock body scroll when modal is shown to avoid background scroll chaining
  React.useEffect(() => {
    if (showResetBankrollModal) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [showResetBankrollModal]);

  if (!showResetBankrollModal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ fontFamily: 'Outfit' }}>Réinitialiser le Capital</h3>
          <button className="modal-close" onClick={() => setShowResetBankrollModal(false)}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleResetBankroll}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nouveau Capital Initial ({bankroll.currency})</label>
              <input 
                type="number" 
                className="form-control" 
                required
                value={resetAmount}
                onChange={(e) => setResetAmount(e.target.value)}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                Cette action va redéfinir votre capital de départ. Le solde actuel sera recalculé automatiquement en y ajoutant les profits/pertes de vos paris déjà résolus.
              </p>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowResetBankrollModal(false)}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              Confirmer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
