import { makeAutoObservable, runInAction } from 'mobx';
import { v4 as uuidv4 } from 'uuid';
import socketService from '../services/api';

export interface InventoryItem {
  id: string;
  characterId: string;
  name: string;
  description: string;
  quantity: number;
  value: number;
  weight: number;
  type: string;
  rarity: string;
  equipped: boolean;
}

class InventoryStore {
  items: InventoryItem[] = [];
  isLoading: boolean = false;
  error: string | null = null;
  isInitialized: boolean = false;

  constructor() {
    makeAutoObservable(this);
  }

  // Fetch all inventory items
  async fetchInventory(): Promise<void> {
    this.isLoading = true;
    this.error = null;
    
    try {
      // Get inventory data from the socket service
      const characters = await socketService.getCharacters();
      const allItems: InventoryItem[] = [];
      
      // Extract inventory items from all characters
      if (characters) {
        Object.keys(characters).forEach(charId => {
          const character = characters[charId];
          if (character.inventory && Array.isArray(character.inventory)) {
            allItems.push(...character.inventory);
          }
        });
      }
      
      runInAction(() => {
        this.items = allItems;
        this.isInitialized = true;
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = 'Failed to load inventory';
        this.isLoading = false;
      });
    }
  }

  // Get inventory for a specific character
  getCharacterInventory(characterId: string): InventoryItem[] {
    return this.items.filter(item => item.characterId === characterId);
  }

  // Add a new inventory item
  async addInventoryItem(item: Omit<InventoryItem, 'id'>): Promise<void> {
    this.isLoading = true;
    this.error = null;
    
    const newItem: InventoryItem = {
      ...item,
      id: uuidv4()
    };
    
    try {
      // Use socket service to send add inventory item event
      await socketService.sendEvent('add_inventory_item', {
        character_id: newItem.characterId,
        item_name: newItem.name,
        item_description: newItem.description,
        item_quantity: newItem.quantity,
        value: newItem.value,
        weight: newItem.weight,
        type: newItem.type,
        rarity: newItem.rarity,
        equipped: newItem.equipped
      });
      
      runInAction(() => {
        this.items.push(newItem);
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = 'Failed to add item';
        this.isLoading = false;
      });
    }
  }

  // Update an existing inventory item
  async updateInventoryItem(item: InventoryItem): Promise<void> {
    this.isLoading = true;
    this.error = null;
    
    try {
      // Use socket service to send update inventory item event
      await socketService.sendEvent('update_inventory_item', {
        character_id: item.characterId,
        item_name: item.name,
        new_name: item.name, 
        new_description: item.description,
        new_quantity: item.quantity,
        value: item.value,
        weight: item.weight,
        type: item.type,
        rarity: item.rarity,
        equipped: item.equipped
      });
      
      runInAction(() => {
        const index = this.items.findIndex(i => i.id === item.id);
        if (index !== -1) {
          this.items[index] = item;
        }
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = 'Failed to update item';
        this.isLoading = false;
      });
    }
  }

  // Remove an inventory item
  async removeInventoryItem(characterId: string, itemId: string): Promise<void> {
    this.isLoading = true;
    this.error = null;
    
    try {
      // Find the item to get its name
      const item = this.items.find(i => i.id === itemId);
      if (!item) {
        throw new Error('Item not found');
      }
      
      // Use socket service to send remove inventory item event
      await socketService.sendEvent('remove_inventory_item', {
        character_id: characterId,
        item_name: item.name
      });
      
      runInAction(() => {
        this.items = this.items.filter(item => item.id !== itemId);
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = 'Failed to delete item';
        this.isLoading = false;
      });
    }
  }
}

const inventoryStore = new InventoryStore();
export default inventoryStore; 