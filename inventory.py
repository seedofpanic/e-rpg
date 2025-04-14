import uuid

class InventoryManager:
    """Handles inventory management for characters"""
    
    @staticmethod
    def initialize_inventory():
        """Initialize an empty inventory"""
        return []
    
    @staticmethod
    def add_item(inventory, character_id, item_name, item_description="", item_quantity=1, 
                value=0, weight=0, type_="", rarity="common", equipped=False):
        """Add an item to the inventory"""
        # Check if item already exists in inventory
        for item in inventory:
            if item["name"].lower() == item_name.lower():
                # Item exists, increase quantity
                item["quantity"] += item_quantity
                return inventory
        
        # Item doesn't exist, add new item
        inventory.append({
            "id": str(uuid.uuid4()),
            "characterId": character_id,
            "name": item_name,
            "description": item_description,
            "quantity": item_quantity,
            "value": value,
            "weight": weight,
            "type": type_,
            "rarity": rarity,
            "equipped": equipped
        })
        
        return inventory
    
    @staticmethod
    def remove_item(inventory, item_name, item_quantity=1):
        """Remove an item from the inventory"""
        for i, item in enumerate(inventory):
            if item["name"].lower() == item_name.lower():
                if item["quantity"] <= item_quantity:
                    # Remove the item completely
                    inventory.pop(i)
                else:
                    # Decrease quantity
                    item["quantity"] -= item_quantity
                return True, inventory
        return False, inventory
    
    @staticmethod
    def update_item(inventory, item_name, new_name=None, new_description=None, new_quantity=None, 
                   value=None, weight=None, type_=None, rarity=None, equipped=None):
        """Update an item in the inventory"""
        for item in inventory:
            if item["name"].lower() == item_name.lower():
                if new_name:
                    item["name"] = new_name
                if new_description is not None:
                    item["description"] = new_description
                if new_quantity is not None:
                    item["quantity"] = new_quantity
                if value is not None:
                    item["value"] = value
                if weight is not None:
                    item["weight"] = weight
                if type_ is not None:
                    item["type"] = type_
                if rarity is not None:
                    item["rarity"] = rarity
                if equipped is not None:
                    item["equipped"] = equipped
                return True, inventory
        return False, inventory
    
    @staticmethod
    def create_default_items(character_id, item_type):
        """Create default items based on character type"""
        items = []
        
        if item_type == "warrior":
            # Warrior default items
            items.append({
                "id": str(uuid.uuid4()),
                "characterId": character_id,
                "name": "Battleaxe",
                "description": "A sturdy dwarven battleaxe",
                "quantity": 1,
                "value": 10,
                "weight": 4,
                "type": "weapon",
                "rarity": "common",
                "equipped": True
            })
            
            items.append({
                "id": str(uuid.uuid4()),
                "characterId": character_id,
                "name": "Potion of Healing",
                "description": "Restores 2d4+2 hit points",
                "quantity": 2,
                "value": 50,
                "weight": 0.5,
                "type": "potion",
                "rarity": "common",
                "equipped": False
            })
            
        elif item_type == "wizard":
            # Wizard default items
            items.append({
                "id": str(uuid.uuid4()),
                "characterId": character_id,
                "name": "Spellbook",
                "description": "Contains all known spells",
                "quantity": 1,
                "value": 50,
                "weight": 3,
                "type": "spellcasting focus",
                "rarity": "uncommon",
                "equipped": True
            })
            
            items.append({
                "id": str(uuid.uuid4()),
                "characterId": character_id,
                "name": "Wand of Magic Missiles",
                "description": "3 charges, regains 1d3 charges daily",
                "quantity": 1,
                "value": 200,
                "weight": 1,
                "type": "wand",
                "rarity": "uncommon",
                "equipped": False
            })
            
        elif item_type == "rogue":
            # Rogue default items
            items.append({
                "id": str(uuid.uuid4()),
                "characterId": character_id,
                "name": "Dagger",
                "description": "A sharp, well-balanced dagger",
                "quantity": 2,
                "value": 2,
                "weight": 1,
                "type": "weapon",
                "rarity": "common",
                "equipped": True
            })
            
            items.append({
                "id": str(uuid.uuid4()),
                "characterId": character_id,
                "name": "Thieves' Tools",
                "description": "For picking locks and disarming traps",
                "quantity": 1,
                "value": 25,
                "weight": 1,
                "type": "tool",
                "rarity": "common",
                "equipped": False
            })
            
        return items 