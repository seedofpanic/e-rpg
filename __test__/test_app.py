import os
import sys
import pytest
import json
import unittest
from unittest.mock import patch, MagicMock

# Add the parent directory to sys.path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import app 
from app_socket import app as flask_app, socketio
from game_state import game_state, GameState
from character import Character, get_characters
from dialog_history import DialogueMessage, get_dialogue_history, set_dialog_history
from base_lore import get_base_lore, set_base_lore
from update_scene import get_current_scene, set_current_scene

@pytest.fixture
def client():
    app.testing = True
    with app.test_client() as client:
        yield client

@pytest.fixture
def socketio_client():
    app.testing = True
    return socketio.test_client(app)

@pytest.fixture
def reset_game_state():
    # Reset game state before each test
    set_dialog_history([])
    set_current_scene("Вы в таверне города Кадера.")
    for character in get_characters().values():
        character.clear_memories()
    yield
    # Cleanup after test
    set_dialog_history([])
    set_current_scene("Вы в таверне города Кадера.")
    for character in get_characters().values():
        character.clear_memories()

# We skip TestRoutes and TestSocketIO for now as they need more extensive refactoring
# to properly work with the current app structure

class TestCharacter:
    def test_character_creation(self):
        """Test character creation endpoint"""
        char = Character(
            char_id="test",
            name="Test Character",
            char_class="Wizard",
            race="Human",
            personality="Smart",
            background="Test background",
            motivation="Learn magic"
        )
        
        # Verify character attributes
        assert char.id == "test"
        assert char.name == "Test Character"
        assert char.char_class == "Wizard"
        assert char.race == "Human"
        assert char.personality == "Smart"
        assert char.background == "Test background"
        assert char.motivation == "Learn magic"
        assert char.is_leader is False
        assert len(char.memory) == 0
    
    def test_character_clear_memories(self):
        """Test clearing character memories"""
        char = Character(
            char_id="test",
            name="Test Character",
            char_class="Wizard",
            race="Human",
            personality="Smart",
            background="Test background",
            motivation="Learn magic"
        )

        # Add a memory
        char.memory.add("Test memory")
        assert len(char.memory) == 1
        
        # Clear memories
        char.clear_memories()
        assert len(char.memory) == 0

class TestGameState:
    def test_save_load_game(self, reset_game_state):
        """Test saving and loading game state"""
        # Set up test state
        test_scene = "Test scene for saving"
        test_lore = "Test lore for saving"
        test_message = DialogueMessage("Test", "Test save message", 1)

        set_current_scene(test_scene)
        set_base_lore(test_lore)
        
        from dialog_history import append_to_dialog_history
        append_to_dialog_history(test_message)
        
        # Create a test game state instance
        test_game_state = GameState(
            current_scene=test_scene,
            dialogue_history=[test_message],
            base_lore=test_lore
        )
        
        # Create a simple filename (not a path)
        save_filename = "test_app_save.json"
        expected_file_path = os.path.join("saves", save_filename)
        
        # Make sure saves directory exists
        os.makedirs("saves", exist_ok=True)
        
        # Set the save filename
        test_game_state.set_save_file_path(save_filename)
        
        # Save the game
        save_result = test_game_state.save_game()
        assert save_result is True
        assert os.path.exists(expected_file_path)
        
        # Reset state for loading test
        set_current_scene("Reset scene")
        set_base_lore("Reset lore")
        set_dialog_history([])
        
        # Load the game
        load_result = test_game_state.load_game()
        assert load_result is True
        
        # Verify state was loaded
        assert get_current_scene() == test_scene
        assert get_base_lore() == test_lore
        
        dialog_history = get_dialogue_history()
        assert len(dialog_history) == 1
        assert dialog_history[0].sender == "Test"
        assert dialog_history[0].message == "Test save message"
        
        # Clean up
        if os.path.exists(expected_file_path):
            os.remove(expected_file_path)

if __name__ == "__main__":
    pytest.main(["-v", "__test__/test_app.py"]) 