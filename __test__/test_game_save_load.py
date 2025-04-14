#!/usr/bin/env python3

import os
import sys
import json
import pytest
import tempfile
from unittest.mock import patch, mock_open

# Add the parent directory to sys.path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from character import Character, get_characters, get_character_by_id
from game_state import game_state, DialogueMessage
from dialog_history import get_dialogue_history, set_dialog_history
from base_lore import get_base_lore, set_base_lore
from update_scene import get_current_scene, set_current_scene

def test_game_save_load_with_characters():
    """Test that game save/load works with characters"""
    print("Testing game save/load with characters...")
    
    # Set a test filepath
    test_file = "test_full_game_state.json"
    game_state.set_save_file_path(test_file)
    
    # Create a test scene
    test_scene = "Вы находитесь в волшебном лесу."
    game_state.set_current_scene(test_scene)
    
    # Add some test dialogue
    game_state.add_message(DialogueMessage("Мастер", "Добро пожаловать в лес!", 0))
    
    # Create a test character
    test_char = Character(
        char_id="game_test_char",
        name="Game Test Character",
        char_class="Bard",
        race="Gnome",
        personality="Cheerful and witty",
        background="Wandering musician",
        motivation="Collect stories",
        avatar="avatar.jpg",
        charisma=18
    )
    
    # Save to game state and add a memory
    test_char.save_to_game_state()
    test_char.remember_information("There are strange lights in the forest")
    print(f"Added character to game state: {test_char.name}")
    
    # Save the game
    save_success = game_state.save_game(test_file)
    print(f"Saved game to file: {save_success}")
    
    # Clear state to simulate restart
    game_state.set_current_scene("Empty scene")
    game_state.set_dialog_history([])
    game_state._characters = {}
    game_state._character_memories = {}
    
    # Clear character from memory
    if "game_test_char" in get_characters():
        del get_characters()["game_test_char"]
    
    # Verify character is gone
    if "game_test_char" in get_characters() or game_state.get_character("game_test_char"):
        print("Error: Character not properly cleared")
        return False
    
    # Load the game
    load_success = game_state.load_game(test_file)
    print(f"Loaded game from file: {load_success}")
    
    # Check scene was restored
    if game_state.get_current_scene() != test_scene:
        print(f"Error: Scene not restored correctly. Expected: '{test_scene}', Got: '{game_state.get_current_scene()}'")
        return False
    print(f"Scene restored: '{game_state.get_current_scene()}'")
    
    # Check dialogue was restored
    dialogue = game_state.get_dialogue_history(10)
    if not dialogue or dialogue[0].message != "Добро пожаловать в лес!":
        print("Error: Dialogue not restored correctly")
        return False
    print(f"Dialogue restored: '{dialogue[0].message}'")
    
    # Check character was restored in game_state
    if not game_state.get_character("game_test_char"):
        print("Error: Character not restored in game_state")
        return False
    print(f"Character data found in game_state")
    
    # Try to get character using get_character_by_id 
    loaded_char = get_character_by_id("game_test_char")
    if isinstance(loaded_char, str) and "Error" in loaded_char:
        print(f"Error: Failed to load character: {loaded_char}")
        return False
    
    print(f"Successfully retrieved character: {loaded_char.name}, {loaded_char.race} {loaded_char.char_class}")
    
    # Verify character data
    assert loaded_char.id == test_char.id
    assert loaded_char.name == test_char.name
    assert loaded_char.ability_scores['charisma'] == test_char.ability_scores['charisma']
    
    # Check character memory was restored
    memories = game_state.get_character_memories("game_test_char")
    if not memories or "strange lights in the forest" not in " ".join(memories):
        print("Error: Character memories not restored correctly")
        return False
    
    print(f"Character memories restored: {memories}")
    
    print("Game save/load with characters test passed!")
    
    # Clean up test file
    try:
        os.remove(test_file)
        print(f"Removed test file: {test_file}")
    except:
        pass
    
    return True

# Run test
if __name__ == "__main__":
    print("=== Game Save/Load With Characters Test ===\n")
    
    try:
        test_game_save_load_with_characters()
        print("\nTest completed successfully!")
    except Exception as e:
        print(f"Test failed with error: {str(e)}") 