import os
import time
from flask import request, jsonify, url_for
from app_socket import send_socket_message, app
from character import Character, get_character_by_id, get_characters, set_characters, set_character_active, update_character

def format_character_for_socket(character):
    """Format a character object for Socket.IO events (streamlined version)"""
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
        'gold': character.gold,
        'voice_id': character.voice_id,
        'current_hp': character.current_hp,
        'max_hp': character.max_hp
    }

def get_all_characters_data():
    """Get all characters formatted for API or Socket.IO"""
    characters = get_characters()
    characters_data = {}
    
    for char_id, char in characters.items():
        characters_data[char_id] = format_character_for_socket(char)
    
    return characters_data

def emit_characters_updated():
    """Emit characters_updated event to all clients"""
    characters_data = get_all_characters_data()
    send_socket_message('characters_updated', {
        'characters': characters_data
    })

# Helper function for Socket.IO responses to handle request/response pattern
def send_socket_response(request_id, payload):
    """Send a response to a client request via socket.io"""
    if request_id:
        send_socket_message('response', {
            'requestId': request_id,
            'payload': payload
        })

# Character REST API endpoints
def register_character_rest_api(app):
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
            avatar_dir = os.path.join(app.root_path, 'static/images/avatars')
            os.makedirs(avatar_dir, exist_ok=True)

            print(f"Uploading avatar for {character_id} {file.filename}")
            
            if character_id in get_characters():
                # Handle character avatar upload
                # Generate a unique filename with timestamp to prevent conflicts and caching
                file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'png'
                unique_filename = f"character_{character_id}_{int(time.time())}.{file_ext}"
                
                # Save the file
                file_path = os.path.join(avatar_dir, unique_filename)
                file.save(file_path)
                character = get_character_by_id(character_id)
                print(f"Character {character_id} avatar set to {unique_filename}")
                if character:
                    character.set_avatar(unique_filename)

                # Update all clients about the character update
                emit_characters_updated()
                
                # Update character avatar path
                relative_path = f"avatars/{unique_filename}"
                
                return jsonify({
                    "status": "success",
                    "avatar_path": relative_path,
                    "url": url_for('uploaded_file', filename=unique_filename)
                })
            else:
                return jsonify({"error": f"Invalid character ID: {character_id}"}), 404
        
        return jsonify({"error": "File upload failed"}), 500

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

# Character WebSocket endpoints
def register_character_socket_handlers(socketio):
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
        characters = get_characters()
        
        for char_id, char_data in new_characters.items():
            # Check if character already exists
            existing_character = characters.get(char_id)
            
            # Create or update character
            updated_character = Character(
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
                active=char_data.get('active', True),
                # Set voice_id from the character data
                voice_id=char_data.get('voice_id')
            )
            
            # Set additional attributes that aren't in the constructor
            if 'skill_proficiencies' in char_data:
                updated_character.skill_proficiencies = char_data['skill_proficiencies']
            
            # Set max_hp and current_hp if provided
            if 'max_hp' in char_data:
                updated_character.max_hp = char_data['max_hp']
            if 'current_hp' in char_data:
                updated_character.current_hp = char_data['current_hp']
            
            # Set armor_class if provided
            if 'armor_class' in char_data:
                updated_character.armor_class = char_data['armor_class']
            
            # Set proficiency_bonus if provided
            if 'proficiency_bonus' in char_data:
                updated_character.proficiency_bonus = char_data['proficiency_bonus']
            
            update_character(updated_character)
        
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