import { makeAutoObservable } from 'mobx';
import socketService from '../services/api';

export interface Persona {
  id: string;
  name: string;
  description: string;
  avatar: string;
  isDefault: boolean;
  isFavorite: boolean;
  avatarTimestamp?: number;
}

class PersonaStore {
  personas: Persona[] = [];
  currentPersona: Persona | null = null;
  isLoading: boolean = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);

    // Initialize by loading personas
    this.initSocket();
  }

  initSocket() {
    socketService.on('personas_updated', (data: { personas: Persona[], default_persona: string }) => {
      console.log('personas_updated', data);
      this.loadPersonas(data);
    });
  }

  loadPersonas(data: { personas: Persona[], default_persona: string }) {
    this.personas = Object.values(data.personas);
    this.currentPersona = this.personas.find(p => p.id === data.default_persona) || null;
  }

  setCurrentPersona(personaId: string) {
    const persona = this.personas.find(p => p.id === personaId);
    if (!persona) {
      this.error = 'Persona not found';
      return;
    }

    this.currentPersona = persona;
  }

  async createPersona(persona: Omit<Persona, 'id'>) {
    this.isLoading = true;
    this.error = null;

    socketService.sendEvent('create_persona', persona);
  }

  async updatePersona(personaId: string, updates: Partial<Omit<Persona, 'id'>>) {
    this.isLoading = true;
    this.error = null;

    // Add timestamp for avatar updates
    const updatesWithTimestamp = {...updates};
    if (updates.avatar) {
      updatesWithTimestamp.avatarTimestamp = Date.now();
    }

    socketService.sendEvent('update_persona', {
      persona_id: personaId,
      ...updatesWithTimestamp
    });
  }

  async deletePersona(personaId: string) {
    this.isLoading = true;
    this.error = null;

    socketService.sendEvent('delete_persona', { persona_id: personaId });
  }

  async setAsDefault(personaId: string) {
    this.isLoading = true;
    this.error = null;

    socketService.sendEvent('set_default_persona', { persona_id: personaId });
  }

  async toggleFavorite(personaId: string) {
    const persona = this.personas.find(p => p.id === personaId);
    if (!persona) {
      this.error = 'Persona not found';
      return;
    }

    const newFavoriteState = !persona.isFavorite;
    
    socketService.sendEvent('update_persona', {
      persona_id: personaId,
      isFavorite: newFavoriteState
    });
  }

  // New method to refresh avatar without changing the actual image
  refreshAvatar(personaId: string) {
    const persona = this.personas.find(p => p.id === personaId);
    if (!persona) return;
    
    // Update timestamp to force refresh
    const updates = {
      avatarTimestamp: Date.now()
    };
    
    // Also update on backend
    socketService.sendEvent('update_persona', {
      persona_id: personaId,
      ...updates
    });
  }

  getPersonaById(personaId: string) {
    return this.personas.find(p => p.id === personaId);
  }
}

export default new PersonaStore(); 