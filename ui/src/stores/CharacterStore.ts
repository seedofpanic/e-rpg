import { makeAutoObservable, runInAction } from 'mobx';
import socketService from '../services/api';
import { InventoryItem } from './InventoryStore';

interface TTSVoice {
  id: string;
  name: string;
  languages: string[];
  gender: string;
  age: string;
}

export interface Character {
  id: string;
  name: string;
  class: string;
  race: string;
  personality: string;
  background: string;
  motivation: string;
  avatar: string;
  active: boolean;
  is_leader: boolean;
  ability_scores: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  max_hp: number;
  current_hp: number;
  armor_class: number;
  proficiency_bonus: number;
  skill_proficiencies: Record<string, boolean>;
  inventory: Array<InventoryItem>;
  gold: number;
  voice_id: string;
}

class CharacterStore {
  charactersIds: string[] = [];
  characters: Record<string, Character> = {};
  isLoading: boolean = true;
  editingCharacter: Character | null = null;
  ttsVoices: any[] = [];
  
  constructor() {
    makeAutoObservable(this);
    // Initialize with empty object to prevent undefined errors
    this.initSocket()
  }
    
  
  initSocket() {
    // Listen for character updates from the server
    socketService.on('characters_updated', (data: {characters: Record<string, Character>}) => {
      console.log('characters_updated', data);
      this.setCharacters(data.characters);
    });

    socketService.on('tts_voices', (data: {voices: TTSVoice[]}) => {
      console.log('tts_voices', data);
      this.setTTSVoices(data.voices);
    });
  }

  tryTTSVoice(voice: TTSVoice) {
    socketService.sendEvent('tts_voice_test', {
      voice_id: voice.id
    });
  }

  setTTSVoices(voices: TTSVoice[]) {
    this.ttsVoices = voices;
  }

  setCharacters(data: Record<string, Character>) {
    this.characters = data;
    this.charactersIds = Object.keys(data);
    this.setLoading(false);
  }
  
  toggleCharacterActive(characterId: string) {    
    socketService.sendEvent('toggle_character_active', { 
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
    // Add to a characters object for the update_characters endpoint
    const characters = {
      [characterData.id]: characterData
    };
    
    socketService.sendEvent('update_characters', { characters });
  }

  // Update an existing character
  updateCharacter(characterData: any) {
    // Add to a characters object for the update_characters endpoint
    const characters = {
      [characterData.id]: characterData
    };
    
    socketService.sendEvent('update_characters', { characters });
  }

  // Delete a character
  deleteCharacter(characterId: string) {
    socketService.sendEvent('delete_character', { character_id: characterId });
  }

  // Set, add, or remove gold for a character
  setGold(characterId: string, amount: number, action: 'add' | 'remove' | 'set' = 'set') {
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