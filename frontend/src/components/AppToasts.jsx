import React from 'react';

export default function AppToasts({ toasts }) {
  return (
    <div style={{
      position: 'fixed',
      top: '24px',
      right: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      zIndex: 9999,
      pointerEvents: 'none'
    }}>
      {toasts.map(toast => (
        <div 
          key={toast.id}
          style={{
            pointerEvents: 'auto',
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(12px)',
            border: `1.5px solid rgba(${
              toast.type === 'error' ? '255, 69, 58' : 
              toast.type === 'warning' ? '255, 159, 10' : 
              toast.type === 'info' ? '10, 132, 255' : '48, 209, 88'
            }, 0.22)`,
            color: 'var(--text-primary)',
            padding: '12px 20px 12px 24px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            fontSize: '13px',
            fontFamily: 'Outfit',
            fontWeight: 600,
            minWidth: '290px',
            maxWidth: '380px',
            animation: 'slideInRight 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: '4px',
            background: toast.type === 'error' ? '#ff453a' : 
                        toast.type === 'warning' ? '#ff9f0a' : 
                        toast.type === 'info' ? '#0a84ff' : '#30d158'
          }} />
          <span style={{ flexGrow: 1, lineHeight: 1.4 }}>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
