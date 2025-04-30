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
        dialogue_history = []
        for msg in messages:
            from dialog_history import append_to_dialog_history
            append_to_dialog_history(msg)
            dialogue_history.append(msg)
        
        return GameState(current_scene="Test Dungeon", dialogue_history=dialogue_history, base_lore="This is a test lore entry")
    
    def test_game_state_initialization(self):
        """Test that GameState initializes properly"""
        test_state = GameState(current_scene="Test Scene", dialogue_history=[])
        assert test_state._save_file_path == "game_state.json"
        assert test_state._autosave_enabled is True  # Default is True in current implementation
        assert test_state._autosave_threshold == 5
    
    def test_save_file_path_management(self):
        """Test setting and getting save file path"""
        test_path = "test_save_path.json"
        game_state.set_save_file_path(test_path)
        assert game_state.get_save_file_path() == test_path
        
        # Reset to default
        game_state.set_save_file_path("game_state.json")
    
    def test_autosave_settings(self):
        """Test autosave settings management"""
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
        # Create a simple filename (not a path)
        save_filename = "test_save.json"
        
        # Set the save path (just the filename)
        populated_game_state.set_save_file_path(save_filename)
        
        # Save the game
        result = populated_game_state.save_game()
        assert result is True
        
        # Verify file exists in saves directory
        expected_file_path = os.path.join("saves", save_filename)
        assert os.path.exists(expected_file_path)
        
        # Verify file contents - use UTF-8 encoding
        with open(expected_file_path, 'r', encoding='utf-8') as f:
            save_data = json.load(f)
            assert save_data["current_scene"] == "Test Dungeon"
            assert save_data["base_lore"] == "This is a test lore entry"
            assert len(save_data["dialogue_history"]) == 3
        
        # Clean up
        if os.path.exists(expected_file_path):
            os.remove(expected_file_path)
    
    def test_load_game(self, reset_state, tmp_path):
        """Test loading game from file"""
        # Create a simple filename (not a path)
        save_filename = "test_load.json"
        expected_file_path = os.path.join("saves", save_filename)
        
        # Create saves directory if needed
        os.makedirs("saves", exist_ok=True)
        
        test_data = {
            "current_scene": "Loaded Scene",
            "base_lore": "Loaded Lore",
            "dialogue_history": [
                {"sender": "GM", "message": "Loaded message 1", "character_id": 0},
                {"sender": "Character1", "message": "Loaded message 2", "character_id": 1}
            ],
            "characters": [],
            "gm_personas": [],
            "default_persona": "gm"
        }
        
        with open(expected_file_path, 'w') as f:
            json.dump(test_data, f)
        
        # Create a test game state
        test_state = GameState(current_scene="Test Scene", dialogue_history=[])
        
        # Set the save path and load
        test_state.set_save_file_path(save_filename)
        result = test_state.load_game()
        
        assert result is True
        assert get_current_scene() == "Loaded Scene"
        assert get_base_lore() == "Loaded Lore"
        
        dialog_history = get_dialogue_history()
        assert len(dialog_history) == 2
        assert dialog_history[0].sender == "GM"
        assert dialog_history[0].message == "Loaded message 1"
        assert dialog_history[1].sender == "Character1"
        assert dialog_history[1].message == "Loaded message 2"
        
        # Clean up
        if os.path.exists(expected_file_path):
            os.remove(expected_file_path)
    
    def test_increment_messages_counter(self):
        """Test timer-based autosave functionality"""
        # We'll test the _timer_autosave method indirectly since there's no increment_messages_counter method anymore
        
        # Disable autosave to prevent interference
        game_state.disable_autosave()
        
        # Mock the _autosave method
        with patch.object(game_state, '_autosave') as mock_autosave:
            # Enable autosave
            game_state.enable_autosave()
            
            # Trigger the timer handler manually
            game_state._timer_autosave()
            
            # Should have called _autosave
            assert mock_autosave.call_count == 1
        
        # Disable autosave again
        game_state.disable_autosave()
    
    def test_autosave_disabled(self):
        """Test that autosave doesn't happen when disabled"""
        # Ensure autosave is disabled
        game_state.disable_autosave()
        
        # Mock _autosave to verify it's not called
        with patch.object(game_state, '_autosave') as mock_autosave:
            # Try triggering the timer handler manually
            game_state._timer_autosave()
            
            # Should not have called _autosave
            assert mock_autosave.call_count == 0


if __name__ == "__main__":
    pytest.main(["-v", "__test__/test_game_state.py"]) 