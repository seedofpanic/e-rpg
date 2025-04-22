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

  // Get inventory for a specific character
  getCharacterInventory(characterId: string): InventoryItem[] {
    return this.items.filter(item => item.characterId === characterId);
  }

  // Add a new inventory item
  addInventoryItem(item: Omit<InventoryItem, 'id'>) {
    this.isLoading = true;
    this.error = null;
    
    const newItem: InventoryItem = {
      ...item,
      id: uuidv4()
    };

    // Use socket service to send add inventory item event
    socketService.sendEvent('add_inventory_item', {
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