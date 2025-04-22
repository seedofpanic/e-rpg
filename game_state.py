import json
import os
import time
import threading

from base_lore import get_base_lore, set_base_lore
from dialog_history import DialogueMessage, append_to_dialog_history, get_dialogue_history, set_dialog_history
from update_scene import get_current_scene, set_current_scene
from character import get_characters, Character, reset_to_default_characters, set_characters
from gm_persona import GMPersona, get_personas, set_personas, set_default_persona, get_default_persona

language = os.getenv("LANGUAGE")

class GameState:
    def __init__(self, current_scene: str, dialogue_history: list[DialogueMessage], base_lore: str = "", debug_mode: bool = False):
        print("GameState __init__")
        set_current_scene(current_scene)
        set_dialog_history(dialogue_history)
        set_base_lore(base_lore)
        self._save_file_path = "game_state.json"  # Default save file path
        self._autosave_threshold = 5  # Autosave every X minutes (default: 5 minutes)
        self._autosave_enabled = not debug_mode  # Disable autosave in debug mode
        self._last_autosave_time = time.time()  # Last time autosave was performed
        self._autosave_timer = None  # Timer for autosave
        self._debug_mode = debug_mode

        self.load_game()
        if not self._debug_mode:
            self._start_autosave_timer()
    
    def _start_autosave_timer(self):
        """Start the autosave timer thread"""
        if self._autosave_timer:
            # Cancel existing timer if it's running
            self._autosave_timer.cancel()
        
        if self._autosave_enabled:
            # Convert minutes to seconds for the timer
            interval_seconds = self._autosave_threshold * 60
            self._autosave_timer = threading.Timer(interval_seconds, self._timer_autosave)
            self._autosave_timer.daemon = True  # Allow the timer thread to exit when main program exits
            self._autosave_timer.start()
    
    def stop_autosave_timer(self):
        """Stop the autosave timer thread - call this during Flask reload or app shutdown"""
        if self._autosave_timer:
            self._autosave_timer.cancel()
            self._autosave_timer = None
            print("Autosave timer stopped")
    
    def _timer_autosave(self):
        """Handler for timer-based autosave"""
        if self._autosave_enabled:
            self._autosave()
            # Restart the timer for the next autosave
            self._start_autosave_timer()
    
    def set_save_file_path(self, path):
        """Set the file path for saving/loading game state"""
        self._save_file_path = path
        
    def get_save_file_path(self):
        """Get the current save file path"""
        return self._save_file_path
    
    def set_autosave_threshold(self, threshold: int):
        """Set the time in minutes between autosaves"""
        self._autosave_threshold = threshold
        # Restart the timer with the new threshold
        self._start_autosave_timer()
    
    def get_autosave_threshold(self):
        """Get the current autosave threshold in minutes"""
        return self._autosave_threshold
    
    def enable_autosave(self):
        """Enable automatic saving"""
        self._autosave_enabled = True
        # Start the timer when enabling autosave
        self._start_autosave_timer()
    
    def disable_autosave(self):
        """Disable automatic saving"""
        self._autosave_enabled = False
        # Cancel the timer when disabling autosave
        if self._autosave_timer:
            self._autosave_timer.cancel()
    
    def is_autosave_enabled(self):
        """Check if autosave is enabled"""
        return self._autosave_enabled
    
    def _autosave(self):
        """Perform an automatic save and update last save time"""
        success = self.save_game()
        if success:
            print(f"Autosaved game state to {self._save_file_path}")
        else:
            print(f"Failed to autosave game state to {self._save_file_path}")
        
        # Update the last autosave time
        self._last_autosave_time = time.time()
    
    def save_game(self):
        """Save the game state to a file in save/ directory"""
        file_path = f"saves/{self._save_file_path}"
        # Create directory if it doesn't exist
        directory = os.path.dirname(file_path)
        if directory and not os.path.exists(directory):
            try:
                os.makedirs(directory)
            except Exception as e:
                print(f"Error creating directory: {e}")
                return False
            
        # Convert dialogue history to serializable format
        print(f"saving dialogue history {len(get_dialogue_history())}")
        dialogue_history_data = [msg.to_dict() for msg in get_dialogue_history()]
        
        characters_data = [character.export_to_dict() for character in get_characters().values()]
        
        # Convert GM personas to serializable format
        personas_data = [persona.export_to_dict() for persona in get_personas().values()]

        # Create the game state dictionary
        game_data = {
            "current_scene": get_current_scene(),
            "dialogue_history": dialogue_history_data,
            "base_lore": get_base_lore(),
            "characters": characters_data,  # Add characters to the save data
            "gm_personas": personas_data,  # Add GM personas to the save data
            "default_persona": get_default_persona()  # Save the default persona
        }
        
        # Save to file
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(game_data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"Error saving game state: {e}")
            return False
    
    def load_game(self):
        print("load_game")
        file_path = f"saves/{self._save_file_path}"
            
        if not os.path.exists(file_path):
            reset_to_default_characters()
            return False
            
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                game_data = json.load(f)
                
            # Restore current scene
            set_current_scene(game_data.get("current_scene", ""))
            
            # Restore dialogue history
            set_dialog_history([])
            for msg_data in game_data.get("dialogue_history", []):
                append_to_dialog_history(DialogueMessage.from_dict(msg_data))
                
            # Restore base lore
            set_base_lore(game_data.get("base_lore", ""))
            
            # Restore characters
            characters_data = game_data.get("characters", {})
            loaded_characters = {}
            for char_data in characters_data:
                loaded_characters[char_data["id"]] = Character.from_dict(char_data)

            set_characters(loaded_characters)
                
            # Restore GM personas
            personas_data = game_data.get("gm_personas", [])
            loaded_personas = {}
            for persona_data in personas_data:
                loaded_personas[persona_data["id"]] = GMPersona.from_dict(persona_data)
            set_personas(loaded_personas)
                
            # Restore default persona
            default_persona = game_data.get("default_persona", "gm")
            set_default_persona(default_persona)
                
            return True
        except Exception as e:
            print(f"Error loading game state: {e}")
            return False

# Check if Flask is in debug mode
def is_flask_debug_mode():
    # Check FLASK_DEBUG environment variable first
    flask_debug = os.environ.get('FLASK_DEBUG')
    if flask_debug and flask_debug.lower() in ('true', '1', 't'):
        return True
    
    # If we're in a Flask application context, we could check app.debug
    # But that's not available at import time, so we rely on the environment variable
    return False

# Game state
game_state = GameState(
    current_scene="You are in the tavern of the city of Kadera." if language != "ru" else "Вы в таверне города Кадера.",
    dialogue_history=[],  # Initialize messages array
    base_lore=get_base_lore(),  # Initialize with empty base lore
    debug_mode=is_flask_debug_mode()
)
