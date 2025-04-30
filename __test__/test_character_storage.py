#!/usr/bin/env python3

import os
import sys
import json
import pytest

# Add the parent directory to sys.path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from character import Character, get_characters, get_character_by_id, set_characters, update_character
from game_state import game_state

def test_character_export_import():
    print("Testing character export/import functions...")
    
    # Create a test character
    test_char = Character(
        char_id="test",
        name="Test Character",
        char_class="Warrior",
        race="Human",
        personality="Brave and strong",
        background="Test background",
        motivation="Testing",
        avatar="avatar.jpg",
        strength=15,
        dexterity=13
    )
    
    # Export to dict
    char_dict = test_char.export_to_dict()
    print(f"Exported character to dict: {json.dumps(char_dict, indent=2)}")
    
    # Import from dict
    imported_char = Character.from_dict(char_dict)
    print(f"Imported character: {imported_char.name}, {imported_char.race} {imported_char.char_class}")
    
    # Check if values match
    assert imported_char.id == test_char.id
    assert imported_char.name == test_char.name
    assert imported_char.ability_scores['strength'] == test_char.ability_scores['strength']
    
    print("Basic export/import test passed!")

def test_game_state_storage():
    print("\nTesting game state character storage...")
    
    # Save test character to game state
    test_char = Character(
        char_id="test_state",
        name="Test Character in State",
        char_class="Wizard",
        race="Elf",
        personality="Smart and wise",
        background="Test state background",
        motivation="Testing state storage",
        avatar="avatar.jpg",
        intelligence=18
    )
    
    # Save to game state
    # Instead of using save_to_game_state, we'll directly update the character in the global dict
    update_character(test_char)
    print(f"Saved character to game state: {test_char.name}")
    
    # Load from game state
    loaded_char = get_character_by_id("test_state")
    print(f"Loaded character from game state: {loaded_char.name}, {loaded_char.race} {loaded_char.char_class}")
    
    # Check if values match
    assert loaded_char.id == test_char.id
    assert loaded_char.name == test_char.name
    assert loaded_char.ability_scores['intelligence'] == test_char.ability_scores['intelligence']
    
    print("Game state storage test passed!")

def test_default_characters():
    print("\nTesting default characters...")
    
    # Get the current characters
    characters = get_characters()
    
    # Check if there are any characters
    assert len(characters) > 0, "No characters found in global characters dict"
    
    # Check if we can get a character by ID
    for char_id in characters.keys():
        char = get_character_by_id(char_id)
        assert char is not None, f"Could not retrieve character with ID {char_id}"
        print(f"Successfully retrieved character: {char.name}")
    
    print("Default characters test passed!")

# Run all tests
if __name__ == "__main__":
    print("=== Character Storage Tests ===\n")
    
    try:
        test_character_export_import()
        test_game_state_storage()
        test_default_characters()
        print("\nAll tests passed successfully!")
    except Exception as e:
        print(f"Test failed with error: {str(e)}") 