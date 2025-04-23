"""
Text-to-Speech Manager using Silero TTS model.
This implementation provides high-quality text-to-speech with multiple voices.
"""

import os
import torch
import sounddevice as sd
import threading
import numpy as np
import base64
from urllib.request import urlretrieve
from pathlib import Path
from app_socket import send_socket_message

print(f"CUDA available: {torch.cuda.is_available()}")

class TTSManager:
    def __init__(self, language_code=None):
        """Initialize the Silero text-to-speech manager"""

        # Add explicit error tracking
        self.last_error = None

        # Create models directory if it doesn't exist
        self.models_dir = Path("models")
        self.models_dir.mkdir(exist_ok=True)

        # Model properties
        self.model = None
        self.sample_rate = 48000
        self.device = torch.device(
            'cuda' if torch.cuda.is_available() else 'cpu')
        self.speakers = None
        self.rate = 1.0  # Speed factor
        self.volume = 1.0  # Volume level (0.0 to 1.0)
        self.current_voice = None
        self._russian_voice_id = None
        self._english_voice_id = None
        self._current_language = language_code  # Default language
        
        # New flag to control where audio is played
        self.play_in_ui = True  # Default to playing in UI

        # Model URLs by language
        self.model_urls = {
            "ru": "https://models.silero.ai/models/tts/ru/v3_1_ru.pt",
            "en": "https://models.silero.ai/models/tts/en/v3_en.pt",
            "de": "https://models.silero.ai/models/tts/de/v3_de.pt",
            "es": "https://models.silero.ai/models/tts/es/v3_es.pt",
            "fr": "https://models.silero.ai/models/tts/fr/v3_fr.pt"
        }

        # Audio device settings
        self.audio_device = None  # Use default device initially

        # Add a lock to prevent multiple threads from calling speak_text simultaneously
        self.tts_lock = threading.Lock()

        # Load model synchronously - we don't care about blocking
        self.load_model()

    def load_model(self, language_code=None):
        """Load the Silero TTS model for specified language or current language

        Args:
            language_code: Language code (e.g., 'ru', 'en') or None to use current language
        """
        # If model is already loaded, do nothing
        if self.model is not None:
            return
        
        try:
            # Use specified language or current language
            lang = language_code or self._current_language

            # Skip if language is not supported
            if lang not in self.model_urls:
                error_msg = f"Language {lang} is not supported"
                print(error_msg)
                self.last_error = error_msg
                return

            model_url = self.model_urls[lang]
            model_filename = f"silero_tts_{lang}.pt"
            model_path = self.models_dir / model_filename

            # First check if the model exists directly in the project folder
            project_model_path = Path(
                f"v3_{lang}.pt" if lang != "en" else "v3_en.pt")
            if project_model_path.exists():
                print(f"Found model in project folder: {project_model_path}")
                model_path = project_model_path
            # Otherwise download or use the model in models directory
            elif not model_path.exists():
                print(
                    f"Downloading Silero TTS model for {lang} (this may take a moment)...")
                try:
                    urlretrieve(model_url, model_path)
                except Exception as e:
                    error_msg = f"Failed to download TTS model: {str(e)}"
                    print(error_msg)
                    self.last_error = error_msg
                    return

            # Load the model
            print(f"Loading model from {model_path}")
            try:
                self.model = self._download_and_load_model(
                    model_path, model_url)
            except Exception as e:
                error_msg = f"Error loading model: {str(e)}. Attempting to redownload..."
                print(error_msg)
                try:
                    self.model = self._download_and_load_model(
                        model_path, model_url, force_download=True)
                except Exception as e2:
                    error_msg = f"Failed to load model after redownload attempt: {str(e2)}"
                    print(error_msg)
                    self.last_error = error_msg
                    return

            if self.device.type == 'cuda':
                print("Using GPU for inference")
            else:
                print("Using CPU for inference")

            # Get available speakers
            self.speakers = self.model.speakers

            # Select appropriate default voice
            if lang == "ru":
                # Set default voice to first Russian speaker
                russian_speakers = [
                    s for s in self.speakers if s.startswith('ru_')]
                self.current_voice = russian_speakers[0] if russian_speakers else self.speakers[0]
                # Store Russian voice ID
                if russian_speakers:
                    self._russian_voice_id = russian_speakers[0]
                    print(f"Found Russian voice: {self._russian_voice_id}")
            elif lang == "en":
                # Set default voice to first English speaker
                english_speakers = [
                    s for s in self.speakers if s.startswith('en_')]
                self.current_voice = english_speakers[0] if english_speakers else self.speakers[0]
                # Store English voice ID
                if english_speakers:
                    self._english_voice_id = english_speakers[0]
                    print(f"Found English voice: {self._english_voice_id}")
            else:
                # For other languages, select first voice that starts with language code
                lang_speakers = [
                    s for s in self.speakers if s.startswith(f'{lang}_')]
                self.current_voice = lang_speakers[0] if lang_speakers else self.speakers[0]

            # Update current language
            self._current_language = lang
            print(
                f"Silero TTS model loaded successfully for language {lang}. Using voice: {self.current_voice}")


        except Exception as e:
            error_msg = f"Error loading Silero TTS model: {str(e)}"
            print(error_msg)
            self.last_error = error_msg
            self.speakers = []  # Ensure speakers list is empty but defined

    def _download_and_load_model(self, model_path, model_url, force_download=False):
        """Download (if needed) and load the model

        Args:
            model_path: Path to the model file
            model_url: URL to download the model from
            force_download: Whether to force redownload the model

        Returns:
            The loaded model
        """
        # Delete model if force_download is True
        if force_download and model_path.exists():
            os.remove(model_path)

        # Download the model if it doesn't exist
        if force_download or not model_path.exists():
            print(f"Downloading model from {model_url}...")
            try:
                urlretrieve(model_url, model_path)
            except Exception as e:
                error_msg = f"Failed to download model: {str(e)}"
                print(error_msg)
                self.last_error = error_msg
                raise

        # Load the model
        try:
            model = torch.package.PackageImporter(
                model_path).load_pickle("tts_models", "model")
            model.to(self.device)
            return model
        except Exception as e:
            error_msg = f"Failed to load model file: {str(e)}"
            print(error_msg)
            self.last_error = error_msg
            raise

    def synthesize_and_play_speech(self, text, selected_voice, speech_rate, speech_volume):
        """Process and play text directly without batching
        
        Args:
            text: Text to be spoken
            selected_voice: Voice ID to use
            speech_rate: Speed of speech (float multiplier)
            speech_volume: Volume level (0.0 to 1.0)
        """
        # Process all text at once
        audio = self._generate_audio(text, selected_voice, speech_rate, speech_volume)
        print(f"Audio generated")
        if audio is not None:
            if self.play_in_ui:
                # Send to UI for playback
                print("Sending audio to UI")
                self._send_audio_to_ui(audio, text)
            else:
                # Play locally using sounddevice
                sd.play(audio.numpy(), self.sample_rate, device=self.audio_device)
                sd.wait()
            print("Finished speaking text")
            
    def _encode_audio_to_base64(self, audio_tensor):
        """Convert audio tensor to base64 encoded string
        
        Args:
            audio_tensor: PyTorch tensor containing audio data
            
        Returns:
            Base64 encoded string of audio data
        """
        try:
            # Convert to numpy array
            audio_np = audio_tensor.numpy()
            
            # Normalize to 32-bit float range for Web Audio API compatibility
            # Web Audio API expects 32-bit float PCM data in range [-1.0, 1.0]
            audio_np = np.clip(audio_np, -1.0, 1.0)
            audio_float32 = audio_np.astype(np.float32)
            
            # Convert to bytes
            audio_bytes = audio_float32.tobytes()
            
            # Encode to base64
            audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
            
            return audio_base64
        except Exception as e:
            print(f"Error encoding audio: {str(e)}")
            return None
            
    def _send_audio_to_ui(self, audio, text=""):
        """Send audio data to UI for playback
        
        Args:
            audio: PyTorch tensor containing audio data
            text: Optional text that was spoken (for display/debugging)
        """
        try:
            # Encode audio to base64
            audio_base64 = self._encode_audio_to_base64(audio)
            
            if audio_base64:
                # Prepare data for socket
                audio_data = {
                    'audio': audio_base64,
                    'text': text,
                    'sample_rate': self.sample_rate,
                    'voice': self.current_voice,
                    'format': 'float32',  # Specify audio format
                    'channels': 1  # Mono audio
                }
                
                # Send via WebSocket
                send_socket_message('tts_audio', audio_data)
                print("Audio sent to UI")
            else:
                print("Failed to encode audio for UI")
        except Exception as e:
            print(f"Error sending audio to UI: {str(e)}")

    def process_text_directly(self, text, rate=None, volume=None, voice=None):
        """Process text directly
        
        Args:
            text: Text to be spoken
            rate: Speed of speech (float multiplier)
            volume: Volume level (0.0 to 1.0)
            voice: Voice ID to use
        """
        # Set default values if not provided
        speech_rate = rate if rate is not None else self.rate
        speech_volume = volume if volume is not None else self.volume
        selected_voice = voice if voice is not None else self.current_voice

        # Ensure we have a model
        if not self.model:
            print("TTS model not loaded, skipping speech")
            return

        # Ensure we have a valid voice
        if not selected_voice or selected_voice not in self.speakers:
            selected_voice = self.speakers[0]
            print(f"No voice specified, using {selected_voice}")

        # Acquire lock to ensure only one text is processed at a time
        with self.tts_lock:
            try:
                self.synthesize_and_play_speech(text, selected_voice, speech_rate, speech_volume)
            except Exception as e:
                print(f"Error processing speech: {str(e)}")

    def speak_text(self, text, rate=None, volume=None, voice=None):
        """Convert text to speech immediately
        
        Args:
            text: Text to be spoken
            rate: Speed of speech (float multiplier, default is 1.0)
            volume: Volume level (0.0 to 1.0)
            voice: Voice ID to use
        
        Returns:
            None
        """
        if not text:
            return
        
        # Process text directly
        self.process_text_directly(text, rate, volume, voice)

    def _generate_audio(self, text, voice, rate=1.0, volume=1.0):
        """Generate audio for text with the specified parameters"""
        try:
            # Generate audio from text
            audio = self.model.apply_tts(
                text=text,
                speaker=voice,
                sample_rate=self.sample_rate
            )

            # Apply rate adjustment if needed (using resampling)
            if rate != 1.0:
                audio = self._adjust_speech_rate(audio, rate)

            # Apply volume adjustment
            if volume != 1.0:
                audio = audio * volume

            return audio
        except Exception as e:
            print(f"Error generating audio: {str(e)}")
            return None

    def _adjust_speech_rate(self, audio, rate):
        """Adjust the speech rate using resampling"""
        if rate == 1.0:
            return audio

        # Convert to numpy for processing
        audio_np = audio.numpy()

        # Calculate new length based on rate
        new_length = int(len(audio_np) / rate)

        # Use numpy to resample the audio
        indices = np.linspace(0, len(audio_np) - 1, new_length)
        indices = indices.astype(np.int32)

        # Create new audio with adjusted rate
        new_audio = audio_np[indices]

        # Convert back to torch tensor
        return torch.tensor(new_audio)

    def set_tts_properties(self, rate=None, volume=None, voice=None, play_in_ui=None):
        """
        Set default properties for text-to-speech

        Args:
            rate: Speed of speech (float multiplier)
            volume: Volume level (0.0 to 1.0)
            voice: Voice ID to use for speech
            play_in_ui: Boolean flag to control where audio is played

        Returns:
            Dictionary of current TTS properties
        """
        if rate is not None:
            self.rate = rate
        if volume is not None:
            self.volume = volume
        if voice is not None and self.speakers and voice in self.speakers:
            self.current_voice = voice
            # Update language based on voice
            if voice.startswith('ru_'):
                self._current_language = "ru"
                self._russian_voice_id = voice
            elif voice.startswith('en_'):
                self._current_language = "en"
                self._english_voice_id = voice
            else:
                for lang in self.model_urls.keys():
                    if voice.startswith(f"{lang}_"):
                        self._current_language = lang
                        break
        
        if play_in_ui is not None:
            self.play_in_ui = play_in_ui

        # Return current properties
        return self.get_tts_properties()

    def get_tts_properties(self):
        """
        Get current text-to-speech properties

        Returns:
            Dictionary of current TTS properties
        """
        # Initialize empty speakers list if model failed to load
        if self.speakers is None:
            self.speakers = []

        return {
            'rate': self.rate,
            'volume': self.volume,
            'voice': self.current_voice,
            'audio_device': self.audio_device,
            'language': self._current_language,
            'play_in_ui': self.play_in_ui
        }

    def set_russian_voice(self):
        """
        Set the text-to-speech engine to use a Russian voice if available

        Returns:
            True if successful, False if no Russian voice found
        """
        return self.set_language("ru")

    def set_english_voice(self):
        """
        Set the text-to-speech engine to use an English voice if available

        Returns:
            True if successful, False if no English voice found
        """
        return self.set_language("en")

    def set_language(self, language_code):
        """
        Set the text-to-speech engine to use a specific language

        Args:
            language_code: Language code (e.g., 'ru', 'en')

        Returns:
            True if successful, False otherwise
        """
        if language_code not in self.model_urls:
            print(f"Language {language_code} is not supported")
            return False

        # Don't reload models - just set the preference for voice selection
        self._current_language = language_code
        
        # Select a voice for this language
        lang_speakers = [s for s in self.speakers if s.startswith(f'{language_code}_')]
        if lang_speakers:
            self.current_voice = lang_speakers[0]
            return True
        
        return False

    def get_available_voices(self):
        """
        Get a list of all available TTS voices

        Returns:
            List of dictionaries with voice information
        """
        # If the model isn't loaded or failed to load, return empty list or a placeholder voice
        if not self.speakers:
            # Return at least a mock voice so the UI has something to display
            return [{
                'id': 'default',
                'name': 'Default Voice',
                'languages': ['en'],
                'gender': 'unknown',
                'age': 'unknown'
            }]

        voice_list = []
        for speaker in self.speakers:
            # Extract language code from speaker ID (typically format: "ru_0", "en_0", etc.)
            parts = speaker.split('_')
            language = parts[0] if len(parts) > 0 else "unknown"

            #if language == self._current_language:
            voice_info = {
                'id': speaker,
                'name': speaker,
                'languages': [language],
                'gender': 'unknown',  # Silero doesn't provide gender info
                'age': 'unknown'      # Silero doesn't provide age info
            }
            voice_list.append(voice_info)

        return voice_list

    def get_supported_languages(self):
        """
        Get a list of all supported languages

        Returns:
            Dictionary of language codes and names
        """
        return {
            "ru": "Russian",
            "en": "English",
            "de": "German",
            "es": "Spanish",
            "fr": "French"
        }

    def set_performance_options(self, chunk_size=None):
        """
        Configure performance options for TTS

        Args:
            chunk_size: Maximum size of text chunks (for compatibility, not used)

        Returns:
            Empty dictionary as batch processing has been removed
        """
        print("Batch processing has been removed, parameters ignored.")
        return {}

    def get_audio_devices(self):
        """
        Get a list of available audio output devices

        Returns:
            List of dictionaries with device information
        """
        devices = []
        try:
            device_list = sd.query_devices()
            for i, device in enumerate(device_list):
                if device['max_output_channels'] > 0:
                    devices.append({
                        'id': i,
                        'name': device['name'],
                        'channels': device['max_output_channels'],
                        'default': device.get('default_output', False)
                    })
        except Exception as e:
            print(f"Error getting audio devices: {str(e)}")

        return devices

    def set_audio_device(self, device_id=None):
        """
        Set the audio output device

        Args:
            device_id: Device ID (int) or None to use default

        Returns:
            Current device ID or None if using default
        """
        try:
            if device_id is not None:
                # Validate device ID
                devices = sd.query_devices()
                if 0 <= device_id < len(devices) and devices[device_id]['max_output_channels'] > 0:
                    self.audio_device = device_id
                    print(f"Audio device set to: {devices[device_id]['name']}")
                else:
                    print(f"Invalid device ID: {device_id}")
                    self.audio_device = None
            else:
                # Reset to default device
                self.audio_device = None
                print("Using default audio device")

        except Exception as e:
            print(f"Error setting audio device: {str(e)}")
            self.audio_device = None

        return self.audio_device

    def get_current_audio_device(self):
        """
        Get information about the currently selected audio device

        Returns:
            Dictionary with device information or None if using default
        """
        if self.audio_device is None:
            return None

        try:
            devices = sd.query_devices()
            if 0 <= self.audio_device < len(devices):
                device = devices[self.audio_device]
                return {
                    'id': self.audio_device,
                    'name': device['name'],
                    'channels': device['max_output_channels']
                }
        except Exception as e:
            print(f"Error getting current audio device: {str(e)}")

        return None

    def _detect_language(self, text):
        """Detect language from text

        Args:
            text: Text to detect language from

        Returns:
            Language code (e.g., 'ru', 'en') or None if detection fails
        """
        if not text:
            return None

        # Check for Cyrillic characters (Russian)
        has_cyrillic = any(ord('а') <= ord(c) <= ord(
            'я') or ord('А') <= ord(c) <= ord('Я') for c in text)
        if has_cyrillic:
            return "ru"

        # Simple language detection for other languages
        # This is a very basic implementation - could be improved with proper language detection libraries

        # English is default if no other language is detected
        # In a real implementation, you might want to use a proper language detection library
        return "en"

tts = TTSManager(language_code=os.environ.get('LANGUAGE', "en"))
