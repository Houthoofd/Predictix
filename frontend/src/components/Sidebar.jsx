import React from 'react';
import { 
  LayoutDashboard, 
  Database, 
  TrendingUp, 
  RefreshCcw,
  Sparkles,
  ShoppingCart,
  ShieldAlert,
  Trophy,
  Dribbble,
  Target,
  Shield,
  Activity,
  Flame,
  Disc,
  Award,
  Crown,
  Zap,
  Timer,
  Circle,
  Crosshair,
  Medal,
  ChevronDown
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

const ALL_SPORTS = [
  'football',
  'basketball',
  'tennis',
  'rugby',
  'handball',
  'volleyball',
  'hockey',
  'baseball',
  'american-football',
  'table-tennis',
  'badminton',
  'cricket',
  'snooker',
  'futsal'
];

const SoccerBallIcon = ({ size = 13, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <circle cx="12" cy="12" r="10" />
    <polygon points="12,7 16,10 14.5,15 9.5,15 8,10" fill="currentColor" fillOpacity="0.2" />
    <line x1="12" y1="2" x2="12" y2="7" />
    <line x1="2" y1="9.5" x2="8" y2="10" />
    <line x1="5.5" y1="19.5" x2="9.5" y2="15" />
    <line x1="18.5" y1="19.5" x2="14.5" y2="15" />
    <line x1="22" y1="9.5" x2="16" y2="10" />
  </svg>
);

const RugbyBallIcon = ({ size = 13, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M5,19 C5,10 10,5 19,5 C19,14 14,19 5,19 Z" fill="currentColor" fillOpacity="0.2" />
    <line x1="5" y1="19" x2="19" y2="5" />
    <line x1="9" y1="13" x2="11" y2="15" />
    <line x1="11" y1="11" x2="13" y2="13" />
    <line x1="13" y1="9" x2="15" y2="11" />
  </svg>
);

const HandballBallIcon = ({ size = 13, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <circle cx="12" cy="12" r="10" />
    <path d="M6,6 C9,9 15,9 18,6" />
    <path d="M6,18 C9,15 15,15 18,18" />
    <path d="M6,6 C9,9 9,15 6,18" />
    <path d="M18,6 C15,9 15,15 18,18" />
  </svg>
);

const VolleyballBallIcon = ({ size = 13, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12,2 C12,12 2,12 2,12" />
    <path d="M12,12 C12,22 22,12 22,12" />
    <path d="M12,12 C22,12 12,2 12,2" />
    <path d="M2.5,9 C7,11 11,7 9,2.5" />
    <path d="M15,21.5 C13,17 17,13 21.5,15" />
    <path d="M9,21.5 C11,17 7,13 2.5,15" />
    <path d="M15,2.5 C17,7 13,11 21.5,9" />
  </svg>
);

const HockeyIcon = ({ size = 13, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M19,3 L7,15 L4,15 C3,15 2.5,16 3,17 L4.5,20 C5,21 6,21 7,20 L7,17 L19,5" />
    <path d="M14,18 C14,19 16.5,20 19,20 C21.5,20 24,19 24,18 C24,17 21.5,16 19,16 C16.5,16 14,17 14,18 Z" fill="currentColor" fillOpacity="0.2" />
    <path d="M14,18 L14,19.5 C14,20.5 16.5,21.5 19,21.5 C21.5,21.5 24,20.5 24,19.5 L24,18" />
  </svg>
);

const BaseballBallIcon = ({ size = 13, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <circle cx="12" cy="12" r="10" />
    <path d="M6,6 C9,9 9,15 6,18" />
    <path d="M18,6 C15,9 15,15 18,18" />
    <line x1="7.5" y1="8" x2="8.5" y2="7.5" />
    <line x1="8.5" y1="11" x2="9.5" y2="11" />
    <line x1="7.5" y1="14" x2="8.5" y2="14.5" />
    <line x1="16.5" y1="8" x2="15.5" y2="7.5" />
    <line x1="15.5" y1="11" x2="14.5" y2="11" />
    <line x1="16.5" y1="14" x2="15.5" y2="14.5" />
  </svg>
);

const sportIcons = {
  football: SoccerBallIcon,
  basketball: Dribbble,
  tennis: Target,
  rugby: RugbyBallIcon,
  handball: HandballBallIcon,
  volleyball: VolleyballBallIcon,
  hockey: HockeyIcon,
  baseball: BaseballBallIcon,
  'american-football': RugbyBallIcon,
  'table-tennis': Circle,
  badminton: Zap,
  cricket: Timer,
  snooker: Crosshair,
  futsal: SoccerBallIcon
};

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

  React.useEffect(() => {
    if (activeTab === 'magic-predictions') {
      setIsMagicExpanded(true);
    } else {
      setIsMagicExpanded(false);
    }
  }, [activeTab]);

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
              onClick={() => {
                if (activeTab === 'magic-predictions') {
                  setIsMagicExpanded(prev => !prev);
                } else {
                  setActiveTab('magic-predictions');
                }
              }}
              title={sidebarCollapsed ? "Pronostics Magiques" : ""}
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
              {!sidebarCollapsed && <span style={{ fontWeight: activeTab === 'magic-predictions' ? 700 : 500 }}>Pronostics Magiques</span>}
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
            
            <div 
              className="sports-submenu"
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                paddingLeft: '12px', 
                gap: '4px',
                borderLeft: '1.5px solid rgba(191, 90, 242, 0.25)',
                marginLeft: '26px',
                // Smooth height/opacity transitions
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
                const SportIcon = sportIcons[sportKey] || Activity;
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
