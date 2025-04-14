#!/usr/bin/env python3

import os
import sys
import json
import pytest

# Add the parent directory to sys.path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from character import Character, get_characters, get_character_by_id, set_character, set_characters
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
    
    return True

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
    test_char.save_to_game_state()
    print(f"Saved character to game state: {test_char.name}")
    
    # Load from game state
    loaded_char = Character.load_from_game_state("test_state")
    print(f"Loaded character from game state: {loaded_char.name}, {loaded_char.race} {loaded_char.char_class}")
    
    # Check if values match
    assert loaded_char.id == test_char.id
    assert loaded_char.name == test_char.name
    assert loaded_char.ability_scores['intelligence'] == test_char.ability_scores['intelligence']
    
    print("Game state storage test passed!")
    
    return True

def test_save_predefined_characters():
    print("\nTesting saving predefined characters...")
    
    # Save predefined characters
    save_predefined_characters_to_game_state()
    print("Saved predefined characters to game state")
    
    # Check if they can be loaded
    for char_id in get_characters().keys():
        loaded_char = Character.load_from_game_state(char_id)
        if loaded_char:
            print(f"Successfully loaded {loaded_char.name} from game state")
        else:
            print(f"Failed to load character {char_id}")
            return False
    
    print("Predefined characters test passed!")
    
    return True

# Run all tests
if __name__ == "__main__":
    print("=== Character Storage Tests ===\n")
    
    try:
        test_character_export_import()
        test_game_state_storage()
        test_save_predefined_characters()
        print("\nAll tests passed successfully!")
    except Exception as e:
        print(f"Test failed with error: {str(e)}") 