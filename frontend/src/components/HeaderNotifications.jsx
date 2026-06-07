import React from 'react';
import { Trash2, BellOff, AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';

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

export default function HeaderNotifications({ notifications, setNotifications, handleClearAll }) {
  return (
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

              <div style={{ marginTop: '2px', flexShrink: 0 }}>
                {getNotificationIcon(notif.type)}
              </div>

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
  );
}
