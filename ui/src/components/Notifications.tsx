import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import notificationStore, { Notification } from '../stores/NotificationStore';
import styles from '../styles/Notifications.module.css';

// Toast notification component
const Toast: React.FC<{ notification: Notification, onDismiss: () => void }> = observer(({ notification, onDismiss }) => {
  // Get appropriate icon based on notification type
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <i className="bi bi-check-circle-fill"></i>;
      case 'error':
        return <i className="bi bi-exclamation-circle-fill"></i>;
      case 'warning':
        return <i className="bi bi-exclamation-triangle-fill"></i>;
      case 'info':
        return <i className="bi bi-info-circle-fill"></i>;
      case 'loading':
        return <div className={styles.loadingSpinner}></div>;
      default:
        return <i className="bi bi-bell-fill"></i>;
    }
  };
  
  return (
    <div 
      className={`${styles.toast} ${styles[notification.type]}`}
      style={{ 
        animationDuration: `${notification.duration}ms`,
        animationPlayState: notification.type === 'loading' ? 'paused' : 'running' 
      }}
    >
      <div className={styles.toastIcon}>
        {getIcon()}
      </div>
      <div className={styles.toastContent}>
        <p>{notification.message}</p>
      </div>
      {notification.type !== 'loading' && (
        <button 
          className={styles.dismissButton} 
          onClick={onDismiss}
          aria-label="Dismiss notification"
        >
          <i className="bi bi-x"></i>
        </button>
      )}
    </div>
  );
});

// Confirmation dialog component
const ConfirmationDialog: React.FC = observer(() => {
  if (!notificationStore.isDialogOpen || !notificationStore.dialogOptions) {
    return null;
  }
  
  const { title, message, confirmText, cancelText, type } = notificationStore.dialogOptions;
  
  // Handle escape key to close dialog
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        notificationStore.handleCancel();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);
  
  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.confirmationDialog}>
        <div className={`${styles.dialogHeader} ${styles[type || 'warning']}`}>
          <h3>{title}</h3>
        </div>
        <div className={styles.dialogContent}>
          <p>{message}</p>
        </div>
        <div className={styles.dialogActions}>
          <button 
            className={styles.cancelButton} 
            onClick={() => notificationStore.handleCancel()}
          >
            {cancelText || 'Cancel'}
          </button>
          <button 
            className={`${styles.confirmButton} ${styles[type || 'warning']}`} 
            onClick={() => notificationStore.handleConfirm()}
          >
            {confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
});

// Main notifications container
const Notifications: React.FC = observer(() => {
  return (
    <>
      {/* Toast container */}
      <div className={styles.notificationsContainer}>
        {notificationStore.notifications.map(notification => (
          <Toast 
            key={notification.id} 
            notification={notification} 
            onDismiss={() => notificationStore.dismissNotification(notification.id)} 
          />
        ))}
      </div>
      
      {/* Confirmation dialog */}
      <ConfirmationDialog />
    </>
  );
});

export default Notifications; 