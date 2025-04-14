import { makeObservable, observable, action, runInAction } from 'mobx';
import api from '../services/api';

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
    makeObservable(this, {
      personas: observable,
      currentPersona: observable,
      isLoading: observable,
      error: observable,
      loadPersonas: action,
      setCurrentPersona: action,
      createPersona: action,
      updatePersona: action,
      deletePersona: action,
      setAsDefault: action,
      toggleFavorite: action,
      refreshAvatar: action
    });

    // Initialize by loading personas
    this.loadPersonas();
  }

  async loadPersonas() {
    this.isLoading = true;
    this.error = null;

    try {
      const response = await api.sendEvent<{ personas: Persona[] }>('get_personas');
      
      runInAction(() => {
        if (response.success && response.data) {
          this.personas = response.data.personas || [];
          
          // Set current persona to the default one if available
          const defaultPersona = this.personas.find(p => p.isDefault);
          if (defaultPersona) {
            this.currentPersona = defaultPersona;
          } else if (this.personas.length > 0) {
            // Otherwise use the first one
            this.currentPersona = this.personas[0];
          }
        } else {
          this.error = 'Failed to load personas';
        }
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Unknown error loading personas';
        this.isLoading = false;
      });
    }
  }

  async setCurrentPersona(personaId: string) {
    const persona = this.personas.find(p => p.id === personaId);
    if (!persona) {
      this.error = 'Persona not found';
      return;
    }

    this.currentPersona = persona;
    await api.sendEvent('switch_persona', { persona_id: personaId });
  }

  async createPersona(persona: Omit<Persona, 'id'>) {
    this.isLoading = true;
    this.error = null;

    try {
      const response = await api.sendEvent<{ persona: Persona }>('create_persona', persona);
      
      runInAction(() => {
        if (response.success && response.data) {
          this.personas.push(response.data.persona);
          
          // If this is the first persona, make it current
          if (this.personas.length === 1) {
            this.currentPersona = response.data.persona;
          }
        } else {
          this.error = 'Failed to create persona';
        }
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Unknown error creating persona';
        this.isLoading = false;
      });
    }
  }

  async updatePersona(personaId: string, updates: Partial<Omit<Persona, 'id'>>) {
    this.isLoading = true;
    this.error = null;

    // Add timestamp for avatar updates
    const updatesWithTimestamp = {...updates};
    if (updates.avatar) {
      updatesWithTimestamp.avatarTimestamp = Date.now();
    }

    try {
      const response = await api.sendEvent<{ persona: Persona }>('update_persona', {
        persona_id: personaId,
        ...updatesWithTimestamp
      });
      
      runInAction(() => {
        if (response.success && response.data) {
          // Update the persona in the array
          const index = this.personas.findIndex(p => p.id === personaId);
          if (index !== -1) {
            this.personas[index] = response.data.persona;
            
            // If this is the current persona, update that too
            if (this.currentPersona && this.currentPersona.id === personaId) {
              this.currentPersona = response.data.persona;
            }
          }
        } else {
          this.error = 'Failed to update persona';
        }
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Unknown error updating persona';
        this.isLoading = false;
      });
    }
  }

  async deletePersona(personaId: string) {
    this.isLoading = true;
    this.error = null;

    try {
      const response = await api.sendEvent('delete_persona', { persona_id: personaId });
      
      runInAction(() => {
        if (response.success) {
          // Remove from array
          this.personas = this.personas.filter(p => p.id !== personaId);
          
          // If this was the current persona, set a new one
          if (this.currentPersona && this.currentPersona.id === personaId) {
            const defaultPersona = this.personas.find(p => p.isDefault);
            this.currentPersona = defaultPersona || (this.personas.length > 0 ? this.personas[0] : null);
          }
        } else {
          this.error = 'Failed to delete persona';
        }
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Unknown error deleting persona';
        this.isLoading = false;
      });
    }
  }

  async setAsDefault(personaId: string) {
    this.isLoading = true;
    this.error = null;

    try {
      const response = await api.sendEvent('set_default_persona', { persona_id: personaId });
      
      runInAction(() => {
        if (response.success) {
          // Update all personas to not be default
          this.personas.forEach(p => {
            p.isDefault = p.id === personaId;
          });
          
          // Set this as current persona
          const defaultPersona = this.personas.find(p => p.id === personaId);
          if (defaultPersona) {
            this.currentPersona = defaultPersona;
          }
        } else {
          this.error = 'Failed to set default persona';
        }
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Unknown error setting default persona';
        this.isLoading = false;
      });
    }
  }

  async toggleFavorite(personaId: string) {
    const persona = this.personas.find(p => p.id === personaId);
    if (!persona) {
      this.error = 'Persona not found';
      return;
    }

    const newFavoriteState = !persona.isFavorite;
    
    try {
      const response = await api.sendEvent('update_persona', {
        persona_id: personaId,
        isFavorite: newFavoriteState
      });
      
      runInAction(() => {
        if (response.success) {
          // Update the persona in the array
          const index = this.personas.findIndex(p => p.id === personaId);
          if (index !== -1) {
            this.personas[index].isFavorite = newFavoriteState;
            
            // If this is the current persona, update that too
            if (this.currentPersona && this.currentPersona.id === personaId) {
              this.currentPersona.isFavorite = newFavoriteState;
            }
          }
        } else {
          this.error = 'Failed to update persona favorite status';
        }
      });
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unknown error updating persona favorite status';
    }
  }

  // New method to refresh avatar without changing the actual image
  refreshAvatar(personaId: string) {
    const persona = this.personas.find(p => p.id === personaId);
    if (!persona) return;
    
    // Update timestamp to force refresh
    const updates = {
      avatarTimestamp: Date.now()
    };
    
    // Update locally immediately for faster UI response
    runInAction(() => {
      const index = this.personas.findIndex(p => p.id === personaId);
      if (index !== -1) {
        this.personas[index].avatarTimestamp = updates.avatarTimestamp;
        
        // Also update current persona if applicable
        if (this.currentPersona && this.currentPersona.id === personaId) {
          this.currentPersona.avatarTimestamp = updates.avatarTimestamp;
        }
      }
    });
    
    // Also update on backend
    api.sendEvent('update_persona', {
      persona_id: personaId,
      ...updates
    });
  }
}

export default new PersonaStore(); 