#!/usr/bin/env python3

import os
import sys
import json
import pytest

# Add the parent directory to sys.path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from game_state import GameState
from gm_persona import GMPersona, get_personas, set_personas, get_default_persona, set_default_persona
from unittest.mock import patch, MagicMock

def test_persona_restoration():
    """Test that GM personas are properly restored when loading game state"""
    print("Testing persona restoration during game state loading...")
    
    # Set a test filepath
    test_file = "test_persona_restore.json"
    test_save_path = f"saves/{test_file}"
    
    # Create and initialize a new game state
    game_state = GameState(
        current_scene="Test scene",
        dialogue_history=[]
    )
    game_state.set_save_file_path(test_file)
    
    # Create a couple of custom personas
    test_personas = {}
    persona1 = GMPersona("test1", "Test Persona 1", "A test GM persona", "test_avatar1.jpg")
    persona1.is_favorite = True
    persona1.use_count = 5
    
    persona2 = GMPersona("test2", "Test Persona 2", "Another test persona", "test_avatar2.jpg")
    persona2.use_count = 3
    
    # Add personas to the global persona dictionary
    test_personas["test1"] = persona1
    test_personas["test2"] = persona2
    set_personas(test_personas)
    
    # Set one as the default
    set_default_persona("test1")
    assert get_default_persona() == "test1"
    
    # Save the game state
    save_success = game_state.save_game()
    print(f"Saved game with personas to file: {save_success}")
    
    # Clear personas completely
    set_personas({})
    assert len(get_personas()) == 0
    
    # Load the game
    load_success = game_state.load_game()
    print(f"Loaded game from file: {load_success}")
    
    # Verify personas were restored
    restored_personas = get_personas()
    assert len(restored_personas) == 2
    assert "test1" in restored_personas
    assert "test2" in restored_personas
    
    # Verify persona properties were restored
    assert restored_personas["test1"].name == "Test Persona 1"
    assert restored_personas["test1"].description == "A test GM persona"
    assert restored_personas["test1"].avatar == "test_avatar1.jpg"
    assert restored_personas["test1"].is_favorite == True
    assert restored_personas["test1"].use_count == 5
    
    assert restored_personas["test2"].name == "Test Persona 2"
    assert restored_personas["test2"].use_count == 3
    
    # Verify default persona was restored
    assert get_default_persona() == "test1"
    
    print("Persona restoration test passed!")
    
    # Clean up test file
    try:
        os.remove(test_save_path)
        print(f"Removed test file: {test_save_path}")
    except Exception as e:
        print(f"Could not remove test file: {str(e)}")
    
    return True

def test_personas_updated_emitted_on_load():
    """Test that the personas_updated event is emitted when loading a game state"""
    # Mock the socketio emit function
    with patch('app.socketio.emit') as mock_emit:
        # Import the handler function (done here to avoid circular imports)
        from app import handle_load_game, emit_personas_updated
        
        # Mock emit_personas_updated
        with patch('app.emit_personas_updated') as mock_emit_personas:
            # Create test data
            data = {
                'requestId': 'test-123',
                'filepath': 'test_game.json'
            }
            
            # Mock game_state.load_game to return True
            with patch('app.game_state.load_game', return_value=True):
                # Call the handler
                handle_load_game(data)
                
                # Verify that emit_personas_updated was called
                mock_emit_personas.assert_called_once()
                
                # Verify that the socketio.emit was called with appropriate events
                # Should have calls for 'scene_updated' and 'notification' at minimum
                assert mock_emit.call_count >= 2
                
                # Check for scene_updated call
                scene_updated_call = False
                notification_call = False
                
                for call in mock_emit.call_args_list:
                    args = call[0]
                    if args[0] == 'scene_updated':
                        scene_updated_call = True
                    elif args[0] == 'notification':
                        notification_call = True
                
                assert scene_updated_call, "scene_updated event was not emitted"
                assert notification_call, "notification event was not emitted"

if __name__ == "__main__":
    print("=== GM Persona Restoration Test ===\n")
    
    try:
        test_persona_restoration()
        print("\nTest completed successfully!")
    except Exception as e:
        print(f"Test failed with error: {str(e)}") 