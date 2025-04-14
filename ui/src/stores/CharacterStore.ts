import { makeAutoObservable, runInAction } from 'mobx';
import { Socket } from 'socket.io-client';
import socketService from '../services/api';
import { InventoryItem } from './InventoryStore';

export interface Character {
  id: string;
  name: string;
  class?: string;
  race?: string;
  avatar: string;
  active: boolean;
  is_leader: boolean;
  personality?: string;
  background?: string;
  motivation?: string;
  ability_scores?: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  max_hp?: number;
  current_hp?: number;
  armor_class?: number;
  proficiency_bonus?: number;
  skill_proficiencies?: Record<string, boolean>;
  inventory?: Array<InventoryItem>;
  gold?: number;
}


class CharacterStore {
  characters: Record<string, Character> = {};
  isLoading: boolean = true;
  editingCharacter: Character | null = null;
  
  constructor() {
    makeAutoObservable(this);
    // Initialize with empty object to prevent undefined errors
    this.characters = {};
    
    // Fetch characters via socket on initialization
    this.fetchCharacters();
  }
  
  // Fetch characters using the SocketService
  async fetchCharacters() {
    try {
      console.log('CharacterStore: Fetching characters via socket');
      const characters = await socketService.getCharacters();
      console.log('CharacterStore: Characters fetched via socket', characters);
      
      // Process characters from socket
      if (characters && typeof characters === 'object') {
        const processedCharacters: Record<string, Character> = {};
        
        Object.keys(characters).forEach(id => {
          const backendChar = characters[id];
          processedCharacters[id] = this.mapBackendCharacter(id, backendChar);
        });
        
        this.handleCharactersUpdated(processedCharacters);
      }
    } catch (err) {
      console.error('CharacterStore: Error fetching characters via socket', err);
    }
  }
  
  initSocket(socket: Socket) {
    console.log('CharacterStore: Initializing socket listeners');
    
    // Listen for character updates from the server
    socket.on('characters_updated', (data) => {
      console.log('CharacterStore: Received characters_updated event', data);
      
      try {
        // Convert backend data format to our Character interface
        const processedCharacters: Record<string, Character> = {};
        
        if (data && typeof data === 'object') {
          // Check if data is already a map of characters (format from backend)
          if (data.characters && typeof data.characters === 'object') {
            // Format is { characters: { id1: char1, id2: char2 } }
            const charactersMap = data.characters;
            
            Object.keys(charactersMap).forEach(id => {
              const backendChar = charactersMap[id];
              processedCharacters[id] = this.mapBackendCharacter(id, backendChar);
            });
          } else {
            // Format might be direct characters object without nesting
            Object.keys(data).forEach(id => {
              const backendChar = data[id];
              if (backendChar && typeof backendChar === 'object') {
                processedCharacters[id] = this.mapBackendCharacter(id, backendChar);
              }
            });
          }
        }
        
        // Update store with processed characters
        this.handleCharactersUpdated(processedCharacters);
      } catch (err) {
        console.error('CharacterStore: Error processing characters data', err);
        this.handleCharactersUpdated({});
      }
    });
    
    // Force a refresh if needed
    socket.emit('get_characters');
  }
  
  // Map backend character format to our interface
  private mapBackendCharacter(id: string, backendChar: any): Character {
    try {
      return {
        id: id,
        name: backendChar.name || 'Unknown',
        class: backendChar.class,
        race: backendChar.race,
        avatar: backendChar.avatar || '',
        active: backendChar.active === undefined ? true : backendChar.active,
        is_leader: backendChar.is_leader === undefined ? false : backendChar.is_leader,
        personality: backendChar.personality,
        background: backendChar.background,
        motivation: backendChar.motivation,
        ability_scores: backendChar.ability_scores,
        max_hp: backendChar.max_hp,
        current_hp: backendChar.current_hp,
        armor_class: backendChar.armor_class,
        proficiency_bonus: backendChar.proficiency_bonus,
        skill_proficiencies: backendChar.skill_proficiencies,
        inventory: backendChar.inventory,
        gold: backendChar.gold
      };
    } catch (err) {
      console.error('CharacterStore: Error mapping character', err);
      return {
        id: id,
        name: 'Error',
        avatar: '',
        active: false,
        is_leader: false
      };
    }
  }
  
  handleCharactersUpdated(charactersData: Record<string, Character>) {
    console.log('CharacterStore: Handling characters update', charactersData);
    
    runInAction(() => {
      try {
        // Make sure we always have an object even if null/undefined is passed
        this.characters = charactersData && typeof charactersData === 'object' ? charactersData : {};
        console.log('CharacterStore: Updated characters state', this.characters);
      } catch (err) {
        console.error('CharacterStore: Error updating characters state', err);
        this.characters = {};
      } finally {
        this.isLoading = false;
      }
    });
  }
  
  toggleCharacterActive(characterId: string) {
    const socket = socketService.getSocket();
    if (!socket) return;
    const character = this.getCharacterById(characterId);
    if (!character) return;
    
    socket.emit('toggle_character_active', { 
      character_id: characterId
    });
  }

  // Set the character that's being edited
  setEditCharacterId(characterId: string) {
    runInAction(() => {
      this.editingCharacter = this.getCharacterById(characterId) || null;
    });
  }

  // Clear the editing character (for creating a new one)
  clearEditCharacter() {
    runInAction(() => {
      this.editingCharacter = null;
    });
  }

  // Create a new character
  createCharacter(characterData: any) {
    const socket = socketService.getSocket();
    if (!socket) return;
    
    // Add to a characters object for the update_characters endpoint
    const characters = {
      [characterData.id]: characterData
    };
    
    socket.emit('update_characters', { characters });
  }

  // Update an existing character
  updateCharacter(characterData: any) {
    const socket = socketService.getSocket();
    if (!socket) return;
    
    // Add to a characters object for the update_characters endpoint
    const characters = {
      [characterData.id]: characterData
    };
    
    socket.emit('update_characters', { characters });
  }

  // Delete a character
  deleteCharacter(characterId: string) {
    const socket = socketService.getSocket();
    if (!socket) return;
    
    socket.emit('delete_character', { character_id: characterId });
  }

  // Set, add, or remove gold for a character
  setGold(characterId: string, amount: number, action: 'add' | 'remove' | 'set' = 'set') {
    const socket = socketService.getSocket();
    if (!socket) return;
    
    const character = this.getCharacterById(characterId);
    if (!character) return;
    
    if (action === 'add') {
      socketService.sendEvent('add_character_gold', {
        character_id: characterId,
        gold_amount: amount
      });
    } else if (action === 'remove') {
      socketService.sendEvent('remove_character_gold', {
        character_id: characterId,
        gold_amount: amount
      });
    } else {
      socketService.sendEvent('update_character_gold', {
        character_id: characterId,
        gold_amount: amount
      });
    }
  }
  
  getActiveCharacters(): Character[] {
    try {
      // Ensure characters is an object before calling Object.values
      const charactersObj = this.characters || {};
      return Object.values(charactersObj).filter(char => char && char.active);
    } catch (err) {
      console.error('CharacterStore: Error in getActiveCharacters', err);
      return [];
    }
  }
  
  getAllCharacters(): Character[] {
    try {
      // Ensure characters is an object before calling Object.values
      const charactersObj = this.characters || {};
      return Object.values(charactersObj);
    } catch (err) {
      console.error('CharacterStore: Error in getAllCharacters', err);
      return [];
    }
  }
  
  getCharacterById(id: string): Character | undefined {
    try {
      const charactersObj = this.characters || {};
      return charactersObj[id];
    } catch (err) {
      console.error('CharacterStore: Error in getCharacterById', err);
      return undefined;
    }
  }
  
  setLoading(isLoading: boolean) {
    this.isLoading = isLoading;
  }
}

export default new CharacterStore(); 