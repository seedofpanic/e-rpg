import { makeAutoObservable } from 'mobx';
import personaStore from './PersonaStore';
import socketService from '../services/api';

// Local storage key for game state file path
const SAVE_FILE_PATH_STORAGE_KEY = 'e-rpg-save-file-path';

export interface Message {
  id: string;
  sender: string;
  content: string;
  characterId?: string;
  avatar?: string;
  type: 'message' | 'system' | 'thinking' | 'gm' | 'roll' | 'memory';
  timestamp: number;
  data?: any; // For skill roll data and other message-specific data
}

export interface Scene {
  description: string;
  text: string;
  lore: string;
}

class ChatStore {
  
  // Messages
  messages: Message[] = [];
  isThinking: boolean = false;
  
  // Persona
  currentPersonaId: string = '';
  
  // Settings
  saveFilePath: string = '';
  autosaveEnabled: boolean = true;
  autosaveThreshold: number = 5;

  skillRollModal: {
    open: boolean;
    characterId: string;
  } = {
    open: false,
    characterId: ''
  };
  
  // UI State
  messageInput: string = '';

  constructor() {
    makeAutoObservable(this);
    
    // Load saved file path from local storage
    const savedFilePath = localStorage.getItem(SAVE_FILE_PATH_STORAGE_KEY);
    if (savedFilePath) {
      this.saveFilePath = savedFilePath;
    }
    
    this.initializeSocket();
  }

  initializeSocket() {
    try {
      socketService.on('connect', () => {
        console.log('Socket connected');
        this.setConnected(true);
        
        // Load the default persona if available
        this.ensureCurrentPersona();
      });
      
      socketService.on('disconnect', () => {
        console.log('Socket disconnected');
        this.setConnected(false);
      });
      
      // Listen for character messages
      socketService.on('message', (data) => {
        this.addMessage(data);
      });
      
      // Listen for new messages (separate from regular message events)
      socketService.on('new_message', (data) => {
        this.addMessage(data);
      });
      
      // Listen for loading messages in bulk (e.g., when loading a saved game)
      socketService.on('load_messages', (messages) => {
        console.log('Loading messages:', messages.length);
        // Clear existing messages first
        this.setMessages([]);
        // Add all messages in the array
        if (Array.isArray(messages)) {
          messages.forEach(msg => this.addMessage(msg));
        }
      });
      
      // Listen for game state updates
      socketService.on('scene_updated', (data) => {
        console.log('Received scene update:', data);
        if (typeof data === 'string') {
          this.updateScene(data);
        } else if (data && typeof data === 'object') {
          this.updateScene(data);
        }
      });
      
      // Listen for thinking status
      socketService.on('thinking_started', () => {
        this.setThinking(true);
      });
      
      socketService.on('thinking_stopped', () => {
        this.setThinking(false);
      });
      
      socketService.on('thinking_ended', () => {
        this.setThinking(false);
      });
      
      // Listen for save file path updates
      socketService.on('save_file_path', (data) => {
        this.setSaveFilePath(data.filepath);
      });
      
      // Listen for autosave settings updates
      socketService.on('autosave_settings', (data) => {
        this.autosaveEnabled = data.enabled;
        this.autosaveThreshold = data.threshold;
      });
      
      // Listen for autosave status updates
      socketService.on('autosave_status', (data) => {
        this.autosaveEnabled = data.enabled;
      });
      
      // Listen for game reset events
      socketService.on('game_reset', () => {
        this.resetState();
      });
      
      // Listen for notification events
      socketService.on('notification', (data) => {
        // toast notification using UI notifications system
        console.log('Notification:', data);
      });
    } catch (error) {
      console.error('Socket initialization error:', error);
    }
  }
  
  // Method to ensure the current persona is set
  private ensureCurrentPersona() {
    // If currentPersonaId is not set, use the default from PersonaStore
    if (!this.currentPersonaId && personaStore.currentPersona) {
      this.currentPersonaId = personaStore.currentPersona.id;
    }
  }

  setMessages(messages: Message[]) {
    this.messages = messages;
  }
  
  // Message Actions
  setMessageInput(text: string) {
    this.messageInput = text;
  }
  
  sendMessage() {
    if (!this.messageInput.trim() || !this.socket) return;
    
    const message = this.messageInput;
    this.messageInput = '';
    
    // Make sure we have a current persona
    this.ensureCurrentPersona();
    
    this.socket.emit('gm_message', {
      message,
      persona_id: this.currentPersonaId
    });
  }
  
  continueCampaign() {
    if (!this.socket) return;
    
    this.socket.emit('gm_continue');
    
    this.setThinking(true);
  }
  
  addMessage(message: any) {
    // Generate a unique ID if not provided
    const id = message.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const newMessage: Message = {
      id,
      sender: message.sender || 'System',
      content: message.content || message.message || '',
      characterId: message.character_id,
      avatar: message.avatar,
      type: message.type || 'character',
      timestamp: Date.now(),
      data: message.data
    };
    
    this.messages.push(newMessage);
    
    // Remove thinking message if this is a response
    if (newMessage.type !== 'thinking') {
      this.setThinking(false);
    }
  }
  
  setThinking(isThinking: boolean) {
    this.isThinking = isThinking;
    
    if (isThinking) {
      // Add thinking message
      const thinkingMessageIndex = this.messages.findIndex(m => m.type === 'thinking');
      
      if (thinkingMessageIndex === -1) {
        this.addMessage({
          sender: 'System',
          content: 'Thinking...',
          type: 'thinking',
          id: 'thinking-message'
        });
      }
    } else {
      // Remove thinking message
      const thinkingMessageIndex = this.messages.findIndex(m => m.type === 'thinking');
      
      if (thinkingMessageIndex !== -1) {
        this.messages.splice(thinkingMessageIndex, 1);
      }
    }
  }
  
  // Scene Actions
  updateScene(data: any) {
    console.log('Updating scene with data:', data);
    
    // Check if we're receiving string data directly
    if (typeof data === 'string') {
      this.currentScene = {
        description: data,
        text: data,
        lore: this.currentScene.lore || ''
      };
    } 
    // Check if data is an object with scene property
    else if (data && typeof data === 'object') {
      // The backend sends { scene: string, lore: string }
      // We need to map it to our Scene interface
      this.currentScene = {
        description: data.scene || data.description || '',
        text: data.scene || data.text || '',
        lore: data.lore || this.currentScene.lore || ''
      };
    }
    
    console.log('Scene updated:', this.currentScene);
  }
  
  saveScene() {
    if (!this.socket) return;
    
    this.socket.emit('update_scene', this.currentScene);
  }
  
  // Persona Actions
  setCurrentPersona(personaId: string) {
    this.currentPersonaId = personaId;
    
    if (this.socket) {
      this.socket.emit('set_current_persona', { persona_id: personaId });
    }
    
    // Synchronize with PersonaStore if needed
    if (personaStore.currentPersona?.id !== personaId) {
      personaStore.setCurrentPersona(personaId);
    }
  }
  
  // Reset state (for game reset)
  resetState() {
    this.messages = [];
    this.currentScene = {
      description: '',
      text: '',
      lore: ''
    };
  }
  
  // Get socket for other stores to use
  getSocket(): Socket | null {
    return this.socket;
  }
  
  // Update lore in game state
  updateLore(loreText: string) {
    if (!this.socket) return;
    
    this.socket.emit('update_game_state', {
      lore: loreText,
      requestId: Date.now().toString()
    });
    
    // Update locally too
    this.currentScene = {
      ...this.currentScene,
      lore: loreText
    };
  }

  // Save game to a file
  saveGame(path?: string) {
    if (!this.socket) return;
    
    const finalPath = path || this.saveFilePath;
    
    this.socket.emit('save_game', {
      filepath: finalPath
    });
    
    if (finalPath) {
      this.setSaveFilePath(finalPath);
    }
  }
  
  // Load game from a file
  loadGame(path?: string) {
    if (!this.socket) return;
    
    const finalPath = path || this.saveFilePath;
    
    this.socket.emit('load_game', {
      filepath: finalPath
    });
    
    if (finalPath) {
      this.setSaveFilePath(finalPath);
    }
  }
  
  // Reset game to initial state
  resetGame() {
    if (!this.socket) return;
    
    this.socket.emit('reset_game');
  }

  // Override setter for saveFilePath to also update localStorage
  setSaveFilePath(path: string) {
    this.saveFilePath = path;
    
    // Store in local storage for persistence
    if (path) {
      localStorage.setItem(SAVE_FILE_PATH_STORAGE_KEY, path);
    } else {
      localStorage.removeItem(SAVE_FILE_PATH_STORAGE_KEY);
    }
  }

  openSkillRoll(characterId: string) {
     this.skillRollModal.open = true;
     this.skillRollModal.characterId = characterId;
  }

  setConnected(connected: boolean) {
    this.isConnected = connected;
  }
}

export default new ChatStore(); 