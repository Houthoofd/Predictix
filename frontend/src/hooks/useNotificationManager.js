import { useState, useEffect } from 'react';

export default function useNotificationManager(globalSettings) {
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

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data || []);
      }
    } catch (err) {
      console.error('Failed to sync notifications:', err);
    }
  };

  const handleClearNotifications = async () => {
    try {
      await fetch('/api/notifications', { method: 'DELETE' });
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  // Synchronize notifications list on mount and listen to SSE stream if enabled
  useEffect(() => {
    fetchNotifications();
    
    const isRealtime = !globalSettings || globalSettings.realtime_notifications !== 'false';
    if (!isRealtime) {
      return;
    }
    
    const eventSource = new EventSource('/api/notifications/stream');
    
    eventSource.onmessage = (event) => {
      try {
        const newNotif = JSON.parse(event.data);
        setNotifications(prev => {
          const exists = prev.some(p => p.id === newNotif.id);
          if (!exists) {
            // Trigger toast notification
            const toastId = Date.now() + Math.random().toString(36).substr(2, 9);
            setToasts(t => [...t, { id: toastId, message: newNotif.message, type: newNotif.type }]);
            setTimeout(() => {
              setToasts(t => t.filter(x => x.id !== toastId));
            }, 4000);
            return [newNotif, ...prev];
          }
          return prev;
        });
      } catch (err) {
        console.error('Failed to parse SSE notification:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('EventSource connection error, attempting automatic reconnection...', err);
    };

    return () => {
      eventSource.close();
    };
  }, [globalSettings]);

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
