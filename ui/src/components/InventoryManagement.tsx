import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import characterStore from '../stores/CharacterStore';
import inventoryStore from '../stores/InventoryStore';
import { InventoryItem } from '../stores/InventoryStore';
import socketService from '../services/api';
import '../styles/InventoryManagement.css';

interface ItemFormModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (item: InventoryItem) => void;
  initialItem?: InventoryItem;
  characterId: string;
}

const ItemFormModal: React.FC<ItemFormModalProps> = ({ show, onClose, onSave, initialItem, characterId }) => {
  const [item, setItem] = useState<InventoryItem>({
    id: initialItem?.id || '',
    characterId: characterId,
    name: initialItem?.name || '',
    description: initialItem?.description || '',
    quantity: initialItem?.quantity || 1,
    value: initialItem?.value || 0,
    weight: initialItem?.weight || 0,
    type: initialItem?.type || 'misc',
    rarity: initialItem?.rarity || 'common',
    equipped: initialItem?.equipped || false
  });

  useEffect(() => {
    if (initialItem) {
      setItem({
        ...initialItem,
        characterId: characterId // Ensure characterId is set correctly
      });
    } else {
      setItem({
        id: '',
        characterId: characterId,
        name: '',
        description: '',
        quantity: 1,
        value: 0,
        weight: 0,
        type: 'misc',
        rarity: 'common',
        equipped: false
      });
    }
  }, [initialItem, characterId, show]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setItem({ ...item, [name]: checkbox.checked });
    } else if (type === 'number') {
      setItem({ ...item, [name]: parseFloat(value) || 0 });
    } else {
      setItem({ ...item, [name]: value });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(item);
  };

  if (!show) return null;

  return (
    <div className="modal-backdrop">
      <div className="item-modal">
        <div className="modal-header">
          <h4>{initialItem ? 'Edit Item' : 'Add New Item'}</h4>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              name="name"
              value={item.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={item.description}
              onChange={handleChange}
              rows={3}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Quantity</label>
              <input
                type="number"
                name="quantity"
                value={item.quantity}
                onChange={handleChange}
                min={1}
              />
            </div>
            <div className="form-group">
              <label>Value (gp)</label>
              <input
                type="number"
                name="value"
                value={item.value}
                onChange={handleChange}
                min={0}
                step={0.1}
              />
            </div>
            <div className="form-group">
              <label>Weight (lb)</label>
              <input
                type="number"
                name="weight"
                value={item.weight}
                onChange={handleChange}
                min={0}
                step={0.1}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Type</label>
              <select name="type" value={item.type} onChange={handleChange}>
                <option value="weapon">Weapon</option>
                <option value="armor">Armor</option>
                <option value="potion">Potion</option>
                <option value="scroll">Scroll</option>
                <option value="wondrous">Wondrous Item</option>
                <option value="tool">Tool</option>
                <option value="misc">Miscellaneous</option>
              </select>
            </div>
            <div className="form-group">
              <label>Rarity</label>
              <select name="rarity" value={item.rarity} onChange={handleChange}>
                <option value="common">Common</option>
                <option value="uncommon">Uncommon</option>
                <option value="rare">Rare</option>
                <option value="veryRare">Very Rare</option>
                <option value="legendary">Legendary</option>
                <option value="artifact">Artifact</option>
              </select>
            </div>
          </div>
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="equipped"
                checked={item.equipped}
                onChange={handleChange}
              />
              Equipped
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const InventoryManagement: React.FC = observer(() => {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [showGoldModal, setShowGoldModal] = useState<boolean>(false);
  const [goldAmount, setGoldAmount] = useState<number>(0);
  const [goldAction, setGoldAction] = useState<'add' | 'remove' | 'set'>('add');
  
  useEffect(() => {
    // Load inventory data when component mounts
    const loadData = async () => {
      if (!inventoryStore.isInitialized) {
        await inventoryStore.fetchInventory();
      }
    };
    
    loadData();
  }, []);

  useEffect(() => {
    // Set first character as selected if none selected
    const allCharacters = characterStore.getAllCharacters();
    if (!selectedCharacterId && allCharacters.length > 0) {
      setSelectedCharacterId(allCharacters[0]?.id || '');
    }
  }, [selectedCharacterId, characterStore.characters]);

  const characters = characterStore.getAllCharacters();
  const inventory = selectedCharacterId 
    ? inventoryStore.getCharacterInventory(selectedCharacterId)
    : [];

  const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = inventory.reduce((sum, item) => sum + (item.value * item.quantity), 0);
  const totalWeight = inventory.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
  
  const handleAddItem = () => {
    setEditingItem(undefined);
    setShowModal(true);
  };
  
  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setShowModal(true);
  };
  
  const handleDeleteItem = async (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await inventoryStore.removeInventoryItem(selectedCharacterId, itemId);
    }
  };
  
  const handleSaveItem = async (item: InventoryItem) => {
    if (editingItem) {
      await inventoryStore.updateInventoryItem(item);
    } else {
      await inventoryStore.addInventoryItem(item);
    }
    setShowModal(false);
  };
  
  const toggleEquipped = async (item: InventoryItem) => {
    await inventoryStore.updateInventoryItem({
      ...item,
      equipped: !item.equipped
    });
  };
  
  const updateQuantity = async (item: InventoryItem, change: number) => {
    const newQuantity = Math.max(1, item.quantity + change);
    if (newQuantity !== item.quantity) {
      await inventoryStore.updateInventoryItem({
        ...item,
        quantity: newQuantity
      });
    }
  };
  
  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };
  
  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'weapon': return '⚔️';
      case 'armor': return '🛡️';
      case 'potion': return '🧪';
      case 'scroll': return '📜';
      case 'wondrous': return '✨';
      case 'tool': return '🔧';
      default: return '📦';
    }
  };
  
  const getRarityClass = (rarity: string) => {
    switch (rarity) {
      case 'uncommon': return 'rarity-uncommon';
      case 'rare': return 'rarity-rare';
      case 'veryRare': return 'rarity-very-rare';
      case 'legendary': return 'rarity-legendary';
      case 'artifact': return 'rarity-artifact';
      default: return 'rarity-common';
    }
  };

  const handleGoldModalOpen = (action: 'add' | 'remove' | 'set') => {
    setGoldAction(action);
    setGoldAmount(0);
    setShowGoldModal(true);
  };

  const handleGoldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGoldAmount(parseFloat(e.target.value) || 0);
  };

  const handleGoldSubmit = async () => {
    const selectedCharacter = characterStore.getCharacterById(selectedCharacterId);
    if (!selectedCharacter) return;
    
    // Use the new setGold method from characterStore
    characterStore.setGold(selectedCharacterId, goldAmount, goldAction);
    
    setShowGoldModal(false);
  };

  const selectedCharacter = selectedCharacterId 
    ? characterStore.getCharacterById(selectedCharacterId)
    : undefined;

  // Get character gold with safe fallback to 0
  const characterGold = (selectedCharacter?.gold || 0);

  return (
    <div className="inventory-management">
      <div className="inventory-header">
        <h2>Inventory Management</h2>
        <div className="character-selector">
          <label>Character:</label>
          <select 
            value={selectedCharacterId}
            onChange={(e) => setSelectedCharacterId(e.target.value)}
          >
            {characters.map(character => (
              <option key={character.id} value={character.id}>
                {character.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="inventory-controls">
        <div className="inventory-stats">
          <div className="stat-item">
            <span className="stat-label">Items:</span>
            <span className="stat-value">{totalItems}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Value:</span>
            <span className="stat-value">{totalValue.toFixed(1)} gp</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Weight:</span>
            <span className="stat-value">{totalWeight.toFixed(1)} lb</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Gold:</span>
            <span className="stat-value gold-value">{Number(characterGold).toFixed(1)} gp</span>
            <div className="gold-controls">
              <button 
                className="gold-btn gold-add"
                onClick={() => handleGoldModalOpen('add')}
                title="Add Gold"
              >
                +
              </button>
              <button
                className="gold-btn gold-remove"
                onClick={() => handleGoldModalOpen('remove')}
                title="Remove Gold"
              >
                -
              </button>
              <button
                className="gold-btn gold-set"
                onClick={() => handleGoldModalOpen('set')}
                title="Set Gold Amount"
              >
                =
              </button>
            </div>
          </div>
        </div>
        <button className="add-item-button" onClick={handleAddItem}>
          <i className="bi bi-plus-lg"></i> Add Item
        </button>
      </div>

      {inventory.length === 0 ? (
        <div className="empty-inventory">
          <p>No items in inventory. Add some items to get started!</p>
        </div>
      ) : (
        <div className="inventory-table-container">
          <table className="inventory-table">
            <thead>
              <tr>
                <th className="col-type"></th>
                <th className="col-name">Name</th>
                <th className="col-quantity">Qty</th>
                <th className="col-weight">Weight</th>
                <th className="col-value">Value</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <React.Fragment key={item.id}>
                  <tr className={`inventory-row ${item.equipped ? 'equipped' : ''}`}>
                    <td className="col-type">
                      <span className="item-icon" title={item.type}>
                        {getItemTypeIcon(item.type)}
                      </span>
                    </td>
                    <td className="col-name">
                      <div className={`item-name ${getRarityClass(item.rarity)}`}>
                        {item.name}
                        {item.equipped && <span className="equipped-badge">E</span>}
                      </div>
                      {item.description && (
                        <button
                          className="toggle-description-btn"
                          onClick={() => toggleExpanded(item.id)}
                        >
                          {expandedItems[item.id] ? 'Hide' : 'Show'} details
                        </button>
                      )}
                    </td>
                    <td className="col-quantity">
                      <div className="quantity-control">
                        <button 
                          className="quantity-btn decrease-btn" 
                          onClick={() => updateQuantity(item, -1)}
                          disabled={item.quantity <= 1}
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button 
                          className="quantity-btn increase-btn" 
                          onClick={() => updateQuantity(item, 1)}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="col-weight">{(item.weight * item.quantity).toFixed(1)} lb</td>
                    <td className="col-value">{(item.value * item.quantity).toFixed(1)} gp</td>
                    <td className="col-actions">
                      <button 
                        className="action-btn toggle-equipped-btn" 
                        title={item.equipped ? "Unequip" : "Equip"}
                        onClick={() => toggleEquipped(item)}
                      >
                        {item.equipped ? "📴" : "📳"}
                      </button>
                      <button 
                        className="action-btn edit-item-btn" 
                        title="Edit"
                        onClick={() => handleEditItem(item)}
                      >
                        ✏️
                      </button>
                      <button 
                        className="action-btn delete-item-btn" 
                        title="Delete"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                  {expandedItems[item.id] && (
                    <tr className="description-row">
                      <td colSpan={6}>
                        <div className="item-description expanded-description">
                          <p>{item.description || 'No description available.'}</p>
                          <div className="item-details">
                            <span className={`item-rarity ${getRarityClass(item.rarity)}`}>
                              {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                            </span>
                            <span className="item-type">
                              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Gold Management Modal */}
      {showGoldModal && (
        <div className="modal-backdrop">
          <div className="gold-modal">
            <div className="modal-header">
              <h4>
                {goldAction === 'add' ? 'Add Gold' : 
                 goldAction === 'remove' ? 'Remove Gold' : 'Set Gold Amount'}
              </h4>
              <button className="close-button" onClick={() => setShowGoldModal(false)}>×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleGoldSubmit(); }}>
              <div className="form-group">
                <label>Amount (gp)</label>
                <input
                  type="number"
                  value={goldAmount}
                  onChange={handleGoldChange}
                  min={0}
                  step={0.1}
                  autoFocus
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowGoldModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  {goldAction === 'add' ? 'Add' : 
                   goldAction === 'remove' ? 'Remove' : 'Set'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Form Modal */}
      <ItemFormModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveItem}
        initialItem={editingItem}
        characterId={selectedCharacterId}
      />
    </div>
  );
});

export default InventoryManagement; 