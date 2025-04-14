import os
import sys
import json
import pytest
import tempfile
from unittest.mock import patch, mock_open

# Add the parent directory to sys.path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from game_state import game_state, GameState
from dialog_history import DialogueMessage, get_dialogue_history, set_dialog_history
from base_lore import get_base_lore, set_base_lore
from update_scene import get_current_scene, set_current_scene

class TestGameState:
    @pytest.fixture
    def reset_state(self):
        """Reset game state between tests"""
        set_dialog_history([])
        set_current_scene("Initial test scene")
        set_base_lore("Initial test lore")
        yield
        set_dialog_history([])
        set_current_scene("Initial test scene")
        set_base_lore("Initial test lore")
    
    @pytest.fixture
    def populated_game_state(self, reset_state):
        """Create a game state with sample data"""
        set_current_scene("Test Dungeon")
        set_base_lore("This is a test lore entry")
        
        # Add dialogue history
        messages = [
            DialogueMessage("Мастер", "Welcome to the dungeon", 0),
            DialogueMessage("Рагнар", "I'll check for traps", 1),
            DialogueMessage("Элара", "I'll cast light spell", 2)
        ]
        for msg in messages:
            from dialog_history import append_to_dialog_history
            append_to_dialog_history(msg)
        
        return GameState()
    
    def test_game_state_initialization(self):
        """Test that GameState initializes properly"""
        test_state = GameState()
        assert test_state.save_file_path == "game_save.json"
        assert test_state.autosave_enabled is False
        assert test_state.autosave_threshold == 5
        assert test_state.messages_since_last_save == 0
    
    def test_save_file_path_management(self):
        """Test setting and getting save file path"""
        test_path = "test_save_path.json"
        game_state.set_save_file_path(test_path)
        assert game_state.get_save_file_path() == test_path
        
        # Reset to default
        game_state.set_save_file_path("game_save.json")
    
    def test_autosave_settings(self):
        """Test autosave settings management"""
        # Default state
        assert game_state.is_autosave_enabled() is False
        
        # Enable autosave
        game_state.enable_autosave()
        assert game_state.is_autosave_enabled() is True
        
        # Disable autosave
        game_state.disable_autosave()
        assert game_state.is_autosave_enabled() is False
        
        # Set threshold
        game_state.set_autosave_threshold(10)
        assert game_state.get_autosave_threshold() == 10
        
        # Reset to default
        game_state.set_autosave_threshold(5)
    
    def test_save_game(self, populated_game_state, tmp_path):
        """Test saving game to file"""
        # Create a temporary file path
        save_path = os.path.join(tmp_path, "test_save.json")
        
        # Set the save path
        populated_game_state.set_save_file_path(save_path)
        
        # Save the game
        result = populated_game_state.save_game()
        assert result is True
        assert os.path.exists(save_path)
        
        # Verify file contents
        with open(save_path, 'r') as f:
            save_data = json.load(f)
            assert save_data["scene"] == "Test Dungeon"
            assert save_data["lore"] == "This is a test lore entry"
            assert len(save_data["dialog_history"]) == 3
    
    def test_load_game(self, reset_state, tmp_path):
        """Test loading game from file"""
        # Create a test save file
        save_path = os.path.join(tmp_path, "test_load.json")
        
        test_data = {
            "scene": "Loaded Scene",
            "lore": "Loaded Lore",
            "dialog_history": [
                {"sender": "GM", "message": "Loaded message 1", "character_id": 0},
                {"sender": "Character1", "message": "Loaded message 2", "character_id": 1}
            ]
        }
        
        with open(save_path, 'w') as f:
            json.dump(test_data, f)
        
        # Set the save path and load
        game_state.set_save_file_path(save_path)
        result = game_state.load_game()
        
        assert result is True
        assert get_current_scene() == "Loaded Scene"
        assert get_base_lore() == "Loaded Lore"
        
        dialog_history = get_dialogue_history(10)
        assert len(dialog_history) == 2
        assert dialog_history[0].sender == "GM"
        assert dialog_history[0].message == "Loaded message 1"
        assert dialog_history[1].sender == "Character1"
        assert dialog_history[1].message == "Loaded message 2"
    
    def test_increment_messages_counter(self):
        """Test incrementing message counter for autosave"""
        # Reset counter
        game_state.messages_since_last_save = 0
        
        # Enable autosave
        game_state.enable_autosave()
        game_state.set_autosave_threshold(3)
        
        # Mock save_game to avoid actual file operations
        with patch.object(game_state, 'save_game') as mock_save:
            mock_save.return_value = True
            
            # Add messages just below threshold
            for i in range(2):
                game_state.increment_messages_counter()
            
            # Should not have called save_game yet
            assert mock_save.call_count == 0
            
            # Add one more message to hit threshold
            game_state.increment_messages_counter()
            
            # Should have called save_game
            assert mock_save.call_count == 1
            
            # Counter should be reset
            assert game_state.messages_since_last_save == 0
        
        # Disable autosave
        game_state.disable_autosave()
    
    def test_autosave_disabled(self):
        """Test that autosave doesn't happen when disabled"""
        # Reset counter
        game_state.messages_since_last_save = 0
        
        # Ensure autosave is disabled
        game_state.disable_autosave()
        
        # Mock save_game to avoid actual file operations
        with patch.object(game_state, 'save_game') as mock_save:
            # Add messages beyond threshold
            for i in range(10):
                game_state.increment_messages_counter()
            
            # Should not have called save_game
            assert mock_save.call_count == 0
            
            # Counter should still be incrementing
            assert game_state.messages_since_last_save == 10


if __name__ == "__main__":
    pytest.main(["-v", "__test__/test_game_state.py"]) 