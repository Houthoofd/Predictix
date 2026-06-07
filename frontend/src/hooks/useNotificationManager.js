import { useState } from 'react';

export default function useNotificationManager() {
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([
    { id: 'init', message: 'Bienvenue sur votre tableau de bord Predictix !', type: 'info', timestamp: 'À l\'instant', read: false }
  ]);
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
    showConfirm
  };
}
