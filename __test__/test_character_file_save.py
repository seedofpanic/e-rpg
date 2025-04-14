#!/usr/bin/env python3

import os
import sys
import json
import pytest

# Add the parent directory to sys.path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from character import Character, get_characters, get_character_by_id
from game_state import game_state

def test_save_load_characters_to_file():
    """Test saving and loading characters to/from a save file"""
    print("Testing character saving and loading with game_state...")
    
    # Set a test filepath
    test_file = "test_character_save.json"
    test_save_path = f"saves/{test_file}"
    
    # Create a test character
    test_char = Character(
        char_id="test_char_1",
        name="Test Character 1",
        char_class="Fighter",
        race="Human",
        personality="Brave and strong",
        background="Was a soldier",
        motivation="Protect the weak",
        is_leader=True,
        strength=16,
        dexterity=14,
        constitution=15,
        intelligence=10,
        wisdom=12,
        charisma=8
    )
    
    # Add character to global characters dict
    characters_dict = get_characters()
    characters_dict["test_char_1"] = test_char
    
    # Set test file path
    game_state.set_save_file_path(test_file)
    
    # Save to file
    save_success = game_state.save_game(test_file)
    print(f"Saved game with characters to file: {save_success}")
    
    # Remove character from memory
    characters_dict = get_characters()
    if "test_char_1" in characters_dict:
        del characters_dict["test_char_1"]
    
    # Verify character is gone
    assert get_character_by_id("test_char_1") is None
    
    # Load from file
    load_success = game_state.load_game(test_file)
    print(f"Loaded game from file: {load_success}")
    
    # Verify character was loaded
    loaded_characters = get_characters()
    assert "test_char_1" in loaded_characters
    
    loaded_char = loaded_characters["test_char_1"]
    assert loaded_char.name == "Test Character 1"
    assert loaded_char.char_class == "Fighter"
    assert loaded_char.race == "Human"
    assert loaded_char.ability_scores["strength"] == 16
    assert loaded_char.ability_scores["dexterity"] == 14
    
    print("Character save/load test passed!")
    
    # Clean up test file
    if os.path.exists(test_save_path):
        os.remove(test_save_path)
        print(f"Removed test file: {test_save_path}")
    
    return True

if __name__ == "__main__":
    test_save_load_characters_to_file() 