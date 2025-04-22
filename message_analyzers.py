# Determine which character should act first
from app_socket import send_socket_message
from ai_utils import generate_response
from character import Character, get_active_characters, get_character_by_id, get_characters
from character_tools import build_dialogue_messages_list
from dialog_history import DialogueMessage, append_to_dialog_history
from update_scene import do_update_scene
from queue import Queue
from google.genai.types import FunctionDeclaration, Tool, Schema

characters_queue: Queue[str] = Queue()
tmp_characters_queue: Queue[str] = Queue()

def request_character_response(character_id: str):
    if tmp_characters_queue.empty():
        tmp_characters_queue.put(character_id)

def process_character(character_id: str):
    character = get_character_by_id(character_id)
    if not character:
        return False

    result = character.generate_response()
    text = result["text"]
        
    # Add character response to game_state messages
    message = DialogueMessage(character.name, text, character.avatar, character_id)
    append_to_dialog_history(message)
    
    
    # output character response to the chat
    send_socket_message('new_message', message.to_dict())

    do_update_scene(character.name, result["text"])

request_character_response_declaration = Tool(function_declarations=[FunctionDeclaration(
    name="request_character_response",
    description="Request a response from a specific character based on their ID.",
    parameters=Schema(
        type="OBJECT",
        properties={
            "character_id": Schema(
                type="STRING",
                description="The ID of the character",
                enum=[char_id for char_id in get_active_characters()]
            )
        },
        required=["character_id"]
    )
)])

def analyzer_process(prompt: str):
    global characters_queue
    global tmp_characters_queue
    
    tmp_characters_queue = Queue()
    # Pass the tool function to generate_response
    generate_response(
        prompt, 
        temperature=0.6, 
        tools=[
            (request_character_response, request_character_response_declaration),
        ],
        loggerOn=True
    )

    characters = get_active_characters()
    print("characters: ", characters)
    character_id = tmp_characters_queue.get() if not tmp_characters_queue.empty() else None
    print("character_id: ", character_id)
    character = get_character_by_id(character_id)

    print("character_id: ", character_id)
    if not character:
        # find leader in characters or first character
        character_id = next((char_id for char_id, char in characters.items() if char.is_leader), list(characters.keys())[0])
    print("Using haracter_id: ", character_id)

    process_character(character_id)
    
    

def decide_acting_character_for_master():
    active_characters = get_active_characters()
    # Add character information to the prompt
    characters_info = ""
    delimiter = "\n - "
    for char_id in active_characters:
        char = get_character_by_id(char_id)
        if char:
            leader_status = "Group Leader" if char.is_leader else "Group Member"
            characters_info += (f"## {char.name} ({leader_status})\n"
                                f"id: {char_id}\n"
                                f"race: {char.race}\n"
                                f"class: {char.char_class}\n"
                                f"personality: {char.personality}\n\n"
                                f"### Character things to do:\n"
                                f"{delimiter.join(char.intentions)}\n\n"
                                )
    
    prompt = ("You are the Game Process Agent for a RPG campaign.\n"
               "You are responsible for ensuring characters speak in turns and don't interrupt each other.\n"
               "You make sure that a character who has already responded doesn't respond again.\n"
               "Analyze the message history.\n"
               "Choose the character who is most suitable to react.\n"
               "If a suitable character cannot be determined, let the group leader act.\n"
               "Call the request_character_response function with the character's ID as an argument\n\n"
               "# Context:\n"
               "# Information about the group characters:\n"
               f"{characters_info}\n\n"
               "# Message history:\n"
               f"{build_dialogue_messages_list()}"
               )
    
    analyzer_process(prompt)
    

