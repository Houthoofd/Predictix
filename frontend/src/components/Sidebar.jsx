import React from 'react';
import { 
  LayoutDashboard, 
  Database, 
  TrendingUp, 
  RefreshCcw,
  Sparkles,
  ShoppingCart,
  ShieldAlert,
  ChevronDown,
  Clock,
  Settings,
  Brain
} from 'lucide-react';
import { sportLabels, ALL_SPORTS } from '../utils/labels';
import { sportIcons } from './SidebarIcons';
import styles from './Sidebar.module.css';

export default function Sidebar({ 
  sidebarCollapsed, 
  activeTab, 
  setActiveTab, 
  setShowResetBankrollModal,
  basketCount = 0,
  selectedMagicSport = 'football',
  setSelectedMagicSport,
  sportCounts = {}
}) {
  const [isMagicExpanded, setIsMagicExpanded] = React.useState(activeTab === 'magic-predictions');
  const [showMagicPopover, setShowMagicPopover] = React.useState(false);

  React.useEffect(() => {
    if (activeTab === 'magic-predictions') {
      setIsMagicExpanded(true);
    } else {
      setIsMagicExpanded(false);
    }
    setShowMagicPopover(false);
  }, [activeTab]);

  React.useEffect(() => {
    setShowMagicPopover(false);
  }, [selectedMagicSport]);

  return (
    <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ''}`}>
      <div>
        <div className={styles.sidebarLogo}>
          <div className={styles.logoIcon}>P</div>
          {!sidebarCollapsed && <div className={styles.logoText}>PREDICTIX</div>}
        </div>
        
        <nav className={styles.sidebarNav}>
          <button 
            className={`${styles.navItem} ${activeTab === 'dashboard' ? styles.active : ''}`}
            onClick={() => setActiveTab('dashboard')}
            title={sidebarCollapsed ? "Tableau de Bord" : ""}
          >
            <LayoutDashboard size={20} />
            {!sidebarCollapsed && <span>Tableau de Bord</span>}
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <button 
              className={`${styles.navItem} ${activeTab === 'magic-predictions' ? styles.active : ''}`}
              onClick={() => {
                if (sidebarCollapsed) {
                  setShowMagicPopover(prev => !prev);
                } else {
                  if (activeTab === 'magic-predictions') {
                    setIsMagicExpanded(prev => !prev);
                  } else {
                    setActiveTab('magic-predictions');
                  }
                }
              }}
              title={sidebarCollapsed ? "Sports" : ""}
              style={{
                '--item-accent': '#bf5af2',
                borderLeft: activeTab === 'magic-predictions' ? '3px solid #bf5af2' : undefined,
                color: activeTab === 'magic-predictions' ? '#bf5af2' : undefined,
                marginBottom: activeTab === 'magic-predictions' && !sidebarCollapsed ? '2px' : undefined,
                display: 'flex',
                alignItems: 'center',
                width: '100%'
              }}
            >
              <Sparkles size={20} style={{ color: '#bf5af2' }} />
              {!sidebarCollapsed && <span style={{ fontWeight: activeTab === 'magic-predictions' ? 700 : 500 }}>Sports</span>}
              {!sidebarCollapsed && (
                <ChevronDown 
                  size={14} 
                  style={{ 
                    marginLeft: 'auto', 
                    color: isMagicExpanded ? '#bf5af2' : 'var(--text-secondary)',
                    transform: isMagicExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.25s ease'
                  }} 
                />
              )}
            </button>

            {sidebarCollapsed && showMagicPopover && (
              <>
                {/* Backdrop overlay */}
                <div 
                  onClick={() => setShowMagicPopover(false)}
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 999,
                    background: 'transparent',
                    cursor: 'default'
                  }}
                />
                {/* Floating Dropdown */}
                <div
                  style={{
                    position: 'absolute',
                    left: '60px',
                    top: '0px',
                    background: '#0a0f1d',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '8px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.65)',
                    zIndex: 1000,
                    minWidth: '180px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '4px' }}>
                    Sélectionner un Sport
                  </div>
                  {ALL_SPORTS.map((sportKey) => {
                    const label = sportLabels[sportKey] || (sportKey.charAt(0).toUpperCase() + sportKey.slice(1));
                    const isSportActive = selectedMagicSport === sportKey;
                    const count = sportCounts[sportKey] || 0;
                    const SportIcon = sportIcons[sportKey] || Sparkles;
                    return (
                      <button
                        key={sportKey}
                        onClick={() => {
                          setSelectedMagicSport(sportKey);
                          setActiveTab('magic-predictions');
                          setShowMagicPopover(false);
                        }}
                        style={{
                          border: 'none',
                          textAlign: 'left',
                          color: isSportActive ? '#bf5af2' : 'var(--text-secondary)',
                          fontSize: '12px',
                          padding: '8px 10px',
                          cursor: 'pointer',
                          fontWeight: isSportActive ? 700 : 500,
                          borderRadius: '6px',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: isSportActive ? 'rgba(191, 90, 242, 0.08)' : 'transparent',
                          outline: 'none'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = isSportActive ? 'rgba(191, 90, 242, 0.08)' : 'rgba(255, 255, 255, 0.03)';
                          if (!isSportActive) {
                            e.currentTarget.style.color = '#bf5af2';
                            const svg = e.currentTarget.querySelector('svg');
                            if (svg) svg.style.color = '#bf5af2';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isSportActive ? 'rgba(191, 90, 242, 0.08)' : 'transparent';
                          if (!isSportActive) {
                            e.currentTarget.style.color = 'var(--text-secondary)';
                            const svg = e.currentTarget.querySelector('svg');
                            if (svg) svg.style.color = 'var(--text-secondary)';
                          }
                        }}
                      >
                        <SportIcon size={14} style={{ 
                          color: isSportActive ? '#bf5af2' : 'var(--text-secondary)',
                          flexShrink: 0,
                          transition: 'color 0.2s ease'
                        }} />
                        <span>{label}</span>
                        <span style={{
                          marginLeft: 'auto',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '10px',
                          background: isSportActive ? 'rgba(191, 90, 242, 0.16)' : 'rgba(255, 255, 255, 0.06)',
                          color: isSportActive ? '#bf5af2' : 'var(--text-secondary)',
                          transition: 'all 0.2s ease',
                          fontFamily: 'Outfit'
                        }}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            
            <div 
              className={styles.sportsSubmenu}
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                paddingLeft: '12px', 
                gap: '4px',
                borderLeft: '1.5px solid rgba(191, 90, 242, 0.25)',
                marginLeft: '26px',
                maxHeight: (isMagicExpanded && !sidebarCollapsed) ? '420px' : '0px',
                opacity: (isMagicExpanded && !sidebarCollapsed) ? 1 : 0,
                marginTop: (isMagicExpanded && !sidebarCollapsed) ? '4px' : '0px',
                marginBottom: (isMagicExpanded && !sidebarCollapsed) ? '10px' : '0px',
                overflowY: (isMagicExpanded && !sidebarCollapsed) ? 'auto' : 'hidden',
                overflowX: 'hidden',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, margin 0.3s ease',
                pointerEvents: (isMagicExpanded && !sidebarCollapsed) ? 'auto' : 'none'
              }}
            >
              {ALL_SPORTS.map((sportKey) => {
                const label = sportLabels[sportKey] || (sportKey.charAt(0).toUpperCase() + sportKey.slice(1));
                const isSportActive = selectedMagicSport === sportKey;
                const count = sportCounts[sportKey] || 0;
                const SportIcon = sportIcons[sportKey] || Sparkles;
                return (
                  <button
                    key={sportKey}
                    onClick={() => {
                      setSelectedMagicSport(sportKey);
                      setActiveTab('magic-predictions');
                    }}
                    style={{
                      border: 'none',
                      textAlign: 'left',
                      color: isSportActive ? '#bf5af2' : 'var(--text-secondary)',
                      fontSize: '11.5px',
                      padding: '6px 10px',
                      cursor: 'pointer',
                      fontWeight: isSportActive ? 700 : 500,
                      borderRadius: '6px',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: isSportActive ? 'rgba(191, 90, 242, 0.08)' : 'transparent',
                      outline: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isSportActive ? 'rgba(191, 90, 242, 0.08)' : 'rgba(255, 255, 255, 0.03)';
                      if (!isSportActive) {
                        e.currentTarget.style.color = '#bf5af2';
                        const svg = e.currentTarget.querySelector('svg');
                        if (svg) svg.style.color = '#bf5af2';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isSportActive ? 'rgba(191, 90, 242, 0.08)' : 'transparent';
                      if (!isSportActive) {
                        e.currentTarget.style.color = 'var(--text-secondary)';
                        const svg = e.currentTarget.querySelector('svg');
                        if (svg) svg.style.color = 'var(--text-secondary)';
                      }
                    }}
                  >
                    <SportIcon size={13} style={{ 
                      color: isSportActive ? '#bf5af2' : 'var(--text-secondary)',
                      flexShrink: 0,
                      transition: 'color 0.2s ease'
                    }} />
                    <span>{label}</span>
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '10px',
                      background: isSportActive ? 'rgba(191, 90, 242, 0.16)' : 'rgba(255, 255, 255, 0.06)',
                      color: isSportActive ? '#bf5af2' : 'var(--text-secondary)',
                      transition: 'all 0.2s ease',
                      fontFamily: 'Outfit'
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <button 
            className={`${styles.navItem} ${activeTab === 'basket' ? styles.active : ''}`}
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
            className={`${styles.navItem} ${activeTab === 'scraper' ? styles.active : ''}`}
            onClick={() => setActiveTab('scraper')}
            title={sidebarCollapsed ? "Collecteur de Données" : ""}
          >
            <RefreshCcw size={20} />
            {!sidebarCollapsed && <span>Collecteur de Données</span>}
          </button>
          <button 
            className={`${styles.navItem} ${activeTab === 'crons' ? styles.active : ''}`}
            onClick={() => setActiveTab('crons')}
            title={sidebarCollapsed ? "Planifications" : ""}
            style={{
              '--item-accent': '#0a84ff',
              borderLeft: activeTab === 'crons' ? '3px solid #0a84ff' : undefined,
              color: activeTab === 'crons' ? '#0a84ff' : undefined
            }}
          >
            <Clock size={20} style={{ color: activeTab === 'crons' ? '#0a84ff' : undefined }} />
            {!sidebarCollapsed && <span>Planifications</span>}
          </button>
          <button 
            className={`${styles.navItem} ${activeTab === 'tracker' ? styles.active : ''}`}
            onClick={() => setActiveTab('tracker')}
            title={sidebarCollapsed ? "Suivi des Paris" : ""}
          >
            <TrendingUp size={20} />
            {!sidebarCollapsed && <span>Suivi des Paris</span>}
          </button>
          <button 
            className={`${styles.navItem} ${activeTab === 'strategies' ? styles.active : ''}`}
            onClick={() => setActiveTab('strategies')}
            title={sidebarCollapsed ? "Stratégies" : ""}
          >
            <Database size={20} />
            {!sidebarCollapsed && <span>Stratégies</span>}
          </button>
          <button 
            className={`${styles.navItem} ${activeTab === 'integrity' ? styles.active : ''}`}
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
          <button 
            className={`${styles.navItem} ${activeTab === 'models' ? styles.active : ''}`}
            onClick={() => setActiveTab('models')}
            title={sidebarCollapsed ? "Modèles GBDT" : ""}
            style={{
              '--item-accent': '#bf5af2',
              borderLeft: activeTab === 'models' ? '3px solid #bf5af2' : undefined,
              color: activeTab === 'models' ? '#bf5af2' : undefined
            }}
          >
            <Brain size={20} style={{ color: activeTab === 'models' ? '#bf5af2' : undefined }} />
            {!sidebarCollapsed && <span>Modèles GBDT</span>}
          </button>
          <button 
            className={`${styles.navItem} ${activeTab === 'settings' ? styles.active : ''}`}
            onClick={() => setActiveTab('settings')}
            title={sidebarCollapsed ? "Paramètres" : ""}
            style={{
              '--item-accent': '#8e8e93',
              borderLeft: activeTab === 'settings' ? '3px solid #8e8e93' : undefined,
              color: activeTab === 'settings' ? '#8e8e93' : undefined
            }}
          >
            <Settings size={20} style={{ color: activeTab === 'settings' ? '#8e8e93' : undefined }} />
            {!sidebarCollapsed && <span>Paramètres</span>}
          </button>
        </nav>
      </div>

      <div className={styles.sidebarFooter}>
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
