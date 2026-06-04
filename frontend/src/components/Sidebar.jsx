import React from 'react';
import { 
  LayoutDashboard, 
  Database, 
  TrendingUp, 
  RefreshCcw,
  Sparkles,
  ShoppingCart,
  ShieldAlert
} from 'lucide-react';

const sportLabels = {
  football: 'Football',
  basketball: 'Basketball',
  tennis: 'Tennis',
  rugby: 'Rugby',
  handball: 'Handball',
  volleyball: 'Volleyball',
  hockey: 'Hockey sur glace',
  baseball: 'Baseball',
  'american-football': 'Football Américain',
  'table-tennis': 'Tennis de table',
  badminton: 'Badminton',
  cricket: 'Cricket',
  snooker: 'Snooker',
  futsal: 'Futsal'
};

export default function Sidebar({ 
  sidebarCollapsed, 
  activeTab, 
  setActiveTab, 
  setShowResetBankrollModal,
  basketCount = 0,
  selectedMagicSport = 'all',
  setSelectedMagicSport
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
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <button 
              className={`nav-item ${activeTab === 'magic-predictions' ? 'active' : ''}`}
              onClick={() => setActiveTab('magic-predictions')}
              title={sidebarCollapsed ? "Pronostics Magiques" : ""}
              style={{
                '--item-accent': '#bf5af2',
                borderLeft: activeTab === 'magic-predictions' ? '3px solid #bf5af2' : undefined,
                color: activeTab === 'magic-predictions' ? '#bf5af2' : undefined,
                marginBottom: activeTab === 'magic-predictions' && !sidebarCollapsed ? '2px' : undefined
              }}
            >
              <Sparkles size={20} style={{ color: '#bf5af2' }} />
              {!sidebarCollapsed && <span style={{ fontWeight: activeTab === 'magic-predictions' ? 700 : 500 }}>Pronostics Magiques</span>}
            </button>
            
            {activeTab === 'magic-predictions' && !sidebarCollapsed && (
              <div 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  paddingLeft: '12px', 
                  gap: '2px',
                  marginTop: '2px',
                  marginBottom: '10px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
                  marginLeft: '26px'
                }}
              >
                {['all', 'football', 'basketball', 'tennis', 'rugby', 'handball', 'volleyball', 'hockey', 'baseball', 'american-football', 'table-tennis', 'badminton', 'cricket', 'snooker', 'futsal'].map((sportKey) => {
                  const label = sportKey === 'all' ? 'Tous les sports' : (sportLabels[sportKey] || sportKey);
                  const isSportActive = selectedMagicSport === sportKey;
                  return (
                    <button
                      key={sportKey}
                      onClick={() => setSelectedMagicSport(sportKey)}
                      style={{
                        border: 'none',
                        textAlign: 'left',
                        color: isSportActive ? '#bf5af2' : 'var(--text-secondary)',
                        fontSize: '11.5px',
                        padding: '6px 8px',
                        cursor: 'pointer',
                        fontWeight: isSportActive ? 700 : 500,
                        borderRadius: '4px',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: isSportActive ? 'rgba(191, 90, 242, 0.06)' : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSportActive) e.currentTarget.style.color = '#bf5af2';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSportActive) e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                    >
                      <span style={{ 
                        width: '4px', 
                        height: '4px', 
                        borderRadius: '50%', 
                        background: isSportActive ? '#bf5af2' : 'rgba(255, 255, 255, 0.2)', 
                        display: 'inline-block',
                        flexShrink: 0
                      }}></span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button 
            className={`nav-item ${activeTab === 'basket' ? 'active' : ''}`}
            onClick={() => setActiveTab('basket')}
            title={sidebarCollapsed ? `Panier de Paris (${basketCount})` : ""}
            style={{
              position: 'relative',
              '--item-accent': '#0082ff',
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
                display: 'inline-block'
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
          <button 
            className={`nav-item ${activeTab === 'integrity' ? 'active' : ''}`}
            onClick={() => setActiveTab('integrity')}
            title={sidebarCollapsed ? "Qualité des Données" : ""}
            style={{
              '--item-accent': '#ff3b30',
              borderLeft: activeTab === 'integrity' ? '3px solid #ff3b30' : undefined,
              color: activeTab === 'integrity' ? '#ff3b30' : undefined
            }}
          >
            <ShieldAlert size={20} style={{ color: activeTab === 'integrity' ? '#ff3b30' : undefined }} />
            {!sidebarCollapsed && <span>Qualité des Données</span>}
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
