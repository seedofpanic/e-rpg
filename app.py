import traceback
import uuid
from dotenv import load_dotenv
load_dotenv()

import os
import time
from flask import request, jsonify, url_for, send_from_directory
from base_lore import get_base_lore, set_base_lore
from dialog_history import DialogueMessage, append_to_dialog_history, get_dialogue_history, set_dialog_history
from game_state import game_state
from app_socket import send_socket_message, app, socketio
from message_analyzers import decide_acting_character_for_master
from update_scene import get_current_scene, set_current_scene
from character import Character, get_character_by_id, get_characters, set_characters, set_character_active, update_character
from gm_persona import get_personas, get_persona_by_id, create_persona, remove_persona, toggle_favorite, set_default_persona, get_default_persona, persona_manager
from ai_utils import set_default_api_key, update_api_key, remove_api_key, get_current_api_key, generate_response
from tts_manager import tts
from api.characters import emit_characters_updated, format_character_for_socket, get_all_characters_data, register_character_rest_api, register_character_socket_handlers, send_socket_response
import base64
from google import genai

# Import logging for voice transcription
from logger_config import setup_logger
logger = setup_logger(__name__)

def get_gm_avatar():
    # Get GM avatar - check if custom GM avatar exists in app config
    gm_avatar = "avatar.jpg"
    gm_avatar_path = f"avatars/gm.png"
    if os.path.exists(os.path.join(app.root_path, 'static/images/', gm_avatar_path)):
        gm_avatar = gm_avatar_path
    return gm_avatar

# Load environment variables
DEFAULT_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
current_language = "English" if os.getenv("LANGUAGE", "en") == "en" else "Russian"

# Set the default API key in ai_utils
set_default_api_key(DEFAULT_GEMINI_API_KEY)

# Ensure avatar directories exist
avatar_dirs = [
    os.path.join(app.root_path, 'static/images'),
    os.path.join(app.root_path, 'static/images/avatars')
]
for directory in avatar_dirs:
    os.makedirs(directory, exist_ok=True)

def restore_messages():
    """Restore message history from server"""
    messages = get_dialogue_history()
    send_socket_message('load_messages', {
        'messages': [message.to_dict() for message in messages]
    })

def emit_game_data():
    # Emit the current game state, including scene, characters, lore
    send_socket_message('scene_updated', {
        'scene': get_current_scene(),
        'lore': get_base_lore()
    })
    
    # Send characters data
    emit_characters_updated()
    
    # Also send all personas
    emit_personas_updated()
    
    # Restore message history from server
    restore_messages()

    emit_tts_voices()

# Socket.IO events for real-time chat
@socketio.on('init')
def handle_init():
    """Handle client connection"""
    print("Client connected")
    
    emit_game_data()

@socketio.on('disconnect')
def handle_disconnect():
    """Handle socket disconnect."""
    print('Client disconnected', request.sid)
    # Remove user's API key when they disconnect
    session_id = request.sid
    remove_api_key(session_id)
    
@socketio.on('gm_message')
def handle_gm_message(data):
    """Handle GM message with optional persona"""
    
    try:
        message_text = data.get('message', '')
        persona_id = data.get('persona_id')
        
        if not persona_id:
            persona_id = get_default_persona()
        
        # If persona ID is provided or found in session, use that persona
        if persona_id:
            persona = get_persona_by_id(persona_id)
            if persona:
                # Update persona usage stats
                persona.use_count += 1
                persona.last_used = int(time.time())
                
                # Create message with persona info
                gm_message = DialogueMessage(persona.name, message_text, persona.avatar, 0, persona_id=persona_id)
                append_to_dialog_history(gm_message)
                
                # Emit new message event
                send_socket_message('new_message', gm_message.to_dict())
    
    except Exception as e:
        print(f"Error in handle_gm_message: {e}")

@socketio.on('gm_continue')
def handle_gm_continue():
    send_socket_message('thinking_started')
    try:
        decide_acting_character_for_master()
    finally:
        send_socket_message('thinking_ended')
        

@socketio.on('update_api_key')
def handle_update_api_key(data):
    api_key = data.get('api_key')
    if api_key:
        # Use the function from ai_utils to update the API key
        session_id = request.sid
        update_api_key(session_id, api_key)
        print(f"Updated API key for session {session_id}")
    else:
        return {'status': 'error', 'message': 'API key is required'}

# Register character-related socket handlers
register_character_socket_handlers(socketio)

@socketio.on('set_current_persona')
def handle_set_current_persona(data):
    """Handle client selecting a persona to use for messages"""
    persona_id = data.get('persona_id')
    
    if not persona_id:
        return {'status': 'error', 'message': 'Persona ID is required'}
    
    # We'll use the session id as a key to store the current persona for each client
    session_id = request.sid
    
    # Store this in the flask session
    if not hasattr(app, 'client_personas'):
        app.client_personas = {}
    
    app.client_personas[session_id] = persona_id
    
    return {'status': 'success', 'message': f'Current persona set to {persona_id}'}

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(os.path.join(app.root_path, 'static'), path)

@app.route('/')
def serve_index():
    return send_from_directory(os.path.join(app.root_path, 'static'), 'index.html')

@socketio.on('save_game')
def handle_save_game(data):
    """Socket.IO event to save the game"""
    request_id = data.get('requestId')
    filepath = data.get('filepath')
    
    if filepath:
        game_state.set_save_file_path(filepath + ".json")
    
    success = game_state.save_game()
    
    if success:
        # Send notification of successful save
        send_socket_message('notification', {
            'type': 'success',
            'message': f'Game saved successfully to {game_state.get_save_file_path()}'
        })
    
    response = {
        "status": "success" if success else "error",
        "filepath": game_state.get_save_file_path()
    }
    
    send_socket_response(request_id, response)

@socketio.on('load_game')
def handle_load_game(data):
    """Socket.IO event to load the game"""
    request_id = data.get('requestId')
    filepath = data.get('filepath')
    
    if filepath:
        game_state.set_save_file_path(filepath + ".json")
    
    success = game_state.load_game()
    
    if success:
        # Notify connected clients about updated game state
        emit_game_data()
        
        # Send notification of successful load
        send_socket_message('notification', {
            'type': 'success',
            'message': f'Game loaded successfully from {game_state.get_save_file_path()}'
        })
    
    response = {
        "status": "success" if success else "error",
        "filepath": game_state.get_save_file_path(),
        "game_state": {
            "scene": get_current_scene(),
            "lore": get_base_lore()
        } if success else {}
    }
    
    send_socket_response(request_id, response)

@socketio.on('update_game_state')
def handle_update_game_state(data):
    """Socket.IO event to update the game state"""
    request_id = data.get('requestId')
    new_scene = data.get('scene')
    new_lore = data.get('lore')
    
    if new_scene:
        set_current_scene(new_scene)
    
    if new_lore is not None:
        set_base_lore(new_lore)
    
    # Notify all clients about the update
    send_socket_message('scene_updated', {
        'scene': get_current_scene(),
        'lore': get_base_lore()
    })

@socketio.on('reset_game')
def handle_reset_game(data=None):
    """Socket.IO event to reset the game"""
    request_id = data.get('requestId') if data else None
    
    # Reset dialogue history
    set_dialog_history([])
    
    set_current_scene("You are in a tavern in the city of Kadera.")
    
    # Reset character memories
    for character in get_characters().values():
        character.clear_memories()
    
    # Notify connected clients about reset game state
    send_socket_message('scene_updated', {
        'scene': get_current_scene(),
        'lore': get_base_lore()
    })

    # save to file
    game_state.save_game()
    
    # Emit an event to clear chat history
    send_socket_message('game_reset')
    
    response = {
        "status": "success",
        "game_state": {
            "scene": get_current_scene(),
            "lore": get_base_lore()
        }
    }

# Register character-related REST API endpoints
register_character_rest_api(app)

# Format a persona object for API responses
def format_persona_for_api(persona):
    """Format a persona object for API responses"""
    return {
        'id': persona.id,
        'name': persona.name,
        'description': persona.description,
        'avatar': persona.avatar,
        'use_count': persona.use_count,
        'last_used': persona.last_used,
        'is_favorite': persona.is_favorite
    }

# Get all personas formatted for API
def get_all_personas_data():
    """Get all personas formatted for API"""
    personas = get_personas()
    personas_data = {}
    
    for persona_id, persona in personas.items():
        personas_data[persona_id] = format_persona_for_api(persona)
    
    return personas_data

# Emit a personas_updated event to all clients
def emit_personas_updated():
    """Emit personas_updated event to all clients"""
    personas_data = get_all_personas_data()
    send_socket_message('personas_updated', {
        'personas': personas_data,
        'default_persona': get_default_persona()
    })

def emit_tts_voices():
    send_socket_message('tts_voices', {
        'voices': tts.get_available_voices()
    })

# New routes for GM Personas

@app.route('/api/get_personas', methods=['GET'])
def get_all_personas():
    """Get all GM personas"""
    return jsonify({
        "status": "success",
        "personas": get_all_personas_data(),
        "default_persona": get_default_persona()
    })

@app.route('/api/create_persona', methods=['POST'])
def api_create_persona():
    """Create a new GM persona"""
    data = request.json
    name = data.get('name')
    description = data.get('description', "")
    avatar = data.get('avatar', "avatar.jpg")
    
    if not name:
        return jsonify({
            "status": "error",
            "message": "Persona name is required"
        }), 400
    
    persona = create_persona(name, description, avatar)
    
    # Emit personas_updated event to all clients
    emit_personas_updated()
    
    return jsonify({
        "status": "success",
        "persona": format_persona_for_api(persona)
    })

@app.route('/api/update_persona', methods=['POST'])
def update_persona():
    """Update an existing GM persona"""
    data = request.json
    persona_id = data.get('id')
    name = data.get('name')
    description = data.get('description')
    avatar = data.get('avatar')
    
    persona = get_persona_by_id(persona_id)
    if not persona:
        return jsonify({
            "status": "error",
            "message": "Persona not found"
        }), 404
    
    if name:
        persona.name = name
    if description is not None:
        persona.description = description
    if avatar:
        persona.avatar = avatar
    
    # Emit personas_updated event to all clients
    emit_personas_updated()
    
    return jsonify({
        "status": "success",
        "persona": format_persona_for_api(persona)
    })

@app.route('/api/delete_persona', methods=['POST'])
def delete_persona():
    """Delete a GM persona"""
    data = request.json
    persona_id = data.get('id')
    
    # Check if it's the default persona
    if persona_id == get_default_persona():
        return jsonify({
            "status": "error",
            "message": "Cannot delete default persona"
        }), 400
    
    success = remove_persona(persona_id)
    
    # Emit personas_updated event to all clients
    emit_personas_updated()
    
    return jsonify({
        "status": "success" if success else "error",
        "message": "Persona deleted" if success else "Failed to delete persona"
    })

@app.route('/api/toggle_persona_favorite', methods=['POST'])
def toggle_persona_favorite():
    """Toggle favorite status for a persona"""
    data = request.json
    persona_id = data.get('id')
    
    is_favorite = toggle_favorite(persona_id)
    
    # Emit personas_updated event to all clients
    emit_personas_updated()
    
    return jsonify({
        "status": "success",
        "is_favorite": is_favorite
    })

@app.route('/api/set_default_persona', methods=['POST'])
def api_set_default_persona():
    """Set the default persona"""
    data = request.json
    persona_id = data.get('id')
    
    success = set_default_persona(persona_id)
    
    # Emit personas_updated event to all clients
    emit_personas_updated()
    
    return jsonify({
        "status": "success" if success else "error",
        "default_persona": get_default_persona()
    })

@socketio.on('get_personas')
def handle_get_personas(data=None):
    """Handle request to get all personas"""
    request_id = data.get('requestId') if data else None
    
    personas = persona_manager.get_all_personas()
    
    # Send response back to client
    if request_id:
        send_socket_response(request_id, {'personas': personas})
    else:
        send_socket_message('personas', {'personas': personas})

@socketio.on('tts_voice_test')
def handle_tts_voice_test(data):
    """Handle request to test TTS voice"""
    if not data:
        return
    print(f"Testing TTS voice {data.get('voice_id')}")
    tts.speak_text("This is a test of the TTS voice" if os.environ.get("LANGUAGE", "en") == "en" else "Это тестовая проверка голоса TTS", voice=data.get('voice_id'))

@socketio.on('create_persona')
def handle_create_persona(data):
    """Handle request to create a new persona"""
    if not data:
        return
    
    request_id = data.get('requestId')
    
    # Create the persona
    new_persona = persona_manager.create_persona({
        'name': data.get('name', 'New Persona'),
        'description': data.get('description', ''),
        'avatar': data.get('avatar', 'images/avatar.jpg'),
        'isDefault': data.get('isDefault', False),
        'isFavorite': data.get('isFavorite', False)
    })
    
    # Send response back to client
    if request_id:
        send_socket_response(request_id, {'persona': new_persona})
    
    # Notify all clients that personas have been updated
    emit_personas_updated()

@socketio.on('update_persona')
def handle_update_persona(data):
    """Handle request to update an existing persona"""
    if not data:
        return
    
    request_id = data.get('requestId')
    persona_id = data.get('persona_id')
    
    if not persona_id:
        if request_id:
            send_socket_response(request_id, {'error': 'No persona ID provided'})
        return
    
    # Update fields
    updates = {}
    for field in ['name', 'description', 'avatar', 'isDefault', 'isFavorite']:
        if field in data:
            updates[field] = data[field]
    
    # Update the persona
    updated_persona = persona_manager.update_persona(persona_id, updates)
    
    # Send response back to client
    if request_id:
        if updated_persona:
            send_socket_response(request_id, {'persona': updated_persona})
        else:
            send_socket_response(request_id, {'error': 'Persona not found'})
    
    # Notify all clients that personas have been updated
    emit_personas_updated()

@socketio.on('delete_persona')
def handle_delete_persona(data):
    """Handle request to delete a persona"""
    if not data:
        return
    
    request_id = data.get('requestId')
    persona_id = data.get('persona_id')
    
    if not persona_id:
        if request_id:
            send_socket_response(request_id, {'error': 'No persona ID provided'})
        return
    
    # Delete the persona
    success = persona_manager.delete_persona(persona_id)
    
    # Send response back to client
    if request_id:
        send_socket_response(request_id, {'success': success})
    
    # Notify all clients that personas have been updated
    emit_personas_updated()

@socketio.on('set_default_persona')
def handle_set_default_persona(data):
    """Handle request to set a persona as default"""
    if not data:
        return
    
    request_id = data.get('requestId')
    persona_id = data.get('persona_id')
    
    if not persona_id:
        if request_id:
            send_socket_response(request_id, {'error': 'No persona ID provided'})
        return
    
    # Set the persona as default
    success = persona_manager.set_default_persona(persona_id)
    
    # Send response back to client
    if request_id:
        send_socket_response(request_id, {'success': success})
    
    emit_personas_updated()

@socketio.on('switch_persona')
def handle_switch_persona(data):
    """Handle request to switch to a different persona"""
    if not data:
        return
    
    request_id = data.get('requestId')
    persona_id = data.get('persona_id')
    
    if not persona_id:
        if request_id:
            send_socket_response(request_id, {'error': 'No persona ID provided'})
        return
    
    # Switch to the persona
    success = persona_manager.switch_persona(persona_id)
    
    # Send response back to client
    if request_id:
        send_socket_response(request_id, {'success': success})
    
    # Send the current persona to all clients
    current_persona = persona_manager.get_current_persona()
    if current_persona:
        send_socket_message('current_persona_updated', {'current_persona': current_persona})

@app.route('/api/upload_persona_avatar', methods=['POST'])
def upload_persona_avatar():
    """Handle avatar upload for personas"""
    if 'avatar' not in request.files:
        return jsonify({"error": "No avatar file provided"}), 400
    
    file = request.files['avatar']
    persona_id = request.form.get('persona_id')
    
    if not file or not persona_id:
        return jsonify({"error": "Missing required parameters"}), 400
    
    # Check if the persona exists
    persona = persona_manager.get_persona(persona_id)
    if not persona:
        return jsonify({"error": "Persona not found"}), 404
    
    # Save the file to a temporary location
    temp_path = os.path.join(app.root_path, '/tmp', f"temp_{uuid.uuid4()}.png")
    os.makedirs(os.path.dirname(temp_path), exist_ok=True)
    file.save(temp_path)
    
    print(f"Saving avatar to {temp_path} for persona {persona_id}")
    # Use the persona manager to save the avatar
    avatar_url = persona_manager.save_avatar(persona_id, temp_path)
    
    # Clean up the temporary file
    if os.path.exists(temp_path):
        os.remove(temp_path)
    
    print(f"Avatar saved to {avatar_url}")
    if not avatar_url:
        return jsonify({"error": "Failed to save avatar"}), 500
    
    emit_personas_updated()

    return jsonify({"avatar_url": avatar_url})

# Voice transcription endpoint
@socketio.on('voice_transcribe')
def handle_voice_transcription(data):
    try:
        audio_data = data.get('audio')
        if not audio_data:
            send_socket_message('voice_transcription_result', {
                'success': False, 
                'error': 'No audio data provided'
            })
            return
        
        # Notify client that we're starting transcription
        send_socket_message('thinking_started')
        
        # Decode the base64 audio data
        try:
            # Split if it's a data URL (e.g., data:audio/webm;base64,...)
            if ',' in audio_data:
                header, encoded_data = audio_data.split(',', 1)
                mime_type = header.split(':')[1].split(';')[0] if ':' in header else 'audio/webm'
            else:
                encoded_data = audio_data
                mime_type = 'audio/webm'  # Default mime type
                
            audio_bytes = base64.b64decode(encoded_data)
            
        except Exception as e:
            logger.error(f"Error decoding audio data: {str(e)}")
            send_socket_message('thinking_stopped')
            send_socket_message('voice_transcription_result', {
                'success': False, 
                'error': f'Error decoding audio: {str(e)}'
            })
            return
        
        # Generate content with Gemini using the audio data
        try:
            response = generate_response(
                [
                    f"Transcribe the following audio to text. Return only the transcribed text without any additional explanation. The language is {current_language}.",
                    genai.types.Part.from_bytes(
                        data=audio_bytes,
                        mime_type=mime_type
                    )
                ]
            )
            
            # Notify client that thinking has stopped
            send_socket_message('thinking_stopped')
            
            # Return the transcribed text to the client
            send_socket_message('voice_transcription_result', {
                'success': True,
                'text': response.text
            })
            
        except Exception as e:
            logger.error(f"Error in Gemini transcription: {str(e)}")
            send_socket_message('thinking_stopped')
            send_socket_message('voice_transcription_result', {
                'success': False, 
                'error': f'Error in transcription: {str(e)}'
            })
            
    except Exception as e:
        logger.error(f"Error in voice transcription: {str(e)}")
        send_socket_message('thinking_stopped')
        send_socket_message('voice_transcription_result', {
            'success': False,
            'error': str(e)
        })

if __name__ == '__main__':
    socketio.run(app, debug=False, host='0.0.0.0', port=5000, use_reloader=False, log_output=False)
    