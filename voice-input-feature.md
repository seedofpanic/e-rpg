# Description
Voice feature allow user to input text by voice.

# Implementation
- Add mic button next to the continue button
- When user press the mic button it will start record the audio from users mic
- When user press the mic button again it stops recording
- Recorded audio is sent to the backend
- Backend send the recorded audion to gemini and ask it to return recognized text
- Backend return text back to the ui
- Ui adds text to the input box