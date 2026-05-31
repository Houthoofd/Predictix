import React from 'react';
import { X, HelpCircle, AlertTriangle } from 'lucide-react';

export default function ConfirmModal({
  show,
  title = "Confirmation Requise",
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  isDanger = false
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

  if (!show) return null;

  return (
    <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center' }}>
      <div className="modal-content glass-card" style={{ maxWidth: '420px', width: '90%', padding: '24px 30px' }}>
        
        {/* Header */}
        <div className="modal-header" style={{ padding: '0 0 12px 0', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
          <h3 className="modal-title" style={{ fontFamily: 'Outfit', fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isDanger ? (
              <AlertTriangle size={18} style={{ color: 'var(--color-danger)' }} />
            ) : (
              <HelpCircle size={18} style={{ color: 'var(--color-accent-solid)' }} />
            )}
            <span>{title}</span>
          </h3>
          <button className="modal-close" onClick={onCancel} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: 0 }}>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ padding: '16px 0 0 0', marginTop: '20px', borderTop: '1px solid var(--border-color)', gap: '10px' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onCancel}
            style={{ padding: '8px 16px', fontSize: '12.5px' }}
          >
            {cancelText}
          </button>
          
          <button 
            type="button" 
            className={isDanger ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={onConfirm}
            style={{ 
              padding: '8px 20px', 
              fontSize: '12.5px',
              background: isDanger ? 'var(--color-danger)' : 'var(--grad-accent)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700
            }}
          >
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  );
}
