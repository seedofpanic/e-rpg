import logging
import sys
import io

def setup_logger(name):
    """
    Configure and return a logger instance
    
    Args:
        name (str): The name of the logger, typically __name__
        
    Returns:
        logging.Logger: Configured logger instance
    """
    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    
    # Clear any existing handlers
    if logger.hasHandlers():
        logger.handlers.clear()
    
    # Create formatter
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    
    # Configure console handler with UTF-8 encoding
    console_handler = logging.StreamHandler(stream=io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8'))
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # Add file handler with UTF-8 encoding
    file_handler = logging.FileHandler('app.log', encoding='utf-8')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    
    return logger

logger = setup_logger(__name__)