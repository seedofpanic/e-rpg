import uuid
from dotenv import load_dotenv
load_dotenv()

import os
import time
from flask import render_template, request, jsonify, url_for, send_from_directory
import google.generativeai as genai
import speech_recognition as sr
from base_lore import get_base_lore, set_base_lore
from dialog_history import DialogueMessage, append_to_dialog_history, get_dialogue_history, set_dialog_history
from game_state import game_state
from app_socket import send_socket_message, app, socketio
from message_analyzers import decide_acting_character_for_master
from update_scene import get_current_scene, set_current_scene
from character import Character, get_character_by_id, get_characters, set_characters, set_character_active, get_active_characters
from gm_persona import get_personas, get_persona_by_id, create_persona, remove_persona, toggle_favorite, set_default_persona, get_default_persona, persona_manager
from ai_utils import set_default_api_key, update_api_key, remove_api_key

# Helper function for Socket.IO responses to handle request/response pattern
def send_socket_response(request_id, payload):
    """Send a response to a client request via socket.io"""
    if request_id:
        send_socket_message('response', {
            'requestId': request_id,
            'payload': payload
        })

# Helper functions for character data
def format_character_for_api(character):
    """Format a character object for API responses"""
    return {
        'id': character.id,
        'name': character.name,
        'class': character.char_class,
        'race': character.race,
        'personality': character.personality,
        'background': character.background,
        'motivation': character.motivation,
        'is_leader': character.is_leader,
        'active': character.active,
        'avatar': character.avatar,
        'ability_scores': character.ability_scores,
        'inventory': character.inventory,
        'gold': character.gold
    }

def format_character_for_socket(character):
    """Format a character object for Socket.IO events (streamlined version)"""
    return {
        'id': character.id,
        'name': character.name,
        'class': character.char_class,
        'race': character.race,
        'is_leader': character.is_leader,
        'active': character.active,
        'avatar': character.avatar,
        'gold': character.gold,
        'inventory': character.inventory
    }

def get_all_characters_data(for_socket=False):
    """Get all characters formatted for API or Socket.IO"""
    characters = get_characters()
    characters_data = {}
    
    formatter = format_character_for_socket if for_socket else format_character_for_api
    
    for char_id, char in characters.items():
        characters_data[char_id] = formatter(char)
    
    return characters_data

def emit_characters_updated():
    """Emit characters_updated event to all clients"""
    characters_data = get_all_characters_data(for_socket=True)
    send_socket_message('characters_updated', {
        'characters': characters_data
    })

def get_gm_avatar():
    # Get GM avatar - check if custom GM avatar exists in app config
    gm_avatar = "avatar.jpg"
    gm_avatar_path = f"avatars/gm.png"
    if os.path.exists(os.path.join(app.root_path, 'ui/public/images/', gm_avatar_path)):
        gm_avatar = gm_avatar_path
    return gm_avatar

# Load environment variables
DEFAULT_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Set the default API key in ai_utils
set_default_api_key(DEFAULT_GEMINI_API_KEY)

# Configure Google Gemini API with default key
genai.configure(api_key=DEFAULT_GEMINI_API_KEY)

# Ensure avatar directories exist
avatar_dirs = [
    os.path.join(app.root_path, 'ui/public/images'),
    os.path.join(app.root_path, 'ui/public/images/avatars')
]
for directory in avatar_dirs:
    os.makedirs(directory, exist_ok=True)

# Add a route to serve images from the /images URL path
@app.route('/images/<path:filename>')
def serve_images(filename):
    """Serve images from the ui/public/images directory"""
    return send_from_directory(os.path.join(app.root_path, 'ui/public/images'), filename)

# Define the React app path for production
REACT_BUILD_PATH = os.path.join(app.root_path, 'react_build')

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react_app(path):
    # For production: serve the React app from the build directory
    if os.path.exists(REACT_BUILD_PATH):
        # If the path is empty, serve the React index.html
        if not path:
            return send_from_directory(REACT_BUILD_PATH, 'index.html')
        
        # Check if the requested file exists
        if os.path.exists(os.path.join(REACT_BUILD_PATH, path)):
            return send_from_directory(REACT_BUILD_PATH, path)
        
        # For React router, return index.html for all non-file paths
        return send_from_directory(REACT_BUILD_PATH, 'index.html')
    
    # For development or if React build doesn't exist: serve the Flask template
    # Convert characters dictionary to format expected by the template
    char_data = {}
    characters = get_characters()
    for char_id, char in characters.items():
        # Check if avatar file exists
        avatar = char.get_avatar_url()
        
        char_data[char_id] = {
            "name": char.name,
            "class": char.char_class,
            "race": char.race,
            "personality": char.personality,
            "background": char.background,
            "avatar": avatar,
            "is_leader": char.is_leader,
            "active": char.active
        }
    
    gm_avatar = get_gm_avatar()
    
    return render_template('index.html', 
                          characters=char_data,
                          gm_avatar=gm_avatar,
                          current_scene=get_current_scene(),
                          base_lore=get_base_lore(),
                          save_file_path=game_state.get_save_file_path())

@app.route('/api/voice_input', methods=['POST'])
def voice_input():
    # Initialize recognizer
    r = sr.Recognizer()
    
    # Capture audio from microphone
    with sr.Microphone() as source:
        r.adjust_for_ambient_noise(source)
        audio = r.listen(source)
    
    try:
        # Convert speech to text
        text = r.recognize_google(audio)
        return jsonify({"text": text})
    except sr.UnknownValueError:
        return jsonify({"error": "Could not understand audio"})
    except sr.RequestError:
        return jsonify({"error": "Could not request results"})

@app.route('/api/update_game_state', methods=['POST'])
def update_game_state():
    data = request.json
    new_scene = data.get('scene')
    new_lore = data.get('lore')
    
    if new_scene:
        set_current_scene(new_scene)
    
    if new_lore is not None:
        set_base_lore(new_lore)
    
    return jsonify({
        "status": "success", 
        "game_state": {
            "scene": get_current_scene(),
            "lore": get_base_lore()
        }
    })

@app.route('/api/save_game', methods=['POST'])
def save_game():
    data = request.json
    filepath = data.get('filepath')
    
    if filepath:
        game_state.set_save_file_path(filepath)
    
    success = game_state.save_game()
    
    if success:
        # Send notification of successful save
        send_socket_message('notification', {
            'type': 'success',
            'message': f'Game saved successfully to {game_state.get_save_file_path()}'
        })
    
    return jsonify({
        "status": "success" if success else "error",
        "filepath": game_state.get_save_file_path()
    })

def restore_messages():
    history = get_dialogue_history(1000)  # Get a reasonable number of messages
    if history:
        # Send all messages at once instead of one by one
        messages = [msg.to_dict() for msg in history]
        send_socket_message('load_messages', messages)

@app.route('/api/load_game', methods=['POST'])
def load_game():
    data = request.json
    filepath = data.get('filepath')
    
    if filepath:
        game_state.set_save_file_path(filepath)
    
    success = game_state.load_game()
    print(f"Loaded game from {filepath} {success}")
    
    if success:
        # Notify connected clients about updated game state
        send_socket_message('scene_updated', {
            'scene': get_current_scene(),
            'lore': get_base_lore()
        })
        
        # Also emit an event with all loaded dialogue history
        restore_messages()
        
        # Emit persona update to ensure UI gets latest personas from restored game
        emit_personas_updated()
        
        # Send notification of successful load
        send_socket_message('notification', {
            'type': 'success',
            'message': f'Game loaded successfully from {game_state.get_save_file_path()}'
        })
    
    return jsonify({
        "status": "success" if success else "error",
        "filepath": game_state.get_save_file_path(),
        "game_state": {
            "scene": get_current_scene(),
            "lore": get_base_lore()
        } if success else {}
    })

@app.route('/api/get_save_file_path', methods=['GET'])
def get_save_file_path():
    return jsonify({
        "filepath": game_state.get_save_file_path()
    })

@app.route('/api/get_autosave_status', methods=['GET'])
def get_autosave_status():
    is_debug = app.debug or os.environ.get('FLASK_DEBUG', '').lower() in ('true', '1', 't')
    
    return jsonify({
        "status": "success",
        "enabled": game_state.is_autosave_enabled(),
        "debug_mode": is_debug,
        "message": "Autosave is disabled in debug mode" if is_debug else ""
    })

@app.route('/api/get_autosave_settings', methods=['GET'])
def get_autosave_settings():
    return jsonify({
        "enabled": game_state.is_autosave_enabled(),
        "threshold": game_state.get_autosave_threshold()
    })

@app.route('/api/update_autosave_settings', methods=['POST'])
def update_autosave_settings():
    data = request.json
    enabled = data.get('enabled')
    threshold = data.get('threshold')
    
    # Check if we're in debug mode
    if app.debug or os.environ.get('FLASK_DEBUG', '').lower() in ('true', '1', 't'):
        # Force autosave to be disabled in debug mode
        game_state.disable_autosave()
        
        return jsonify({
            "status": "warning",
            "message": "Autosave is always disabled in debug mode",
            "enabled": False,
            "settings": {
                "enabled": False,
                "threshold": game_state.get_autosave_threshold()
            }
        })
    
    # Not in debug mode, process normally
    if enabled is not None:
        if enabled:
            game_state.enable_autosave()
        else:
            game_state.disable_autosave()
    
    if threshold is not None and isinstance(threshold, int) and threshold > 0:
        game_state.set_autosave_threshold(threshold)
    
    return jsonify({
        "status": "success",
        "enabled": game_state.is_autosave_enabled(),
        "settings": {
            "enabled": game_state.is_autosave_enabled(),
            "threshold": game_state.get_autosave_threshold()
        }
    })

@app.route('/api/reset_game', methods=['POST'])
def reset_game():
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
    
    return jsonify({
        "status": "success",
        "game_state": {
            "scene": get_current_scene(),
            "lore": get_base_lore()
        }
    })

# Socket.IO events for real-time chat
@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print("Client connected")
    
    # Emit the current game state, including scene, characters, lore
    send_socket_message('scene_updated', {
        'scene': get_current_scene(),
        'lore': get_base_lore()
    })
    
    # Send the save file path to the client
    save_path = game_state.get_save_file_path()
    send_socket_message('save_file_path', {
        'filepath': save_path
    })
    
    # Send characters data
    emit_characters_updated()
    
    # Also send all personas
    emit_personas_updated()
    
    # Restore message history from server
    restore_messages()

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')
    # Remove user's API key when they disconnect
    session_id = request.sid
    remove_api_key(session_id)

@socketio.on('gm_message')
def handle_gm_message(data):
    """Handle GM message with optional persona"""
    
    try:
        message_text = data.get('message', '')
        persona_id = data.get('persona_id')
        
        # If persona_id is not provided in the message data, check if we have a stored persona for this client
        if not persona_id and hasattr(app, 'client_personas'):
            session_id = request.sid
            persona_id = app.client_personas.get(session_id)
        
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
        else:
            # Default behavior if no persona was specified or found
            gm_message = DialogueMessage("Game Master", message_text, get_gm_avatar(), "0")
            append_to_dialog_history(gm_message)
            send_socket_message('new_message', gm_message.to_dict())

        # Process the message
        if data.get('continue'):
            decide_acting_character_for_master()
    
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

@socketio.on('roll_skill')
def handle_roll_skill(data):
    character_id = data.get('character_id')
    skill_name = data.get('skill_name')
    
    if not character_id or not skill_name:
        return {'status': 'error', 'message': 'Character ID and skill name are required'}
    
    character = get_character_by_id(character_id)
    if not character:
        return {'status': 'error', 'message': 'Character not found'}
    
    # Perform the skill roll
    result = character.roll_skill(skill_name)
    return {'status': 'success'}

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

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(os.path.join(app.root_path, 'ui/public/images/avatars'), filename)

@socketio.on('get_save_file_path')
def handle_get_save_file_path(data=None):
    """Handle request for current save file path"""
    request_id = data.get('requestId') if data else None
    filepath = game_state.get_save_file_path()
    
    send_socket_response(request_id, {
        'filepath': filepath
    })

@socketio.on('get_autosave_status')
def handle_get_autosave_status(data=None):
    """Socket.IO event to get autosave status"""
    request_id = data.get('requestId') if data else None
    
    is_debug = app.debug or os.environ.get('FLASK_DEBUG', '').lower() in ('true', '1', 't')
    
    response = {
        "status": "success",
        "enabled": game_state.is_autosave_enabled(),
        "debug_mode": is_debug,
        "message": "Autosave is disabled in debug mode" if is_debug else ""
    }
    
    send_socket_response(request_id, response)

@socketio.on('save_game')
def handle_save_game(data):
    """Socket.IO event to save the game"""
    request_id = data.get('requestId')
    filepath = data.get('filepath')
    
    if filepath:
        game_state.set_save_file_path(filepath)
    
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
        game_state.set_save_file_path(filepath)
    
    success = game_state.load_game()
    print(f"Loaded game from {filepath} {success}")
    
    if success:
        # Notify connected clients about updated game state
        send_socket_message('scene_updated', {
            'scene': get_current_scene(),
            'lore': get_base_lore()
        })
        
        # Also emit an event with all loaded dialogue history
        restore_messages()
        
        # Emit persona update to ensure UI gets latest personas from restored game
        emit_personas_updated()
        
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

@socketio.on('get_characters')
def handle_get_characters(data=None):
    """Socket.IO event to get all characters"""
    request_id = data.get('requestId') if data else None
    
    response = {
        'status': 'success',
        'characters': get_all_characters_data()
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
    
    response = {
        "status": "success", 
        "game_state": {
            "scene": get_current_scene(),
            "lore": get_base_lore()
        }
    }
    
    send_socket_response(request_id, response)
    
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
    
@app.route('/api/update_characters', methods=['POST'])
def update_characters():
    data = request.json
    if not data or not data.get('characters'):
        return jsonify({
            'status': 'error',
            'error': 'No character data provided'
        }), 400
    
    new_characters = data['characters']
    
    # Create new characters dictionary
    updated_characters = {}
    characters = get_characters()
    
    for char_id, char_data in new_characters.items():
        # Check if character already exists
        existing_character = characters.get(char_id)
        
        # Create or update character
        updated_characters[char_id] = Character(
            char_id=char_id,
            name=char_data['name'],
            char_class=char_data['class'],
            race=char_data['race'],
            personality=char_data['personality'],
            background=char_data['background'],
            motivation=char_data['motivation'],
            is_leader=char_data['is_leader'],
            # Use existing avatar if character exists, otherwise default
            avatar=existing_character.avatar if existing_character else "",
            strength=char_data['ability_scores']['strength'],
            dexterity=char_data['ability_scores']['dexterity'],
            constitution=char_data['ability_scores']['constitution'],
            intelligence=char_data['ability_scores']['intelligence'],
            wisdom=char_data['ability_scores']['wisdom'],
            charisma=char_data['ability_scores']['charisma'],
            # Set active state from the character data, default to True if not provided
            active=char_data.get('active', True)
        )
        
        # Set additional attributes that aren't in the constructor
        if 'skill_proficiencies' in char_data:
            updated_characters[char_id].skill_proficiencies = char_data['skill_proficiencies']
        
        # Set max_hp and current_hp if provided
        if 'max_hp' in char_data:
            updated_characters[char_id].max_hp = char_data['max_hp']
        if 'current_hp' in char_data:
            updated_characters[char_id].current_hp = char_data['current_hp']
        
        # Set armor_class if provided
        if 'armor_class' in char_data:
            updated_characters[char_id].armor_class = char_data['armor_class']
        
        # Set proficiency_bonus if provided
        if 'proficiency_bonus' in char_data:
            updated_characters[char_id].proficiency_bonus = char_data['proficiency_bonus']
    
    # Replace the global characters dictionary
    set_characters(updated_characters)
    
    # Emit characters_updated event to all clients
    emit_characters_updated()
    
    return jsonify({
        'status': 'success',
        'message': 'Characters updated successfully'
    })

@app.route('/api/avatars', methods=['POST'])
def upload_avatar():
    if 'avatar' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['avatar']
    character_id = request.form.get('character_id')
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file:
        # Create directory if it doesn't exist
        avatar_dir = os.path.join(app.root_path, 'ui/public/images/avatars')
        os.makedirs(avatar_dir, exist_ok=True)

        print(f"Uploading avatar for {character_id} {file.filename}")
        
        if character_id == None:
            # Generate a unique filename to prevent conflicts
            filename = file.filename
            unique_filename = f"{uuid.uuid4()}.{file.filename.split('.')[-1]}"
            # Save the file
            file_path = os.path.join(avatar_dir, unique_filename)
            file.save(file_path)
            
            return jsonify({
                "status": "success",
                "avatar_path": f"avatars/{unique_filename}",
                "url": url_for('uploaded_file', filename=unique_filename)
            })
        elif character_id == 'gm':
            # Handle GM avatar upload
            filename = f"gm.png"
            # Save the file
            file_path = os.path.join(avatar_dir, filename)
            file.save(file_path)
            
            return jsonify({
                "status": "success",
                "avatar_path": f"avatars/{filename}",
                "url": url_for('uploaded_file', filename=filename)
            })
        elif character_id in get_characters():
            # Handle character avatar upload
            filename = file.filename
            
            # Save the file
            file_path = os.path.join(avatar_dir, filename)
            file.save(file_path)
            get_character_by_id(character_id).set_avatar(filename)

            # Update all clients about the character update
            emit_characters_updated()
            
            # Update character avatar path
            relative_path = f"avatars/{filename}"
            
            return jsonify({
                "status": "success",
                "avatar_path": relative_path,
                "url": url_for('uploaded_file', filename=filename)
            })
        else:
            return jsonify({"error": f"Invalid character ID: {character_id}"}), 404
    
    return jsonify({"error": "File upload failed"}), 500

@socketio.on('toggle_character_active')
def handle_toggle_character_active(data):
    """Socket.IO event to toggle a character's active state"""
    request_id = data.get('requestId')
    character_id = data.get('character_id')
    
    if not character_id:
        response = {
            'status': 'error',
            'error': 'No character ID provided'
        }
        send_socket_response(request_id, response)
        return
    
    # Get the character
    character = get_character_by_id(character_id)
    if not character:
        response = {
            'status': 'error',
            'error': f"Character '{character_id}' not found"
        }
        send_socket_response(request_id, response)
        return
    
    # Toggle the active state (flip the current value)
    new_active_state = not character.active
    
    # Update character active state
    result = set_character_active(character_id, new_active_state)
    
    if result:
        # Emit characters_updated event to all clients
        emit_characters_updated()
        
        response = {
            'status': 'success',
            'message': f"Character '{character_id}' active state set to {new_active_state}",
            'active': new_active_state
        }
    else:
        response = {
            'status': 'error',
            'error': f"Failed to update character '{character_id}'"
        }
    
    send_socket_response(request_id, response)

@socketio.on('update_characters')
def handle_update_characters(data):
    """Socket.IO event to update characters"""
    request_id = data.get('requestId')
    new_characters = data.get('characters')
    
    if not new_characters:
        response = {
            'status': 'error',
            'error': 'No character data provided'
        }
        send_socket_response(request_id, response)
        return
    
    # Create new characters dictionary
    updated_characters = {}
    characters = get_characters()
    
    for char_id, char_data in new_characters.items():
        # Check if character already exists
        existing_character = characters.get(char_id)
        
        # Create or update character
        updated_characters[char_id] = Character(
            char_id=char_id,
            name=char_data['name'],
            char_class=char_data['class'],
            race=char_data['race'],
            personality=char_data['personality'],
            background=char_data['background'],
            motivation=char_data['motivation'],
            is_leader=char_data['is_leader'],
            # Use existing avatar if character exists, otherwise default
            avatar=existing_character.avatar if existing_character else "",
            strength=char_data['ability_scores']['strength'],
            dexterity=char_data['ability_scores']['dexterity'],
            constitution=char_data['ability_scores']['constitution'],
            intelligence=char_data['ability_scores']['intelligence'],
            wisdom=char_data['ability_scores']['wisdom'],
            charisma=char_data['ability_scores']['charisma'],
            # Set active state from the character data, default to True if not provided
            active=char_data.get('active', True)
        )
        
        # Set additional attributes that aren't in the constructor
        if 'skill_proficiencies' in char_data:
            updated_characters[char_id].skill_proficiencies = char_data['skill_proficiencies']
        
        # Set max_hp and current_hp if provided
        if 'max_hp' in char_data:
            updated_characters[char_id].max_hp = char_data['max_hp']
        if 'current_hp' in char_data:
            updated_characters[char_id].current_hp = char_data['current_hp']
        
        # Set armor_class if provided
        if 'armor_class' in char_data:
            updated_characters[char_id].armor_class = char_data['armor_class']
        
        # Set proficiency_bonus if provided
        if 'proficiency_bonus' in char_data:
            updated_characters[char_id].proficiency_bonus = char_data['proficiency_bonus']
    
    # Replace the global characters dictionary
    set_characters(updated_characters)
    
    # Emit characters_updated event to all clients
    emit_characters_updated()
    
    response = {
        'status': 'success',
        'message': 'Characters updated successfully'
    }
    
    send_socket_response(request_id, response)

@socketio.on('delete_character')
def handle_delete_character(data):
    """Socket.IO event to delete a character"""
    request_id = data.get('requestId')
    character_id = data.get('character_id')
    
    if not character_id:
        response = {
            'status': 'error',
            'error': 'No character ID provided'
        }
        send_socket_response(request_id, response)
        return
    
    # Get current characters
    characters = get_characters()
    
    # Check if character exists
    if character_id not in characters:
        response = {
            'status': 'error',
            'error': f"Character '{character_id}' not found"
        }
        send_socket_response(request_id, response)
        return
    
    # Remove the character
    del characters[character_id]
    
    # Update the characters dictionary
    set_characters(characters)
    
    # Emit characters_updated event to all clients
    emit_characters_updated()
    
    response = {
        'status': 'success',
        'message': f"Character '{character_id}' deleted successfully"
    }
    
    send_socket_response(request_id, response)

# Format a persona object for API responses
def format_persona_for_api(persona):
    """Format a persona object for API responses"""
    return {
        'id': persona.id,
        'name': persona.name,
        'description': persona.description,
        'avatar': get_gm_avatar() if persona.id == 'gm' else persona.avatar,
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

@app.route('/api/character/inventory', methods=['GET'])
def get_character_inventory():
    character_id = request.args.get('character_id')
    if not character_id:
        return jsonify({"error": "Character ID is required"}), 400
    
    character = get_character_by_id(character_id)
    if not character:
        return jsonify({"error": "Character not found"}), 404
    
    return jsonify({
        "status": "success",
        "inventory": character.inventory
    })

@app.route('/api/character/inventory/add', methods=['POST'])
def add_character_inventory_item():
    data = request.json
    character_id = data.get('character_id')
    item_name = data.get('item_name')
    item_description = data.get('item_description', '')
    item_quantity = data.get('item_quantity', 1)
    
    if not character_id or not item_name:
        return jsonify({"error": "Character ID and item name are required"}), 400
    
    character = get_character_by_id(character_id)
    if not character:
        return jsonify({"error": "Character not found"}), 404
    
    character.add_item_to_inventory(item_name, item_description, item_quantity)
    emit_characters_updated()
    
    return jsonify({
        "status": "success",
        "inventory": character.inventory
    })

@app.route('/api/character/inventory/remove', methods=['POST'])
def remove_character_inventory_item():
    data = request.json
    character_id = data.get('character_id')
    item_name = data.get('item_name')
    item_quantity = data.get('item_quantity', 1)
    
    if not character_id or not item_name:
        return jsonify({"error": "Character ID and item name are required"}), 400
    
    character = get_character_by_id(character_id)
    if not character:
        return jsonify({"error": "Character not found"}), 404
    
    result = character.remove_item_from_inventory(item_name, item_quantity)
    emit_characters_updated()
    
    return jsonify({
        "status": "success" if result else "error",
        "message": "Item removed" if result else "Item not found in inventory",
        "inventory": character.inventory
    })

@app.route('/api/character/inventory/update', methods=['POST'])
def update_character_inventory_item():
    data = request.json
    character_id = data.get('character_id')
    item_name = data.get('item_name')
    new_name = data.get('new_name')
    new_description = data.get('new_description')
    new_quantity = data.get('new_quantity')
    
    if not character_id or not item_name:
        return jsonify({"error": "Character ID and item name are required"}), 400
    
    character = get_character_by_id(character_id)
    if not character:
        return jsonify({"error": "Character not found"}), 404
    
    result = character.update_item_in_inventory(item_name, new_name, new_description, new_quantity)
    emit_characters_updated()
    
    return jsonify({
        "status": "success" if result else "error",
        "message": "Item updated" if result else "Item not found in inventory",
        "inventory": character.inventory
    })

@app.route('/api/character/gold', methods=['GET'])
def get_character_gold():
    character_id = request.args.get('character_id')
    if not character_id:
        return jsonify({"error": "Character ID is required"}), 400
    
    character = get_character_by_id(character_id)
    if not character:
        return jsonify({"error": "Character not found"}), 404
    
    return jsonify({
        "status": "success",
        "gold": character.gold
    })

@app.route('/api/character/gold/update', methods=['POST'])
def update_character_gold():
    data = request.json
    character_id = data.get('character_id')
    gold_amount = data.get('gold_amount')
    
    if not character_id or gold_amount is None:
        return jsonify({"error": "Character ID and gold amount are required"}), 400
    
    character = get_character_by_id(character_id)
    if not character:
        return jsonify({"error": "Character not found"}), 404
    
    character.set_gold(gold_amount)
    emit_characters_updated()
    
    return jsonify({
        "status": "success",
        "gold": character.gold
    })

@app.route('/api/character/gold/add', methods=['POST'])
def add_character_gold():
    data = request.json
    character_id = data.get('character_id')
    gold_amount = data.get('gold_amount', 0)
    
    if not character_id or gold_amount <= 0:
        return jsonify({"error": "Character ID and positive gold amount are required"}), 400
    
    character = get_character_by_id(character_id)
    if not character:
        return jsonify({"error": "Character not found"}), 404
    
    character.add_gold(gold_amount)
    emit_characters_updated()
    
    return jsonify({
        "status": "success",
        "gold": character.gold
    })

@app.route('/api/character/gold/remove', methods=['POST'])
def remove_character_gold():
    data = request.json
    character_id = data.get('character_id')
    gold_amount = data.get('gold_amount', 0)
    
    if not character_id or gold_amount <= 0:
        return jsonify({"error": "Character ID and positive gold amount are required"}), 400
    
    character = get_character_by_id(character_id)
    if not character:
        return jsonify({"error": "Character not found"}), 404
    
    result = character.remove_gold(gold_amount)
    emit_characters_updated()
    
    return jsonify({
        "status": "success" if result else "error",
        "message": "Gold removed" if result else "Insufficient gold",
        "gold": character.gold
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
    send_socket_message('personas_updated', {'personas': persona_manager.get_all_personas()})

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
    if updated_persona:
        send_socket_message('personas_updated', {'personas': persona_manager.get_all_personas()})

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
    if success:
        send_socket_message('personas_updated', {'personas': persona_manager.get_all_personas()})

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
    
    # Notify all clients that personas have been updated
    if success:
        send_socket_message('personas_updated', {'personas': persona_manager.get_all_personas()})

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
    
    # Use the persona manager to save the avatar
    avatar_url = persona_manager.save_avatar(persona_id, temp_path)
    
    # Clean up the temporary file
    if os.path.exists(temp_path):
        os.remove(temp_path)
    
    if not avatar_url:
        return jsonify({"error": "Failed to save avatar"}), 500
    
    return jsonify({"avatar_url": avatar_url})
