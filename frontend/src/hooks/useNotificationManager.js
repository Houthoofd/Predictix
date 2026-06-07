import { useState, useEffect } from 'react';

export default function useNotificationManager() {
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notification, setNotification] = useState({
    show: false,
    title: '',
    message: '',
    type: 'success'
  });

  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: '',
    message: '',
    confirmText: 'Confirmer',
    cancelText: 'Annuler',
    isDanger: false,
    onConfirm: null,
    onCancel: null
  });

  const fetchNotifications = async (isInitial = false) => {
    try {
      const res = await fetch('http://localhost:5000/api/notifications');
      const json = await res.json();
      if (json.success) {
        const backendNotifs = json.data || [];
        
        if (!isInitial) {
          setNotifications(prev => {
            backendNotifs.forEach(bNotif => {
              const exists = prev.some(p => p.id === bNotif.id);
              if (!exists) {
                // Trigger toast notification
                const toastId = Date.now() + Math.random().toString(36).substr(2, 9);
                setToasts(t => [...t, { id: toastId, message: bNotif.message, type: bNotif.type }]);
                setTimeout(() => {
                  setToasts(t => t.filter(x => x.id !== toastId));
                }, 4000);
              }
            });
            return backendNotifs;
          });
        } else {
          setNotifications(backendNotifs);
        }
      }
    } catch (err) {
      console.error('Failed to sync notifications:', err);
    }
  };

  const handleClearNotifications = async () => {
    try {
      await fetch('http://localhost:5000/api/notifications', { method: 'DELETE' });
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  // Synchronize notifications list on mount and start polling
  useEffect(() => {
    fetchNotifications(true);
    
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  const showNotification = (title, message, type = 'success') => {
    setNotification({
      show: true,
      title,
      message,
      type
    });
  };

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setNotifications(prev => [
      { id, message, type, timestamp: timeStr, read: false },
      ...prev
    ]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const showConfirm = ({ title, message, confirmText, cancelText, isDanger, onConfirm }) => {
    setConfirmDialog({
      show: true,
      title: title || 'Confirmation Requise',
      message,
      confirmText: confirmText || 'Confirmer',
      cancelText: cancelText || 'Annuler',
      isDanger: !!isDanger,
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, show: false }));
        if (onConfirm) onConfirm();
      },
      onCancel: () => {
        setConfirmDialog(prev => ({ ...prev, show: false }));
      }
    });
  };

  return {
    toasts,
    setToasts,
    notifications,
    setNotifications,
    notification,
    setNotification,
    confirmDialog,
    setConfirmDialog,
    showNotification,
    showToast,
    showConfirm,
    handleClearNotifications
  };
}
