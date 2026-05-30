import React from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  Wallet 
} from 'lucide-react';

export default function Header({ 
  sidebarCollapsed, 
  setSidebarCollapsed, 
  activeTab, 
  theme, 
  setTheme, 
  bankroll 
}) {
  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button 
          className="sidebar-toggle-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? "Agrandir le menu" : "Réduire le menu"}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        
        <div className="breadcrumbs">
          <span className="crumb-brand text-gradient-accent">PREDICTIX</span>
          <ChevronRight size={12} className="crumb-separator" />
          <span className="crumb-active">
            {activeTab === 'dashboard' && 'Tableau de Bord'}
            {activeTab === 'scraper' && 'Match en Direct'}
            {activeTab === 'tracker' && 'Tracker de Paris'}
            {activeTab === 'strategies' && 'Stratégies de Cartons'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Theme switcher */}
        <div className="header-theme-dots">
          <button 
            className={`theme-dot ${theme === 'modern' ? 'active' : ''}`}
            style={{ 
              width: '18px', height: '18px', borderRadius: '50%', border: '1.5px solid transparent', 
              background: 'linear-gradient(135deg, #0062ff, #00f5a0)', cursor: 'pointer',
              outline: theme === 'modern' ? '1.5px solid var(--text-primary)' : 'none',
              outlineOffset: '2px'
            }}
            onClick={() => setTheme('modern')}
            title="Sombre Moderne (Vert)"
          />
          <button 
            className={`theme-dot ${theme === 'tech' ? 'active' : ''}`}
            style={{ 
              width: '18px', height: '18px', borderRadius: '50%', border: '1.5px solid transparent', 
              background: 'linear-gradient(135deg, #7f00ff, #00f5d4)', cursor: 'pointer',
              outline: theme === 'tech' ? '1.5px solid var(--text-primary)' : 'none',
              outlineOffset: '2px'
            }}
            onClick={() => setTheme('tech')}
            title="Sombre Technologique (Violet)"
          />
          <button 
            className={`theme-dot ${theme === 'light' ? 'active' : ''}`}
            style={{ 
              width: '18px', height: '18px', borderRadius: '50%', 
              background: '#cbd5e1', border: '1px solid #94a3b8', cursor: 'pointer',
              outline: theme === 'light' ? '1.5px solid var(--text-primary)' : 'none',
              outlineOffset: '2px'
            }}
            onClick={() => setTheme('light')}
            title="Mode Clair"
          />
        </div>

        <div className="header-wallet-pill">
          <Wallet size={13} className="wallet-pill-icon text-gradient-accent" />
          <span>{bankroll.balance?.toFixed(2)} {bankroll.currency}</span>
        </div>

        <div className="header-profile-avatar" title="Benoit (Propriétaire)">
          B
        </div>
      </div>
    </header>
  );
}
