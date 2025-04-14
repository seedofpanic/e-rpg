import { makeAutoObservable } from 'mobx';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration: number; // in milliseconds
  timestamp: number;
}

export interface ConfirmationDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  type?: 'danger' | 'warning' | 'info';
}

class NotificationStore {
  notifications: Notification[] = [];
  loadingStates: Map<string, boolean> = new Map();
  isDialogOpen: boolean = false;
  dialogOptions: ConfirmationDialogOptions | null = null;
  
  constructor() {
    makeAutoObservable(this);
  }
  
  // Show a toast notification
  showNotification(message: string, type: NotificationType = 'info', duration: number = 3000) {
    const id = Date.now().toString();
    const notification: Notification = {
      id,
      message,
      type,
      duration,
      timestamp: Date.now()
    };
    
    this.notifications.push(notification);
    
    // Auto-dismiss non-loading notifications
    if (type !== 'loading') {
      setTimeout(() => {
        this.dismissNotification(id);
      }, duration);
    }
    
    return id;
  }
  
  // Shorthand methods for different notification types
  showSuccess(message: string, duration: number = 3000) {
    return this.showNotification(message, 'success', duration);
  }
  
  showError(message: string, duration: number = 5000) {
    return this.showNotification(message, 'error', duration);
  }
  
  showWarning(message: string, duration: number = 4000) {
    return this.showNotification(message, 'warning', duration);
  }
  
  showInfo(message: string, duration: number = 3000) {
    return this.showNotification(message, 'info', duration);
  }
  
  // Show a special notification for rate limits
  showRateLimitNotification(retryAfter: number) {
    const seconds = Math.ceil(retryAfter / 1000);
    return this.showNotification(
      `Rate limit reached. Please wait ${seconds} seconds before trying again.`,
      'warning',
      retryAfter + 1000
    );
  }
  
  // Dismiss a notification by id
  dismissNotification(id: string) {
    this.notifications = this.notifications.filter(notification => notification.id !== id);
  }
  
  // Clear all notifications
  clearAllNotifications() {
    this.notifications = [];
  }
  
  // Loading indicator methods
  setLoading(key: string, isLoading: boolean) {
    this.loadingStates.set(key, isLoading);
    
    // If we're setting a loading state to true, also show a loading toast
    if (isLoading) {
      const loadingId = `loading-${key}`;
      const existingNotification = this.notifications.find(n => n.id === loadingId);
      
      if (!existingNotification) {
        this.showNotification(`Loading ${key}...`, 'loading', 0);
      }
    } else {
      // Remove the loading toast when done
      const loadingId = `loading-${key}`;
      this.dismissNotification(loadingId);
    }
  }
  
  isLoading(key: string): boolean {
    return this.loadingStates.get(key) || false;
  }
  
  // Confirmation dialog methods
  showConfirmationDialog(options: ConfirmationDialogOptions) {
    this.dialogOptions = {
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      type: 'warning',
      ...options
    };
    this.isDialogOpen = true;
  }
  
  closeConfirmationDialog() {
    this.isDialogOpen = false;
    this.dialogOptions = null;
  }
  
  handleConfirm() {
    if (this.dialogOptions?.onConfirm) {
      this.dialogOptions.onConfirm();
    }
    this.closeConfirmationDialog();
  }
  
  handleCancel() {
    if (this.dialogOptions?.onCancel) {
      this.dialogOptions.onCancel();
    }
    this.closeConfirmationDialog();
  }
}

const notificationStore = new NotificationStore();
export default notificationStore; 