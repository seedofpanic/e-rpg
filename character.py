import random
from ai_utils import generate_response, run_tools
from google.genai.types import FunctionDeclaration, Tool, Schema

from base_lore import get_base_lore
from character_tools import build_dialogue_messages_list
from dialog_history import DialogueMessage, DialogueMessageType, append_to_dialog_history, get_dialogue_history
from app_socket import send_socket_message
import os
from logger_config import logger as char_logger, logger as memory_logger
from update_scene import get_current_scene
from vector_compare import compare_with_base
from inventory import InventoryManager

language = os.getenv("LANGUAGE")

remember_information_declaration = Tool(function_declarations=[FunctionDeclaration(
    name="remember_information",
    description="Remember information",
    parameters=Schema(
        type="OBJECT",
        properties={
            "memory_item": Schema(
                type="STRING",
                description="Information you want to remember"
            )
        },
        required=["memory_item"]
    )
)])

addIntention_declaration = Tool(function_declarations=[FunctionDeclaration(
    name="addIntention",
    description="Add intention",
    parameters=Schema(
        type="OBJECT",
        properties={
            "intention": Schema(
                type="STRING",
                description="Add a goal that character needs or whants to accomplish"
            )
        },
        required=["intention"]
    )
)])

removeIntention_declaration = Tool(function_declarations=[FunctionDeclaration(
    name="removeIntention",
    description="Remove intention",
    parameters=Schema(
        type="OBJECT",
        properties={
            "intention": Schema(
                type="STRING",
                description="Remove goal that is achieved or doesn't make sense anymore"
            )
        },
        required=["intention"]
    )
)])

class Character:
    def __init__(self, char_id, name, char_class="", race="", personality="", background="", motivation="", avatar=None, is_leader=False,
                 strength=10, dexterity=10, constitution=10, intelligence=10, wisdom=10, charisma=10,
                 max_hp=10, current_hp=10, armor_class=10, proficiency_bonus=2, memory: list[str] = [], intentions: list[str] = [], inventory: list[dict] = [], gold=0, active=True):
        self.active = active
        self.id = char_id
        self.name = name
        self.char_class = char_class
        self.race = race
        self.personality = personality
        self.background = background
        self.motivation = motivation
        if avatar:
            self.avatar = avatar
        else:
            self.avatar = f"avatar.jpg"
        self.is_leader = is_leader
        self.memory_updated = False
        self.memory = set(memory)
        self.intentions = set(intentions)
        self.inventory = inventory if inventory else InventoryManager.initialize_inventory()
        self.gold = gold
        
        # RPG Character Stats
        self.ability_scores = {
            "strength": strength,
            "dexterity": dexterity,
            "constitution": constitution,
            "intelligence": intelligence,
            "wisdom": wisdom,
            "charisma": charisma
        }
        self.max_hp = max_hp
        self.current_hp = current_hp
        self.armor_class = armor_class
        self.proficiency_bonus = proficiency_bonus
        
        # Skills and their associated ability scores
        self.skills = {
            "acrobatics": "dexterity",
            "animal_handling": "wisdom",
            "arcana": "intelligence",
            "athletics": "strength",
            "deception": "charisma",
            "history": "intelligence",
            "insight": "wisdom",
            "intimidation": "charisma",
            "investigation": "intelligence",
            "medicine": "wisdom",
            "nature": "intelligence",
            "perception": "wisdom",
            "performance": "charisma",
            "persuasion": "charisma",
            "religion": "intelligence",
            "sleight_of_hand": "dexterity",
            "stealth": "dexterity",
            "survival": "wisdom"
        }
        
        # Skill proficiencies (empty by default)
        self.skill_proficiencies = []

    def export_to_dict(self):
        """Export character data to a dictionary for serialization"""
        return {
            "id": self.id,
            "name": self.name,
            "char_class": self.char_class,
            "race": self.race,
            "personality": self.personality,
            "background": self.background,
            "motivation": self.motivation,
            "avatar": self.avatar,
            "is_leader": self.is_leader,
            "ability_scores": self.ability_scores,
            "max_hp": self.max_hp,
            "current_hp": self.current_hp,
            "armor_class": self.armor_class,
            "proficiency_bonus": self.proficiency_bonus,
            "skill_proficiencies": self.skill_proficiencies,
            "memory": list(self.memory),
            "active": self.active,
            "intentions": list(self.intentions),
            "inventory": self.inventory,
            "gold": self.gold
        }
    
    @classmethod
    def from_dict(cls, char_data):
        """Create a Character instance from a dictionary"""
        char = cls(
            char_id=char_data["id"],
            name=char_data["name"],
            char_class=char_data["char_class"],
            race=char_data["race"],
            personality=char_data["personality"],
            background=char_data["background"],
            motivation=char_data["motivation"],
            avatar=char_data["avatar"],
            is_leader=char_data["is_leader"],
            strength=char_data["ability_scores"]["strength"],
            dexterity=char_data["ability_scores"]["dexterity"],
            constitution=char_data["ability_scores"]["constitution"],
            intelligence=char_data["ability_scores"]["intelligence"],
            wisdom=char_data["ability_scores"]["wisdom"],
            charisma=char_data["ability_scores"]["charisma"],
            max_hp=char_data["max_hp"],
            current_hp=char_data["current_hp"],
            armor_class=char_data["armor_class"],
            proficiency_bonus=char_data["proficiency_bonus"],
            memory=set(char_data["memory"]),
            active=char_data.get("active", True),  # Default to True if not present
            intentions=set(char_data.get("intentions", [])),
            inventory=char_data.get("inventory", []),  # Get inventory or default to empty list
            gold=char_data.get("gold", 0)  # Get gold or default to 0
        )
        char.skill_proficiencies = char_data["skill_proficiencies"]
        return char

    def set_avatar(self, avatar_path):
        """Set the avatar path, using a default if none is provided"""
        if avatar_path:
            self.avatar = "avatars/" + avatar_path
        else:
            self.avatar = f"avatar.jpg"
    
    def get_avatar_url(self):
        """Get the full URL for the avatar"""
        if self.avatar.startswith('avatars/'):
            return self.avatar
        return self.avatar  # For backward compatibility with existing avatar paths

    def say_to_chat(self, message):
        print(f"Say to chat: {message}")
    
    def remember_information(self, memory_item: str):
        """Add an item to character's memory"""
        memory_logger.info(f"Adding to memory for {self.name}: '{memory_item}'")
        for character in get_characters().values():
            character.memory.add(memory_item)
        
        # Prepare memory data for UI display
        memory_logger.info(f"Memory size for {self.name}: {len(self.memory)} items")
        print(f"Added to memory: {memory_item}")
    
    def remove_from_memory(self, memory_item: str):
        """Remove an item from character's memory"""
        self.memory.discard(memory_item)
        print(f"Removed from memory: {memory_item}")
    
    def add_intention(self, intention: str):
        """Add an intention to character's intentions"""
        self.intentions.add(intention)
        print(f"Added intention: {intention}")
    
    def remove_intention(self, intention: str):
        # remove all items like intention from list
        self.intentions.discard(intention)
        print(f"Removed intention: {intention}")
    
    def roll_skill(self, skill_name: str):
        """Roll a skill check"""
        roll = random.randint(1, 20)
        
        # If skill exists, add the ability modifier
        if skill_name in self.skills:
            ability = self.skills[skill_name]
            ability_score = self.ability_scores[ability]
            ability_modifier = (ability_score - 10) // 2
            
            # Add proficiency bonus if proficient
            proficiency_bonus = self.proficiency_bonus if skill_name in self.skill_proficiencies else 0
            
            total = roll + ability_modifier + proficiency_bonus
            
            # Import Socket.IO instance if available
            try:
                # Add roll result to game_state messages
                try:
                    # Format roll message
                    roll_message = f"Rolls {total} for {skill_name}"
                    
                    message = DialogueMessage(self.name, roll_message, self.avatar, self.id, data={
                        "ability": ability,
                        "base_roll": roll,
                        "ability_modifier": ability_modifier,
                        "proficiency_bonus": proficiency_bonus,
                        "skill_name": skill_name,
                    }, type=DialogueMessageType.ROLL)
                    # Add to game_state messages
                    append_to_dialog_history(message)
                    send_socket_message('new_message', message.to_dict())
                except (ImportError, AttributeError):
                    pass  # game_state not available
            except (ImportError, AttributeError):
                pass  # Socket.IO not available, continue without emitting
                
            return total
        
        return roll

    def get_short_memory(self):
        memory_logger.info(f"Getting short memory for {self.name}. Memory size: {len(self.memory)}")
        dialogue_history = get_dialogue_history(10)
        short_memory = set()
        
        try:
            for dialog_item in dialogue_history:
                message = dialog_item.message
                memory_logger.info(f"Processing message: {message[:50]}...")
                for memory_item in self.memory:
                    try:
                        cosine_similarity = compare_with_base(memory_item, message)
                        
                        if cosine_similarity > 0.61:
                            short_memory.add(memory_item)
                    except Exception as e:
                        memory_logger.error(f"Error processing memory item: {str(e)}", exc_info=True)
            
            memory_logger.info(f"Short memory size for {self.name}: {len(short_memory)} items")
            return short_memory
        except Exception as e:
            memory_logger.error(f"Error in get_short_memory: {str(e)}", exc_info=True)
            return set()  # Return empty set on error
    
    def generate_response(self):
        global language
        # Check if character is active
        if not self.active:
            char_logger.info(f"Character {self.name} is inactive, skipping response generation")
            return None
            
        # Use the Character class method to generate response
        dialogue_history = build_dialogue_messages_list()
        char_logger.info(f"Generating response for {self.name}")
        try:
            short_memory = self.get_short_memory()
            char_logger.info(f"Retrieved {len(short_memory)} relevant memories for response generation")
        except Exception as e:
            char_logger.error(f"Error getting short memory: {str(e)}", exc_info=True)
            short_memory = set()

        characters_list = '\n'.join([f'{char.name} ({char.race} {char.char_class}){" - not nearby" if not char.active else ""}' for char in get_characters().values()])
        delimiter = "\n - "

        # Format inventory for prompt
        inventory_text = ""
        if self.inventory:
            inventory_items = [f"{item['name']} ({item['quantity']}){': ' + item['description'] if item['description'] else ''}" for item in self.inventory]
            inventory_text = delimiter.join(inventory_items)
        else:
            inventory_text = "No items"

        prompt = (
            "# Your role:\n"
            f"You are a RPG player controlling the character {self.name}, {self.race} {self.char_class}.\n"
            f"{'Use Russian language for your response' if language == 'ru' else ''}\n"
            f"Your personality: {self.personality}\n"
            f"Your background: {self.background}\n"
            f"Your motivation: {self.motivation}\n\n"
            f"{'You are the group leader. You make decisions about group movement and announce them.' if self.is_leader else ''}\n\n"
            "# Communication rules:\n"
            "You are all friends sitting at the same table. Be casual.\n"
            "You can include meta-game jokes, but not too often.\n"
            "Speak about your character in first person.\n"
            "State actions to do something. Express your intentions in affirmative form.\n"
            "If your group is stuck, try to act differently.\n"
            "Discuss your plans with the group before acting.\n"
            "Be brief and concise.\n\n"

            "\n# Game rules:\n"
            "You must ask master to move somewhere in the game world.\n"
            "If you want to address someone, use direct speech.\n"
            "Don't make up things not mentioned in the context or message history. Ask the master for clarification about what's happening.\n"
            "You can use items in your inventory. Mention them by name when you want to use them.\n"
            "You have gold to buy items or services. Use it wisely.\n"

            "# Context:\n"
            "## Other characters in your group:\n"
            f"{characters_list}\n\n"
            "## Basic knowledge:\n"
            f"{get_base_lore()}\n\n"
            "## Your knowledge:\n"
            f"{delimiter.join(short_memory) if short_memory else '- No memories about topics in messages'}\n\n"
            "## Your were going to do:\n"
            f"{delimiter.join(self.intentions)}\n\n"
            "## Your inventory:\n"
            f"{inventory_text}\n\n"
            "## Your gold:\n"
            f"{self.gold} gold coins\n\n"
            "## Current game context:\n"
            f"{get_current_scene()}\n\n"
            "## Message history:\n"
            f"{dialogue_history}\n"
        )
        
        result = generate_response(prompt, temperature=0.85)

        if result and "text" in result:
            self.do_tools(result["text"])

        return result

    def do_tools(self, message):
        # Check if character is active
        if not self.active:
            char_logger.info(f"Character {self.name} is inactive, skipping tools execution")
            return None
            
        dialogue_history = build_dialogue_messages_list(5)
        delimiter = "\n - "
        prompt = (
            "# Your role:\n"
            "You are an agent using auxiliary tools for a RPG player.\n"
            f"{'Use Russian language for your response' if language == 'ru' else ''}\n"

            "# Instructions:\n"
            "- remember_information: Remember important moments in the game. For example: names of places, characters, events, descriptions of items, etc.\n"
            "- manage things character is going to do or tasks he accepts with addIntention and removeIntention\n"

            "\n# Context:\n"
            "## Your intentions:"
            f"{delimiter.join(self.intentions)}\n\n"
            "## Message history:\n"
            f"{dialogue_history}\n\n"
            "## Message from your player:\n"
            f"{message}\n"
        )

        generate_response(prompt, temperature=0.70, tools=[
            (self.add_intention, addIntention_declaration),
            (self.remove_intention, removeIntention_declaration),
            (self.remember_information, remember_information_declaration),
        ])

    def clear_memories(self):
        self.memory = set()

    def add_item_to_inventory(self, item_name, item_description="", item_quantity=1, 
                             value=0, weight=0, type_="", rarity="common", equipped=False):
        """Add an item to the character's inventory"""
        self.inventory = InventoryManager.add_item(
            self.inventory, 
            self.id, 
            item_name, 
            item_description, 
            item_quantity,
            value,
            weight,
            type_,
            rarity,
            equipped
        )
    
    def remove_item_from_inventory(self, item_name, item_quantity=1):
        """Remove an item from the character's inventory"""
        success, self.inventory = InventoryManager.remove_item(self.inventory, item_name, item_quantity)
        return success
    
    def update_item_in_inventory(self, item_name, new_name=None, new_description=None, new_quantity=None, 
                                value=None, weight=None, type_=None, rarity=None, equipped=None):
        """Update an item in the character's inventory"""
        success, self.inventory = InventoryManager.update_item(
            self.inventory, 
            item_name, 
            new_name, 
            new_description, 
            new_quantity,
            value,
            weight,
            type_,
            rarity,
            equipped
        )
        return success
    
    def get_inventory(self):
        """Get the character's inventory"""
        return self.inventory

    def add_gold(self, amount):
        """Add gold to the character"""
        self.gold += amount
        
    def remove_gold(self, amount):
        """Remove gold from the character (if possible)"""
        if self.gold >= amount:
            self.gold -= amount
            return True
        return False
        
    def set_gold(self, amount):
        """Set gold to a specific amount"""
        self.gold = max(0, amount)  # Ensure gold doesn't go below 0
        
    def get_gold(self):
        """Get the character's gold amount"""
        return self.gold

_characters = {
    
}

def update_avatar(character):
    global _characters
    if os.path.exists("ui/public/images/" + character.avatar):
        _characters[character.id].avatar = character.avatar
    else:
        _characters[character.id].avatar = "avatar.jpg"

def update_character(character):
    global _characters
    _characters[character.id] = character

def get_characters():
    return _characters

def get_active_characters():
    """Return only active characters"""
    return {char_id: char for char_id, char in _characters.items() if char.active}

def set_characters(characters):
    global _characters
    _characters = characters
    for character in _characters.values():
        update_avatar(character)

def get_character_by_id(character_id):
    return _characters.get(character_id)

def set_character_active(character_id, active_state):
    """Set a character's active state"""
    character = get_character_by_id(character_id)
    if character:
        character.active = active_state
        return True
    return False

def reset_to_default_characters():
    """Reset the characters dictionary to default state in case of errors"""
    # Define default characters
    reseted_characters = {
        "ragnar": Character(
            char_id="ragnar",
            name="Ragnar Stormhammer" if language != "ru" else "Рыганар Громовый",
            char_class="Barbarian",
            race="Dwarf",
            personality="Brave, impulsive and loyal. Prefers direct combat over stealth.",
            background="Mountain dwarf who lost his clan in a dragon attack and seeks revenge.",
            motivation="Help his friends and protect them from enemies.",
            avatar="",
            is_leader=True,
            strength=12,
            dexterity=10,
            constitution=14,
            intelligence=10,
            wisdom=12,
            charisma=10,
            gold=50
        ),
        "elara": Character(
            char_id="elara",
            name="Elara Moonshadow" if language != "ru" else "Элара Мооншад",
            char_class="Wizard",
            race="Elf",
            personality="Smart, cautious and curious. Analyzes the situation before acting.",
            background="High elf who left her magical academy to find ancient arcane secrets.",
            motivation="Find ancient arcane secrets and protect them from enemies.",
            avatar="",
            strength=10,
            dexterity=12,
            constitution=10,
            intelligence=14,
            wisdom=12,
            charisma=10,
            gold=30
        ),
        "thorne": Character(
            char_id="thorne",
            name="Thorne Nightwalker" if language != "ru" else "Торн Ночной",
            char_class="Rogue",
            race="Human",
            personality="Cunning, sarcastic and self-serving, but deep down good-hearted.",
            background="Former guild thief who now uses his skills to correct the mistakes of corrupt nobles.",
            motivation="Find ancient arcane secrets and protect them from enemies.",
            avatar="",
            strength=10,
            dexterity=12,
            constitution=10,
            intelligence=14,
            wisdom=12,
            charisma=10,
            gold=75
        )
    }
    
    # Add default inventory items based on character class
    reseted_characters["ragnar"].inventory = InventoryManager.create_default_items("ragnar", "warrior")
    reseted_characters["elara"].inventory = InventoryManager.create_default_items("elara", "wizard")
    reseted_characters["thorne"].inventory = InventoryManager.create_default_items("thorne", "rogue")

    set_characters(reseted_characters)

# Generate AI character response
def get_character_by_id(character_id) -> Character | None:
    char_logger.info(f"Getting character by id: {character_id}")
    character = _characters.get(character_id)
    if character:
        return character
    else:
        return None