import { makeAutoObservable } from 'mobx';
import personaStore from './PersonaStore';
import socketService from '../services/api';
import notificationStore from './NotificationStore';

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
    
    this.initializeSocket();
  }

  initializeSocket() {
    // Listen for character messages
    socketService.on('message', (data) => {
      this.addMessage(data);
    });
    
    // Listen for new messages (separate from regular message events)
    socketService.on('new_message', (data) => {
      console.log('New message:', data);
      this.addMessage(data);
    });
    
    // Listen for loading messages in bulk (e.g., when loading a saved game)
    socketService.on('load_messages', ({messages}) => {
      // Clear existing messages first
      this.setMessages([]);
      // Add all messages in the array
      if (Array.isArray(messages)) {
        messages.forEach(msg => this.addMessage(msg));
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

    // Listen for notification events
    socketService.on('notification', (data) => {
      // toast notification using UI notifications system
      console.log('Notification:', data);
    });

    socketService.on('voice_transcription_result', (data) => {
      if (data.success && data.text) {
        // Add the transcribed text to the input box
        this.setMessageInput(this.messageInput + data.text);
        notificationStore.showSuccess('Voice transcription completed successfully');
      } else {
        console.error('Voice transcription error:', data.error);
        notificationStore.showError(`Voice transcription failed: ${data.error || 'Unknown error'}`);
      }
    });
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
    if (!this.messageInput.trim()) return;
    
    const message = this.messageInput;
    this.messageInput = '';
    
    // Make sure we have a current persona
    this.ensureCurrentPersona();
    
    socketService.sendEvent('gm_message', {
      message,
      persona_id: this.currentPersonaId
    });
  }
  
  continueCampaign() {
    socketService.sendEvent('gm_continue');
    
    this.setThinking(true);
  }
  
  addMessage(message: any) {
    // Generate a unique ID if not provided
    const newMessage: Message = {
      id: message.id,
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
  
  // Persona Actions
  setCurrentPersona(personaId: string) {
    this.currentPersonaId = personaId;
    
    socketService.sendEvent('set_current_persona', { persona_id: personaId });
    
    // Synchronize with PersonaStore if needed
    if (personaStore.currentPersona?.id !== personaId) {
      personaStore.setCurrentPersona(personaId);
    }
  }

  openSkillRoll(characterId: string) {
     this.skillRollModal.open = true;
     this.skillRollModal.characterId = characterId;
  }

  closeSkillRoll() {
    this.skillRollModal.open = false;
    this.skillRollModal.characterId = '';
  }
}

export default new ChatStore(); 