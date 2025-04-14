import socketService, { SocketResponse } from './api';
import notificationStore from '../stores/NotificationStore';

// ApiHandler enhances the SocketService with notification functionality
class ApiHandler {
  /**
   * Send request with notification handling
   * @param apiCall - Function that makes the actual API call
   * @param successMessage - Message to show on success (optional)
   * @param errorPrefix - Prefix for error messages
   * @param loadingKey - Key for tracking loading state
   */
  async withNotification<T>(
    apiCall: () => Promise<SocketResponse<T>>,
    options: {
      successMessage?: string,
      errorPrefix: string,
      loadingKey: string
    }
  ): Promise<SocketResponse<T>> {
    const { successMessage, errorPrefix, loadingKey } = options;
    
    // Set loading state
    notificationStore.setLoading(loadingKey, true);
    
    try {
      const response = await apiCall();
      
      // Clear loading state
      notificationStore.setLoading(loadingKey, false);
      
      if (response.success) {
        // Show success notification if provided
        if (successMessage) {
          notificationStore.showSuccess(successMessage);
        }
        return response;
      } else {
        // Show error notification
        const errorMessage = response.error || 'Unknown error occurred';
        notificationStore.showError(`${errorPrefix}: ${errorMessage}`);
        return response;
      }
    } catch (error: any) {
      // Clear loading state and show error
      notificationStore.setLoading(loadingKey, false);
      notificationStore.showError(`${errorPrefix}: ${error.message || 'Unknown error occurred'}`);
      
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Confirm an action with a dialog before executing
   * @param options - Configuration for the confirmation dialog
   * @param action - Function to execute if confirmed
   */
  async withConfirmation<T>(
    options: {
      title: string,
      message: string,
      confirmText?: string,
      cancelText?: string,
      type?: 'danger' | 'warning' | 'info'
    },
    action: () => Promise<T>
  ): Promise<T | null> {
    return new Promise(resolve => {
      notificationStore.showConfirmationDialog({
        ...options,
        onConfirm: async () => {
          try {
            const result = await action();
            resolve(result);
          } catch (error) {
            notificationStore.showError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            resolve(null);
          }
        },
        onCancel: () => {
          resolve(null);
        }
      });
    });
  }
  
  // Enhanced API methods with notifications
  
  async saveGame(filepath: string): Promise<boolean> {
    const response = await this.withNotification(
      () => socketService.sendEvent('save_game', { filepath }),
      {
        errorPrefix: 'Failed to save game',
        loadingKey: 'saveGame'
      }
    );
    return response.success;
  }
  
  async loadGame(filepath: string): Promise<boolean> {
    const confirmResult = await this.withConfirmation(
      {
        title: 'Load Game',
        message: 'Loading a game will replace your current game state. Are you sure you want to continue?',
        type: 'warning'
      },
      async () => {
        const response = await this.withNotification(
          () => socketService.sendEvent('load_game', { filepath }),
          {
            errorPrefix: 'Failed to load game',
            loadingKey: 'loadGame'
          }
        );
        return response.success;
      }
    );
    
    return confirmResult || false;
  }
  
  async deleteCharacter(characterId: string): Promise<boolean> {
    const confirmResult = await this.withConfirmation(
      {
        title: 'Delete Character',
        message: 'This action cannot be undone. Are you sure you want to delete this character?',
        confirmText: 'Delete',
        type: 'danger'
      },
      async () => {
        const response = await this.withNotification(
          () => socketService.sendEvent('delete_character', { character_id: characterId }),
          {
            successMessage: 'Character deleted successfully',
            errorPrefix: 'Failed to delete character',
            loadingKey: 'deleteCharacter'
          }
        );
        return response.success;
      }
    );
    
    return confirmResult || false;
  }
  
  async removeInventoryItem(characterId: string, itemId: string): Promise<boolean> {
    const confirmResult = await this.withConfirmation(
      {
        title: 'Remove Item',
        message: 'Are you sure you want to remove this item from inventory?',
        type: 'warning'
      },
      async () => {
        const response = await this.withNotification(
          () => socketService.sendEvent('remove_inventory_item', { character_id: characterId, item_id: itemId }),
          {
            successMessage: 'Item removed successfully',
            errorPrefix: 'Failed to remove item',
            loadingKey: 'removeItem'
          }
        );
        return response.success;
      }
    );
    
    return confirmResult || false;
  }
  
  // Expose the original SocketService for methods we haven't enhanced yet
  getSocketService() {
    return socketService;
  }
}

const apiHandler = new ApiHandler();
export default apiHandler; 