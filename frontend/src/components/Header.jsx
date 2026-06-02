import React from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  Wallet,
  Bell,
  BellOff,
  Trash2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  X
} from 'lucide-react';

export default function Header({ 
  sidebarCollapsed, 
  setSidebarCollapsed, 
  activeTab, 
  theme, 
  setTheme, 
  bankroll,
  notifications = [],
  setNotifications
}) {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleToggleDropdown = (e) => {
    e.stopPropagation();
    setShowDropdown(prev => !prev);
    
    // Mark all as read when opening
    if (!showDropdown && unreadCount > 0) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    setNotifications([]);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'error':
        return <AlertCircle size={14} style={{ color: '#ff453a' }} />;
      case 'warning':
        return <AlertTriangle size={14} style={{ color: '#ff9f0a' }} />;
      case 'info':
        return <Info size={14} style={{ color: '#0a84ff' }} />;
      case 'success':
      default:
        return <CheckCircle size={14} style={{ color: '#30d158' }} />;
    }
  };

  return (
    <header className="app-header" style={{ position: 'relative', overflow: 'visible' }}>
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
            {activeTab === 'basket' && 'Panier de Paris'}
            {activeTab === 'magic-predictions' && 'Pronostics Magiques'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
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

        {/* Notification Bell Button Container */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={handleToggleDropdown}
            style={{
              background: showDropdown ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)',
              border: showDropdown ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid var(--border-color)',
              color: unreadCount > 0 ? '#bf5af2' : 'var(--text-secondary)',
              padding: '8px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            title="Notifications"
          >
            <Bell size={16} />
            
            {/* Glowing Unread Badge */}
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#bf5af2',
                animation: 'pulse 1.8s infinite'
              }} />
            )}
          </button>

          {/* Notifications Glassmorphic Dropdown Menu */}
          {showDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '12px',
              width: '320px',
              background: 'rgba(20, 20, 22, 0.96)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(191, 90, 242, 0.3)',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
              zIndex: 1500,
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              animation: 'fadeIn 0.15s ease-out'
            }} onClick={(e) => e.stopPropagation()}>
              
              {/* Header inside dropdown */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, fontFamily: 'Outfit', color: 'var(--text-primary)' }}>
                  Notifications ({notifications.length})
                </span>
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 600,
                      transition: 'color 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ff453a'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <Trash2 size={12} />
                    Tout effacer
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div style={{ 
                maxHeight: '240px', 
                overflowY: 'auto', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                paddingRight: '2px'
              }}>
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      style={{
                        padding: '10px 10px 10px 14px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.03)',
                        borderRadius: '8px',
                        position: 'relative',
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'flex-start'
                      }}
                    >
                      {/* Accent bar */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: '3px',
                        borderRadius: '3px 0 0 3px',
                        background: notif.type === 'error' ? '#ff453a' : 
                                    notif.type === 'warning' ? '#ff9f0a' : 
                                    notif.type === 'info' ? '#0a84ff' : '#30d158'
                      }} />

                      {/* Icon */}
                      <div style={{ marginTop: '2px', flexShrink: 0 }}>
                        {getNotificationIcon(notif.type)}
                      </div>

                      {/* Message and time */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flexGrow: 1 }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4', fontWeight: 500 }}>
                          {notif.message}
                        </span>
                        <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
                          {notif.timestamp}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 0', gap: '8px', color: 'var(--text-muted)' }}>
                    <BellOff size={24} style={{ opacity: 0.4 }} />
                    <span style={{ fontSize: '12px', fontWeight: 500 }}>Aucune notification récente.</span>
                  </div>
                )}
              </div>
            </div>
          )}
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
