import React from 'react';

export default function BetModalSuccessOverlay({ betPlacedSuccess }) {
  if (!betPlacedSuccess) return null;
  
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'var(--bg-secondary)',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      fontFamily: 'Outfit',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: 'rgba(16, 185, 129, 0.1)',
        border: '2px solid var(--color-success)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)',
        animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="var(--color-success)" strokeWidth="3" style={{ width: '32px', height: '32px' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h4 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Pari enregistré avec succès !</h4>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Mise à jour de la bankroll en cours...</p>
    </div>
  );
}
