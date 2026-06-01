import React from 'react';
import { 
  LayoutDashboard, 
  Database, 
  TrendingUp, 
  RefreshCcw,
  Sparkles,
  ShoppingCart
} from 'lucide-react';

export default function Sidebar({ 
  sidebarCollapsed, 
  activeTab, 
  setActiveTab, 
  setShowResetBankrollModal,
  basketCount = 0
}) {
  return (
    <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <div>
        <div className="sidebar-logo">
          <div className="logo-icon">P</div>
          {!sidebarCollapsed && <div className="logo-text">PREDICTIX</div>}
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
            title={sidebarCollapsed ? "Tableau de Bord" : ""}
          >
            <LayoutDashboard size={20} />
            {!sidebarCollapsed && <span>Tableau de Bord</span>}
          </button>
          <button 
            className={`nav-item ${activeTab === 'magic-predictions' ? 'active' : ''}`}
            onClick={() => setActiveTab('magic-predictions')}
            title={sidebarCollapsed ? "Pronostics Magiques" : ""}
            style={{
              borderLeft: activeTab === 'magic-predictions' ? '3px solid #bf5af2' : undefined,
              color: activeTab === 'magic-predictions' ? '#bf5af2' : undefined
            }}
          >
            <Sparkles size={20} style={{ color: activeTab === 'magic-predictions' ? '#bf5af2' : '#bf5af2' }} />
            {!sidebarCollapsed && <span style={{ fontWeight: activeTab === 'magic-predictions' ? 700 : 500 }}>Pronostics Magiques</span>}
          </button>
          <button 
            className={`nav-item ${activeTab === 'basket' ? 'active' : ''}`}
            onClick={() => setActiveTab('basket')}
            title={sidebarCollapsed ? `Panier de Paris (${basketCount})` : ""}
            style={{
              position: 'relative',
              borderLeft: activeTab === 'basket' ? '3px solid #0082ff' : undefined,
              color: activeTab === 'basket' ? '#0082ff' : undefined
            }}
          >
            <ShoppingCart size={20} style={{ color: activeTab === 'basket' ? '#0082ff' : undefined }} />
            {!sidebarCollapsed && <span style={{ fontWeight: activeTab === 'basket' ? 700 : 500 }}>Panier de Paris</span>}
            {basketCount > 0 && (
              <span style={{
                position: sidebarCollapsed ? 'absolute' : 'relative',
                top: sidebarCollapsed ? '-4px' : 'auto',
                right: sidebarCollapsed ? '-4px' : 'auto',
                marginLeft: sidebarCollapsed ? 0 : '8px',
                background: '#bf5af2',
                color: '#fff',
                fontSize: '9.5px',
                fontWeight: 800,
                borderRadius: '10px',
                padding: '1px 5px',
                display: 'inline-block',
                boxShadow: '0 0 8px rgba(191, 90, 242, 0.4)'
              }}>
                {basketCount}
              </span>
            )}
          </button>
          <button 
            className={`nav-item ${activeTab === 'scraper' ? 'active' : ''}`}
            onClick={() => setActiveTab('scraper')}
            title={sidebarCollapsed ? "Match en Direct" : ""}
          >
            <RefreshCcw size={20} />
            {!sidebarCollapsed && <span>Match en Direct</span>}
          </button>
          <button 
            className={`nav-item ${activeTab === 'tracker' ? 'active' : ''}`}
            onClick={() => setActiveTab('tracker')}
            title={sidebarCollapsed ? "Suivi des Paris" : ""}
          >
            <TrendingUp size={20} />
            {!sidebarCollapsed && <span>Suivi des Paris</span>}
          </button>
          <button 
            className={`nav-item ${activeTab === 'strategies' ? 'active' : ''}`}
            onClick={() => setActiveTab('strategies')}
            title={sidebarCollapsed ? "Stratégies" : ""}
          >
            <Database size={20} />
            {!sidebarCollapsed && <span>Stratégies</span>}
          </button>
        </nav>
      </div>

      <div className="sidebar-footer">
        {!sidebarCollapsed ? (
          <button 
            className="btn btn-secondary" 
            style={{ width: '100%', fontSize: '12px', padding: '6px 12px' }}
            onClick={() => setShowResetBankrollModal(true)}
          >
            Réinitialiser Capital
          </button>
        ) : (
          <button 
            className="btn btn-secondary"
            style={{ width: '32px', height: '32px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}
            onClick={() => setShowResetBankrollModal(true)}
            title="Réinitialiser Capital"
          >
            <RefreshCcw size={14} />
          </button>
        )}
      </div>
    </aside>
  );
}
