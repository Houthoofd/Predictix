import React from 'react';
import { X } from 'lucide-react';

export default function LogoMappingModal({
  show,
  logoForm,
  setLogoForm,
  onClose,
  onSave
}) {
  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div className="glass-card" style={{ width: '400px', padding: '24px', position: 'relative' }}>
        <button 
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          onClick={onClose}
        >
          <X size={18} />
        </button>

        <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', fontWeight: 800, marginBottom: '16px' }}>
          Définir un Logo Personnalisé
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Équipe</label>
            <input 
              type="text" 
              value={logoForm.team} 
              disabled
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-muted)', marginTop: '4px', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>URL de l'image (logo)</label>
            <input 
              type="text" 
              value={logoForm.url} 
              onChange={(e) => setLogoForm(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://ex.com/logo.png"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: 'var(--text-primary)', marginTop: '4px', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              Annuler
            </button>
            <button 
              className="btn btn-primary" 
              style={{ flex: 1, background: 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)', border: 'none' }} 
              onClick={onSave}
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
