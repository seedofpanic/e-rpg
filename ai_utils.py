from socket import SocketIO
import time
from collections import deque
from google import genai
from flask import request
from logger_config import setup_logger
from google.genai.types import FunctionCall
from app_socket import send_socket_message

# Setup logger
logger = setup_logger(__name__)

# Track the timestamps of recent API calls
_request_timestamps: deque[float] = deque(maxlen=10)

# Dictionary to store user-specific API keys
api_keys: dict[str, str] = {}

# Default API key from environment
DEFAULT_GEMINI_API_KEY = None

def set_default_api_key(api_key):
    global DEFAULT_GEMINI_API_KEY
    DEFAULT_GEMINI_API_KEY = api_key

def get_current_api_key():
    """Get the API key for the current session or fall back to the default key"""
    session_id = request.sid
    return api_keys.get(session_id, DEFAULT_GEMINI_API_KEY)

def update_api_key(session_id, api_key):
    """Update the API key for a session"""
    api_keys[session_id] = api_key
    logger.info(f"Updated API key for session {session_id}")

def remove_api_key(session_id):
    """Remove the API key for a session when it disconnects"""
    if session_id in api_keys:
        del api_keys[session_id]
        logger.info(f"Removed API key for session {session_id}")

def run_tools(function_calls: list[FunctionCall], tools):# Handle function calling responses
    for part in function_calls:
        logger.info(f"Response part: {part}")
        
        
        function_name = part.name
        args = part.args
        
        # Create a map of function names to their actual functions
        name_to_func = {func_tuple[0].__name__: func_tuple[0] for func_tuple in tools}
        
        # Find and execute the function
        if function_name in name_to_func:
            logger.info(f"Executing function: {function_name} with args: {args}")
            name_to_func[function_name](**args)

def generate_response(prompt, temperature=0.5, tools=None, api_key=None, defer_tools=False, loggerOn=False):
    """
    Generate a response using the Gemini model.
    
    Args:
        prompt: The text prompt to send to the model
        tools: A list of (function, declaration) tuples to make available to the model (optional)
        api_key: The Gemini API key to use for this request (optional)
    
    Returns:
        The generated text response or function call result
    
    Raises:
        RateLimitError: If rate limit is reached and wait=False
    """
    # If no API key is provided, get it from the current session
    if api_key is None:
        api_key = get_current_api_key()
        
    # Log the input prompt
    if loggerOn:
        logger.info(f"Input prompt: {prompt}..." if len(prompt) > 100 else f"Input prompt: {prompt}")
    
    # Check if we've hit the rate limit (14 requests per minute)
    current_time = time.time()
    if len(_request_timestamps) >= 14:
        # If the oldest request is less than 60 seconds old, we've hit the limit
        time_since_oldest = current_time - _request_timestamps[0]
        if time_since_oldest < 60:
            sleep_time = 60 - time_since_oldest
            if loggerOn:
                logger.info(f"Rate limit reached, waiting for {sleep_time:.2f} seconds")
            
            # Emit rate limit reached event if socketio is available
            send_socket_message('rate_limit_reached', {'wait_time': sleep_time})
            
            time.sleep(sleep_time)
    
    # Add the current timestamp to our tracking
    _request_timestamps.append(current_time)
    
    # Create a client with the provided API key
    if loggerOn:
        logger.info("Using API key for this request")
    
    client = genai.Client(api_key=api_key)
    
    # Make the API call
    if loggerOn:
        print("sending request")
    
    # Configure generation based on whether tools are provided
    config = None
    if tools:
        # Extract the function declarations for the API
        function_declarations = [tool_tuple[1] for tool_tuple in tools]
        
        config = genai.types.GenerateContentConfig(
            temperature=temperature,
            top_p=0.95,
            top_k=40,
            tools=function_declarations
        )
    else:
        # Standard text generation without tools
        config = genai.types.GenerateContentConfig(
            temperature=temperature,
            top_p=0.95,
            top_k=40,
        )
        
    response = client.models.generate_content(
        model='gemini-2.5-flash-preview-04-17',
        contents=prompt,
        config=config
    )
    
    logger.info(f"Output response: {response.text}")
    # Process the response
    if not tools:
        if loggerOn:
            return {"text": response.text}

    text = response.text

    if defer_tools:
        return {"text": text, "response": response}
    else:
        if response.function_calls:
            run_tools(response.function_calls, tools)
        return {"text": text}