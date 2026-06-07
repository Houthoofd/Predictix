import React from 'react';
import { Image, Trash2 } from 'lucide-react';

export default function CustomLogosManager({
  customLogos,
  onDeleteCustomLogo
}) {
  return (
    <div className="glass-card" style={{ padding: '20px', marginTop: '10px' }}>
      <h3 style={{ fontSize: '16px', fontFamily: 'Outfit', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Image size={18} style={{ color: '#bf5af2' }} />
        Logos d'Équipes Personnalisés ({customLogos.length})
      </h3>
      
      {customLogos.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
          {customLogos.map((logo) => (
            <div key={logo.team_name} style={{
              padding: '10px 14px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src={logo.logo_url} alt="" onError={(e) => { e.target.src = 'placeholder'; }} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'contain' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{logo.team_name}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px', whiteSpace: 'nowrap' }} title={logo.logo_url}>
                    {logo.logo_url}
                  </div>
                </div>
              </div>

              <button 
                className="btn btn-secondary"
                style={{ 
                  padding: '0 8px', 
                  height: '28px', 
                  color: 'var(--color-danger)', 
                  borderColor: 'rgba(231, 76, 60, 0.2)',
                  background: 'rgba(231, 76, 60, 0.05)'
                }}
                onClick={() => onDeleteCustomLogo(logo.team_name)}
                title="Supprimer la substitution"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          Aucun logo personnalisé configuré dans la bibliothèque.
        </div>
      )}
    </div>
  );
}
