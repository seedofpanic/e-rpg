import os
import json
import uuid
import shutil
from typing import Dict, List, Optional, Any

language = os.getenv("LANGUAGE")

class GMPersona:
    def __init__(self, persona_id, name, description="", avatar=None):
        self.id = persona_id
        self.name = name
        self.description = description
        self.avatar = avatar if avatar else "avatar.jpg"
        self.use_count = 0
        self.last_used = 0  # Timestamp
        self.is_favorite = False
    
    def export_to_dict(self):
        """Export persona data to a dictionary for serialization"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "avatar": self.avatar,
            "use_count": self.use_count,
            "last_used": self.last_used,
            "is_favorite": self.is_favorite
        }
    
    @classmethod
    def from_dict(cls, persona_data):
        """Create a GMPersona instance from a dictionary"""
        persona = cls(
            persona_id=persona_data["id"],
            name=persona_data["name"],
            description=persona_data.get("description", ""),
            avatar=persona_data.get("avatar", "avatar.jpg")
        )
        persona.use_count = persona_data.get("use_count", 0)
        persona.last_used = persona_data.get("last_used", 0)
        persona.is_favorite = persona_data.get("is_favorite", False)
        return persona

# Private storage for personas
_personas = {}
_default_persona = None

def get_personas():
    """Get all GM personas"""
    return _personas

def get_persona_by_id(persona_id):
    """Get a persona by ID"""
    return _personas.get(persona_id)

def set_personas(personas):
    """Set the GM personas dictionary"""
    global _personas
    if (len(personas) > 0):
        _personas = personas
    else:
        _personas = get_default_personas()
    

def add_persona(persona):
    """Add a new persona"""
    _personas[persona.id] = persona
    return persona

def remove_persona(persona_id):
    """Remove a persona by ID"""
    if persona_id in _personas:
        del _personas[persona_id]
        return True
    return False

def set_default_persona(persona_id):
    """Set the default persona"""
    global _default_persona
    # If trying to set "gm" as default, just accept it even if not in _personas dictionary
    if persona_id == "gm" or persona_id in _personas:
        _default_persona = persona_id
        return True
    return False

def get_default_persona():
    """Get the default persona ID"""
    return _default_persona or "gm"

def create_persona(name, description="", avatar=None):
    """Create a new persona with a unique ID"""
    persona_id = str(uuid.uuid4())[:8]
    persona = GMPersona(persona_id, name, description, avatar)
    return add_persona(persona)

def toggle_favorite(persona_id):
    """Toggle favorite status for a persona"""
    if persona_id in _personas:
        _personas[persona_id].is_favorite = not _personas[persona_id].is_favorite
        return _personas[persona_id].is_favorite
    return False

def get_default_personas():
    return {
        "gm": GMPersona("gm", "Game Master" if language != "ru" else "Мастер", "The default Game Master persona" if language != "ru" else "По умолчанию персонаж Мастера игры", "avatar.jpg")
    }

# Initialize with a default GM persona
if not _personas:
    # Create default persona with a fixed ID instead of random UUID
    set_personas(get_default_personas())
    set_default_persona("gm")

class PersonaManager:
    """Manages Game Master personas for the E-RPG application."""
    
    def __init__(self):
        """Initialize the PersonaManager."""
        self.current_persona_id = get_default_persona()
        
    def get_all_personas(self) -> List[Dict[str, Any]]:
        """Get all personas.
        
        Returns:
            List of all personas
        """
        return [persona.export_to_dict() for persona in get_personas().values()]
    
    def get_persona(self, persona_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific persona by ID.
        
        Args:
            persona_id: ID of the persona to retrieve
            
        Returns:
            Persona data or None if not found
        """
        persona = get_persona_by_id(persona_id)
        if persona:
            return persona.export_to_dict()
        return None
    
    def get_current_persona(self) -> Optional[Dict[str, Any]]:
        """Get the current active persona.
        
        Returns:
            Current persona data or None if no persona is active
        """
        persona = get_persona_by_id(self.current_persona_id)
        if persona:
            return persona.export_to_dict()
        return None
    
    def create_persona(self, persona_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new persona.
        
        Args:
            persona_data: Data for the new persona
            
        Returns:
            Created persona data
        """
        # Create the new persona
        persona = create_persona(
            name=persona_data.get("name", "New Persona"),
            description=persona_data.get("description", ""),
            avatar=persona_data.get("avatar", "images/avatar.jpg")
        )
        
        # Check if it should be set as default
        if persona_data.get("isDefault", False):
            set_default_persona(persona.id)
            self.current_persona_id = persona.id
            
        # Set favorite status if specified
        if persona_data.get("isFavorite", False):
            toggle_favorite(persona.id)
        
        # Trigger game state save
        if 'game_state' in globals():
            globals()['game_state'].save_game()
        
        return persona.export_to_dict()
    
    def update_persona(self, persona_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing persona.
        
        Args:
            persona_id: ID of the persona to update
            updates: Data to update in the persona
            
        Returns:
            Updated persona data or None if persona not found
        """
        persona = get_persona_by_id(persona_id)
        if not persona:
            return None
        
        # Update basic fields
        if "name" in updates:
            persona.name = updates["name"]
        if "description" in updates:
            persona.description = updates["description"]
        if "avatar" in updates:
            persona.avatar = updates["avatar"]
            
        # Handle favorite toggling
        if "isFavorite" in updates:
            if updates["isFavorite"] != persona.is_favorite:
                toggle_favorite(persona_id)
        
        # Handle setting as default
        if "isDefault" in updates and updates["isDefault"]:
            set_default_persona(persona_id)
            self.current_persona_id = persona_id
            
        # Trigger game state save
        if 'game_state' in globals():
            globals()['game_state'].save_game()
            
        return persona.export_to_dict()
    
    def delete_persona(self, persona_id: str) -> bool:
        """Delete a persona.
        
        Args:
            persona_id: ID of the persona to delete
            
        Returns:
            True if deleted successfully, False otherwise
        """
        # Don't delete the default persona
        if persona_id == get_default_persona():
            return False
            
        # Delete the persona
        result = remove_persona(persona_id)
        
        # If this was the current persona, switch to the default
        if persona_id == self.current_persona_id:
            self.current_persona_id = get_default_persona()
            
        # Trigger game state save
        if result and 'game_state' in globals():
            globals()['game_state'].save_game()
            
        return result
    
    def set_default_persona(self, persona_id: str) -> bool:
        """Set a persona as the default.
        
        Args:
            persona_id: ID of the persona to set as default
            
        Returns:
            True if set as default successfully, False otherwise
        """
        result = set_default_persona(persona_id)
        if result:
            self.current_persona_id = persona_id
            
            # Trigger game state save
            if 'game_state' in globals():
                globals()['game_state'].save_game()
                
        return result
    
    def switch_persona(self, persona_id: str) -> bool:
        """Switch to a different persona.
        
        Args:
            persona_id: ID of the persona to switch to
            
        Returns:
            True if switched successfully, False otherwise
        """
        if get_persona_by_id(persona_id):
            self.current_persona_id = persona_id
            return True
        return False
    
    def save_avatar(self, persona_id: str, avatar_path: str) -> Optional[str]:
        """Save an avatar image for a persona.
        
        Args:
            persona_id: ID of the persona
            avatar_path: Path to the avatar image
            
        Returns:
            URL of the saved avatar or None if failed
        """
        persona = get_persona_by_id(persona_id)
        if not persona:
            return None
        
        try:
            # Ensure avatars directory exists
            avatars_dir = "ui/public/images/avatars"
            os.makedirs(avatars_dir, exist_ok=True)
            
            # Get file extension and create a unique filename
            _, ext = os.path.splitext(avatar_path)
            filename = f"persona_{persona_id}{ext}"
            destination = avatars_dir + "/" + filename
            print(f"Saving avatar to: {destination}")
            
            # Copy the avatar file
            shutil.copy2(avatar_path, destination)
            
            # Update persona with new avatar URL
            avatar_url = f"images/avatars/{filename}"
            persona.avatar = avatar_url
            
            # Trigger game state save
            if 'game_state' in globals():
                globals()['game_state'].save_game()
                
            return avatar_url
        except Exception as e:
            print(f"Error saving avatar: {e}")
            return None

# Create a global instance of the PersonaManager
persona_manager = PersonaManager() 