import enum
from typing import Optional, Dict, Any, List
import uuid

class DialogueMessageType(enum.Enum):
    CHARACTER = "character"
    GM = "gm"
    ROLL = "roll"
    SYSTEM = "system"

class DialogueMessage:
    def __init__(self, sender: str, message: str, avatar: str, character_id: str = "0", data: Optional[Dict[str, Any]] = None, 
                 type: DialogueMessageType = DialogueMessageType.CHARACTER, persona_id: Optional[str] = None, id: str = None):
        self.id = id or str(uuid.uuid4())
        self.sender = sender
        self.message = message
        self.character_id = character_id
        self.data = data
        try:
            self.type = type if isinstance(type, DialogueMessageType) else DialogueMessageType(type)
        except:
            self.type = DialogueMessageType.CHARACTER
        self.persona_id = persona_id  # New field for GM persona
        self.avatar = avatar
    
    def to_dict(self) -> Dict[str, Any]:
        result = {
            "id": self.id,
            "sender": self.sender,
            "message": self.message,
            "character_id": self.character_id,
            "data": self.data,
            "type": self.type.value,
            "avatar": self.avatar
        }
        
        # Only include persona_id if it exists
        if self.persona_id:
            result["persona_id"] = self.persona_id
            
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'DialogueMessage':
        return cls(
            id=data.get("id"),
            sender=data["sender"],
            message=data["message"],
            character_id=data["character_id"],
            data=data.get("data"),
            type=data.get("type", "message"),
            persona_id=data.get("persona_id"),
            avatar=data.get("avatar", "avatar.jpg")
        )

# Store dialogue history
_dialogue_history: List[DialogueMessage] = []

def get_dialogue_history(limit: Optional[int] = None) -> List[DialogueMessage]:
    """Get the dialogue history, optionally limited to the last N messages"""
    if limit is not None:
        return _dialogue_history[-limit:]
    return _dialogue_history

def set_dialog_history(history: List[DialogueMessage]) -> None:
    """Set the dialogue history"""
    global _dialogue_history
    _dialogue_history = history

def append_to_dialog_history(message: DialogueMessage) -> None:
    """Add a message to the dialogue history"""
    _dialogue_history.append(message)

def clear_dialog_history() -> None:
    """Clear the dialogue history"""
    global _dialogue_history
    _dialogue_history = []