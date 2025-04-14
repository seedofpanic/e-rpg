import os
import sys
import pytest
import json
import unittest
from unittest.mock import patch, MagicMock
from flask import url_for
from flask_socketio import SocketIOTestClient

# Add the parent directory to sys.path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import app
from game_state import game_state, GameState
from character import Character, get_characters
from dialog_history import DialogueMessage, get_dialogue_history, set_dialog_history
from base_lore import get_base_lore, set_base_lore
from update_scene import get_current_scene, set_current_scene

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture
def socketio_client():
    app.config['TESTING'] = True
    return SocketIOTestClient(app, socketio)

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

class TestRoutes:
    def test_index_route(self, client):
        """Test the index route returns 200 status code"""
        response = client.get('/')
        assert response.status_code == 200
        
    def test_update_game_state(self, client, reset_game_state):
        """Test updating game state"""
        data = {
            'scene': 'New test scene',
            'lore': 'New test lore'
        }
        response = client.post('/api/update_game_state', 
                               data=json.dumps(data),
                               content_type='application/json')
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['status'] == 'success'
        assert response_data['game_state']['scene'] == 'New test scene'
        assert response_data['game_state']['lore'] == 'New test lore'
        
    def test_get_characters(self, client):
        """Test getting characters"""
        response = client.get('/api/get_characters')
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['status'] == 'success'
        assert 'characters' in response_data
        # Check that ragnar is in the characters
        assert 'ragnar' in response_data['characters']
        
    @patch('app.update_character_file')
    def test_update_characters(self, mock_update_file, client):
        """Test updating characters"""
        mock_update_file.return_value = True
        
        test_characters = {
            "test_char": {
                "id": "test_char",
                "name": "Test Character",
                "race": "Human",
                "class": "Fighter",
                "personality": "Brave",
                "background": "Test background",
                "motivation": "Test motivation",
                "is_leader": True,
                "avatar": "test.png",
                "ability_scores": {
                    "strength": 10,
                    "dexterity": 10,
                    "constitution": 10,
                    "intelligence": 10,
                    "wisdom": 10,
                    "charisma": 10
                }
            }
        }
        
        data = {
            'characters': test_characters
        }
        
        response = client.post('/api/update_characters', 
                               data=json.dumps(data),
                               content_type='application/json')
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['status'] == 'success'
        
        # Verify that the character was updated
        response = client.get('/api/get_characters')
        characters_data = json.loads(response.data)
        assert 'test_char' in characters_data['characters']
        
    def test_reset_game(self, client, reset_game_state):
        """Test resetting the game"""
        # First, update game state
        client.post('/api/update_game_state', 
                    data=json.dumps({'scene': 'Changed scene'}),
                    content_type='application/json')
        
        # Add a message to dialog history
        dialog_msg = DialogueMessage("Test", "Test message", 1)
        from dialog_history import append_to_dialog_history
        append_to_dialog_history(dialog_msg)
        
        # Now reset
        response = client.post('/api/reset_game')
        assert response.status_code == 200
        
        # Check that state is reset
        assert get_current_scene() == "Вы в таверне города Кадера."
        assert len(get_dialogue_history(100)) == 0

    @patch('app.sr')
    def test_voice_input(self, mock_sr, client):
        """Test voice input endpoint"""
        # Mock the speech recognition
        mock_recognizer = MagicMock()
        mock_recognizer.recognize_google.return_value = "Test speech input"
        mock_sr.Recognizer.return_value = mock_recognizer
        
        # Mock the microphone context
        mock_mic = MagicMock()
        mock_sr.Microphone.return_value = mock_mic
        
        response = client.post('/api/voice_input')
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['text'] == "Test speech input"

class TestSocketIO:
    def test_connect(self, socketio_client, reset_game_state):
        """Test client connection"""
        socketio_client.connect()
        assert socketio_client.is_connected()
        
        # Should receive scene_updated event
        received = socketio_client.get_received()
        assert len(received) >= 1
        assert any(event['name'] == 'scene_updated' for event in received)
        
    def test_gm_message(self, socketio_client, reset_game_state):
        """Test sending GM message"""
        socketio_client.connect()
        
        # Clear received events from connection
        socketio_client.get_received()
        
        # Send a GM message
        socketio_client.emit('gm_message', {'message': 'Test GM message'})
        
        # Check that we got a new_message event
        received = socketio_client.get_received()
        assert len(received) >= 1
        
        # Find the new_message event
        new_message_events = [event for event in received if event['name'] == 'new_message']
        assert len(new_message_events) >= 1
        
        # Check message content
        message_data = new_message_events[0]['args'][0]
        assert message_data['sender'] == 'Мастер'
        assert message_data['message'] == 'Test GM message'
        assert message_data['avatar'] == 'gm'
        
        # Verify it was added to dialog history
        dialog_history = get_dialogue_history(100)
        assert len(dialog_history) >= 1
        assert any(msg.message == 'Test GM message' for msg in dialog_history)
        
    @patch('app.update_api_key')
    def test_update_api_key(self, mock_update_key, socketio_client):
        """Test updating API key"""
        socketio_client.connect()
        socketio_client.emit('update_api_key', {'api_key': 'test_key_123'})
        
        # Check that update_api_key was called
        mock_update_key.assert_called_once()
        assert mock_update_key.call_args[0][1] == 'test_key_123'

class TestCharacter:
    def test_character_creation(self):
        """Test character creation and properties"""
        char = Character(
            char_id="test",
            name="Test Character",
            char_class="Wizard",
            race="Human",
            personality="Smart",
            background="Test background",
            motivation="Learn magic",
            is_leader=False,
            strength=8,
            dexterity=12,
            constitution=10,
            intelligence=16,
            wisdom=14,
            charisma=10
        )
        
        assert char.name == "Test Character"
        assert char.char_class == "Wizard"
        assert char.race == "Human"
        assert char.personality == "Smart"
        assert char.ability_scores["intelligence"] == 16
        assert char.is_leader is False
        
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
        char.add_memory("Test memory")
        
        # Check that memory was added
        assert len(char.memories) == 1
        
        # Clear memories
        char.clear_memories()
        
        # Check that memories were cleared
        assert len(char.memories) == 0
        
class TestGameState:
    def test_save_load_game(self, reset_game_state, tmp_path):
        """Test saving and loading game state"""
        # Set up test state
        test_scene = "Test scene for saving"
        test_lore = "Test lore for saving"
        test_message = DialogueMessage("Test", "Test save message", 1)
        
        set_current_scene(test_scene)
        set_base_lore(test_lore)
        append_to_dialog_history(test_message)
        
        # Save game to temp file
        save_path = os.path.join(tmp_path, "test_save.json")
        game_state.set_save_file_path(save_path)
        result = game_state.save_game(save_path)
        assert result is True
        assert os.path.exists(save_path)
        
        # Reset state
        set_current_scene("Reset scene")
        set_base_lore("Reset lore")
        set_dialog_history([])
        
        # Load game
        result = game_state.load_game()
        assert result is True
        
        # Verify state was restored
        assert get_current_scene() == test_scene
        assert get_base_lore() == test_lore
        
        dialog_history = get_dialogue_history(100)
        assert len(dialog_history) == 1
        assert dialog_history[0].message == "Test save message"


if __name__ == '__main__':
    pytest.main(['-v', '__test__/test_app.py']) 