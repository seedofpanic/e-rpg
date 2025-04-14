// SocketService to handle all backend communication via Socket.IO
import { io, Socket } from 'socket.io-client';
import notificationStore from '../stores/NotificationStore';

export interface SocketResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

class SocketService {
  private socket: Socket | null = null;
  private connected: boolean = false;
  private responseCallbacks: Map<string, (response: any) => void> = new Map();
  private responseCounter: number = 0;

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    this.socket = io();
    
    this.socket.on('connect', () => {
      console.log('SocketService: Connected to server');
      this.connected = true;
    });
    
    this.socket.on('disconnect', () => {
      console.log('SocketService: Disconnected from server');
      this.connected = false;
    });

    // General response handler for all emitted events that expect responses
    this.socket.on('response', (data: any) => {
      if (data && data.requestId && this.responseCallbacks.has(data.requestId)) {
        const callback = this.responseCallbacks.get(data.requestId);
        if (callback) {
          callback(data.payload);
          this.responseCallbacks.delete(data.requestId);
        }
      }
    });
    
    // Listen for notification events from the server
    this.socket.on('notification', (data: { type: string, message: string }) => {
      switch (data.type) {
        case 'success':
          notificationStore.showSuccess(data.message);
          break;
        case 'error':
          notificationStore.showError(data.message);
          break;
        case 'warning':
          notificationStore.showWarning(data.message);
          break;
        case 'info':
          notificationStore.showInfo(data.message);
          break;
        default:
          notificationStore.showInfo(data.message);
      }
    });
  }

  /**
   * Send an event to the server and wait for a response
   */
  async sendEvent<T = any>(eventName: string, data: any = {}): Promise<SocketResponse<T>> {
    if (!this.socket) {
      return { success: false, error: 'Socket not initialized' };
    }

    try {
      return new Promise((resolve) => {
        const requestId = `req_${this.responseCounter++}_${Date.now()}`;
        
        // Store callback for this request
        this.responseCallbacks.set(requestId, (response) => {
          resolve({ success: true, data: response });
        });
        
        // Send event with requestId
        this.socket!.emit(eventName, { ...data, requestId });
        
        // Set timeout to clean up callback if no response is received
        setTimeout(() => {
          if (this.responseCallbacks.has(requestId)) {
            this.responseCallbacks.delete(requestId);
            resolve({ success: false, error: 'Request timed out' });
          }
        }, 10000); // 10 second timeout
      });
    } catch (error: any) {
      console.error(`SocketService: Error in sendEvent ${eventName}:`, error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Get save file path
   */
  async getSaveFilePath(): Promise<string> {
    const response = await this.sendEvent<{ filepath: string }>('get_save_file_path');
    return response.success ? response.data?.filepath || '' : '';
  }

  /**
   * Get autosave status
   */
  async getAutosaveStatus(): Promise<{ enabled: boolean, debug_mode: boolean }> {
    const response = await this.sendEvent<{ enabled: boolean, debug_mode: boolean }>('get_autosave_status');
    return response.success ? response.data || { enabled: false, debug_mode: false } : { enabled: false, debug_mode: false };
  }

  /**
   * Save game state
   */
  async saveGame(filepath: string): Promise<boolean> {
    const response = await this.sendEvent('save_game', { filepath });
    return response.success;
  }

  /**
   * Load game state
   */
  async loadGame(filepath: string): Promise<boolean> {
    const response = await this.sendEvent('load_game', { filepath });
    return response.success;
  }

  /**
   * Get all characters
   */
  async getCharacters() {
    console.log('SocketService: Fetching characters');
    const response = await this.sendEvent('get_characters');
    if (response.success && response.data) {
      console.log('SocketService: Characters fetched successfully', response.data);
      return response.data.characters || {};
    }
    console.error('SocketService: Failed to fetch characters', response);
    return {};
  }

  /**
   * Toggle character active state
   */
  async toggleCharacterActive(characterId: string): Promise<boolean> {
    if (!this.socket) return false;
    
    const character = await this.getCharacterById(characterId);
    if (!character) return false;
    
    const newActiveState = !character.active;
    
    const response = await this.sendEvent('toggle_character_active', {
      character_id: characterId,
      active: newActiveState
    });
    
    return response.success;
  }

  /**
   * Get a character by ID
   */
  async getCharacterById(characterId: string) {
    const characters = await this.getCharacters();
    return characters[characterId];
  }

  /**
   * Update characters
   */
  async updateCharacters(characters: any): Promise<boolean> {
    const response = await this.sendEvent('update_characters', { characters });
    return response.success;
  }

  /**
   * Delete a character
   */
  async deleteCharacter(characterId: string): Promise<boolean> {
    const response = await this.sendEvent('delete_character', { character_id: characterId });
    return response.success;
  }

  /**
   * Get inventory for all characters
   */
  async getInventory() {
    console.log('SocketService: Fetching inventory');
    const response = await this.sendEvent('get_inventory');
    if (response.success && response.data) {
      console.log('SocketService: Inventory fetched successfully', response.data);
      return response.data;
    }
    console.error('SocketService: Failed to fetch inventory', response);
    return { items: [] };
  }

  /**
   * Get inventory for a specific character
   */
  async getCharacterInventory(characterId: string) {
    console.log(`SocketService: Fetching inventory for character ${characterId}`);
    const response = await this.sendEvent('get_character_inventory', { character_id: characterId });
    if (response.success && response.data) {
      console.log('SocketService: Character inventory fetched successfully', response.data);
      return response.data.items || [];
    }
    console.error('SocketService: Failed to fetch character inventory', response);
    return [];
  }

  /**
   * Add an item to a character's inventory
   */
  async addInventoryItem(item: any): Promise<boolean> {
    const response = await this.sendEvent('add_inventory_item', item);
    return response.success;
  }

  /**
   * Update an inventory item
   */
  async updateInventoryItem(item: any): Promise<boolean> {
    const response = await this.sendEvent('update_inventory_item', item);
    return response.success;
  }

  /**
   * Remove an item from a character's inventory
   */
  async removeInventoryItem(characterId: string, itemId: string): Promise<boolean> {
    const response = await this.sendEvent('remove_inventory_item', {
      character_id: characterId,
      item_id: itemId
    });
    return response.success;
  }

  /**
   * Get all personas
   */
  async getPersonas() {
    console.log('SocketService: Fetching personas');
    const response = await this.sendEvent('get_personas');
    if (response.success && response.data) {
      console.log('SocketService: Personas fetched successfully', response.data);
      return response.data.personas || [];
    }
    console.error('SocketService: Failed to fetch personas', response);
    return [];
  }

  /**
   * Create a new persona
   */
  async createPersona(persona: any) {
    console.log('SocketService: Creating persona', persona);
    const response = await this.sendEvent('create_persona', persona);
    return response;
  }

  /**
   * Update an existing persona
   */
  async updatePersona(personaId: string, updates: any) {
    console.log(`SocketService: Updating persona ${personaId}`, updates);
    const response = await this.sendEvent('update_persona', {
      persona_id: personaId,
      ...updates
    });
    return response;
  }

  /**
   * Delete a persona
   */
  async deletePersona(personaId: string) {
    console.log(`SocketService: Deleting persona ${personaId}`);
    const response = await this.sendEvent('delete_persona', { persona_id: personaId });
    return response;
  }

  /**
   * Set a persona as default
   */
  async setDefaultPersona(personaId: string) {
    console.log(`SocketService: Setting persona ${personaId} as default`);
    const response = await this.sendEvent('set_default_persona', { persona_id: personaId });
    return response;
  }

  /**
   * Switch to a different persona
   */
  async switchPersona(personaId: string) {
    console.log(`SocketService: Switching to persona ${personaId}`);
    const response = await this.sendEvent('switch_persona', { persona_id: personaId });
    return response;
  }

  /**
   * Upload a persona avatar
   */
  async uploadPersonaAvatar(personaId: string, file: File) {
    console.log(`SocketService: Uploading avatar for persona ${personaId}`);
    
    // Create a FormData object to send the file
    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('persona_id', personaId);
    
    // Use fetch for file upload since Socket.IO isn't ideal for binary data
    try {
      const response = await fetch('/api/upload_persona_avatar', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error uploading persona avatar:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Roll a skill for a character
   */
  async rollSkill(characterId: string, skillName: string): Promise<boolean> {
    const response = await this.sendEvent('roll_skill', {
      character_id: characterId,
      skill_name: skillName
    });
    return response.success;
  }

  /**
   * Get the socket instance for direct use
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

const socketService = new SocketService();
export default socketService; 