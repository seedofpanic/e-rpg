"""
Test script for TTS audio streaming to the UI.
This script tests the functionality of sending audio to the UI via WebSockets.
"""

from tts_manager import tts

def test_tts_ui_streaming():
    """Test TTS audio streaming to the UI."""
    
    # Enable UI playback
    tts.set_tts_properties(play_in_ui=True)
    
    # Test with a simple message
    print("Testing TTS audio streaming to UI...")
    test_text = "This is a test message for audio streaming to the user interface."
    
    # Send audio to UI
    tts.speak_text(test_text)
    
    # Print status message
    print("Test complete. Check the UI console for 'Received TTS audio data' message.")
    print("Audio should be playing in the browser.")

if __name__ == "__main__":
    test_tts_ui_streaming() 