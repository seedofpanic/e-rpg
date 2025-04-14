from google.generativeai.types import FunctionDeclaration
from dialog_history import get_dialogue_history

def build_dialogue_messages_list(count = 10):
    messages = get_dialogue_history(count)
    formatted_messages = []

    if messages and isinstance(messages, list):
        for msg in reversed(messages):
            message_content = msg.message.replace('\n', ' ')
            formatted_messages.insert(0, f"{msg.sender}: {message_content}")
    return "\n".join(formatted_messages)

# Define function declarations for tools
request_master_input_declaration = FunctionDeclaration(
    name="request_master_input",
    description="Request a response from the master based on the query.",
    parameters={
        "type": "OBJECT",
        "properties": {
            "query": {
                "type": "STRING",
                "description": "The query to the master"
            }
        },
        "required": ["query"]
    }
)
