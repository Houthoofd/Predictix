import React from 'react';
import { 
  LayoutDashboard, 
  Database, 
  TrendingUp, 
  Award, 
  RefreshCcw 
} from 'lucide-react';

export default function Sidebar({ 
  sidebarCollapsed, 
  activeTab, 
  setActiveTab, 
  setShowResetBankrollModal 
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
            className={`nav-item ${activeTab === 'predictions' ? 'active' : ''}`}
            onClick={() => setActiveTab('predictions')}
            title={sidebarCollapsed ? "Pronostics Corners" : ""}
          >
            <Award size={20} />
            {!sidebarCollapsed && <span>Pronostics Corners</span>}
          </button>

          <button 
            className={`nav-item ${activeTab === 'scraper' ? 'active' : ''}`}
            onClick={() => setActiveTab('scraper')}
            title={sidebarCollapsed ? "Match en Direct (Scraper)" : ""}
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
