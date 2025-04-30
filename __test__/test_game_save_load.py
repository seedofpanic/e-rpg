#!/usr/bin/env python3

import os
import sys
import json
import pytest
import tempfile
from unittest.mock import patch, mock_open

# Add the parent directory to sys.path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from character import Character, get_characters, get_character_by_id, update_character
from game_state import game_state
from dialog_history import get_dialogue_history, set_dialog_history, append_to_dialog_history, DialogueMessage
from base_lore import get_base_lore, set_base_lore
from update_scene import get_current_scene, set_current_scene

def test_game_save_load_with_characters():
    """Test that game save/load works with characters"""
    print("Testing game save/load with characters...")
    
    # Set a test filepath
    test_file = "test_full_game_state.json"
    test_save_path = f"saves/{test_file}"
    game_state.set_save_file_path(test_file)
    
    # Create a test scene
    test_scene = "Вы находитесь в волшебном лесу."
    set_current_scene(test_scene)
    
    # Add some test dialogue
    append_to_dialog_history(DialogueMessage("Мастер", "Добро пожаловать в лес!", 0))
    
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
    
    # Add character to global character store
    update_character(test_char)
    
    # Add a memory to the character
    test_char.memory.add("There are strange lights in the forest")
    print(f"Added character to game state: {test_char.name}")
    
    # Save the game
    save_success = game_state.save_game()
    print(f"Saved game to file: {save_success}")
    
    # Clear state to simulate restart
    set_current_scene("Empty scene")
    set_dialog_history([])
    
    # Clear character from memory
    characters_dict = get_characters()
    if "game_test_char" in characters_dict:
        del characters_dict["game_test_char"]
    
    # Verify character is gone
    assert get_character_by_id("game_test_char") is None
    
    # Load the game
    load_success = game_state.load_game()
    print(f"Loaded game from file: {load_success}")
    
    # Check scene was restored
    assert get_current_scene() == test_scene
    print(f"Scene restored: '{get_current_scene()}'")
    
    # Check dialogue was restored
    dialogue = get_dialogue_history()
    assert len(dialogue) > 0
    assert dialogue[0].message == "Добро пожаловать в лес!"
    print(f"Dialogue restored: '{dialogue[0].message}'")
    
    # Check character was restored
    loaded_char = get_character_by_id("game_test_char")
    assert loaded_char is not None
    print(f"Successfully retrieved character: {loaded_char.name}, {loaded_char.race} {loaded_char.char_class}")
    
    # Verify character data
    assert loaded_char.id == test_char.id
    assert loaded_char.name == test_char.name
    assert loaded_char.ability_scores['charisma'] == test_char.ability_scores['charisma']
    
    # Check character memory was restored
    assert "There are strange lights in the forest" in loaded_char.memory
    print(f"Character memories restored: {loaded_char.memory}")
    
    print("Game save/load with characters test passed!")
    
    # Clean up test file
    if os.path.exists(test_save_path):
        os.remove(test_save_path)
        print(f"Removed test file: {test_save_path}")

# Run test
if __name__ == "__main__":
    print("=== Game Save/Load With Characters Test ===\n")
    
    try:
        test_game_save_load_with_characters()
        print("\nTest completed successfully!")
    except Exception as e:
        print(f"Test failed with error: {str(e)}") 