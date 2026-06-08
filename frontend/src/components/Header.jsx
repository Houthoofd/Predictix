import React from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  Wallet,
  Bell
} from 'lucide-react';
import HeaderNotifications from './HeaderNotifications';
import styles from './Header.module.css';

export default function Header({ 
  sidebarCollapsed, 
  setSidebarCollapsed, 
  activeTab, 
  theme, 
  setTheme, 
  bankroll,
  notifications = [],
  setNotifications,
  handleClearNotifications
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
    if (handleClearNotifications) {
      handleClearNotifications();
    } else {
      setNotifications([]);
    }
  };


  return (
    <header className={styles.appHeader} style={{ position: 'relative', overflow: 'visible' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button 
          className={styles.sidebarToggleBtn}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? "Agrandir le menu" : "Réduire le menu"}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        
        <div className={styles.breadcrumbs}>
          <span className={`${styles.crumbBrand} text-gradient-accent`}>PREDICTIX</span>
          <ChevronRight size={12} className={styles.crumbSeparator} />
          <span className={styles.crumbActive}>
            {activeTab === 'dashboard' && 'Tableau de Bord'}
            {activeTab === 'scraper' && 'Collecteur de Données'}
            {activeTab === 'tracker' && 'Tracker de Paris'}
            {activeTab === 'strategies' && 'Stratégies de Cartons'}
            {activeTab === 'basket' && 'Panier de Paris'}
            {activeTab === 'magic-predictions' && 'Sports'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
        {/* Theme switcher */}
        <div className={styles.headerThemeDots}>
          <button 
            className={`${styles.themeDot} ${theme === 'modern' ? styles.active : ''}`}
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
            className={`${styles.themeDot} ${theme === 'tech' ? styles.active : ''}`}
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
            className={`${styles.themeDot} ${theme === 'light' ? styles.active : ''}`}
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
            <HeaderNotifications 
              notifications={notifications} 
              setNotifications={setNotifications} 
              handleClearAll={handleClearAll} 
            />
          )}
        </div>

        <div className={styles.headerWalletPill}>
          <Wallet size={13} className="wallet-pill-icon text-gradient-accent" />
          <span>{bankroll.balance?.toFixed(2)} {bankroll.currency}</span>
        </div>

        <div className={styles.headerProfileAvatar} title="Benoit (Propriétaire)">
          B
        </div>
      </div>
    </header>
  );
}
