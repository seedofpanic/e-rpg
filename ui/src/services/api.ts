// SocketService to handle all backend communication via Socket.IO
import { io, Socket } from 'socket.io-client';
import notificationStore from '../stores/NotificationStore';
import { AudioPlayer } from './audioPlayer';

const audioPlayer = new AudioPlayer();

export interface SocketResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

class SocketService {
  private socket: Socket | null = null;
  private responseCallbacks: Map<string, (response: any) => void> = new Map();
  isConnected: boolean = false;

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    this.socket = io();
    
    this.socket.on('connect', () => {
      console.log('SocketService: Connected to server');
      this.isConnected = true;
    });
    
    this.socket.on('disconnect', () => {
      console.log('SocketService: Disconnected from server');
      this.isConnected = false;
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

    audioPlayer.initialize(this);
  }

  /**
   * Send an event to the server and wait for a response
   */
  sendEvent(eventName: string, data?: any) {
    if (!this.socket) {
      return { success: false, error: 'Socket not initialized' };
    }

    if (data) {
      this.socket!.emit(eventName, data);
    } else {
      this.socket!.emit(eventName);
    }
  }

  on(eventName: string, callback: (data: any) => void) {
    if (!this.socket) {
      return { success: false, error: 'Socket not initialized' };
    }
    this.socket!.on(eventName, callback);
  }

  /**
   * Roll a skill for a character
   */
  rollSkill(characterId: string, skillName: string) {
    this.sendEvent('roll_skill', {
      character_id: characterId,
      skill_name: skillName
    });
  }
}

const socketService = new SocketService();
export default socketService; 