import React from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export default function NotificationModal({
  show,
  type = 'success', // 'success' | 'error' | 'warning' | 'info'
  title,
  message,
  onClose
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

  const getTypeStyle = () => {
    switch (type) {
      case 'error':
        return {
          icon: <AlertCircle size={24} style={{ color: '#ff453a' }} />,
          buttonClass: 'btn-danger',
          accentColor: '#ff453a',
          btnBackground: '#ff453a'
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={24} style={{ color: '#ff9f0a' }} />,
          buttonClass: 'btn-secondary',
          accentColor: '#ff9f0a',
          btnBackground: 'linear-gradient(135deg, #ff9f0a 0%, #ff5e00 100%)'
        };
      case 'info':
        return {
          icon: <Info size={24} style={{ color: '#0a84ff' }} />,
          buttonClass: 'btn-primary',
          accentColor: '#0a84ff',
          btnBackground: 'linear-gradient(135deg, #0a84ff 0%, #0040ff 100%)'
        };
      case 'success':
      default:
        return {
          icon: <CheckCircle size={24} style={{ color: '#30d158' }} />,
          buttonClass: 'btn-primary',
          accentColor: '#30d158',
          btnBackground: 'linear-gradient(135deg, #30d158 0%, #10b981 100%)'
        };
    }
  };

  const currentStyle = getTypeStyle();

  return (
    <div 
      className="modal-overlay" 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        zIndex: 2000 // Ensure it sits on top of other modals if they are open
      }}
      onClick={onClose}
    >
      <div 
        className="modal-content glass-card" 
        style={{ 
          maxWidth: '400px', 
          width: '90%', 
          padding: '24px 28px',
          border: `1.5px solid rgba(${type === 'error' ? '255, 69, 58' : type === 'warning' ? '255, 159, 10' : '48, 209, 88'}, 0.25)`,
          boxShadow: `0 12px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(${type === 'error' ? '255, 69, 58' : type === 'warning' ? '255, 159, 10' : '48, 209, 88'}, 0.1)`,
          animation: 'fadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {currentStyle.icon}
            <h3 style={{ fontFamily: 'Outfit', fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              {title || (type === 'success' ? 'Succès' : type === 'error' ? 'Erreur' : 'Information')}
            </h3>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-muted)', 
              cursor: 'pointer', 
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ margin: '0 0 24px 0' }}>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.55', margin: 0 }}>
            {message}
          </p>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={onClose}
            style={{ 
              padding: '8px 24px', 
              fontSize: '12.5px',
              background: currentStyle.btnBackground,
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: `0 4px 12px rgba(${type === 'error' ? '255, 69, 58' : type === 'warning' ? '255, 159, 10' : '48, 209, 88'}, 0.25)`
            }}
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
}
