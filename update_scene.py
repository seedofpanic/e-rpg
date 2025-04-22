import os
from app_socket import send_socket_message
from ai_utils import generate_response
from logger_config import logger

_current_scene = ""

language = os.getenv("LANGUAGE")

def set_current_scene(scene: str):
    global _current_scene
    _current_scene = scene

def get_current_scene():
    return _current_scene

def update_scene(old_scene: str, message: str):
    message_string = message.replace('\n', ' ')
    old_scene_string = old_scene.replace('\n', ' ')
    prompt = f"""
    You are an assistant for a RPG game.
    {"Use Russian language for your response" if language == "ru" else ""}
    You receive a message and update the scene description with new details about objects that players can see.
    Try to rephrase the text to make it shorter.
    Don't add anything that is not in the message.
    Don't add anything from your self.
    Track character movements.
    "You are heading to..." means that you need to update the location name.

    Example:
    You are in <area>. In <place>.
    Here you can see:
    <object>.
    <object>.

    New message:
    {message_string}

    Current scene:
    {old_scene_string}

    Updated scene text:
    """
    
    result = generate_response(prompt, temperature=0.7)
    
    return result
    
def do_update_scene(sender, message):
    # Emit scene_updating event to notify clients
    send_socket_message('scene_updating', {'status': 'started'})
    logger.info(f"Updating scene from {sender}: {message}")
    
    try:
        # Update scene based on message
        result = update_scene(get_current_scene(), f"{sender}: {message}")
        
        # Check if scene was actually updated
        if result["text"] != get_current_scene():
            set_current_scene(result["text"])
            # Emit scene_updated event to clients with the full scene object
            logger.info(f"Scene updated to {result['text']}")
            send_socket_message('scene_updated', {'scene': result['text']})
        
    except Exception as e:
        # Notify clients of update error
        logger.error(f"Error updating scene: {e}")
        send_socket_message('scene_updating', {'status': 'error', 'message': str(e)})
    
    # Notify clients that scene updating is complete
    send_socket_message('scene_updating', {'status': 'completed'})